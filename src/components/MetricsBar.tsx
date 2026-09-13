import React from 'react';
import { useOpsStore } from '../store/useOpsStore';
import { Plane, Clock, Gauge, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export const MetricsBar: React.FC = () => {
  const { metrics, weather, groundStop, activeScenarioName, alerts, setAlertsDrawerOpen } = useOpsStore();

  const unackAlerts = alerts.filter((a) => !a.acknowledged);

  return (
    <div className="bg-[#0b1017] border-b border-[#1b2735] px-4 py-2 flex items-center justify-between text-xs font-mono-data select-none overflow-x-auto shrink-0 gap-4">
      {/* Telemetry Strip */}
      <div className="flex items-center gap-5">
        {/* On Time Performance */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-[10px] text-[#5e778f] uppercase">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>ON-TIME (OTP)</span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                className={`text-sm font-bold ${
                  metrics.onTimePercentage >= 85
                    ? 'text-emerald-400'
                    : metrics.onTimePercentage >= 70
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {metrics.onTimePercentage}%
              </span>
              <div className="w-16 h-1.5 bg-[#141e2b] rounded-full overflow-hidden border border-[#213245]">
                <div
                  className={`h-full transition-all duration-500 ${
                    metrics.onTimePercentage >= 85
                      ? 'bg-emerald-500'
                      : metrics.onTimePercentage >= 70
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${metrics.onTimePercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-[#192636]" />

        {/* Average Delay */}
        <div className="flex flex-col">
          <span className="text-[10px] text-[#5e778f] uppercase flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            AVG DELAY
          </span>
          <span
            className={`text-sm font-bold mt-0.5 ${
              metrics.averageDelayMinutes <= 5
                ? 'text-emerald-400'
                : metrics.averageDelayMinutes <= 15
                ? 'text-amber-400'
                : 'text-red-400'
            }`}
          >
            +{metrics.averageDelayMinutes} MIN
          </span>
        </div>

        <div className="h-6 w-px bg-[#192636]" />

        {/* Airport Acceptance Rate / Throughput */}
        <div className="flex flex-col">
          <span className="text-[10px] text-[#5e778f] uppercase flex items-center gap-1">
            <Gauge className="w-3 h-3 text-cyan-400" />
            THROUGHPUT
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-bold text-cyan-300">{metrics.movementsPerHour}</span>
            <span className="text-[10px] text-[#637d96]">OPS/HR</span>
            {weather.aarReductionPercent > 0 && (
              <span className="text-[10px] text-red-400 font-semibold bg-red-950/60 px-1 rounded border border-red-900/50">
                CAP REDUCED
              </span>
            )}
          </div>
        </div>

        <div className="h-6 w-px bg-[#192636]" />

        {/* Gate Utilization */}
        <div className="flex flex-col">
          <span className="text-[10px] text-[#5e778f] uppercase flex items-center gap-1">
            <Plane className="w-3 h-3 text-[#7999b8]" />
            GATE OCCUPANCY
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-bold text-[#d4e4f5]">{metrics.gateUtilizationPercent}%</span>
            <span className="text-[10px] text-[#637d96]">APRONS ACTIVE</span>
          </div>
        </div>

        <div className="h-6 w-px bg-[#192636]" />

        {/* Total Movements Today */}
        <div className="hidden xl:flex flex-col">
          <span className="text-[10px] text-[#5e778f] uppercase">TOTAL MOVEMENTS</span>
          <span className="text-sm font-bold text-[#b0c8de] mt-0.5">{metrics.totalMovementsToday} FLIGHTS</span>
        </div>
      </div>

      {/* Right side status / active alert chip */}
      <div className="flex items-center gap-3">
        {unackAlerts.length > 0 && (
          <button
            onClick={() => setAlertsDrawerOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1 rounded bg-amber-950/40 border border-amber-500/50 text-amber-300 hover:bg-amber-950/70 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
            <span className="font-semibold">{unackAlerts.length} ACTIVE ALERTS</span>
          </button>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-[#718da6] bg-[#101720] px-2.5 py-1 rounded border border-[#1b2735]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-[#8ca8c4]">{activeScenarioName}</span>
        </div>
      </div>
    </div>
  );
};
