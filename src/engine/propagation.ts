import { Flight, Gate, Runway, WeatherState, DelayRecord, OperationalAlert } from '../types';
import { validateGateAssignment } from './rules';

export interface PropagationResult {
  updatedFlights: Flight[];
  updatedGates: Gate[];
  newAlerts: OperationalAlert[];
}

/**
 * Pure function: Cascades runway closures onto scheduled flights
 */
export function propagateRunwayClosure(
  closedRunwayId: string,
  reason: string,
  simTime: number,
  flights: Flight[],
  runways: Runway[],
  gates: Gate[]
): PropagationResult {
  const alerts: OperationalAlert[] = [
    {
      id: `alert-rwy-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: simTime,
      level: 'CRITICAL',
      category: 'RUNWAY',
      title: `RUNWAY ${closedRunwayId} CLOSED`,
      description: `NOTAM issued: ${reason}. Rerouting active traffic to secondary runways.`,
      runwayId: closedRunwayId,
      acknowledged: false,
    },
  ];

  // Find alternative active runway
  const activeRunways = runways.filter((r) => r.id !== closedRunwayId && r.status === 'ACTIVE');
  const fallbackRunway = activeRunways[0] || runways[0];

  let accumulatedHoldDelay = 12; // Initial queue delay (minutes)
  const updatedFlights: Flight[] = flights.map((flight) => {
    // If flight was assigned to the closed runway and not yet completed
    const affectsFlight =
      flight.assignedRunwayId === closedRunwayId &&
      !['DEPARTED', 'AT_GATE', 'DIVERTED', 'CANCELLED'].includes(flight.status);

    if (affectsFlight) {
      accumulatedHoldDelay += 6; // Queue separation delay
      const addedMin = Math.min(accumulatedHoldDelay, 45);

      const delayRecord: DelayRecord = {
        code: 'RWY_CLS',
        message: `+${addedMin}m — Rerouted from closed ${closedRunwayId} (${reason}) to ${fallbackRunway?.name || 'alternate'}`,
        timestamp: simTime,
        source: `RWY ${closedRunwayId} Closure`,
        minutesAdded: addedMin,
      };

      const newEstTime = flight.estimatedTime + addedMin;
      const newGateStart = flight.gateOccupancyStart + (flight.isArrival ? addedMin : 0);
      const newGateEnd = flight.gateOccupancyEnd + addedMin;

      // Update milestones with delay
      const newMilestones = flight.milestones.map((m) => {
        if (!m.completed) {
          return {
            ...m,
            targetTime: m.targetTime + addedMin,
            varianceMin: (m.varianceMin || 0) + addedMin,
            note: m.note ? `${m.note} | RWY reflow` : `Delayed due to RWY ${closedRunwayId} closure`,
          };
        }
        return m;
      });

      return {
        ...flight,
        assignedRunwayId: fallbackRunway.id,
        estimatedTime: newEstTime,
        delayMinutes: flight.delayMinutes + addedMin,
        gateOccupancyStart: newGateStart,
        gateOccupancyEnd: newGateEnd,
        delayHistory: [delayRecord, ...flight.delayHistory],
        milestones: newMilestones,
      };
    }
    return flight;
  });

  // Check downstream gate conflicts caused by shifted gate times
  const updatedGates = gates.map((gate) => {
    const flightsAtGate = updatedFlights.filter(
      (f) => f.assignedGateId === gate.id && !['CANCELLED', 'DIVERTED'].includes(f.status)
    );
    let hasConflict = false;
    for (let i = 0; i < flightsAtGate.length; i++) {
      const check = validateGateAssignment(
        flightsAtGate[i],
        gate.id,
        flightsAtGate[i].gateOccupancyStart,
        flightsAtGate[i].gateOccupancyEnd,
        gates,
        updatedFlights
      );
      if (check.hasConflict) {
        hasConflict = true;
        alerts.push({
          id: `alert-gate-conf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: simTime,
          level: 'WARNING',
          category: 'GATE',
          title: `GATE CONFLICT AT ${gate.id}`,
          description: `Runway delay caused knock-on conflict for ${flightsAtGate[i].flightNumber}: ${check.message}`,
          gateId: gate.id,
          flightId: flightsAtGate[i].id,
          acknowledged: false,
        });
        break;
      }
    }
    return {
      ...gate,
      status: hasConflict ? ('CONFLICT' as const) : gate.status,
    };
  });

  return { updatedFlights, updatedGates, newAlerts: alerts };
}

/**
 * Pure function: Cascades weather degradation onto flight operations
 */
export function propagateWeatherChange(
  weather: WeatherState,
  simTime: number,
  flights: Flight[],
  gates: Gate[]
): PropagationResult {
  const alerts: OperationalAlert[] = [];
  const delayFactor = weather.aarReductionPercent > 0 ? Math.round(weather.aarReductionPercent / 2) : 0;

  if (weather.condition !== 'CLEAR') {
    alerts.push({
      id: `alert-wx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: simTime,
      level: weather.condition === 'THUNDERSTORM' ? 'CRITICAL' : 'WARNING',
      category: 'WEATHER',
      title: `WEATHER ALERT: ${weather.condition.replace('_', ' ')}`,
      description: `Wind: ${weather.windDirectionDeg}°/${weather.windSpeedKnots}kt | Vis: ${weather.visibilitySm}SM. AAR reduced by ${weather.aarReductionPercent}%.`,
      acknowledged: false,
    });
  }

  let delayQueue = delayFactor;
  const updatedFlights = flights.map((flight) => {
    // Weather primarily impacts airborne inbounds and departing queue
    if (['ON_APPROACH', 'EN_ROUTE', 'FINAL'].includes(flight.status) && weather.condition !== 'CLEAR') {
      const addedMin = Math.max(5, Math.min(delayQueue, 35));
      delayQueue += 2;

      const record: DelayRecord = {
        code: 'WX',
        message: `+${addedMin}m — Speed reduction & holding stack due to ${weather.condition}`,
        timestamp: simTime,
        source: `METAR: ${weather.condition}`,
        minutesAdded: addedMin,
      };

      return {
        ...flight,
        delayMinutes: flight.delayMinutes + addedMin,
        estimatedTime: flight.estimatedTime + addedMin,
        gateOccupancyStart: flight.gateOccupancyStart + addedMin,
        gateOccupancyEnd: flight.gateOccupancyEnd + addedMin,
        delayHistory: [record, ...flight.delayHistory],
      };
    }
    return flight;
  });

  return { updatedFlights, updatedGates: gates, newAlerts: alerts };
}

/**
 * Pure function: Propagates gate outage / maintenance
 */
export function propagateGateOutage(
  gateId: string,
  reason: string,
  simTime: number,
  flights: Flight[],
  gates: Gate[]
): PropagationResult {
  const updatedGates = gates.map((g) => {
    if (g.id === gateId) {
      return {
        ...g,
        status: 'OUT_OF_SERVICE' as const,
        outOfServiceReason: reason,
      };
    }
    return g;
  });

  const alerts: OperationalAlert[] = [
    {
      id: `alert-gate-out-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: simTime,
      level: 'CRITICAL',
      category: 'GATE',
      title: `GATE ${gateId} TAKEN OUT OF SERVICE`,
      description: `Ramp safety outage: ${reason}. Reassignment required for assigned flights.`,
      gateId,
      acknowledged: false,
    },
  ];

  const affectedFlights = flights.filter(
    (f) => f.assignedGateId === gateId && !['DEPARTED', 'CANCELLED'].includes(f.status)
  );

  for (const f of affectedFlights) {
    alerts.push({
      id: `alert-reassign-${f.id}-${Date.now()}`,
      timestamp: simTime,
      level: 'WARNING',
      category: 'FLIGHT',
      title: `REASSIGNMENT REQUIRED: ${f.flightNumber}`,
      description: `Flight ${f.flightNumber} displaced from Gate ${gateId}. Open gate Gantt to relocate.`,
      flightId: f.id,
      gateId,
      acknowledged: false,
    });
  }

  return {
    updatedFlights: flights,
    updatedGates,
    newAlerts: alerts,
  };
}
