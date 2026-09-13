import React, { useState, useMemo } from 'react';
import { useOpsStore } from '../../store/useOpsStore';
import { Flight, Gate } from '../../types';
import { formatSimTime, validateGateAssignment } from '../../engine/rules';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import {
  Clock,
  Layers,
  AlertTriangle,
  Move,
  CheckCircle2,
  Filter,
  ZoomIn,
  ZoomOut,
  Info,
  Plane,
} from 'lucide-react';

export const GateGantt: React.FC = () => {
  const {
    gates,
    flights,
    simTime,
    requestGateAssignment,
    selectFlight,
    selectedFlightId,
    conflictPrompt,
  } = useOpsStore();

  const [concourseFilter, setConcourseFilter] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
  const [draggedFlightId, setDraggedFlightId] = useState<string | null>(null);
  const [dragOverGateId, setDragOverGateId] = useState<string | null>(null);

  // Time window parameters (e.g. 4 hours span)
  const windowDurationMin = 240; // 4 hours
  const timelineStartMin = simTime - 45; // Starts 45m before current sim time
  const timelineEndMin = timelineStartMin + windowDurationMin;

  // Filter gates
  const filteredGates = useMemo(() => {
    return gates.filter((g) => {
      if (concourseFilter === 'ALL') return true;
      return g.concourse === concourseFilter;
    });
  }, [gates, concourseFilter]);

  // Convert sim minute to percentage along timeline
  const getPercentFromTime = (time: number) => {
    const p = ((time - timelineStartMin) / windowDurationMin) * 100;
    return Math.max(0, Math.min(100, p));
  };

  // Drag and Drop Event Handlers
  const handleDragStart = (e: React.DragEvent, flightId: string) => {
    e.dataTransfer.setData('text/plain', flightId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedFlightId(flightId);
  };

  const handleDragOver = (e: React.DragEvent, gateId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverGateId(gateId);
  };

  const handleDragLeave = () => {
    setDragOverGateId(null);
  };

  const handleDrop = (e: React.DragEvent, targetGateId: string) => {
    e.preventDefault();
    const flightId = e.dataTransfer.getData('text/plain') || draggedFlightId;
    setDraggedFlightId(null);
    setDragOverGateId(null);

    if (!flightId) return;

    const flight = flights.find((f) => f.id === flightId);
    if (!flight) return;

    // Trigger instant validation and resolution prompt if conflict
    requestGateAssignment(flightId, targetGateId, flight.gateOccupancyStart, flight.gateOccupancyEnd);
  };

  // Helper time markers (e.g. every 30 minutes)
  const timeMarkers = useMemo(() => {
    const markers: number[] = [];
    const firstMark = Math.ceil(timelineStartMin / 30) * 30;
    for (let t = firstMark; t <= timelineEndMin; t += 30) {
      markers.push(t);
    }
    return markers;
  }, [timelineStartMin, timelineEndMin]);

  return (
    <div className="flex-1 flex flex-col bg-[#090e15] select-none overflow-hidden font-mono-data text-xs">
      {/* Top Toolbar */}
      <div className="p-3 bg-[#0e1520] border-b border-[#1b2838] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-white font-bold tracking-wide">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>GATE TIMELINE GANTT & CONFLICT ENGINE</span>
          </div>

          <div className="flex items-center bg-[#131e2b] p-0.5 rounded-lg border border-[#22354a]">
            {(['ALL', 'A', 'B', 'C'] as const).map((conc) => (
              <button
                key={conc}
                onClick={() => setConcourseFilter(conc)}
                className={`px-2.5 py-1 text-[11px] rounded transition-all ${
                  concourseFilter === conc
                    ? 'bg-cyan-500 text-[#080d13] font-bold shadow'
                    : 'text-[#859cb2] hover:text-white'
                }`}
              >
                {conc === 'ALL' ? 'ALL CONCOURSES' : `CONCOURSE ${conc}`}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="hidden md:flex items-center gap-4 text-[11px] text-[#718da6]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-cyan-400" />
            <span>Occupied / Assigned</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-purple-400" />
            <span>Code E Wide-body</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-400" />
            <span>Conflict / Buffer Violation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-red-600" />
            <span>Gate Out of Service</span>
          </div>
        </div>
      </div>

      {/* Main Gantt Area */}
      <div className="flex-1 overflow-auto flex flex-col relative">
        {/* Timeline Header Time Axis */}
        <div className="sticky top-0 z-20 bg-[#0b121b] border-b border-[#1b2838] h-8 flex">
          {/* Left Gates Column Header */}
          <div className="w-44 shrink-0 px-3 py-2 border-r border-[#1b2838] font-bold text-[#627d96] text-[10px] uppercase">
            GATE [ICAO CODE]
          </div>

          {/* Time Axis Markers */}
          <div className="flex-1 relative h-full">
            {timeMarkers.map((time) => {
              const left = getPercentFromTime(time);
              return (
                <div
                  key={time}
                  className="absolute top-0 bottom-0 border-l border-[#192736] flex flex-col justify-center pl-1 text-[10px] text-[#5e778f]"
                  style={{ left: `${left}%` }}
                >
                  {formatSimTime(time)}
                </div>
              );
            })}

            {/* Current Sim Time Indicator (Vertical Red Needle) */}
            <div
              className="absolute top-0 bottom-0 z-30 pointer-events-none"
              style={{ left: `${getPercentFromTime(simTime)}%` }}
            >
              <div className="w-0.5 h-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <div className="absolute top-0 -left-6 bg-red-600 text-white font-bold text-[9px] px-1 py-0.2 rounded shadow">
                {formatSimTime(simTime)}
              </div>
            </div>
          </div>
        </div>

        {/* Gate Rows */}
        <div className="divide-y divide-[#131d2a]">
          {filteredGates.map((gate) => {
            const isOutOfService = gate.status === 'OUT_OF_SERVICE';
            const isDragTarget = dragOverGateId === gate.id;

            // Flights assigned to this gate
            const gateFlights = flights.filter(
              (f) =>
                f.assignedGateId === gate.id &&
                f.status !== 'CANCELLED' &&
                f.status !== 'DIVERTED' &&
                f.gateOccupancyEnd >= timelineStartMin &&
                f.gateOccupancyStart <= timelineEndMin
            );

            return (
              <div
                key={gate.id}
                onDragOver={(e) => handleDragOver(e, gate.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, gate.id)}
                className={`flex h-12 transition-colors relative ${
                  isDragTarget
                    ? 'bg-cyan-950/40 ring-1 ring-cyan-400'
                    : isOutOfService
                    ? 'bg-red-950/20'
                    : 'hover:bg-[#0c141e]'
                }`}
              >
                {/* Left Gate Info Column */}
                <div className="w-44 shrink-0 px-3 py-1.5 border-r border-[#1b2838] flex items-center justify-between bg-[#0b121b]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">GATE {gate.id}</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                        gate.maxCategory === 'E'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-[#152332] text-[#708aa3] border border-[#233547]'
                      }`}
                    >
                      CODE {gate.maxCategory}
                    </span>
                  </div>

                  {isOutOfService ? (
                    <span className="text-[9px] px-1 rounded bg-red-900 text-red-200 font-bold">
                      OOS
                    </span>
                  ) : (
                    <span className="text-[9px] text-[#5e778f]">{gate.terminal}</span>
                  )}
                </div>

                {/* Right Timeline Canvas Track */}
                <div className="flex-1 relative h-full">
                  {/* Grid lines */}
                  {timeMarkers.map((time) => (
                    <div
                      key={time}
                      className="absolute top-0 bottom-0 border-l border-[#131f2c] pointer-events-none"
                      style={{ left: `${getPercentFromTime(time)}%` }}
                    />
                  ))}

                  {/* Out of Service Background Stripes */}
                  {isOutOfService && (
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,#3f0a0a,#3f0a0a_10px,#280707_10px,#280707_20px)] opacity-60 flex items-center justify-center">
                      <span className="text-[10px] text-red-300 font-bold bg-red-950/80 px-2 py-0.5 rounded border border-red-700/60">
                        {gate.outOfServiceReason || 'GATE OUT OF SERVICE'}
                      </span>
                    </div>
                  )}

                  {/* Current Sim Time Needle Line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500/50 pointer-events-none z-10"
                    style={{ left: `${getPercentFromTime(simTime)}%` }}
                  />

                  {/* Render Flights in this Gate Slot */}
                  {gateFlights.map((flight) => {
                    const startPercent = getPercentFromTime(flight.gateOccupancyStart);
                    const endPercent = getPercentFromTime(flight.gateOccupancyEnd);
                    const widthPercent = Math.max(4, endPercent - startPercent);

                    const isSelected = selectedFlightId === flight.id;
                    const isBeingDragged = draggedFlightId === flight.id;

                    // Evaluate conflict for this block
                    const check = validateGateAssignment(
                      flight,
                      gate.id,
                      flight.gateOccupancyStart,
                      flight.gateOccupancyEnd,
                      gates,
                      flights
                    );

                    const hasConflict = check.hasConflict;

                    return (
                      <div
                        key={flight.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, flight.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectFlight(isSelected ? null : flight.id);
                        }}
                        style={{
                          left: `${startPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                        className={`absolute top-1.5 bottom-1.5 rounded border cursor-grab active:cursor-grabbing p-1 flex items-center justify-between text-left overflow-hidden transition-all shadow-md group ${
                          hasConflict
                            ? 'bg-amber-950/80 border-amber-500 text-amber-200 animate-pulse'
                            : isSelected
                            ? 'bg-cyan-900 border-cyan-400 text-white ring-1 ring-cyan-300'
                            : flight.category === 'E'
                            ? 'bg-[#231536] border-purple-600/70 text-purple-200 hover:border-purple-400'
                            : 'bg-[#122334] border-cyan-700/60 text-[#d0e3f5] hover:border-cyan-400'
                        } ${isBeingDragged ? 'opacity-40 scale-95' : 'opacity-100'}`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: flight.airline.color }}
                          />
                          <div className="truncate">
                            <span className="font-bold text-[11px] block leading-tight">
                              {flight.flightNumber}
                            </span>
                            <span className="text-[9px] text-[#86a2be] block leading-tight truncate">
                              {flight.origin.replace(/\s*\(.*?\)\s*/g, '')} →{' '}
                              {flight.destination.replace(/\s*\(.*?\)\s*/g, '')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          <span className="text-[8.5px] px-1 py-0.2 rounded bg-black/40 font-bold">
                            [{flight.category}]
                          </span>
                          {hasConflict && (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conflict Resolution Prompt Modal */}
      {conflictPrompt && <ConflictResolutionModal />}
    </div>
  );
};
