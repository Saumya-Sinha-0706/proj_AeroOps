import {
  isCategoryCompatible,
  validateGateAssignment,
  MTT_MINUTES,
  MIN_GATE_BUFFER_MINUTES,
  formatSimTime,
} from './rules';
import { Flight, Gate } from '../types';

/**
 * Self-contained unit tests for ICAO / IATA Ground Operations Conflict Rules
 * Can be run in node or verified in console
 */
export function runGroundRulesTestVerification(): { passed: number; failed: number; log: string[] } {
  const logs: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      logs.push(`PASS: ${testName}`);
      passed++;
    } else {
      logs.push(`FAIL: ${testName}`);
      failed++;
    }
  }

  // Test 1: Category hierarchy
  assert(isCategoryCompatible('E', 'C') === true, 'Code E gate accepts Code C aircraft');
  assert(isCategoryCompatible('E', 'E') === true, 'Code E gate accepts Code E aircraft');
  assert(isCategoryCompatible('C', 'E') === false, 'Code C gate REJECTS Code E aircraft');
  assert(isCategoryCompatible('D', 'E') === false, 'Code D gate REJECTS Code E aircraft');
  assert(isCategoryCompatible('D', 'C') === true, 'Code D gate accepts Code C aircraft');

  // Test 2: MTT values
  assert(MTT_MINUTES['C'] === 40, 'Code C Narrow-body MTT is 40 minutes');
  assert(MTT_MINUTES['E'] === 75, 'Code E Wide-body MTT is 75 minutes');

  // Test 3: Overlap & Gate Assignment Validation
  const sampleGates: Gate[] = [
    {
      id: 'A1',
      concourse: 'A',
      terminal: 'T1',
      maxCategory: 'C',
      allowedCategories: ['C'],
      status: 'AVAILABLE',
      hasDualJetbridge: false,
      coordinates: { x: 390, y: 250, angle: 90 },
      pushbackCoords: { x: 390, y: 220 },
    },
    {
      id: 'A7',
      concourse: 'A',
      terminal: 'T1',
      maxCategory: 'E',
      allowedCategories: ['C', 'D', 'E'],
      status: 'AVAILABLE',
      hasDualJetbridge: true,
      coordinates: { x: 700, y: 250, angle: 90 },
      pushbackCoords: { x: 700, y: 215 },
    },
    {
      id: 'B4',
      concourse: 'B',
      terminal: 'T2',
      maxCategory: 'C',
      allowedCategories: ['C'],
      status: 'OUT_OF_SERVICE',
      outOfServiceReason: 'Jetbridge hydraulic fault',
      hasDualJetbridge: false,
      coordinates: { x: 540, y: 340, angle: 90 },
      pushbackCoords: { x: 540, y: 310 },
    },
  ];

  const existingFlight: Flight = {
    id: 'f-1',
    flightNumber: 'UA100',
    callsign: 'UNITED 100',
    airline: { code: 'UA', name: 'United', color: '#005DAA', textColor: '#fff' },
    origin: 'KORD',
    destination: 'KDEN',
    isArrival: true,
    aircraftType: 'B737-800',
    category: 'C',
    passengers: 160,
    status: 'AT_GATE',
    scheduledTime: 800,
    estimatedTime: 800,
    gateOccupancyStart: 800,
    gateOccupancyEnd: 860, // 13:20 to 14:20Z
    assignedGateId: 'A1',
    assignedRunwayId: '09L/27R',
    delayMinutes: 0,
    delayHistory: [],
    milestones: [],
    position: { x: 390, y: 250, altitude: 0, speed: 0, heading: 90, stage: 'GATE' },
  };

  const newFlightC: Flight = {
    ...existingFlight,
    id: 'f-2',
    flightNumber: 'DL200',
    callsign: 'DELTA 200',
  };

  const heavyFlightE: Flight = {
    ...existingFlight,
    id: 'f-3',
    flightNumber: 'BA300',
    aircraftType: 'B777-300ER',
    category: 'E',
  };

  // Conflict 1: Size Mismatch (Heavy E into Code C gate A1)
  const sizeCheck = validateGateAssignment(heavyFlightE, 'A1', 900, 980, sampleGates, [existingFlight]);
  assert(sizeCheck.hasConflict && sizeCheck.conflictType === 'SIZE_MISMATCH', 'Catches Category E at Category C gate');

  // Conflict 2: Time Overlap
  const overlapCheck = validateGateAssignment(newFlightC, 'A1', 820, 890, sampleGates, [existingFlight]);
  assert(overlapCheck.hasConflict && overlapCheck.conflictType === 'TIME_OVERLAP', 'Catches direct temporal overlap');

  // Conflict 3: Buffer Separation Violation (< 15 min)
  const bufferCheck = validateGateAssignment(newFlightC, 'A1', 865, 920, sampleGates, [existingFlight]);
  assert(
    bufferCheck.hasConflict && bufferCheck.conflictType === 'MIN_TURNAROUND_VIOLATION',
    `Catches buffer < ${MIN_GATE_BUFFER_MINUTES} min`
  );

  // Conflict 4: Gate Out Of Service
  const outageCheck = validateGateAssignment(newFlightC, 'B4', 900, 960, sampleGates, []);
  assert(outageCheck.hasConflict && outageCheck.conflictType === 'GATE_OUTAGE', 'Catches OUT_OF_SERVICE gate assignment');

  // Valid assignment
  const validCheck = validateGateAssignment(newFlightC, 'A1', 880, 940, sampleGates, [existingFlight]);
  assert(!validCheck.hasConflict, 'Approves valid non-overlapping assignment with >= 15 min buffer');

  // Time formatting check
  assert(formatSimTime(855) === '14:15Z', 'Formats 855 sim min as 14:15Z');

  return { passed, failed, log: logs };
}
