import { AircraftCategory, Flight, Gate, GateConflictCheckResult } from '../types';

/**
 * Standard ICAO / IATA Ground Operations Turnaround Minima
 * Assumptions:
 * - Code C (Narrow-body: A320, B738): 40 min minimum ground turnaround
 * - Code D (Mid-body: B757, B763): 60 min minimum ground turnaround
 * - Code E (Heavy Wide-body: B777, A350, B787): 75 min minimum ground turnaround
 * - Minimum safety buffer between two different aircraft occupying the same gate: 15 minutes
 */
export const MTT_MINUTES: Record<AircraftCategory, number> = {
  C: 40,
  D: 60,
  E: 75,
};

export const MIN_GATE_BUFFER_MINUTES = 15;

const CATEGORY_HIERARCHY: Record<AircraftCategory, number> = {
  C: 1,
  D: 2,
  E: 3,
};

/**
 * Validates whether an aircraft category can physically fit at a gate.
 * Code E gate can accept C, D, E.
 * Code D gate can accept C, D.
 * Code C gate can ONLY accept C.
 */
export function isCategoryCompatible(gateMaxCategory: AircraftCategory, aircraftCategory: AircraftCategory): boolean {
  return CATEGORY_HIERARCHY[gateMaxCategory] >= CATEGORY_HIERARCHY[aircraftCategory];
}

/**
 * Pure function: Detects whether two time windows overlap
 */
export function doIntervalsOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

/**
 * Evaluates all gate constraints according to ICAO / IATA ground operations:
 * 1. Physical aircraft dimension check (Gate Max Category vs Aircraft Category)
 * 2. Gate Serviceability (Out of service / maintenance)
 * 3. Direct temporal overlap with other flights
 * 4. Minimum Turnaround Time (MTT) buffer violations between consecutive operations
 */
export function validateGateAssignment(
  flight: Flight,
  targetGateId: string,
  targetStart: number,
  targetEnd: number,
  allGates: Gate[],
  allFlights: Flight[]
): GateConflictCheckResult {
  const gate = allGates.find((g) => g.id === targetGateId);
  if (!gate) {
    return {
      hasConflict: true,
      conflictType: 'GATE_OUTAGE',
      message: `Gate ${targetGateId} not found in airport configuration.`,
      severity: 'ERROR',
      suggestedGateIds: [],
    };
  }

  // 1. Gate out of service check
  if (gate.status === 'OUT_OF_SERVICE') {
    const suggested = findAlternativeGates(flight, targetStart, targetEnd, allGates, allFlights, [targetGateId]);
    return {
      hasConflict: true,
      conflictType: 'GATE_OUTAGE',
      message: `Gate ${targetGateId} is OUT OF SERVICE: ${gate.outOfServiceReason || 'Scheduled maintenance'}`,
      severity: 'ERROR',
      suggestedGateIds: suggested,
    };
  }

  // 2. Aircraft category / gate size physical compatibility
  if (!isCategoryCompatible(gate.maxCategory, flight.category)) {
    const suggested = findAlternativeGates(flight, targetStart, targetEnd, allGates, allFlights, [targetGateId]);
    return {
      hasConflict: true,
      conflictType: 'SIZE_MISMATCH',
      message: `Physical dimension violation: Aircraft ${flight.aircraftType} (ICAO Code ${flight.category}) exceeds Gate ${targetGateId} maximum rating (Code ${gate.maxCategory}).`,
      severity: 'ERROR',
      suggestedGateIds: suggested,
    };
  }

  // Filter other flights assigned to this gate (excluding the flight itself)
  const otherGateFlights = allFlights.filter(
    (f) => f.id !== flight.id && f.assignedGateId === targetGateId && f.status !== 'CANCELLED' && f.status !== 'DIVERTED'
  );

  // 3. Direct Overlap check
  for (const other of otherGateFlights) {
    if (doIntervalsOverlap(targetStart, targetEnd, other.gateOccupancyStart, other.gateOccupancyEnd)) {
      const suggested = findAlternativeGates(flight, targetStart, targetEnd, allGates, allFlights, [targetGateId]);
      return {
        hasConflict: true,
        conflictType: 'TIME_OVERLAP',
        conflictingFlight: other,
        message: `Temporal conflict: Gate ${targetGateId} is already occupied by ${other.flightNumber} (${formatSimTime(other.gateOccupancyStart)} - ${formatSimTime(other.gateOccupancyEnd)}).`,
        severity: 'ERROR',
        suggestedGateIds: suggested,
      };
    }
  }

  // 4. Minimum Buffer & MTT check between consecutive flights
  // Check flights right before and right after
  for (const other of otherGateFlights) {
    // If 'other' departs just before 'flight' arrives
    if (other.gateOccupancyEnd <= targetStart) {
      const buffer = targetStart - other.gateOccupancyEnd;
      if (buffer < MIN_GATE_BUFFER_MINUTES) {
        const suggested = findAlternativeGates(flight, targetStart, targetEnd, allGates, allFlights, [targetGateId]);
        return {
          hasConflict: true,
          conflictType: 'MIN_TURNAROUND_VIOLATION',
          conflictingFlight: other,
          message: `Ground separation buffer violation: Only ${buffer} min between ${other.flightNumber} departure and ${flight.flightNumber} arrival (minimum ${MIN_GATE_BUFFER_MINUTES} min required).`,
          severity: 'WARNING',
          suggestedGateIds: suggested,
        };
      }
    }

    // If 'flight' departs just before 'other' arrives
    if (targetEnd <= other.gateOccupancyStart) {
      const buffer = other.gateOccupancyStart - targetEnd;
      if (buffer < MIN_GATE_BUFFER_MINUTES) {
        const suggested = findAlternativeGates(flight, targetStart, targetEnd, allGates, allFlights, [targetGateId]);
        return {
          hasConflict: true,
          conflictType: 'MIN_TURNAROUND_VIOLATION',
          conflictingFlight: other,
          message: `Ground separation buffer violation: Only ${buffer} min buffer before subsequent flight ${other.flightNumber} (minimum ${MIN_GATE_BUFFER_MINUTES} min required).`,
          severity: 'WARNING',
          suggestedGateIds: suggested,
        };
      }
    }
  }

  return {
    hasConflict: false,
    message: `Gate ${targetGateId} assignment fully compliant with ICAO ground criteria.`,
    severity: 'RESOLVED',
    suggestedGateIds: [],
  };
}

/**
 * Searches for optimal open alternative gates that satisfy all rules
 */
export function findAlternativeGates(
  flight: Flight,
  targetStart: number,
  targetEnd: number,
  allGates: Gate[],
  allFlights: Flight[],
  excludeGateIds: string[] = []
): string[] {
  const compatibleGates = allGates.filter(
    (g) =>
      !excludeGateIds.includes(g.id) &&
      g.status !== 'OUT_OF_SERVICE' &&
      isCategoryCompatible(g.maxCategory, flight.category)
  );

  const available: { gateId: string; score: number }[] = [];

  for (const gate of compatibleGates) {
    const check = validateGateAssignment(flight, gate.id, targetStart, targetEnd, allGates, allFlights);
    if (!check.hasConflict) {
      // Score by concourse affinity (prefer same concourse if possible)
      const currentConcourse = flight.assignedGateId?.charAt(0) || '';
      const score = gate.id.charAt(0) === currentConcourse ? 10 : 5;
      available.push({ gateId: gate.id, score });
    }
  }

  // Sort best match first
  available.sort((a, b) => b.score - a.score);
  return available.map((item) => item.gateId).slice(0, 4);
}

/**
 * Helper to display simulation minutes as HH:MM ZULU
 */
export function formatSimTime(minutesFromMidnight: number): string {
  const normalized = ((Math.floor(minutesFromMidnight) % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60).toString().padStart(2, '0');
  const m = Math.floor(normalized % 60).toString().padStart(2, '0');
  return `${h}:${m}Z`;
}
