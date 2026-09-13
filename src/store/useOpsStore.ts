import { create } from 'zustand';
import {
  Flight,
  Gate,
  Runway,
  GroundVehicle,
  WeatherState,
  OperationalAlert,
  SimulationMetrics,
  GateConflictCheckResult,
} from '../types';
import {
  INITIAL_FLIGHTS,
  INITIAL_GATES,
  INITIAL_RUNWAYS,
  INITIAL_VEHICLES,
  INITIAL_WEATHER,
  INITIAL_SIM_TIME,
} from '../engine/mockData';
import { advanceFlightMovement, advanceVehicleMovement } from '../engine/movement';
import { propagateRunwayClosure, propagateWeatherChange, propagateGateOutage } from '../engine/propagation';
import { validateGateAssignment } from '../engine/rules';

export const computeMetrics = (
  flights: Flight[],
  gates: Gate[],
  runways: Runway[],
  alerts: OperationalAlert[],
  weather: WeatherState
): SimulationMetrics => {
  const activeFlights = flights.filter((f) => f.status !== 'CANCELLED' && f.status !== 'DIVERTED');

  const onTimeCount = activeFlights.filter((f) => f.delayMinutes <= 15).length;
  const onTimePercentage = activeFlights.length > 0 ? Math.round((onTimeCount / activeFlights.length) * 100) : 100;

  const totalDelay = activeFlights.reduce((acc, f) => acc + f.delayMinutes, 0);
  const averageDelayMinutes = activeFlights.length > 0 ? Math.round(totalDelay / activeFlights.length) : 0;

  const occupiedGates = gates.filter((g) => g.status === 'OCCUPIED').length;
  const usableGates = gates.filter((g) => g.status !== 'OUT_OF_SERVICE').length;
  const gateUtilizationPercent = usableGates > 0 ? Math.round((occupiedGates / usableGates) * 100) : 0;

  const activeRunways = runways.filter((r) => r.status === 'ACTIVE').length;
  const runwayUtilizationPercent = Math.round((activeRunways / runways.length) * 100);

  const activeCriticalAlerts = alerts.filter((a) => !a.acknowledged && a.level === 'CRITICAL').length;
  const cancelledFlightsCount = flights.filter((f) => f.status === 'CANCELLED').length;

  return {
    onTimePercentage,
    averageDelayMinutes,
    totalMovementsToday: 142 + flights.length,
    movementsPerHour: activeRunways * 28 - (weather.aarReductionPercent > 0 ? 12 : 0),
    gateUtilizationPercent,
    runwayUtilizationPercent,
    activeCriticalAlerts,
    cancelledFlightsCount,
  };
};

const INITIAL_ALERTS: OperationalAlert[] = [
  {
    id: 'alert-init-1',
    timestamp: INITIAL_SIM_TIME - 12,
    level: 'INFO',
    category: 'RUNWAY',
    title: 'RWY 09L/27R ILS CAT IIIb OPERATIONAL',
    description: 'Routine surface telemetry normal. Surface winds 080° at 11kt.',
    acknowledged: false,
  },
  {
    id: 'alert-init-2',
    timestamp: INITIAL_SIM_TIME - 5,
    level: 'WARNING',
    category: 'FLIGHT',
    title: 'TRANSFER BAGS DELAY: UA442',
    description: 'Gate A4 baggage hold +10 min inherited from inbound UA112.',
    flightId: 'f-ua442',
    gateId: 'A4',
    acknowledged: false,
  },
];

const INITIAL_METRICS: SimulationMetrics = computeMetrics(
  INITIAL_FLIGHTS,
  INITIAL_GATES,
  INITIAL_RUNWAYS,
  INITIAL_ALERTS,
  INITIAL_WEATHER
);

interface OpsState {
  // Master Clock
  simTime: number; // in simulation minutes from midnight
  isPlaying: boolean;
  speedMultiplier: number;

  // Domain Entities
  flights: Flight[];
  gates: Gate[];
  runways: Runway[];
  vehicles: GroundVehicle[];
  weather: WeatherState;
  alerts: OperationalAlert[];
  groundStop: boolean;
  activeScenarioName: string;
  metrics: SimulationMetrics;

  // Active UI Selections
  selectedFlightId: string | null;
  selectedGateId: string | null;
  selectedVehicleId: string | null;
  selectedRunwayId: string | null;
  activeView: 'MAP' | 'FLIGHTS' | 'GATES' | 'DISRUPTIONS' | 'VEHICLES';
  commandPaletteOpen: boolean;
  shiftReportOpen: boolean;

  // Conflict Resolution Modal State
  conflictPrompt: {
    flightId: string;
    candidateGateId: string;
    targetStart: number;
    targetEnd: number;
    result: GateConflictCheckResult;
  } | null;

  // Actions
  togglePlay: () => void;
  setSpeedMultiplier: (multiplier: number) => void;
  jumpSimTime: (minutesDelta: number) => void;
  tick: (deltaSeconds: number) => void;

  selectFlight: (id: string | null) => void;
  selectGate: (id: string | null) => void;
  selectVehicle: (id: string | null) => void;
  selectRunway: (id: string | null) => void;
  setActiveView: (view: 'MAP' | 'FLIGHTS' | 'GATES' | 'DISRUPTIONS' | 'VEHICLES') => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setShiftReportOpen: (open: boolean) => void;
  alertsDrawerOpen: boolean;
  setAlertsDrawerOpen: (open: boolean) => void;

  // Gate Drag-and-Drop / Assignment
  requestGateAssignment: (
    flightId: string,
    candidateGateId: string,
    targetStart?: number,
    targetEnd?: number
  ) => void;
  confirmGateAssignment: (flightId: string, gateId: string, manualOverride?: boolean, justification?: string) => void;
  closeConflictPrompt: () => void;

  // Disruption Triggers
  toggleRunway: (runwayId: string, reason?: string) => void;
  toggleGateOutage: (gateId: string, reason?: string) => void;
  updateWeather: (weatherPartial: Partial<WeatherState>) => void;
  toggleGroundStop: () => void;
  dispatchVehicle: (vehicleId: string, gateId: string, flightId?: string) => void;
  acknowledgeAlert: (alertId: string) => void;
  acknowledgeAllAlerts: () => void;
  clearAllAlerts: () => void;
  loadScenario: (scenario: 'BASELINE' | 'FOG_CRISIS' | 'RWY_09L_BIRD_STRIKE' | 'RAMP_DISRUPTION') => void;
}

export const useOpsStore = create<OpsState>((set, get) => ({
  simTime: INITIAL_SIM_TIME,
  isPlaying: true,
  speedMultiplier: 1,

  flights: INITIAL_FLIGHTS,
  gates: INITIAL_GATES,
  runways: INITIAL_RUNWAYS,
  vehicles: INITIAL_VEHICLES,
  weather: INITIAL_WEATHER,
  alerts: INITIAL_ALERTS,
  metrics: INITIAL_METRICS,
  groundStop: false,
  activeScenarioName: 'Normal Morning Operations',

  selectedFlightId: null,
  selectedGateId: null,
  selectedVehicleId: null,
  selectedRunwayId: null,
  activeView: 'MAP',
  commandPaletteOpen: false,
  shiftReportOpen: false,
  alertsDrawerOpen: false,
  conflictPrompt: null,

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setSpeedMultiplier: (speedMultiplier) => set({ speedMultiplier }),
  jumpSimTime: (deltaMinutes) => set((state) => ({ simTime: state.simTime + deltaMinutes })),

  selectFlight: (id) => set({ selectedFlightId: id }),
  selectGate: (id) => set({ selectedGateId: id }),
  selectVehicle: (id) => set({ selectedVehicleId: id }),
  selectRunway: (id) => set({ selectedRunwayId: id }),
  setActiveView: (activeView) => set({ activeView }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setShiftReportOpen: (open) => set({ shiftReportOpen: open }),
  setAlertsDrawerOpen: (open) => set({ alertsDrawerOpen: open }),

  tick: (deltaSeconds: number) => {
    const state = get();
    if (!state.isPlaying) return;

    // Simulation minutes advanced
    const deltaSimMinutes = (deltaSeconds / 60) * state.speedMultiplier;
    const newSimTime = state.simTime + deltaSimMinutes;

    // Advance aircraft & vehicle spatial movements
    const updatedFlights = advanceFlightMovement(state.flights, deltaSimMinutes, state.gates, state.runways);
    const updatedVehicles = advanceVehicleMovement(state.vehicles, deltaSimMinutes, state.gates);

    // Sync gate occupied state based on flight locations
    const updatedGates = state.gates.map((g) => {
      if (g.status === 'OUT_OF_SERVICE' || g.status === 'CONFLICT') return g;
      const occFlight = updatedFlights.find(
        (f) => f.assignedGateId === g.id && ['AT_GATE', 'BOARDING', 'PUSHBACK'].includes(f.status)
      );
      return {
        ...g,
        status: occFlight ? ('OCCUPIED' as const) : ('AVAILABLE' as const),
        currentFlightId: occFlight?.id,
      };
    });

    const updatedMetrics = computeMetrics(
      updatedFlights,
      updatedGates,
      state.runways,
      state.alerts,
      state.weather
    );

    set({
      simTime: newSimTime,
      flights: updatedFlights,
      vehicles: updatedVehicles,
      gates: updatedGates,
      metrics: updatedMetrics,
    });
  },

  requestGateAssignment: (flightId, candidateGateId, targetStart, targetEnd) => {
    const { flights, gates } = get();
    const flight = flights.find((f) => f.id === flightId);
    if (!flight) return;

    const start = targetStart ?? flight.gateOccupancyStart;
    const end = targetEnd ?? flight.gateOccupancyEnd;

    const validation = validateGateAssignment(flight, candidateGateId, start, end, gates, flights);

    if (validation.hasConflict) {
      set({
        conflictPrompt: {
          flightId,
          candidateGateId,
          targetStart: start,
          targetEnd: end,
          result: validation,
        },
      });
    } else {
      // Instant valid assignment
      get().confirmGateAssignment(flightId, candidateGateId);
    }
  },

  confirmGateAssignment: (flightId, gateId, manualOverride = false, justification) => {
    const { flights, gates, simTime } = get();
    const flight = flights.find((f) => f.id === flightId);
    const targetGate = gates.find((g) => g.id === gateId);
    if (!flight || !targetGate) return;

    const prevGateId = flight.assignedGateId;
    const targetCoords = targetGate.coordinates;

    const updatedFlights = flights.map((f) => {
      if (f.id === flightId) {
        return {
          ...f,
          assignedGateId: gateId,
          manualGateOverride: manualOverride,
          overrideJustification: justification,
          position:
            f.status === 'AT_GATE'
              ? {
                  ...f.position,
                  x: targetCoords.x,
                  y: targetCoords.y,
                  heading: targetCoords.angle,
                }
              : f.position,
        };
      }
      return f;
    });

    const newAlert: OperationalAlert = {
      id: `alert-gate-reassign-${Date.now()}`,
      timestamp: simTime,
      level: manualOverride ? 'WARNING' : 'INFO',
      category: 'GATE',
      title: manualOverride
        ? `MANUAL OVERRIDE: ${flight.flightNumber} -> GATE ${gateId}`
        : `GATE ASSIGNED: ${flight.flightNumber} -> ${gateId}`,
      description: manualOverride
        ? `Duty Manager override logged: "${justification || 'Operational necessity'}". Reassigned from Gate ${prevGateId}.`
        : `Flight ${flight.flightNumber} relocated from Gate ${prevGateId} to ${gateId}. Ground crews notified.`,
      flightId,
      gateId,
      acknowledged: false,
    };

    set((state) => ({
      flights: updatedFlights,
      alerts: [newAlert, ...state.alerts],
      conflictPrompt: null,
    }));
  },

  closeConflictPrompt: () => set({ conflictPrompt: null }),

  toggleRunway: (runwayId, reason = 'Foreign Object Debris (FOD) inspection') => {
    const state = get();
    const runway = state.runways.find((r) => r.id === runwayId);
    if (!runway) return;

    const willClose = runway.status === 'ACTIVE';

    if (willClose) {
      const propResult = propagateRunwayClosure(
        runwayId,
        reason,
        state.simTime,
        state.flights,
        state.runways,
        state.gates
      );

      const updatedRunways = state.runways.map((r) =>
        r.id === runwayId ? { ...r, status: 'CLOSED' as const, closureReason: reason } : r
      );

      set((s) => ({
        runways: updatedRunways,
        flights: propResult.updatedFlights,
        gates: propResult.updatedGates,
        alerts: [...propResult.newAlerts, ...s.alerts],
      }));
    } else {
      // Reopening runway
      const updatedRunways = state.runways.map((r) =>
        r.id === runwayId ? { ...r, status: 'ACTIVE' as const, closureReason: undefined } : r
      );

      const reopenAlert: OperationalAlert = {
        id: `alert-rwy-open-${Date.now()}`,
        timestamp: state.simTime,
        level: 'INFO',
        category: 'RUNWAY',
        title: `RUNWAY ${runwayId} REOPENED`,
        description: 'Inspection complete. Runway returned to full operational service.',
        runwayId,
        acknowledged: false,
      };

      set((s) => ({
        runways: updatedRunways,
        alerts: [reopenAlert, ...s.alerts],
      }));
    }
  },

  toggleGateOutage: (gateId, reason = 'Jetbridge hydraulic interlock failure') => {
    const state = get();
    const gate = state.gates.find((g) => g.id === gateId);
    if (!gate) return;

    if (gate.status !== 'OUT_OF_SERVICE') {
      const result = propagateGateOutage(gateId, reason, state.simTime, state.flights, state.gates);
      set((s) => ({
        gates: result.updatedGates,
        alerts: [...result.newAlerts, ...s.alerts],
      }));
    } else {
      // Restore gate
      const updatedGates = state.gates.map((g) =>
        g.id === gateId ? { ...g, status: 'AVAILABLE' as const, outOfServiceReason: undefined } : g
      );

      const reopenAlert: OperationalAlert = {
        id: `alert-gate-restored-${Date.now()}`,
        timestamp: state.simTime,
        level: 'INFO',
        category: 'GATE',
        title: `GATE ${gateId} RESTORED`,
        description: 'Jetbridge maintenance completed. Gate returned to active service.',
        gateId,
        acknowledged: false,
      };

      set((s) => ({
        gates: updatedGates,
        alerts: [reopenAlert, ...s.alerts],
      }));
    }
  },

  updateWeather: (weatherPartial) => {
    const state = get();
    const newWeather: WeatherState = { ...state.weather, ...weatherPartial };
    const prop = propagateWeatherChange(newWeather, state.simTime, state.flights, state.gates);

    set((s) => ({
      weather: newWeather,
      flights: prop.updatedFlights,
      alerts: [...prop.newAlerts, ...s.alerts],
    }));
  },

  toggleGroundStop: () => {
    const state = get();
    const newGroundStop = !state.groundStop;

    const alert: OperationalAlert = {
      id: `alert-gs-${Date.now()}`,
      timestamp: state.simTime,
      level: 'CRITICAL',
      category: 'SECURITY',
      title: newGroundStop ? 'AIRPORT-WIDE GROUND STOP DECLARED' : 'GROUND STOP RESCINDED',
      description: newGroundStop
        ? 'All departing pushbacks and taxi clearances suspended by FAA ATC command.'
        : 'Departures resuming with normal metering rates.',
      acknowledged: false,
    };

    set((s) => ({
      groundStop: newGroundStop,
      alerts: [alert, ...s.alerts],
    }));
  },

  dispatchVehicle: (vehicleId, gateId, flightId) => {
    set((state) => ({
      vehicles: state.vehicles.map((v) =>
        v.id === vehicleId
          ? {
              ...v,
              status: 'DISPATCHED',
              assignedGateId: gateId,
              assignedFlightId: flightId,
            }
          : v
      ),
    }));
  },

  acknowledgeAlert: (alertId) => {
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)),
    }));
  },

  acknowledgeAllAlerts: () => {
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, acknowledged: true })),
    }));
  },

  clearAllAlerts: () => {
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, acknowledged: true })),
    }));
  },

  loadScenario: (scenarioKey) => {
    if (scenarioKey === 'BASELINE') {
      set({
        flights: INITIAL_FLIGHTS,
        gates: INITIAL_GATES,
        runways: INITIAL_RUNWAYS,
        vehicles: INITIAL_VEHICLES,
        weather: INITIAL_WEATHER,
        groundStop: false,
        activeScenarioName: 'Normal Morning Baseline',
        metrics: INITIAL_METRICS,
      });
      return;
    }

    if (scenarioKey === 'FOG_CRISIS') {
      const fogWeather: WeatherState = {
        condition: 'DENSE_FOG',
        windSpeedKnots: 4,
        windDirectionDeg: 60,
        visibilitySm: 0.25,
        qnh: 1018,
        metarRaw: 'KDEN 122130Z 06004KT 1/4SM R09L/1200FT FG VV001 10/10 A3004 RMK AO2 AAR-45%',
        crosswindComponent: 1,
        aarReductionPercent: 45,
      };
      get().updateWeather(fogWeather);
      set({ activeScenarioName: 'Catastrophic Dense Fog (AAR -45%)' });
      return;
    }

    if (scenarioKey === 'RWY_09L_BIRD_STRIKE') {
      get().toggleRunway('09L/27R', 'Flock of Canadian Geese strike on RWY 09L touchdown zone');
      set({ activeScenarioName: 'RWY 09L Emergency Bird Strike Closure' });
      return;
    }

    if (scenarioKey === 'RAMP_DISRUPTION') {
      get().toggleGateOutage('A4', 'Fuel hydrant pit leak — EPA containment in progress');
      get().toggleGateOutage('B6', 'Dual jetbridge mechanical cable snap');
      set({ activeScenarioName: 'Concourse A/B Gate Cascade Crisis' });
      return;
    }
  },
}));

/**
 * Returns the cached metrics object reference directly from store state
 * to avoid React 18/19 getSnapshot cache invalidation and infinite re-render loops.
 */
export const selectMetrics = (state: OpsState): SimulationMetrics => state.metrics;
