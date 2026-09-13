import React, { useState } from 'react';
import { useOpsStore } from '../../store/useOpsStore';
import { formatSimTime } from '../../engine/rules';
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCircle2,
  X,
  CheckCheck,
  Filter,
} from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const AlertsDrawer: React.FC<Props> = ({ onClose }) => {
  const { alerts, acknowledgeAlert, acknowledgeAllAlerts } = useOpsStore();
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');

  const filteredAlerts = alerts.filter((a) => {
    if (levelFilter === 'ALL') return true;
    return a.level === levelFilter;
  });

  const unreadCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0d141e] border-l border-[#203247] shadow-2xl flex flex-col font-mono-data text-xs select-none">
      {/* Drawer Header */}
      <div className="px-4 py-3.5 bg-[#101925] border-b border-[#1d2d3e] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-white text-sm">OPERATIONAL ALERTS & LOGS</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-800 text-[10px] font-bold">
              {unreadCount} NEW
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[#1a2839] text-[#718da8] hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Toolbar & Filter */}
      <div className="p-3 bg-[#0e1622] border-b border-[#1a293c] flex items-center justify-between">
        <div className="flex items-center gap-1 bg-[#131e2b] p-0.5 rounded border border-[#223347]">
          {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`px-2 py-0.5 text-[10px] rounded transition-all ${
                levelFilter === lvl
                  ? 'bg-cyan-500 text-[#080d13] font-bold'
                  : 'text-[#7d97b0] hover:text-white'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={acknowledgeAllAlerts}
            className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Ack All
          </button>
        )}
      </div>

      {/* Alerts Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y-0">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-[#55718a]">
            No operational alerts matching filter.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = alert.level === 'CRITICAL';
            const isWarning = alert.level === 'WARNING';

            return (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border transition-all ${
                  alert.acknowledged
                    ? 'bg-[#101722] border-[#1a2738] opacity-75'
                    : isCritical
                    ? 'bg-red-950/40 border-red-700/70 shadow-lg shadow-red-950/20'
                    : isWarning
                    ? 'bg-amber-950/40 border-amber-600/70'
                    : 'bg-[#121c28] border-cyan-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {isCritical ? (
                      <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{alert.title}</span>
                        <span
                          className={`text-[9px] px-1 rounded font-bold ${
                            isCritical
                              ? 'bg-red-900 text-red-200'
                              : isWarning
                              ? 'bg-amber-900 text-amber-200'
                              : 'bg-cyan-900 text-cyan-200'
                          }`}
                        >
                          {alert.level}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#bed4e7] mt-1 leading-relaxed">
                        {alert.description}
                      </p>
                      <div className="text-[9.5px] text-[#65829d] mt-1.5 flex items-center gap-2">
                        <span>Category: {alert.category}</span>
                        <span>•</span>
                        <span>{formatSimTime(alert.timestamp)} UTC</span>
                      </div>
                    </div>
                  </div>

                  {!alert.acknowledged && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="px-2 py-1 bg-[#172535] hover:bg-[#20344a] text-cyan-300 rounded text-[10px] font-semibold border border-[#23384e] shrink-0"
                    >
                      Ack
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
