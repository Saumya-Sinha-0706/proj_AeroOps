export type AircraftCategory = 'C' | 'D' | 'E';

export type FlightStatus =
  | 'SCHEDULED'
  | 'BOARDING'
  | 'PUSHBACK'
  | 'TAXI_OUT'
  | 'DEPARTED'
  | 'EN_ROUTE'
  | 'ON_APPROACH'
  | 'FINAL'
  | 'LANDED'
  | 'TAXI_IN'
  | 'AT_GATE'
  | 'HOLDING'
  | 'DIVERTED'
  | 'CANCELLED';

export interface Milestone {
  id: string;
  name: string;
  targetTime: number; // minutes from midnight or timestamp
  actualTime?: number;
  completed: boolean;
  varianceMin: number;
  note?: string;
}

export interface DelayRecord {
  code: string;
  message: string;
  timestamp: number;
  source: string; // e.g. "RWY 09L Closure", "Gate A03 Overlap", "AAR Reduced"
  minutesAdded: number;
}

export interface FlightPosition {
  x: number;
  y: number;
  altitude: number; // 0 for ground, up to 10,000 for approach
  speed: number;    // knots
  heading: number;  // degrees 0-360
  stage: 'AIR' | 'FINAL' | 'RUNWAY' | 'TAXIWAY' | 'GATE' | 'PUSHBACK';
  currentWaypointIdx?: number;
  pathId?: string;
}

export interface Flight {
  id: string;
  flightNumber: string;
  callsign: string;
  airline: {
    code: string;
    name: string;
    color: string;
    textColor: string;
  };
  origin: string;
  destination: string;
  isArrival: boolean;
  aircraftType: string;
  category: AircraftCategory;
  passengers: number;
  status: FlightStatus;
  
  scheduledTime: number; // in simulation minutes, e.g. 840 = 14:00
  estimatedTime: number;
  actualTime?: number;
  gateOccupancyStart: number;
  gateOccupancyEnd: number;

  assignedGateId: string;
  assignedRunwayId: string;
  
  delayMinutes: number;
  delayHistory: DelayRecord[];
  milestones: Milestone[];
  
  position: FlightPosition;
  connectingFlightId?: string; // for aircraft turnaround rotation
  manualGateOverride?: boolean;
  overrideJustification?: string;
}

export interface Gate {
  id: string;
  concourse: 'A' | 'B' | 'C';
  terminal: string;
  maxCategory: AircraftCategory;
  allowedCategories: AircraftCategory[];
  status: 'AVAILABLE' | 'OCCUPIED' | 'OUT_OF_SERVICE' | 'CONFLICT';
  hasDualJetbridge: boolean;
  coordinates: { x: number; y: number; angle: number };
  pushbackCoords: { x: number; y: number };
  outOfServiceReason?: string;
  currentFlightId?: string;
}

export interface Runway {
  id: string;
  name: string;
  headingPrimary: string;
  headingReciprocal: string;
  activeHeading: string;
  lengthFt: number;
  status: 'ACTIVE' | 'CLOSED' | 'DEGRADED';
  ilsCategory: 'CAT I' | 'CAT II' | 'CAT IIIb';
  visualRangeRVR: number; // meters, e.g. 1200m
  closureReason?: string;
  coordinates: {
    start: { x: number; y: number };
    end: { x: number; y: number };
    thresholdHeading: number;
  };
}

export type VehicleType = 
  | 'FUEL_BOWSER' 
  | 'BAGGAGE_TUG' 
  | 'PUSHBACK_TRACTOR' 
  | 'CATERING_TRUCK' 
  | 'FOLLOW_ME';

export interface GroundVehicle {
  id: string;
  callsign: string;
  type: VehicleType;
  status: 'IDLE' | 'DISPATCHED' | 'SERVICING' | 'RETURNING' | 'MAINTENANCE';
  assignedFlightId?: string;
  assignedGateId?: string;
  position: { x: number; y: number; heading: number };
  targetCoords?: { x: number; y: number };
  speed: number;
  batteryFuelPercent: number;
}

export interface WeatherState {
  condition: 'CLEAR' | 'WIND_SHEAR' | 'DENSE_FOG' | 'THUNDERSTORM' | 'SNOW_ICE';
  windSpeedKnots: number;
  windDirectionDeg: number;
  visibilitySm: number;
  qnh: number;
  metarRaw: string;
  crosswindComponent: number;
  aarReductionPercent: number; // Airport Acceptance Rate reduction
}

export interface OperationalAlert {
  id: string;
  timestamp: number;
  level: 'CRITICAL' | 'WARNING' | 'INFO';
  category: 'GATE' | 'RUNWAY' | 'WEATHER' | 'FLIGHT' | 'SECURITY';
  title: string;
  description: string;
  flightId?: string;
  gateId?: string;
  runwayId?: string;
  acknowledged: boolean;
}

export interface GateConflictCheckResult {
  hasConflict: boolean;
  conflictType?: 'SIZE_MISMATCH' | 'MIN_TURNAROUND_VIOLATION' | 'TIME_OVERLAP' | 'GATE_OUTAGE';
  conflictingFlight?: Flight;
  message: string;
  severity: 'ERROR' | 'WARNING' | 'RESOLVED';
  suggestedGateIds: string[];
}

export interface SimulationMetrics {
  onTimePercentage: number;
  averageDelayMinutes: number;
  totalMovementsToday: number;
  movementsPerHour: number;
  gateUtilizationPercent: number;
  runwayUtilizationPercent: number;
  activeCriticalAlerts: number;
  cancelledFlightsCount: number;
}
