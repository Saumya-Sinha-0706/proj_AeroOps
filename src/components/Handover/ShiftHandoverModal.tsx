import React, { useState } from 'react';
import { useOpsStore } from '../../store/useOpsStore';
import { formatSimTime } from '../../engine/rules';
import {
  FileText,
  Copy,
  Check,
  X,
  Printer,
  ShieldAlert,
  AlertTriangle,
  Plane,
  Clock,
  Layers,
} from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const ShiftHandoverModal: React.FC<Props> = ({ onClose }) => {
  const {
    simTime,
    runways,
    gates,
    flights,
    weather,
    groundStop,
    activeScenarioName,
    alerts,
    metrics,
  } = useOpsStore();

  const [managerNotes, setManagerNotes] = useState<string>(
    'Morning peak handled smoothly. Ground operations prioritized heavy wide-body arrivals at Concourse A. Monitor gusting crosswinds on 18/36 heading into the afternoon bank.'
  );
  const [copied, setCopied] = useState<boolean>(false);

  const openRunways = runways.filter((r) => r.status === 'ACTIVE');
  const closedRunways = runways.filter((r) => r.status === 'CLOSED');
  const outOfServiceGates = gates.filter((g) => g.status === 'OUT_OF_SERVICE');
  const delayedFlights = flights.filter((f) => f.delayMinutes > 0);

  // Generate plain-text / Markdown report
  const generateMarkdownReport = () => {
    return `===============================================================
AERODECK AIRPORT OPERATIONS CONTROL CENTER (AOCC)
DUTY MANAGER SHIFT HANDOVER BRIEFING
Generated at Sim Time: ${formatSimTime(simTime)} UTC
Active Operational Baseline: ${activeScenarioName}
===============================================================

1. AIRFIELD & RUNWAY STATUS
- Active Runways (${openRunways.length}): ${openRunways.map((r) => r.name).join(', ') || 'NONE'}
- Closed Runways (${closedRunways.length}): ${
      closedRunways.map((r) => `${r.name} [Reason: ${r.closureReason || 'NOTAM'}]`).join(', ') || 'NONE'
    }
- Ground Stop Status: ${groundStop ? 'ACTIVE (FAA AIRPORT FREEZE)' : 'INACTIVE (NORMAL FLOW)'}

2. METEOROLOGICAL CONDITONS
- Condition: ${weather.condition}
- METAR: ${weather.metarRaw}
- Winds: ${weather.windDirectionDeg}° at ${weather.windSpeedKnots} KT (Crosswind: ${weather.crosswindComponent} KT)
- Visibility: ${weather.visibilitySm} SM | Acceptance Rate Penalty: -${weather.aarReductionPercent}%

3. TRAFFIC & KEY PERFORMANCE METRICS
- On-Time Performance (OTP): ${metrics.onTimePercentage}%
- Average Departure/Arrival Delay: +${metrics.averageDelayMinutes} Minutes
- Gate Utilization: ${metrics.gateUtilizationPercent}% (${gates.filter((g) => g.status === 'OCCUPIED').length}/${gates.length} stands active)
- Airfield Throughput: ${metrics.movementsPerHour} Ops/Hour
- Total Movements Today: ${metrics.totalMovementsToday} Movements

4. GATE & APRON OUTAGES (${outOfServiceGates.length})
${
  outOfServiceGates.length === 0
    ? '- All gate parking stands fully operational.'
    : outOfServiceGates.map((g) => `- Gate ${g.id} (${g.concourse}): ${g.outOfServiceReason || 'Out of service'}`).join('\n')
}

5. DELAYED FLIGHTS AUDIT SUMMARY (${delayedFlights.length})
${
  delayedFlights.length === 0
    ? '- All flights operating on schedule.'
    : delayedFlights
        .slice(0, 8)
        .map(
          (f) =>
            `- ${f.flightNumber} (${f.origin} -> ${f.destination}): +${f.delayMinutes}m delay [Gate ${f.assignedGateId}]`
        )
        .join('\n')
}

6. OUTGOING DUTY MANAGER LOG & HANDOVER DIRECTIVE
"${managerNotes}"

===============================================================
Authorized: Lead Airfield Operations Supervisor
AeroDeck Mission-Critical Systems (v2.4)
===============================================================`;
  };

  const handleCopy = () => {
    const report = generateMarkdownReport();
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-3xl bg-[#0d141e] border border-[#21354c] rounded-xl shadow-2xl overflow-hidden font-mono-data text-xs flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#101925] border-b border-[#1d2d3e] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-base font-bold text-white tracking-wide">
                DUTY MANAGER SHIFT HANDOVER BRIEFING
              </span>
              <span className="text-[10px] text-[#7693ad] block">
                Official Operational Status Report • Sim Time: {formatSimTime(simTime)} UTC
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 font-semibold flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied to Clipboard!' : 'Copy Markdown'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[#1c2c3d] text-[#6d8aa4] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Key Metrics Quick Dashboard */}
          <div className="grid grid-cols-4 gap-3 bg-[#121c27] p-3 rounded-lg border border-[#203347]">
            <div>
              <span className="text-[10px] text-[#5e778f] uppercase block">ON-TIME (OTP)</span>
              <span
                className={`text-base font-bold ${
                  metrics.onTimePercentage >= 80 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {metrics.onTimePercentage}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#5e778f] uppercase block">AVG DELAY</span>
              <span className="text-base font-bold text-amber-400">
                +{metrics.averageDelayMinutes} MIN
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#5e778f] uppercase block">GATE OCCUPANCY</span>
              <span className="text-base font-bold text-cyan-300">
                {metrics.gateUtilizationPercent}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#5e778f] uppercase block">ACTIVE RUNWAYS</span>
              <span className="text-base font-bold text-white">
                {openRunways.length} / {runways.length}
              </span>
            </div>
          </div>

          {/* Airfield Status Section */}
          <div className="bg-[#111924] p-3.5 rounded-lg border border-[#1d2d3e] space-y-2">
            <span className="font-bold text-white text-xs flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              1. AIRFIELD & RUNWAYS
            </span>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-[#647f99] block text-[10px]">ACTIVE RUNWAYS</span>
                <span className="text-emerald-400 font-bold">
                  {openRunways.map((r) => r.name).join(', ') || 'NONE'}
                </span>
              </div>
              <div>
                <span className="text-[#647f99] block text-[10px]">NOTAM CLOSURES</span>
                <span className={closedRunways.length > 0 ? 'text-red-400 font-bold' : 'text-[#7d97b0]'}>
                  {closedRunways.length > 0
                    ? closedRunways.map((r) => `${r.name} (${r.closureReason || 'Closed'})`).join(', ')
                    : 'None (Full Operational Capacity)'}
                </span>
              </div>
            </div>
          </div>

          {/* Meteorological Section */}
          <div className="bg-[#111924] p-3.5 rounded-lg border border-[#1d2d3e] space-y-2">
            <span className="font-bold text-white text-xs flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" />
              2. CURRENT METEOROLOGY & CAPACITY
            </span>
            <div className="bg-[#0b1017] p-2 rounded border border-[#1b2a3a] text-[11px] text-cyan-300 font-mono">
              {weather.metarRaw}
            </div>
            <div className="text-[10px] text-[#718da8]">
              Winds: {weather.windDirectionDeg}° at {weather.windSpeedKnots} KT • Visibility:{' '}
              {weather.visibilitySm} SM • AAR Capacity Penalty: -{weather.aarReductionPercent}%
            </div>
          </div>

          {/* Active Gate & Ramp Issues */}
          <div className="bg-[#111924] p-3.5 rounded-lg border border-[#1d2d3e] space-y-2">
            <span className="font-bold text-white text-xs flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              3. APRON STANDS & GATE OUTAGES ({outOfServiceGates.length})
            </span>
            {outOfServiceGates.length === 0 ? (
              <span className="text-[#718da8] text-[11px]">All parking stands are operational.</span>
            ) : (
              <div className="space-y-1">
                {outOfServiceGates.map((g) => (
                  <div
                    key={g.id}
                    className="p-1.5 rounded bg-red-950/30 border border-red-900/50 text-[11px] text-red-300 flex items-center justify-between"
                  >
                    <span className="font-bold">Gate {g.id} ({g.concourse})</span>
                    <span>{g.outOfServiceReason || 'Out of service'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing Duty Manager Notes Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-[#637d96] font-bold uppercase block">
              DUTY MANAGER DIRECTIVE & LOG NOTES (EDITABLE)
            </label>
            <textarea
              rows={3}
              value={managerNotes}
              onChange={(e) => setManagerNotes(e.target.value)}
              className="w-full bg-[#111924] text-white p-2.5 rounded-lg border border-[#20344a] focus:outline-none focus:border-cyan-500 text-xs font-mono-data resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#101925] border-t border-[#1d2d3e] flex items-center justify-between">
          <span className="text-[10px] text-[#55718a]">
            Standard Handover Procedure Compliant with ICAO Doc 9971
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1b2c3e] hover:bg-[#253c55] text-white rounded text-xs"
          >
            Close Handover Dialog
          </button>
        </div>
      </div>
    </div>
  );
};
