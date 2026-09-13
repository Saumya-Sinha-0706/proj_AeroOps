import React, { useState } from 'react';
import { useOpsStore } from '../../store/useOpsStore';
import { GroundVehicle } from '../../types';
import {
  Truck,
  BatteryCharging,
  Fuel,
  Send,
  CheckCircle2,
  AlertTriangle,
  Layers,
  MapPin,
} from 'lucide-react';

export const VehicleFleetView: React.FC = () => {
  const { vehicles, gates, flights, dispatchVehicle, selectVehicle, selectedVehicleId, setActiveView } =
    useOpsStore();

  const [filterType, setFilterType] = useState<string>('ALL');
  const [targetGateId, setTargetGateId] = useState<string>('A4');

  const filteredVehicles = vehicles.filter((v) => {
    if (filterType === 'ALL') return true;
    return v.type === filterType;
  });

  const handleDispatch = (vehicleId: string) => {
    dispatchVehicle(vehicleId, targetGateId);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#090e15] select-none overflow-hidden font-mono-data text-xs">
      {/* Top Filter Toolbar */}
      <div className="p-3.5 bg-[#0e151f] border-b border-[#1b2838] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-white font-bold tracking-wide">
            <Truck className="w-4 h-4 text-cyan-400" />
            <span>GROUND SUPPORT EQUIPMENT (GSE) APRON FLEET</span>
          </div>

          <div className="flex items-center bg-[#131e2b] p-0.5 rounded-lg border border-[#22354a]">
            {[
              { key: 'ALL', label: 'ALL FLEET' },
              { key: 'PUSHBACK_TRACTOR', label: 'PUSHBACK TRACTORS' },
              { key: 'FUEL_BOWSER', label: 'FUEL BOWSERS' },
              { key: 'BAGGAGE_TUG', label: 'BAGGAGE TUGS' },
              { key: 'FOLLOW_ME', label: 'FOLLOW-ME TRUCKS' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterType(tab.key)}
                className={`px-2.5 py-1 text-[11px] rounded transition-all ${
                  filterType === tab.key
                    ? 'bg-cyan-500 text-[#080d13] font-bold shadow'
                    : 'text-[#859cb2] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dispatch Target Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#637d96] uppercase">DISPATCH TARGET:</span>
          <select
            value={targetGateId}
            onChange={(e) => setTargetGateId(e.target.value)}
            className="bg-[#131e2b] text-cyan-300 px-2 py-1 rounded border border-[#22354a] font-bold text-xs cursor-pointer focus:outline-none"
          >
            {gates.map((g) => (
              <option key={g.id} value={g.id}>
                Gate {g.id} ({g.concourse} • {g.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Vehicles */}
      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredVehicles.map((veh) => {
          const isSelected = selectedVehicleId === veh.id;
          const assignedGate = gates.find((g) => g.id === veh.assignedGateId);

          return (
            <div
              key={veh.id}
              onClick={() => selectVehicle(isSelected ? null : veh.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#142334] border-cyan-400 shadow-lg shadow-cyan-950/40'
                  : 'bg-[#0e1622] border-[#1d2d40] hover:border-[#2b415a]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#182637]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        veh.status === 'SERVICING'
                          ? 'bg-cyan-400 animate-pulse'
                          : veh.status === 'DISPATCHED' || veh.status === 'RETURNING'
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                    <span className="font-bold text-white text-xs tracking-wider">
                      {veh.callsign}
                    </span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-[#172535] text-[#8ea8c2] border border-[#22354a]">
                      {veh.type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold ${
                      veh.status === 'SERVICING'
                        ? 'text-cyan-400'
                        : veh.status === 'DISPATCHED' || veh.status === 'RETURNING'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {veh.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2.5 text-[11px]">
                  <div>
                    <span className="text-[#59738c] block text-[10px]">ASSIGNED GATE</span>
                    <span className="font-bold text-[#d4e4f5]">
                      {veh.assignedGateId ? `GATE ${veh.assignedGateId}` : 'RAMP POOL'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#59738c] block text-[10px]">ENERGY / FUEL</span>
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      <Fuel className="w-3 h-3 text-emerald-400" />
                      {veh.batteryFuelPercent}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[#59738c] block text-[10px]">GROUND SPEED</span>
                    <span className="font-semibold text-[#d4e4f5]">
                      {Math.round(veh.speed)} KNOTS
                    </span>
                  </div>
                  <div>
                    <span className="text-[#59738c] block text-[10px]">RADAR HEADING</span>
                    <span className="font-semibold text-[#d4e4f5]">
                      {veh.position.heading}°
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-3 pt-2 border-t border-[#182637] flex items-center justify-between">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveView('MAP');
                  }}
                  className="text-cyan-400 hover:text-cyan-300 text-[11px] font-semibold flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3" />
                  Locate on Radar
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDispatch(veh.id);
                  }}
                  className="px-2.5 py-1 rounded bg-[#162738] hover:bg-[#20374e] border border-[#233a52] text-cyan-300 text-[10px] font-semibold flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  Dispatch to Gate {targetGateId}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
