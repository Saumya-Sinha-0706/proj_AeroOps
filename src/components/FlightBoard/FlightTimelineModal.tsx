import React from 'react';
import { Flight } from '../../types';
import { formatSimTime } from '../../engine/rules';
import {
  X,
  Clock,
  Plane,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  MapPin,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface Props {
  flight: Flight;
  onClose: () => void;
  onReassignGate: (flightId: string) => void;
}

export const FlightTimelineModal: React.FC<Props> = ({ flight, onClose, onReassignGate }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-2xl bg-[#0d141d] border border-[#22364c] rounded-xl shadow-2xl overflow-hidden font-mono-data text-xs flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#101924] border-b border-[#1f3044] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="w-3.5 h-3.5 rounded-full ring-2 ring-white/20"
              style={{ backgroundColor: flight.airline.color }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-wide">
                  {flight.flightNumber}
                </span>
                <span className="text-[11px] text-[#8fa7be]">
                  ({flight.callsign})
                </span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-bold">
                  ICAO CODE {flight.category}
                </span>
                {flight.delayMinutes > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
                    +{flight.delayMinutes}M DELAY
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[#637d96]">
                {flight.airline.name} • {flight.aircraftType} • {flight.passengers} PAX
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#1a293a] text-[#718da8] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex flex-col gap-5">
          {/* Origin & Destination Hero Ribbon */}
          <div className="bg-[#121c27] border border-[#213448] p-3.5 rounded-lg flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-[#5e778f] uppercase">ORIGIN</span>
              <span className="text-base font-bold text-white tracking-wider">{flight.origin}</span>
              <span className="text-[10px] text-[#7c95ad]">
                {flight.isArrival ? 'Inbound Airport' : 'KDEN Local Hub'}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2 text-cyan-400">
                <div className="w-8 h-px bg-cyan-500/50" />
                <Plane className="w-4 h-4 transform rotate-90" />
                <div className="w-8 h-px bg-cyan-500/50" />
              </div>
              <span className="text-[10px] font-bold text-emerald-400">{flight.status}</span>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] text-[#5e778f] uppercase">DESTINATION</span>
              <span className="text-base font-bold text-white tracking-wider">{flight.destination}</span>
              <span className="text-[10px] text-[#7c95ad]">
                {flight.isArrival ? 'KDEN Local Hub' : 'Outbound Terminal'}
              </span>
            </div>
          </div>

          {/* Operational Milestones Vertical Chain */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#b4cbdf] uppercase flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                FULL OPERATIONAL MILESTONE TIMELINE
              </span>
              <span className="text-[10px] text-[#637d96]">AUDITED IN REAL-TIME</span>
            </div>

            <div className="relative pl-6 border-l-2 border-[#1c2c3e] space-y-3.5 py-1">
              {flight.milestones.map((m, idx) => {
                const isDelayed = (m.varianceMin || 0) > 0;
                return (
                  <div key={m.id} className="relative">
                    {/* Circle Node */}
                    <div
                      className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        m.completed
                          ? 'bg-emerald-500 border-[#0d141d]'
                          : isDelayed
                          ? 'bg-amber-500 border-[#0d141d]'
                          : 'bg-[#152332] border-[#384f68]'
                      }`}
                    />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            m.completed ? 'text-white' : 'text-[#8da5bc]'
                          }`}
                        >
                          {m.name}
                        </span>
                        {m.completed && (
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1 rounded border border-emerald-900/60">
                            COMPLETED
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[#59738c] text-[10px] mr-1">TARGET</span>
                          <span className="font-mono-data text-[#b9cfe4]">
                            {formatSimTime(m.targetTime)}
                          </span>
                        </div>
                        {isDelayed && (
                          <span className="text-amber-400 font-bold text-[10px] bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-800">
                            +{m.varianceMin}M
                          </span>
                        )}
                      </div>
                    </div>

                    {m.note && (
                      <div className="text-[10px] text-amber-300/80 mt-0.5 ml-0.5">
                        ↳ {m.note}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Traceable Delay Causal Tree */}
          {flight.delayHistory.length > 0 && (
            <div className="bg-amber-950/20 border border-amber-700/40 p-3 rounded-lg">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 mb-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                DISRUPTION CAUSAL AUDIT LOG
              </span>
              <div className="space-y-1.5">
                {flight.delayHistory.map((rec, i) => (
                  <div
                    key={i}
                    className="p-2 rounded bg-[#0e1620] border border-amber-900/50 text-[11px] flex items-start justify-between"
                  >
                    <div>
                      <span className="font-bold text-amber-400">[{rec.code}] </span>
                      <span className="text-[#e2ecf7]">{rec.message}</span>
                      <div className="text-[9.5px] text-[#718ca4] mt-0.5">
                        Root Event: {rec.source} • Time: {formatSimTime(rec.timestamp)}
                      </div>
                    </div>
                    <span className="font-bold text-amber-400 shrink-0 ml-2">
                      +{rec.minutesAdded} MIN
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gate & Runway Assignment Details */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#1e2f42]">
            <div className="bg-[#121c27] p-2.5 rounded border border-[#1e3044]">
              <span className="text-[10px] text-[#5e778f] uppercase block">ASSIGNED GATE</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-sm font-bold text-cyan-300">GATE {flight.assignedGateId}</span>
                <span className="text-[10px] text-[#7c95ad]">
                  Occupancy: {formatSimTime(flight.gateOccupancyStart)} - {formatSimTime(flight.gateOccupancyEnd)}
                </span>
              </div>
              {flight.manualGateOverride && (
                <div className="text-[9.5px] text-amber-400 mt-1 font-semibold">
                  ⚠️ Duty Manager Manual Override Logged
                </div>
              )}
            </div>

            <div className="bg-[#121c27] p-2.5 rounded border border-[#1e3044]">
              <span className="text-[10px] text-[#5e778f] uppercase block">ASSIGNED RUNWAY</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-sm font-bold text-emerald-400">{flight.assignedRunwayId}</span>
                <span className="text-[10px] text-[#7c95ad]">
                  Est: {formatSimTime(flight.estimatedTime)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3 bg-[#101924] border-t border-[#1f3044] flex items-center justify-between">
          <button
            onClick={() => onReassignGate(flight.id)}
            className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 rounded font-semibold text-xs flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            Open in Gate Gantt
          </button>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-[#1a293a] hover:bg-[#23384f] text-[#c9dbe9] rounded text-xs"
          >
            Dismiss Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
