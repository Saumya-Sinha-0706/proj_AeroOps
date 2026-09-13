import React, { useEffect } from 'react';
import { useOpsStore } from '../store/useOpsStore';
import { formatSimTime } from '../engine/rules';
import {
  Play,
  Pause,
  FastForward,
  RotateCcw,
  CloudRain,
  Radio,
  FileText,
  Terminal,
  ShieldAlert,
  Wind,
  Layers,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    simTime,
    isPlaying,
    speedMultiplier,
    togglePlay,
    setSpeedMultiplier,
    jumpSimTime,
    weather,
    activeScenarioName,
    loadScenario,
    setCommandPaletteOpen,
    setShiftReportOpen,
    setAlertsDrawerOpen,
    groundStop,
    activeView,
    setActiveView,
    alerts,
  } = useOpsStore();

  // Keyboard shortcut listener: Space to toggle play, Cmd+K / Ctrl+K for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, setCommandPaletteOpen]);

  const unackCriticalCount = alerts.filter((a) => !a.acknowledged && a.level === 'CRITICAL').length;

  return (
    <header className="h-14 bg-[#0d131a] border-b border-[#1b2735] px-4 flex items-center justify-between select-none z-30 relative shrink-0">
      {/* Brand & Hub Metadata */}
      <div className="flex items-center gap-3.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#131e2b] border border-[#21354a] flex items-center justify-center relative">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#0d131a]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display-tactical text-base font-bold tracking-wider text-[#e6f1fb]">AERODECK</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono-data bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold">
                KDEN HUB OPS
              </span>
            </div>
            <div className="text-[10px] text-[#6b8299] font-mono-data leading-none mt-0.5">
              MID-SIZE HUB CONTROL CENTER • ELEV 5,431 FT
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <nav className="hidden lg:flex items-center gap-1 ml-4 bg-[#080d13] p-0.5 rounded-lg border border-[#1b2735]">
          {(
            [
              { key: 'MAP', label: 'RADAR MAP' },
              { key: 'FLIGHTS', label: 'FLIGHT BOARD' },
              { key: 'GATES', label: 'GATE GANTT' },
              { key: 'DISRUPTIONS', label: 'DISRUPTIONS' },
              { key: 'VEHICLES', label: 'GROUND FLEET' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key)}
              className={`px-3 py-1 text-xs font-display-tactical transition-colors rounded ${
                activeView === tab.key
                  ? 'bg-[#1b2a3a] text-cyan-300 font-semibold shadow-inner border border-cyan-500/30'
                  : 'text-[#7e95ab] hover:text-[#c4d7e8] hover:bg-[#121c27]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Center: Master Simulation Clock & Speed */}
      <div className="flex items-center gap-3 bg-[#080c11] px-3.5 py-1.5 rounded-lg border border-[#1b2735]">
        {/* Zulu Clock */}
        <div className="flex flex-col items-center">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-mono-data text-[#5b7389] uppercase font-semibold">SIM ZULU</span>
            <span className="font-mono-data text-lg font-bold text-emerald-400 tracking-wider">
              {formatSimTime(simTime)}
            </span>
            <span className="text-[11px] font-mono-data text-[#7e95ab]">
              ({formatSimTime(simTime - 360).replace('Z', ' MST')})
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-[#1e2d3e]" />

        {/* Play / Pause */}
        <div className="flex items-center gap-1">
          <button
            onClick={togglePlay}
            title={isPlaying ? 'Pause Simulation (Space)' : 'Resume Simulation (Space)'}
            className={`p-1.5 rounded transition-all flex items-center justify-center ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          </button>

          {/* Speed Multipliers */}
          <div className="flex items-center bg-[#101720] rounded border border-[#1e2d3e] p-0.5">
            {([1, 4, 10, 30] as const).map((speed) => (
              <button
                key={speed}
                onClick={() => setSpeedMultiplier(speed)}
                className={`px-1.5 py-0.5 text-[11px] font-mono-data rounded transition-all ${
                  speedMultiplier === speed
                    ? 'bg-cyan-500 text-[#080c11] font-bold shadow'
                    : 'text-[#7e95ab] hover:text-white'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Jump Time Buttons */}
          <button
            onClick={() => jumpSimTime(15)}
            title="Fast Forward 15 minutes"
            className="p-1 rounded bg-[#101720] hover:bg-[#192534] text-[#8ea3b8] hover:text-white border border-[#1e2d3e] text-[10px] font-mono-data px-1.5 flex items-center gap-0.5"
          >
            <FastForward className="w-3 h-3" />
            +15m
          </button>
        </div>
      </div>

      {/* Right Controls: Weather, Scenarios, Command Palette, Handover */}
      <div className="flex items-center gap-2">
        {/* Ground Stop Warning Indicator */}
        {groundStop && (
          <div className="animate-pulse flex items-center gap-1.5 px-2 py-1 rounded bg-red-950/80 border border-red-600 text-red-400 font-mono-data text-xs font-bold">
            <ShieldAlert className="w-3.5 h-3.5" />
            GROUND STOP ACTIVE
          </div>
        )}

        {/* METAR / Weather Pill */}
        <div
          title={weather.metarRaw}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#101720] border border-[#1f2f40] text-xs font-mono-data text-[#8fa7be]"
        >
          <Wind className="w-3.5 h-3.5 text-cyan-400" />
          <span>{weather.windDirectionDeg}° / {weather.windSpeedKnots}KT</span>
          <span className="text-[#45586b]">|</span>
          <span className={weather.visibilitySm < 3 ? 'text-amber-400 font-semibold' : 'text-[#8fa7be]'}>
            {weather.visibilitySm}SM
          </span>
          {weather.aarReductionPercent > 0 && (
            <span className="text-red-400 font-bold ml-1">(-{weather.aarReductionPercent}% AAR)</span>
          )}
        </div>

        {/* Scenario Selector */}
        <div className="relative">
          <select
            value={
              activeScenarioName.includes('Baseline')
                ? 'BASELINE'
                : activeScenarioName.includes('Fog')
                ? 'FOG_CRISIS'
                : activeScenarioName.includes('Bird')
                ? 'RWY_09L_BIRD_STRIKE'
                : 'RAMP_DISRUPTION'
            }
            onChange={(e) => loadScenario(e.target.value as any)}
            className="bg-[#101720] text-[#a4bbd1] text-xs font-mono-data px-2 py-1 rounded border border-[#1f2f40] focus:outline-none focus:border-cyan-500 cursor-pointer"
            title="Load Preserved Operational Scenario"
          >
            <option value="BASELINE">Scenario: Normal Ops</option>
            <option value="FOG_CRISIS">Scenario: Severe Fog (AAR -45%)</option>
            <option value="RWY_09L_BIRD_STRIKE">Scenario: RWY 09L Bird Strike</option>
            <option value="RAMP_DISRUPTION">Scenario: Gate Outage Crisis</option>
          </select>
        </div>

        {/* Alerts Trigger */}
        <button
          onClick={() => setAlertsDrawerOpen(true)}
          className={`px-2 py-1 rounded border flex items-center gap-1.5 text-xs font-mono-data transition-colors ${
            alerts.filter((a) => !a.acknowledged).length > 0
              ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 hover:bg-amber-950/80'
              : 'bg-[#101720] border-[#1f2f40] text-[#8fa7be] hover:text-white hover:bg-[#182433]'
          }`}
          title="Open Operational Alerts Feed"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>ALERTS</span>
          {alerts.filter((a) => !a.acknowledged).length > 0 && (
            <span className="px-1 rounded bg-amber-400 text-black font-bold text-[10px]">
              {alerts.filter((a) => !a.acknowledged).length}
            </span>
          )}
        </button>

        {/* Command Palette Trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="px-2 py-1 rounded bg-[#101720] hover:bg-[#182433] text-[#8fa7be] hover:text-white border border-[#1f2f40] flex items-center gap-1 text-xs font-mono-data"
          title="Open Command Palette (⌘K)"
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">CMD</span>
          <kbd className="text-[10px] bg-[#090d13] px-1 py-0.2 rounded border border-[#233547] text-[#6b8299]">
            ⌘K
          </kbd>
        </button>

        {/* Shift Handover Report */}
        <button
          onClick={() => setShiftReportOpen(true)}
          className="px-2.5 py-1 rounded bg-[#132233] hover:bg-[#1b3149] text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 text-xs font-display-tactical font-semibold"
          title="Generate Duty Manager Shift Handover Report"
        >
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">HANDOVER</span>
        </button>
      </div>
    </header>
  );
};
