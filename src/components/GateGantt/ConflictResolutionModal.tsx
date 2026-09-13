import React, { useState } from 'react';
import { useOpsStore } from '../../store/useOpsStore';
import { formatSimTime } from '../../engine/rules';
import {
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  CornerDownRight,
  Check,
} from 'lucide-react';

export const ConflictResolutionModal: React.FC = () => {
  const { conflictPrompt, closeConflictPrompt, confirmGateAssignment, flights, gates } = useOpsStore();
  const [overrideJustification, setOverrideJustification] = useState<string>('');
  const [showOverrideInput, setShowOverrideInput] = useState<boolean>(false);

  if (!conflictPrompt) return null;

  const { flightId, candidateGateId, targetStart, targetEnd, result } = conflictPrompt;
  const flight = flights.find((f) => f.id === flightId);
  const targetGate = gates.find((g) => g.id === candidateGateId);

  if (!flight || !targetGate) return null;

  const handleAutoAssign = (suggestedGateId: string) => {
    confirmGateAssignment(flightId, suggestedGateId);
  };

  const handleManualOverride = () => {
    if (!overrideJustification.trim()) {
      alert('Please enter an operational justification for the manual gate override.');
      return;
    }
    confirmGateAssignment(flightId, candidateGateId, true, overrideJustification);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-xl bg-[#0e1622] border-2 border-amber-600/70 rounded-xl shadow-2xl overflow-hidden font-mono-data text-xs flex flex-col">
        {/* Header with Hazard Border */}
        <div className="px-5 py-3.5 bg-amber-950/40 border-b border-amber-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <span>GATE CONFLICT DETECTED</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px]">
                  {result.conflictType?.replace(/_/g, ' ')}
                </span>
              </div>
              <span className="text-[10px] text-amber-200/80">
                ICAO Ground Operations Rule Enforced
              </span>
            </div>
          </div>
          <button
            onClick={closeConflictPrompt}
            className="p-1 rounded hover:bg-[#1f2d3d] text-[#718da8] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Flight & Gate Comparison Box */}
          <div className="grid grid-cols-2 gap-3 bg-[#131d2a] p-3 rounded-lg border border-[#22354a]">
            <div>
              <span className="text-[10px] text-[#5e778f] uppercase block">AIRCRAFT</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-sm font-bold text-white">{flight.flightNumber}</span>
                <span className="text-cyan-300 font-bold">[{flight.category}]</span>
              </div>
              <div className="text-[10px] text-[#7c95ad] mt-0.5 truncate">
                {flight.aircraftType}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-[#5e778f] uppercase block">CANDIDATE GATE</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-sm font-bold text-amber-400">GATE {candidateGateId}</span>
                <span className="text-amber-300 font-bold">[MAX {targetGate.maxCategory}]</span>
              </div>
              <div className="text-[10px] text-[#7c95ad] mt-0.5">
                Slot: {formatSimTime(targetStart)} - {formatSimTime(targetEnd)}
              </div>
            </div>
          </div>

          {/* Conflict Explanation Alert */}
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-200 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-red-300 block">VIOLATION DETAILS:</span>
              <p className="text-[11px] text-red-200 mt-0.5">{result.message}</p>
            </div>
          </div>

          {/* Smart Resolution Suggestions */}
          {result.suggestedGateIds.length > 0 && (
            <div>
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                SMART RESOLUTION: RECOMMENDED COMPATIBLE GATES
              </span>
              <div className="grid grid-cols-2 gap-2">
                {result.suggestedGateIds.map((altGateId) => {
                  const altGate = gates.find((g) => g.id === altGateId);
                  return (
                    <button
                      key={altGateId}
                      onClick={() => handleAutoAssign(altGateId)}
                      className="p-2.5 rounded-lg bg-[#142231] hover:bg-[#1b2f44] border border-cyan-500/40 hover:border-cyan-400 text-left transition-all flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-bold text-cyan-300 text-xs group-hover:text-white flex items-center gap-1.5">
                          <span>ASSIGN GATE {altGateId}</span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                            CODE {altGate?.maxCategory}
                          </span>
                        </div>
                        <div className="text-[9.5px] text-[#7895b0] mt-0.5">
                          {altGate?.concourse} • 0 Conflicts
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Manual Duty Manager Override Option */}
          <div className="border-t border-[#1b2838] pt-3">
            {!showOverrideInput ? (
              <button
                onClick={() => setShowOverrideInput(true)}
                className="text-[11px] text-[#7e9bb6] hover:text-amber-300 flex items-center gap-1 underline underline-offset-2"
              >
                <span>Require Duty Manager Manual Override with logged justification...</span>
              </button>
            ) : (
              <div className="bg-[#101824] p-3 rounded-lg border border-amber-900/60 flex flex-col gap-2">
                <label className="text-[10px] text-amber-300 font-bold uppercase block">
                  DUTY MANAGER SIGNED JUSTIFICATION (AUDIT COMPLIANCE)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Authorized by Ops Lead: towing to remote stand within 10 min"
                  value={overrideJustification}
                  onChange={(e) => setOverrideJustification(e.target.value)}
                  className="bg-[#0b1017] text-white px-2.5 py-1.5 rounded border border-[#2a3d52] focus:outline-none focus:border-amber-500 text-xs font-mono-data"
                />
                <div className="flex items-center justify-end gap-2 mt-1">
                  <button
                    onClick={() => setShowOverrideInput(false)}
                    className="px-2.5 py-1 text-[#728ba3] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleManualOverride}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded"
                  >
                    Confirm Signed Override
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#0a1018] border-t border-[#1b2838] flex items-center justify-between">
          <span className="text-[10px] text-[#556e85]">
            Ref: ICAO Doc 9157 Part 2 & IATA AHM 780
          </span>
          <button
            onClick={closeConflictPrompt}
            className="px-3 py-1.5 rounded bg-[#182535] hover:bg-[#203144] text-[#a4bbcf]"
          >
            Cancel Reassignment
          </button>
        </div>
      </div>
    </div>
  );
};
