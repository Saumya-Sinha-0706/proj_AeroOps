import React, { useState, useMemo } from 'react';
import { useOpsStore } from '../../store/useOpsStore';
import { Flight } from '../../types';
import { formatSimTime } from '../../engine/rules';
import { FlightTimelineModal } from './FlightTimelineModal';
import {
  Search,
  Filter,
  ArrowUpDown,
  Plane,
  Clock,
  AlertTriangle,
  Layers,
  MapPin,
  ExternalLink,
} from 'lucide-react';

type SortField =
  | 'flightNumber'
  | 'airline'
  | 'origin'
  | 'scheduledTime'
  | 'status'
  | 'assignedGateId'
  | 'delayMinutes'
  | 'aircraftType';

export const FlightBoard: React.FC = () => {
  const { flights, selectFlight, setActiveView, selectedFlightId } = useOpsStore();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [opFilter, setOpFilter] = useState<'ALL' | 'ARR' | 'DEP'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DELAYED' | 'AIR' | 'GATE'>('ALL');
  const [concourseFilter, setConcourseFilter] = useState<string>('ALL');

  // Sorting State
  const [sortField, setSortField] = useState<SortField>('scheduledTime');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Inspector Modal State
  const [inspectingFlight, setInspectingFlight] = useState<Flight | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Filtered & Sorted Flights Computation
  const processedFlights = useMemo(() => {
    return flights
      .filter((f) => {
        // Operation filter
        if (opFilter === 'ARR' && !f.isArrival) return false;
        if (opFilter === 'DEP' && f.isArrival) return false;

        // Status filter
        if (statusFilter === 'DELAYED' && f.delayMinutes <= 0) return false;
        if (statusFilter === 'AIR' && !['EN_ROUTE', 'ON_APPROACH', 'FINAL'].includes(f.status)) return false;
        if (statusFilter === 'GATE' && f.status !== 'AT_GATE' && f.status !== 'BOARDING') return false;

        // Concourse filter
        if (concourseFilter !== 'ALL' && !f.assignedGateId.startsWith(concourseFilter)) return false;

        // Free search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchFlight = f.flightNumber.toLowerCase().includes(q);
          const matchCallsign = f.callsign.toLowerCase().includes(q);
          const matchAirline = f.airline.name.toLowerCase().includes(q);
          const matchOrigin = f.origin.toLowerCase().includes(q);
          const matchDest = f.destination.toLowerCase().includes(q);
          const matchGate = f.assignedGateId.toLowerCase().includes(q);
          const matchAircraft = f.aircraftType.toLowerCase().includes(q);
          return (
            matchFlight ||
            matchCallsign ||
            matchAirline ||
            matchOrigin ||
            matchDest ||
            matchGate ||
            matchAircraft
          );
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'airline') {
          valA = a.airline.name;
          valB = b.airline.name;
        }

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [flights, opFilter, statusFilter, concourseFilter, searchQuery, sortField, sortAsc]);

  return (
    <div className="flex-1 flex flex-col bg-[#090e15] select-none overflow-hidden font-mono-data text-xs">
      {/* Search & Filter Toolbar */}
      <div className="p-3.5 bg-[#0e151f] border-b border-[#1b2838] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#5e7790]" />
            <input
              type="text"
              placeholder="Search flight, airline, route, gate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#141f2c] text-[#d4e4f5] pl-8 pr-3 py-1.5 rounded-lg border border-[#22354a] focus:outline-none focus:border-cyan-500 w-64 text-xs font-mono-data placeholder-[#5a748c]"
            />
          </div>

          {/* Operation Filter Tabs */}
          <div className="flex items-center bg-[#141f2c] p-0.5 rounded-lg border border-[#22354a]">
            {(
              [
                { key: 'ALL', label: 'ALL OPS' },
                { key: 'ARR', label: 'ARRIVALS' },
                { key: 'DEP', label: 'DEPARTURES' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setOpFilter(tab.key)}
                className={`px-2.5 py-1 text-[11px] rounded transition-all ${
                  opFilter === tab.key
                    ? 'bg-cyan-500 text-[#080d13] font-bold shadow'
                    : 'text-[#849cb3] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status Quick Filter */}
          <div className="flex items-center bg-[#141f2c] p-0.5 rounded-lg border border-[#22354a]">
            {(
              [
                { key: 'ALL', label: 'ALL STATUS' },
                { key: 'DELAYED', label: 'DELAYED' },
                { key: 'AIR', label: 'AIRBORNE' },
                { key: 'GATE', label: 'AT GATE' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-2 py-1 text-[11px] rounded transition-all ${
                  statusFilter === tab.key
                    ? 'bg-[#22374d] text-cyan-300 font-bold'
                    : 'text-[#849cb3] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Concourse Filter */}
          <select
            value={concourseFilter}
            onChange={(e) => setConcourseFilter(e.target.value)}
            className="bg-[#141f2c] text-[#a1b8ce] px-2.5 py-1.5 rounded-lg border border-[#22354a] focus:outline-none cursor-pointer text-xs"
          >
            <option value="ALL">All Concourses</option>
            <option value="A">Concourse A (Gates A1-A8)</option>
            <option value="B">Concourse B (Gates B1-B8)</option>
            <option value="C">Concourse C (Gates C1-C6)</option>
          </select>
        </div>

        {/* Results Count */}
        <div className="text-[#647f99] text-[11px]">
          SHOWING <span className="text-cyan-300 font-bold">{processedFlights.length}</span> OF{' '}
          <span className="text-[#b2c8de] font-bold">{flights.length}</span> FLIGHTS
        </div>
      </div>

      {/* Main Table View */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#0b121a] text-[#5e778f] text-[10px] uppercase font-bold sticky top-0 z-10 border-b border-[#1b2838] shadow-sm">
            <tr>
              <th
                onClick={() => handleSort('flightNumber')}
                className="p-3 cursor-pointer hover:text-[#c4d7ea]"
              >
                <div className="flex items-center gap-1">
                  <span>FLIGHT / CALLSIGN</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('origin')}
                className="p-3 cursor-pointer hover:text-[#c4d7ea]"
              >
                <div className="flex items-center gap-1">
                  <span>ROUTE</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('scheduledTime')}
                className="p-3 cursor-pointer hover:text-[#c4d7ea]"
              >
                <div className="flex items-center gap-1">
                  <span>SCHED / EST TIME</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('status')}
                className="p-3 cursor-pointer hover:text-[#c4d7ea]"
              >
                <div className="flex items-center gap-1">
                  <span>STATUS</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('assignedGateId')}
                className="p-3 cursor-pointer hover:text-[#c4d7ea]"
              >
                <div className="flex items-center gap-1">
                  <span>GATE</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3">RUNWAY</th>
              <th
                onClick={() => handleSort('aircraftType')}
                className="p-3 cursor-pointer hover:text-[#c4d7ea]"
              >
                <div className="flex items-center gap-1">
                  <span>AIRCRAFT [ICAO]</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('delayMinutes')}
                className="p-3 cursor-pointer hover:text-[#c4d7ea]"
              >
                <div className="flex items-center gap-1">
                  <span>DELAY / ROOT CAUSE</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#141e2b]">
            {processedFlights.map((flight) => {
              const isSelected = selectedFlightId === flight.id;
              const isDelayed = flight.delayMinutes > 0;

              return (
                <tr
                  key={flight.id}
                  onClick={() => {
                    selectFlight(isSelected ? null : flight.id);
                  }}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#152332] text-white font-semibold'
                      : 'hover:bg-[#0f1722] text-[#c0d4e7]'
                  }`}
                >
                  {/* Flight Number & Airline */}
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20 shrink-0"
                        style={{ backgroundColor: flight.airline.color }}
                      />
                      <div>
                        <div className="font-bold text-white text-xs tracking-wide">
                          {flight.flightNumber}
                        </div>
                        <div className="text-[10px] text-[#637d96]">
                          {flight.airline.name} • {flight.callsign}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Route */}
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <span>{flight.origin}</span>
                      <span className="text-[#59738c]">→</span>
                      <span>{flight.destination}</span>
                    </div>
                    <div className="text-[10px] text-[#5e778f]">
                      {flight.isArrival ? 'Inbound Arrival' : 'Outbound Departure'}
                    </div>
                  </td>

                  {/* Sched / Est */}
                  <td className="p-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-bold text-[#e1edf9]">
                        {formatSimTime(flight.estimatedTime)}
                      </span>
                      {isDelayed && (
                        <span className="text-[10px] line-through text-[#5e778f]">
                          {formatSimTime(flight.scheduledTime)}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#5e778f]">
                      Occupancy: {formatSimTime(flight.gateOccupancyStart)}
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                        flight.status === 'AT_GATE'
                          ? 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60'
                          : flight.status === 'FINAL' || flight.status === 'ON_APPROACH'
                          ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
                          : flight.status === 'BOARDING' || flight.status === 'PUSHBACK'
                          ? 'bg-blue-950/70 text-blue-300 border-blue-800/60'
                          : flight.status === 'TAXI_OUT' || flight.status === 'TAXI_IN'
                          ? 'bg-amber-950/70 text-amber-300 border-amber-800/60'
                          : 'bg-[#15202c] text-[#8ea5bc] border-[#223447]'
                      }`}
                    >
                      {flight.status.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Gate */}
                  <td className="p-3">
                    <span className="font-bold text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                      GATE {flight.assignedGateId}
                    </span>
                    {flight.manualGateOverride && (
                      <span className="block text-[9px] text-amber-400 mt-0.5 font-semibold">
                        ⚠️ Override
                      </span>
                    )}
                  </td>

                  {/* Runway */}
                  <td className="p-3">
                    <span className="text-[#a4bdd3]">{flight.assignedRunwayId}</span>
                  </td>

                  {/* Aircraft Type & ICAO Code */}
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#d2e3f3] font-medium">{flight.aircraftType}</span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                          flight.category === 'E'
                            ? 'bg-purple-950/80 text-purple-300 border border-purple-800'
                            : flight.category === 'D'
                            ? 'bg-blue-950/80 text-blue-300 border border-blue-800'
                            : 'bg-[#172330] text-[#7893ad] border border-[#233547]'
                        }`}
                      >
                        [{flight.category}]
                      </span>
                    </div>
                    <div className="text-[10px] text-[#5e778f]">{flight.passengers} Passengers</div>
                  </td>

                  {/* Delay & Root Cause */}
                  <td className="p-3">
                    {isDelayed ? (
                      <div>
                        <span className="font-bold text-amber-400">+{flight.delayMinutes} MIN</span>
                        {flight.delayHistory.length > 0 && (
                          <div className="text-[9.5px] text-amber-300/80 truncate max-w-xs mt-0.5" title={flight.delayHistory[0].message}>
                            ↳ {flight.delayHistory[0].source}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-emerald-400 font-semibold">ON TIME</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setInspectingFlight(flight);
                      }}
                      className="px-2.5 py-1 rounded bg-[#162332] hover:bg-[#20344b] text-cyan-300 hover:text-white border border-[#24394f] text-[11px] font-semibold inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Timeline
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Flight Timeline Modal */}
      {inspectingFlight && (
        <FlightTimelineModal
          flight={inspectingFlight}
          onClose={() => setInspectingFlight(null)}
          onReassignGate={(flightId) => {
            setInspectingFlight(null);
            selectFlight(flightId);
            setActiveView('GATES');
          }}
        />
      )}
    </div>
  );
};
