import { Flight, GroundVehicle, Gate, Runway } from '../types';

/**
 * Airfield Waypoint Coordinates for tactical routing
 */
export const AIRFIELD_WAYPOINTS = {
  // Runway 09L Touchdown and vacates
  RWY09L_THRESHOLD: { x: 140, y: 130 },
  RWY09L_MID: { x: 490, y: 130 },
  RWY09L_END: { x: 840, y: 130 },
  EXIT_ECHO_NORTH: { x: 700, y: 175 },
  EXIT_CHARLIE_NORTH: { x: 490, y: 175 },
  EXIT_FOXTROT_NORTH: { x: 260, y: 175 },

  // Runway 09R Touchdown and vacates
  RWY09R_THRESHOLD: { x: 160, y: 530 },
  RWY09R_MID: { x: 500, y: 530 },
  RWY09R_END: { x: 860, y: 530 },
  EXIT_CHARLIE_SOUTH: { x: 500, y: 480 },
  EXIT_DELTA_SOUTH: { x: 710, y: 480 },

  // Center Taxiway spine
  TAXI_ALPHA_WEST: { x: 260, y: 175 },
  TAXI_ALPHA_MID: { x: 520, y: 175 },
  TAXI_ALPHA_EAST: { x: 740, y: 175 },

  TAXI_BRAVO_WEST: { x: 380, y: 310 },
  TAXI_BRAVO_MID: { x: 540, y: 310 },
  TAXI_BRAVO_EAST: { x: 740, y: 310 },

  TAXI_DELTA_WEST: { x: 380, y: 470 },
  TAXI_DELTA_MID: { x: 540, y: 470 },
  TAXI_DELTA_EAST: { x: 740, y: 470 },
};

/**
 * Pure function: calculates heading in degrees between two points
 */
export function calculateHeading(from: { x: number; y: number }, to: { x: number; y: number }): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle < 0) angle += 360;
  return Math.round(angle);
}

/**
 * Pure function to step a 2D coordinate towards a target by step distance
 */
export function stepTowards(
  current: { x: number; y: number },
  target: { x: number; y: number },
  stepDistance: number
): { x: number; y: number; arrived: boolean } {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist <= stepDistance || dist === 0) {
    return { x: target.x, y: target.y, arrived: true };
  }

  const ratio = stepDistance / dist;
  return {
    x: current.x + dx * ratio,
    y: current.y + dy * ratio,
    arrived: false,
  };
}

/**
 * Advances flight spatial positions by a simulation delta (in minutes)
 */
export function advanceFlightMovement(
  flights: Flight[],
  deltaMinutes: number,
  gates: Gate[],
  _runways: Runway[]
): Flight[] {
  const pixelSpeedScale = 1.6; // Visual speed scaling

  return flights.map((flight) => {
    // 1. Parked at gate - static
    if (flight.status === 'AT_GATE' || flight.status === 'CANCELLED') {
      const gate = gates.find((g) => g.id === flight.assignedGateId);
      if (gate) {
        return {
          ...flight,
          position: {
            ...flight.position,
            x: gate.coordinates.x,
            y: gate.coordinates.y,
            heading: gate.coordinates.angle,
            speed: 0,
            altitude: 0,
            stage: 'GATE',
          },
        };
      }
      return flight;
    }

    // 2. Inbound Final Approach
    if (flight.status === 'FINAL' || flight.status === 'ON_APPROACH') {
      const isNorthRwy = flight.assignedRunwayId.includes('09L');
      const targetThreshold = isNorthRwy ? AIRFIELD_WAYPOINTS.RWY09L_THRESHOLD : AIRFIELD_WAYPOINTS.RWY09R_THRESHOLD;
      const step = Math.max(1, flight.position.speed * 0.08 * deltaMinutes * pixelSpeedScale);
      const res = stepTowards(flight.position, targetThreshold, step);

      // Decrement altitude on approach
      const altStep = 450 * deltaMinutes;
      const newAlt = Math.max(0, flight.position.altitude - altStep);

      if (res.arrived || flight.position.x >= targetThreshold.x) {
        // Transition to touchdown / rollout
        return {
          ...flight,
          status: 'LANDED',
          position: {
            ...flight.position,
            x: targetThreshold.x,
            y: targetThreshold.y,
            altitude: 0,
            speed: 120,
            heading: 90,
            stage: 'RUNWAY',
          },
        };
      }

      return {
        ...flight,
        position: {
          ...flight.position,
          x: res.x,
          y: res.y,
          altitude: newAlt,
          heading: 90,
          stage: flight.status === 'FINAL' ? 'FINAL' : 'AIR',
        },
      };
    }

    // 3. Landed rollout on runway
    if (flight.status === 'LANDED') {
      const isNorthRwy = flight.assignedRunwayId.includes('09L');
      const exitWaypoint = isNorthRwy ? AIRFIELD_WAYPOINTS.EXIT_CHARLIE_NORTH : AIRFIELD_WAYPOINTS.EXIT_CHARLIE_SOUTH;
      const step = Math.max(1, flight.position.speed * 0.05 * deltaMinutes * pixelSpeedScale);
      const res = stepTowards(flight.position, exitWaypoint, step);

      if (res.arrived || flight.position.x >= exitWaypoint.x) {
        return {
          ...flight,
          status: 'TAXI_IN',
          position: {
            ...flight.position,
            x: exitWaypoint.x,
            y: exitWaypoint.y,
            speed: 20,
            heading: isNorthRwy ? 90 : 0,
            stage: 'TAXIWAY',
          },
        };
      }

      return {
        ...flight,
        position: {
          ...flight.position,
          x: res.x,
          y: res.y,
          speed: Math.max(30, flight.position.speed - 15 * deltaMinutes),
          stage: 'RUNWAY',
        },
      };
    }

    // 4. Taxi In towards assigned gate
    if (flight.status === 'TAXI_IN') {
      const gate = gates.find((g) => g.id === flight.assignedGateId);
      const targetPos = gate ? gate.coordinates : { x: 500, y: 300 };
      const step = Math.max(0.8, 16 * 0.06 * deltaMinutes * pixelSpeedScale);
      const res = stepTowards(flight.position, targetPos, step);
      const heading = calculateHeading(flight.position, targetPos);

      if (res.arrived) {
        return {
          ...flight,
          status: 'AT_GATE',
          position: {
            ...flight.position,
            x: targetPos.x,
            y: targetPos.y,
            speed: 0,
            heading: gate?.coordinates.angle || 90,
            stage: 'GATE',
          },
        };
      }

      return {
        ...flight,
        position: {
          ...flight.position,
          x: res.x,
          y: res.y,
          speed: 15,
          heading,
          stage: 'TAXIWAY',
        },
      };
    }

    // 5. Pushback from gate
    if (flight.status === 'PUSHBACK') {
      const gate = gates.find((g) => g.id === flight.assignedGateId);
      const targetPos = gate?.pushbackCoords || { x: flight.position.x, y: flight.position.y - 30 };
      const step = 0.8 * deltaMinutes * pixelSpeedScale;
      const res = stepTowards(flight.position, targetPos, step);

      if (res.arrived) {
        return {
          ...flight,
          status: 'TAXI_OUT',
          position: {
            ...flight.position,
            x: targetPos.x,
            y: targetPos.y,
            speed: 10,
            heading: 90,
            stage: 'TAXIWAY',
          },
        };
      }

      return {
        ...flight,
        position: {
          ...flight.position,
          x: res.x,
          y: res.y,
          speed: 4,
          heading: 270,
          stage: 'PUSHBACK',
        },
      };
    }

    // 6. Taxi Out to runway departure threshold
    if (flight.status === 'TAXI_OUT') {
      const isNorth = flight.assignedRunwayId.includes('09L');
      const holdShort = isNorth ? { x: 130, y: 160 } : { x: 140, y: 500 };
      const step = Math.max(0.8, 18 * 0.06 * deltaMinutes * pixelSpeedScale);
      const res = stepTowards(flight.position, holdShort, step);
      const heading = calculateHeading(flight.position, holdShort);

      if (res.arrived) {
        return {
          ...flight,
          status: 'DEPARTED',
          position: {
            ...flight.position,
            x: holdShort.x,
            y: isNorth ? 130 : 530,
            speed: 140,
            heading: 90,
            altitude: 100,
            stage: 'RUNWAY',
          },
        };
      }

      return {
        ...flight,
        position: {
          ...flight.position,
          x: res.x,
          y: res.y,
          speed: 18,
          heading,
          stage: 'TAXIWAY',
        },
      };
    }

    // 7. Departed climbing out
    if (flight.status === 'DEPARTED') {
      const step = 45 * deltaMinutes * pixelSpeedScale;
      const newX = flight.position.x + step;
      const newAlt = flight.position.altitude + 600 * deltaMinutes;

      return {
        ...flight,
        position: {
          ...flight.position,
          x: newX,
          altitude: newAlt,
          speed: Math.min(320, flight.position.speed + 20 * deltaMinutes),
          stage: 'AIR',
        },
      };
    }

    // 8. En route inbound
    if (flight.status === 'EN_ROUTE') {
      const step = 35 * deltaMinutes * pixelSpeedScale;
      const newX = flight.position.x + step;
      const newAlt = Math.max(3000, flight.position.altitude - 300 * deltaMinutes);

      let nextStatus: Flight['status'] = flight.status;
      if (newX > -90) {
        nextStatus = 'ON_APPROACH';
      }

      return {
        ...flight,
        status: nextStatus,
        position: {
          ...flight.position,
          x: newX,
          altitude: newAlt,
          heading: 90,
          stage: 'AIR',
        },
      };
    }

    return flight;
  });
}

/**
 * Advances ground service vehicles
 */
export function advanceVehicleMovement(
  vehicles: GroundVehicle[],
  deltaMinutes: number,
  gates: Gate[]
): GroundVehicle[] {
  return vehicles.map((veh) => {
    if (veh.status === 'DISPATCHED' && veh.assignedGateId) {
      const targetGate = gates.find((g) => g.id === veh.assignedGateId);
      if (!targetGate) return veh;

      const targetCoords = targetGate.pushbackCoords;
      const step = Math.max(0.5, veh.speed * 0.08 * deltaMinutes);
      const res = stepTowards(veh.position, targetCoords, step);
      const heading = calculateHeading(veh.position, targetCoords);

      if (res.arrived) {
        return {
          ...veh,
          status: 'SERVICING',
          position: { ...targetCoords, heading: targetGate.coordinates.angle },
          speed: 0,
        };
      }

      return {
        ...veh,
        position: { x: res.x, y: res.y, heading },
      };
    }

    if (veh.status === 'SERVICING') {
      // Vehicle slow battery/fuel consumption while servicing
      return {
        ...veh,
        batteryFuelPercent: Math.max(10, +(veh.batteryFuelPercent - 0.05 * deltaMinutes).toFixed(1)),
      };
    }

    return veh;
  });
}
