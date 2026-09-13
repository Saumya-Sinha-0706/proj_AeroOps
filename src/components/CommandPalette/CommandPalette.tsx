import React, { useState, useEffect, useMemo } from 'react';
import { useOpsStore } from '../../store/useOpsStore';
import {
  Search,
  Plane,
  Layers,
  Ban,
  Wind,
  FileText,
  Play,
  Pause,
  AlertTriangle,
  Compass,
  CornerDownLeft,
} from 'lucide-react';

interface Props {
  onClose: () => void;
  onOpenHandover: () => void;
}

export const CommandPalette: React.FC<Props> = ({ onClose, onOpenHandover }) => {
  const {
    flights,
    gates,
    runways,
    setActiveView,
    selectFlight,
    selectGate,
    selectRunway,
    togglePlay,
    isPlaying,
    toggleGroundStop,
    groundStop,
    loadScenario,
    toggleRunway,
  } = useOpsStore();

  const [query, setQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Generate list of actionable items
  const items = useMemo(() => {
    const q = query.toLowerCase().trim();
    const result: Array<{
      id: string;
      title: string;
      subtitle: string;
      category: 'NAVIGATION' | 'ACTION' | 'FLIGHT' | 'GATE' | 'RUNWAY' | 'SCENARIO';
      action: () => void;
    }> = [];

    // Global Actions
    result.push(
      {
        id: 'view-map',
        title: 'Switch to Airfield Spatial Radar Map',
        subtitle: 'Interactive 2D vector radar scope with real-time aircraft tracks',
        category: 'NAVIGATION',
        action: () => {
          setActiveView('MAP');
          onClose();
        },
      },
      {
        id: 'view-flights',
        title: 'Open Flight Operations Board',
        subtitle: 'Comprehensive filterable schedule, status, and turnaround milestones',
        category: 'NAVIGATION',
        action: () => {
          setActiveView('FLIGHTS');
          onClose();
        },
      },
      {
        id: 'view-gates',
        title: 'Open Gate Gantt & Turnaround Matrix',
        subtitle: 'Drag-and-drop stand assignment with automatic ICAO conflict detection',
        category: 'NAVIGATION',
        action: () => {
          setActiveView('GATES');
          onClose();
        },
      },
      {
        id: 'view-disruptions',
        title: 'Open Disruption Control Panel',
        subtitle: 'Trigger runway NOTAMs, severe weather, gate outages, and ground stops',
        category: 'NAVIGATION',
        action: () => {
          setActiveView('DISRUPTIONS');
          onClose();
        },
      },
      {
        id: 'handover-briefing',
        title: 'Generate Shift Handover Briefing Report',
        subtitle: 'Export comprehensive operational status report for incoming duty manager',
        category: 'ACTION',
        action: () => {
          onClose();
          onOpenHandover();
        },
      },
      {
        id: 'toggle-clock',
        title: isPlaying ? 'Pause Simulation Clock' : 'Resume Simulation Clock',
        subtitle: 'Freeze or unfreeze global airfield timeline movement',
        category: 'ACTION',
        action: () => {
          togglePlay();
          onClose();
        },
      },
      {
        id: 'toggle-groundstop',
        title: groundStop ? 'Cancel FAA Airport Ground Stop' : 'Declare FAA Airport Ground Stop',
        subtitle: 'Halt or resume all airport departure pushbacks and taxi clearances',
        category: 'ACTION',
        action: () => {
          toggleGroundStop();
          onClose();
        },
      },
      {
        id: 'scenario-fog',
        title: 'Load Scenario: Dense Fog & Low Visibility (AAR -45%)',
        subtitle: 'RVR drops to 1200ft, glideslope separation increases, approach delays',
        category: 'SCENARIO',
        action: () => {
          loadScenario('FOG_CRISIS');
          onClose();
        },
      },
      {
        id: 'scenario-strike',
        title: 'Load Scenario: Runway 09L Bird Strike Emergency',
        subtitle: 'Active runway closed for sweep, traffic cascades to 09R and 18/36',
        category: 'SCENARIO',
        action: () => {
          loadScenario('RWY_09L_BIRD_STRIKE');
          onClose();
        },
      },
      {
        id: 'scenario-baseline',
        title: 'Load Scenario: Morning Baseline Operations',
        subtitle: 'Restore normal VFR visual operations with zero cascading delays',
        category: 'SCENARIO',
        action: () => {
          loadScenario('BASELINE');
          onClose();
        },
      }
    );

    // Flights
    flights.forEach((f) => {
      result.push({
        id: `flight-${f.id}`,
        title: `${f.flightNumber} (${f.airline.name}) — ${f.origin} → ${f.destination}`,
        subtitle: `Gate ${f.assignedGateId} • Status: ${f.status} • Delay: +${f.delayMinutes}m`,
        category: 'FLIGHT',
        action: () => {
          selectFlight(f.id);
          selectGate(f.assignedGateId);
          setActiveView('MAP');
          onClose();
        },
      });
    });

    // Gates
    gates.forEach((g) => {
      result.push({
        id: `gate-${g.id}`,
        title: `Gate ${g.id} (${g.concourse} • Code ${g.maxCategory})`,
        subtitle: `Status: ${g.status} • ${g.hasDualJetbridge ? 'Dual Jetbridge' : 'Single Jetbridge'}`,
        category: 'GATE',
        action: () => {
          selectGate(g.id);
          setActiveView('GATES');
          onClose();
        },
      });
    });

    // Runways
    runways.forEach((r) => {
      result.push({
        id: `runway-${r.id}`,
        title: `Runway ${r.name} (${r.status})`,
        subtitle: `${r.lengthFt.toLocaleString()} FT • ${r.ilsCategory} • Heading ${r.activeHeading}`,
        category: 'RUNWAY',
        action: () => {
          selectRunway(r.id);
          setActiveView('MAP');
          onClose();
        },
      });
    });

    if (!q) return result.slice(0, 15);

    return result
      .filter((item) => {
        return (
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      })
      .slice(0, 15);
  }, [
    query,
    flights,
    gates,
    runways,
    isPlaying,
    groundStop,
    setActiveView,
    selectFlight,
    selectGate,
    selectRunway,
    togglePlay,
    toggleGroundStop,
    loadScenario,
    onClose,
    onOpenHandover,
  ]);

  // Keyboard navigation within list
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, items.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + items.length) % Math.max(1, items.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIndex]) {
          items[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/75 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-xl bg-[#0c131c] border border-[#233549] rounded-xl shadow-2xl overflow-hidden font-mono-data text-xs flex flex-col">
        {/* Search Input Box */}
        <div className="p-3.5 bg-[#0f1722] border-b border-[#1c2c3d] flex items-center gap-3">
          <Search className="w-4 h-4 text-cyan-400 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command, flight number, gate, runway, or scenario..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-white focus:outline-none text-xs font-mono-data placeholder-[#5d7791]"
          />
          <span className="text-[10px] text-[#5e778f] border border-[#22354a] px-1.5 py-0.5 rounded">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5">
          {items.length === 0 ? (
            <div className="p-6 text-center text-[#5e778f]">
              No operational matches found for "{query}"
            </div>
          ) : (
            items.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-cyan-950/70 border border-cyan-500/50 text-white'
                      : 'hover:bg-[#111a26] text-[#b9cfe4]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                        item.category === 'NAVIGATION'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : item.category === 'ACTION'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : item.category === 'SCENARIO'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : item.category === 'FLIGHT'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : item.category === 'GATE'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-[#152332] text-[#8ea5bc]'
                      }`}
                    >
                      {item.category}
                    </span>
                    <div className="truncate">
                      <div className="font-bold text-xs truncate">{item.title}</div>
                      <div className="text-[10px] text-[#6d88a2] truncate">{item.subtitle}</div>
                    </div>
                  </div>

                  {isSelected && (
                    <CornerDownLeft className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-2" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-3.5 py-2 bg-[#090e15] border-t border-[#1a293c] flex items-center justify-between text-[10px] text-[#556f87]">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span>AeroDeck Quick Dispatch</span>
        </div>
      </div>
    </div>
  );
};
