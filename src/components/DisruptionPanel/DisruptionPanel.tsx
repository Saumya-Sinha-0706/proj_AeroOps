import React, { useState } from 'react';
import { useOpsStore } from '../../store/useOpsStore';
import { formatSimTime } from '../../engine/rules';
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  CloudRain,
  Wind,
  Ban,
  CheckCircle2,
  RefreshCw,
  GitBranch,
  Layers,
  FileWarning,
} from 'lucide-react';

export const DisruptionPanel: React.FC = () => {
  const {
    runways,
    gates,
    flights,
    weather,
    groundStop,
    simTime,
    toggleRunway,
    toggleGateOutage,
    updateWeather,
    toggleGroundStop,
    loadScenario,
    activeScenarioName,
  } = useOpsStore();

  const [customRwyReason, setCustomRwyReason] = useState<string>('Foreign Object Debris (FOD) spotted');
  const [selectedGateToOutage, setSelectedGateToOutage] = useState<string>('B4');
  const [customGateReason, setCustomGateReason] = useState<string>('Jetbridge hydraulic pressure failure');

  // Find all flights with active disruption delay records
  const delayedFlightsWithHistory = flights.filter((f) => f.delayHistory.length > 0);

  return (
    <div className="flex-1 flex flex-col bg-[#090e15] select-none overflow-y-auto p-5 font-mono-data text-xs gap-5">
      {/* Header Banner */}
      <div className="bg-[#0f1722] border border-[#1e2e42] p-4 rounded-xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <span className="text-base font-bold text-white tracking-wider">
              DISRUPTION SIMULATION & DELAY PROPAGATION ENGINE
            </span>
          </div>
          <p className="text-[11px] text-[#718da8] mt-1">
            Trigger real-world airfield disruption vectors. Cascading delay logic automatically reroutes runways,
            adjusts acceptance rates, shifts gate slots, and logs traceable causal chains.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadScenario('BASELINE')}
            className="px-3 py-1.5 rounded-lg bg-[#142232] hover:bg-[#1b2f46] text-[#b0c8df] hover:text-white border border-[#22374d] flex items-center gap-1.5 font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset to Baseline
          </button>
        </div>
      </div>

      {/* Grid of Disruption Controllers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Runway Closures */}
        <div className="bg-[#0d141f] border border-[#1e2f44] rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#1a293c]">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-red-400" />
                RUNWAY CLOSURES
              </span>
              <span className="text-[10px] text-[#637f9b]">ICAO NOTAM</span>
            </div>

            <div className="mt-3 space-y-2.5">
              {runways.map((runway) => {
                const isClosed = runway.status === 'CLOSED';
                return (
                  <div
                    key={runway.id}
                    className={`p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                      isClosed
                        ? 'bg-red-950/40 border-red-700/60 text-red-300'
                        : 'bg-[#121c27] border-[#223345] text-[#b4cbdf]'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-xs block">{runway.name}</span>
                      <span className="text-[10px] text-[#6f8ba4]">
                        {isClosed ? runway.closureReason || 'Closed' : `${runway.lengthFt.toLocaleString()} FT • ${runway.ilsCategory}`}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleRunway(runway.id, customRwyReason)}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                        isClosed
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-red-950 hover:bg-red-900 text-red-300 border border-red-800'
                      }`}
                    >
                      {isClosed ? 'REOPEN' : 'CLOSE RWY'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[#1a293c]">
            <label className="text-[10px] text-[#5e778f] uppercase block mb-1">REASON PRESET</label>
            <select
              value={customRwyReason}
              onChange={(e) => setCustomRwyReason(e.target.value)}
              className="w-full bg-[#141f2c] text-[#b9d0e6] p-1.5 rounded border border-[#24374b] text-[11px] focus:outline-none"
            >
              <option value="Foreign Object Debris (FOD) inspection">FOD Debris Inspection</option>
              <option value="Flock of Canadian Geese strike on touchdown zone">Bird Strike on Touchdown</option>
              <option value="Aircraft blown tire tread on runway">Blown Tire Tread Removal</option>
              <option value="Emergency hydraulic fluid clean-up">Hydraulic Spill Clean-up</option>
            </select>
          </div>
        </div>

        {/* 2. Gate Outages */}
        <div className="bg-[#0d141f] border border-[#1e2f44] rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#1a293c]">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-400" />
                GATE OUTAGES
              </span>
              <span className="text-[10px] text-[#637f9b]">RAMP OPS</span>
            </div>

            <div className="mt-3 space-y-2">
              <label className="text-[10px] text-[#5e778f] uppercase block">TARGET GATE</label>
              <select
                value={selectedGateToOutage}
                onChange={(e) => setSelectedGateToOutage(e.target.value)}
                className="w-full bg-[#141f2c] text-[#b9d0e6] p-1.5 rounded border border-[#24374b] text-xs font-mono-data"
              >
                {gates.map((g) => (
                  <option key={g.id} value={g.id}>
                    Gate {g.id} ({g.concourse} • Code {g.maxCategory}) - {g.status}
                  </option>
                ))}
              </select>

              <label className="text-[10px] text-[#5e778f] uppercase block mt-2">FAULT CAUSE</label>
              <select
                value={customGateReason}
                onChange={(e) => setCustomGateReason(e.target.value)}
                className="w-full bg-[#141f2c] text-[#b9d0e6] p-1.5 rounded border border-[#24374b] text-[11px]"
              >
                <option value="Jetbridge hydraulic pressure failure">Jetbridge Hydraulic Failure</option>
                <option value="Underground fuel hydrant pit rupture">Fuel Hydrant Pit Rupture</option>
                <option value="Severe apron tarmac sinkhole / pavement crack">Tarmac Pavement Spall</option>
                <option value="400Hz ground power unit electrical fault">GPU 400Hz Power Loss</option>
              </select>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[#1a293c]">
            <button
              onClick={() => toggleGateOutage(selectedGateToOutage, customGateReason)}
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs"
            >
              Toggle Gate {selectedGateToOutage} Outage
            </button>
          </div>
        </div>

        {/* 3. Severe Weather Simulation */}
        <div className="bg-[#0d141f] border border-[#1e2f44] rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#1a293c]">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Wind className="w-4 h-4 text-cyan-400" />
                METEOROLOGICAL EVENT
              </span>
              <span className="text-[10px] text-[#637f9b]">AWOS / METAR</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <button
                onClick={() =>
                  updateWeather({
                    condition: 'CLEAR',
                    visibilitySm: 10,
                    windSpeedKnots: 11,
                    windDirectionDeg: 80,
                    aarReductionPercent: 0,
                    metarRaw: 'KDEN 122115Z 08011KT 10SM CLR 22/09 A2992 RMK AO2',
                  })
                }
                className={`p-2 rounded border text-left ${
                  weather.condition === 'CLEAR'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-[#121c27] border-[#223345] text-[#86a2be] hover:text-white'
                }`}
              >
                Clear VFR
              </button>

              <button
                onClick={() =>
                  updateWeather({
                    condition: 'DENSE_FOG',
                    visibilitySm: 0.25,
                    windSpeedKnots: 4,
                    windDirectionDeg: 60,
                    aarReductionPercent: 45,
                    metarRaw: 'KDEN 122130Z 06004KT 1/4SM R09L/1200FT FG VV001 10/10 A3004 RMK AO2 AAR-45%',
                  })
                }
                className={`p-2 rounded border text-left ${
                  weather.condition === 'DENSE_FOG'
                    ? 'bg-purple-950/60 border-purple-500 text-purple-300 font-bold'
                    : 'bg-[#121c27] border-[#223345] text-[#86a2be] hover:text-white'
                }`}
              >
                Dense Fog (-45%)
              </button>

              <button
                onClick={() =>
                  updateWeather({
                    condition: 'WIND_SHEAR',
                    visibilitySm: 6,
                    windSpeedKnots: 32,
                    windDirectionDeg: 190,
                    crosswindComponent: 28,
                    aarReductionPercent: 25,
                    metarRaw: 'KDEN 122145Z 19032G44KT 6SM WS-ALL-RWYS TS 18/12 A2980',
                  })
                }
                className={`p-2 rounded border text-left ${
                  weather.condition === 'WIND_SHEAR'
                    ? 'bg-amber-950/60 border-amber-500 text-amber-300 font-bold'
                    : 'bg-[#121c27] border-[#223345] text-[#86a2be] hover:text-white'
                }`}
              >
                Wind Shear (32KT)
              </button>

              <button
                onClick={() =>
                  updateWeather({
                    condition: 'THUNDERSTORM',
                    visibilitySm: 1.5,
                    windSpeedKnots: 38,
                    windDirectionDeg: 280,
                    aarReductionPercent: 60,
                    metarRaw: 'KDEN 122200Z 28038G52KT 1 1/2SM +TSRA BKN015CB 16/14 A2972',
                  })
                }
                className={`p-2 rounded border text-left ${
                  weather.condition === 'THUNDERSTORM'
                    ? 'bg-red-950/60 border-red-500 text-red-300 font-bold'
                    : 'bg-[#121c27] border-[#223345] text-[#86a2be] hover:text-white'
                }`}
              >
                Squall Thunderstorm
              </button>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[#1a293c] text-[10px] text-[#718ca4]">
            AAR Reduction: <span className="font-bold text-red-400">{weather.aarReductionPercent}%</span> • Winds:{' '}
            <span className="font-bold text-cyan-300">{weather.windSpeedKnots} KT</span>
          </div>
        </div>

        {/* 4. Airport-Wide Ground Stop */}
        <div className="bg-[#0d141f] border border-[#1e2f44] rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#1a293c]">
              <span className="font-bold text-white flex items-center gap-1.5">
                <FileWarning className="w-4 h-4 text-red-500" />
                FAA GROUND STOP
              </span>
              <span className="text-[10px] text-[#637f9b]">AIRPORT FREEZE</span>
            </div>

            <p className="text-[11px] text-[#7f99b1] mt-3 leading-relaxed">
              Enforces immediate suspension of all departing pushbacks and taxi clearances. Simulates severe flow
              control or national airspace constraint.
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-[#1a293c]">
            <button
              onClick={toggleGroundStop}
              className={`w-full py-2 font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 text-xs ${
                groundStop
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-red-700 hover:bg-red-600 text-white shadow-lg shadow-red-950'
              }`}
            >
              {groundStop ? 'Cancel Ground Stop' : 'Declare Airport Ground Stop'}
            </button>
          </div>
        </div>
      </div>

      {/* Live Delay Propagation Traceable Audit Tree */}
      <div className="bg-[#0e1622] border border-[#1e3046] rounded-xl p-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1b2b3d]">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white text-sm">
              CASCADING DELAY PROPAGATION AUDIT LOG ({delayedFlightsWithHistory.length} IMPACTED FLIGHTS)
            </span>
          </div>
          <span className="text-[10px] text-[#5e778f]">REAL-TIME DOWNSTREAM TRACEABILITY</span>
        </div>

        <div className="mt-3 space-y-2.5 max-h-96 overflow-y-auto">
          {delayedFlightsWithHistory.length === 0 ? (
            <div className="p-4 text-center text-[#5e778f]">
              No active cascading delays. All operations operating within schedule buffer.
            </div>
          ) : (
            delayedFlightsWithHistory.map((flight) => (
              <div
                key={flight.id}
                className="p-3 bg-[#111c29] border border-[#20344a] rounded-lg flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="w-3 h-3 rounded-full mt-1 shrink-0"
                    style={{ backgroundColor: flight.airline.color }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{flight.flightNumber}</span>
                      <span className="text-[10px] text-[#7c97b1]">
                        ({flight.origin} → {flight.destination})
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[9px] font-bold">
                        GATE {flight.assignedGateId}
                      </span>
                      <span className="text-[10px] font-bold text-amber-400">
                        +{flight.delayMinutes} MIN DELAY
                      </span>
                    </div>

                    <div className="mt-1.5 space-y-1">
                      {flight.delayHistory.map((rec, i) => (
                        <div key={i} className="text-[10.5px] text-[#b7cde1] flex items-center gap-1.5">
                          <span className="text-amber-400 font-bold">↳ [{rec.code}]</span>
                          <span>{rec.message}</span>
                          <span className="text-[9px] text-[#637f9b]">
                            (Time: {formatSimTime(rec.timestamp)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-[#5e778f] block">ESTIMATED TIME</span>
                  <span className="font-bold text-cyan-300 text-xs">
                    {formatSimTime(flight.estimatedTime)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
