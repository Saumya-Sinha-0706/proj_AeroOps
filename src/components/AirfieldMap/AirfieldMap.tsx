import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useOpsStore } from '../../store/useOpsStore';
import { Flight, Gate, GroundVehicle, Runway } from '../../types';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Compass,
  Wind,
  Layers,
  Eye,
  Info,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export const AirfieldMap: React.FC = () => {
  const {
    flights,
    gates,
    runways,
    vehicles,
    weather,
    selectedFlightId,
    selectFlight,
    selectedGateId,
    selectGate,
    selectedVehicleId,
    selectVehicle,
    selectedRunwayId,
    selectRunway,
    setActiveView,
    toggleRunway,
    toggleGateOutage,
  } = useOpsStore();

  const containerRef = useRef<HTMLDivElement>(null);

  // Pan and Zoom State
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Layer Toggles
  const [showRadarRings, setShowRadarRings] = useState<boolean>(true);
  const [showTaxiways, setShowTaxiways] = useState<boolean>(true);
  const [showVehicles, setShowVehicles] = useState<boolean>(true);
  const [showDataTags, setShowDataTags] = useState<boolean>(true);
  const [showWindOverlay, setShowWindOverlay] = useState<boolean>(true);

  // Hover state for quick tooltips
  const [hoveredEntity, setHoveredEntity] = useState<{
    type: 'FLIGHT' | 'GATE' | 'VEHICLE' | 'RUNWAY';
    data: any;
    coords: { x: number; y: number };
  } | null>(null);

  // Selected details
  const activeFlight = useMemo(() => flights.find((f) => f.id === selectedFlightId), [flights, selectedFlightId]);
  const activeGate = useMemo(() => gates.find((g) => g.id === selectedGateId), [gates, selectedGateId]);
  const activeVehicle = useMemo(() => vehicles.find((v) => v.id === selectedVehicleId), [vehicles, selectedVehicleId]);
  const activeRunway = useMemo(() => runways.find((r) => r.id === selectedRunwayId), [runways, selectedRunwayId]);

  // Handle Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom((prev) => Math.min(3.2, Math.max(0.5, +(prev * zoomFactor).toFixed(2))));
  };

  // Drag Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`relative w-full h-full bg-[#080d13] overflow-hidden select-none cursor-${
        isDragging ? 'grabbing' : 'grab'
      }`}
    >
      {/* Radar Background Texture with Grid and Scanlines */}
      <div className="absolute inset-0 radar-grid opacity-60 pointer-events-none" />
      <div className="absolute inset-0 tactical-scanlines opacity-20 pointer-events-none" />

      {/* Main SVG Radar Surface */}
      <svg
        className="w-full h-full absolute inset-0"
        viewBox="0 0 1000 650"
        preserveAspectRatio="xMidYMid meet"
      >
        <g
          transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
          style={{ transformOrigin: '500px 325px' }}
        >
          {/* Radar Range Rings (Centered on Control Tower at x:500, y:300) */}
          {showRadarRings && (
            <g className="pointer-events-none opacity-40">
              <circle cx="500" cy="300" r="140" fill="none" stroke="#1c3044" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="500" cy="300" r="280" fill="none" stroke="#1c3044" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="500" cy="300" r="420" fill="none" stroke="#1c3044" strokeWidth="1" strokeDasharray="4 4" />
              <text x="505" y="165" fill="#3d5872" fontSize="9" fontFamily="monospace">2 NM</text>
              <text x="505" y="25" fill="#3d5872" fontSize="9" fontFamily="monospace">4 NM</text>
              {/* Tower Crosshair */}
              <line x1="490" y1="300" x2="510" y2="300" stroke="#00e5ff" strokeWidth="1.5" opacity="0.6" />
              <line x1="500" y1="290" x2="500" y2="310" stroke="#00e5ff" strokeWidth="1.5" opacity="0.6" />
              <text x="508" y="295" fill="#00e5ff" fontSize="9" fontFamily="monospace" fontWeight="bold">TWR</text>
            </g>
          )}

          {/* Taxiways Network */}
          {showTaxiways && (
            <g className="taxiways">
              {/* Taxiway Alpha (Parallel North to RWY 09L) */}
              <path
                d="M 120 175 L 860 175"
                fill="none"
                stroke="#15202c"
                strokeWidth="18"
                strokeLinecap="round"
              />
              <path
                d="M 120 175 L 860 175"
                fill="none"
                stroke="#d97706"
                strokeWidth="1.5"
                strokeDasharray="12 6"
                opacity="0.8"
              />
              <text x="130" y="168" fill="#d97706" fontSize="10" fontFamily="monospace" fontWeight="bold">TWY A</text>

              {/* Taxiway Bravo (Mid Apron Connector) */}
              <path
                d="M 360 310 L 800 310"
                fill="none"
                stroke="#15202c"
                strokeWidth="18"
                strokeLinecap="round"
              />
              <path
                d="M 360 310 L 800 310"
                fill="none"
                stroke="#d97706"
                strokeWidth="1.5"
                opacity="0.7"
              />
              <text x="365" y="304" fill="#d97706" fontSize="10" fontFamily="monospace" fontWeight="bold">TWY B</text>

              {/* Taxiway Delta (Parallel South to RWY 09R) */}
              <path
                d="M 140 480 L 880 480"
                fill="none"
                stroke="#15202c"
                strokeWidth="18"
                strokeLinecap="round"
              />
              <path
                d="M 140 480 L 880 480"
                fill="none"
                stroke="#d97706"
                strokeWidth="1.5"
                strokeDasharray="12 6"
                opacity="0.8"
              />
              <text x="150" y="474" fill="#d97706" fontSize="10" fontFamily="monospace" fontWeight="bold">TWY D</text>

              {/* High-speed turnoffs / connectors (Charlie, Echo, Foxtrot) */}
              <path d="M 260 130 L 260 175" stroke="#15202c" strokeWidth="18" />
              <path d="M 260 130 L 260 175" stroke="#d97706" strokeWidth="1.5" />
              <text x="268" y="150" fill="#d97706" fontSize="9" fontFamily="monospace">TWY F</text>

              <path d="M 490 130 L 490 175" stroke="#15202c" strokeWidth="18" />
              <path d="M 490 130 L 490 175" stroke="#d97706" strokeWidth="1.5" />
              <text x="498" y="150" fill="#d97706" fontSize="9" fontFamily="monospace">TWY C</text>

              <path d="M 700 130 L 700 175" stroke="#15202c" strokeWidth="18" />
              <path d="M 700 130 L 700 175" stroke="#d97706" strokeWidth="1.5" />
              <text x="708" y="150" fill="#d97706" fontSize="9" fontFamily="monospace">TWY E</text>

              <path d="M 500 480 L 500 530" stroke="#15202c" strokeWidth="18" />
              <path d="M 500 480 L 500 530" stroke="#d97706" strokeWidth="1.5" />

              <path d="M 710 480 L 710 530" stroke="#15202c" strokeWidth="18" />
              <path d="M 710 480 L 710 530" stroke="#d97706" strokeWidth="1.5" />
            </g>
          )}

          {/* Runways Rendering */}
          {runways.map((runway) => {
            const isClosed = runway.status === 'CLOSED';
            const isSelected = selectedRunwayId === runway.id;

            return (
              <g
                key={runway.id}
                onClick={(e) => {
                  e.stopPropagation();
                  selectRunway(isSelected ? null : runway.id);
                  selectFlight(null);
                  selectGate(null);
                }}
                className="cursor-pointer"
              >
                {/* Runway Base Asphalt */}
                <line
                  x1={runway.coordinates.start.x}
                  y1={runway.coordinates.start.y}
                  x2={runway.coordinates.end.x}
                  y2={runway.coordinates.end.y}
                  stroke={isClosed ? '#241010' : '#111822'}
                  strokeWidth="32"
                  strokeLinecap="square"
                />

                {/* Runway White Boundary lines */}
                <line
                  x1={runway.coordinates.start.x}
                  y1={runway.coordinates.start.y - 14}
                  x2={runway.coordinates.end.x}
                  y2={runway.coordinates.end.y - 14}
                  stroke={isClosed ? '#7f1d1d' : '#455d78'}
                  strokeWidth="1.5"
                />
                <line
                  x1={runway.coordinates.start.x}
                  y1={runway.coordinates.start.y + 14}
                  x2={runway.coordinates.end.x}
                  y2={runway.coordinates.end.y + 14}
                  stroke={isClosed ? '#7f1d1d' : '#455d78'}
                  strokeWidth="1.5"
                />

                {/* Centerline dashes / Active green illumination */}
                <line
                  x1={runway.coordinates.start.x + 40}
                  y1={runway.coordinates.start.y}
                  x2={runway.coordinates.end.x - 40}
                  y2={runway.coordinates.end.y}
                  stroke={isClosed ? '#ef4444' : '#10b981'}
                  strokeWidth="2.5"
                  strokeDasharray="16 12"
                  className={!isClosed ? 'opacity-90' : 'opacity-40'}
                />

                {/* Runway Threshold Identification */}
                {runway.id.includes('09L') && (
                  <>
                    <text x={runway.coordinates.start.x + 10} y={runway.coordinates.start.y + 4} fill="#e2e8f0" fontSize="12" fontFamily="monospace" fontWeight="bold">09L</text>
                    <text x={runway.coordinates.end.x - 36} y={runway.coordinates.end.y + 4} fill="#e2e8f0" fontSize="12" fontFamily="monospace" fontWeight="bold">27R</text>
                  </>
                )}
                {runway.id.includes('09R') && (
                  <>
                    <text x={runway.coordinates.start.x + 10} y={runway.coordinates.start.y + 4} fill="#e2e8f0" fontSize="12" fontFamily="monospace" fontWeight="bold">09R</text>
                    <text x={runway.coordinates.end.x - 36} y={runway.coordinates.end.y + 4} fill="#e2e8f0" fontSize="12" fontFamily="monospace" fontWeight="bold">27L</text>
                  </>
                )}
                {runway.id.includes('18/36') && (
                  <>
                    <text x={runway.coordinates.start.x - 8} y={runway.coordinates.start.y + 20} fill="#e2e8f0" fontSize="12" fontFamily="monospace" fontWeight="bold">18</text>
                    <text x={runway.coordinates.end.x - 8} y={runway.coordinates.end.y - 10} fill="#e2e8f0" fontSize="12" fontFamily="monospace" fontWeight="bold">36</text>
                  </>
                )}

                {/* Closed Runway Hazard Markings (Yellow X's & Stripes) */}
                {isClosed && (
                  <g>
                    {/* Big Red/Yellow Crosses along runway */}
                    <g transform={`translate(${runway.coordinates.start.x + 80}, ${runway.coordinates.start.y})`}>
                      <line x1="-12" y1="-12" x2="12" y2="12" stroke="#ef4444" strokeWidth="4" />
                      <line x1="-12" y1="12" x2="12" y2="-12" stroke="#ef4444" strokeWidth="4" />
                    </g>
                    <g transform={`translate(${(runway.coordinates.start.x + runway.coordinates.end.x) / 2}, ${runway.coordinates.start.y})`}>
                      <line x1="-12" y1="-12" x2="12" y2="12" stroke="#ef4444" strokeWidth="4" />
                      <line x1="-12" y1="12" x2="12" y2="-12" stroke="#ef4444" strokeWidth="4" />
                    </g>
                    <g transform={`translate(${runway.coordinates.end.x - 80}, ${runway.coordinates.end.y})`}>
                      <line x1="-12" y1="-12" x2="12" y2="12" stroke="#ef4444" strokeWidth="4" />
                      <line x1="-12" y1="12" x2="12" y2="-12" stroke="#ef4444" strokeWidth="4" />
                    </g>
                    {/* NOTAM Closed Banner */}
                    <rect
                      x={(runway.coordinates.start.x + runway.coordinates.end.x) / 2 - 75}
                      y={runway.coordinates.start.y - 30}
                      width="150"
                      height="20"
                      fill="#450a0a"
                      stroke="#dc2626"
                      strokeWidth="1.5"
                      rx="3"
                    />
                    <text
                      x={(runway.coordinates.start.x + runway.coordinates.end.x) / 2}
                      y={runway.coordinates.start.y - 16}
                      fill="#fca5a5"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      NOTAM: RWY CLOSED
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Terminal Buildings & Concourses (Pier A, B, C) */}
          <g className="terminals">
            {/* Concourse A Pier */}
            <rect x="370" y="235" width="410" height="28" fill="#182330" stroke="#2a3f55" strokeWidth="2" rx="4" />
            <text x="380" y="253" fill="#6985a2" fontSize="11" fontFamily="monospace" fontWeight="bold">CONCOURSE A</text>

            {/* Concourse B Pier */}
            <rect x="370" y="325" width="420" height="28" fill="#182330" stroke="#2a3f55" strokeWidth="2" rx="4" />
            <text x="380" y="343" fill="#6985a2" fontSize="11" fontFamily="monospace" fontWeight="bold">CONCOURSE B</text>

            {/* Concourse C Pier */}
            <rect x="390" y="415" width="360" height="28" fill="#182330" stroke="#2a3f55" strokeWidth="2" rx="4" />
            <text x="400" y="433" fill="#6985a2" fontSize="11" fontFamily="monospace" fontWeight="bold">CONCOURSE C</text>

            {/* Terminal Main Link Spine */}
            <rect x="350" y="245" width="24" height="190" fill="#121a24" stroke="#24374b" strokeWidth="1.5" rx="3" />
          </g>

          {/* Gates Stands Rendering */}
          {gates.map((gate) => {
            const isOccupied = gate.status === 'OCCUPIED';
            const isOutOfService = gate.status === 'OUT_OF_SERVICE';
            const isConflict = gate.status === 'CONFLICT';
            const isSelected = selectedGateId === gate.id;

            const ringColor = isOutOfService
              ? '#ef4444'
              : isConflict
              ? '#f59e0b'
              : isOccupied
              ? '#06b6d4'
              : '#10b981';

            return (
              <g
                key={gate.id}
                transform={`translate(${gate.coordinates.x}, ${gate.coordinates.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  selectGate(isSelected ? null : gate.id);
                  selectFlight(gate.currentFlightId || null);
                  selectRunway(null);
                }}
                className="cursor-pointer group"
              >
                {/* Gate Parking Halo */}
                <circle
                  cx="0"
                  cy="0"
                  r={gate.maxCategory === 'E' ? 24 : 19}
                  fill={isSelected ? '#1e3852' : '#0e1620'}
                  stroke={ringColor}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  strokeDasharray={isOutOfService ? '4 3' : 'none'}
                />

                {/* Jetbridge arms */}
                <line x1="0" y1="-14" x2="0" y2="-5" stroke="#486581" strokeWidth="3" />
                {gate.hasDualJetbridge && (
                  <line x1="-6" y1="-14" x2="-4" y2="-5" stroke="#486581" strokeWidth="2" />
                )}

                {/* Gate Label */}
                <text
                  x="0"
                  y="4"
                  fill="#d9e6f2"
                  fontSize={gate.maxCategory === 'E' ? '11' : '10'}
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {gate.id}
                </text>

                {/* ICAO Code Category Pill */}
                <text
                  x="0"
                  y="14"
                  fill={gate.maxCategory === 'E' ? '#38bdf8' : '#718096'}
                  fontSize="7.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  [{gate.maxCategory}]
                </text>
              </g>
            );
          })}

          {/* Ground Service Vehicles */}
          {showVehicles &&
            vehicles.map((veh) => {
              const isSelected = selectedVehicleId === veh.id;
              const isWorking = veh.status === 'SERVICING' || veh.status === 'DISPATCHED';

              return (
                <g
                  key={veh.id}
                  transform={`translate(${veh.position.x}, ${veh.position.y}) rotate(${veh.position.heading})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectVehicle(isSelected ? null : veh.id);
                  }}
                  className="cursor-pointer"
                >
                  {/* Vehicle Body Box */}
                  <rect
                    x="-6"
                    y="-4"
                    width="12"
                    height="8"
                    fill={
                      veh.type === 'PUSHBACK_TRACTOR'
                        ? '#eab308'
                        : veh.type === 'FUEL_BOWSER'
                        ? '#ef4444'
                        : veh.type === 'BAGGAGE_TUG'
                        ? '#3b82f6'
                        : '#10b981'
                    }
                    stroke="#ffffff"
                    strokeWidth={isSelected ? 1.5 : 0.6}
                    rx="1.5"
                  />
                  {/* Small direction nose */}
                  <polygon points="6,-2 8,0 6,2" fill="#ffffff" />

                  {showDataTags && (
                    <text
                      x="9"
                      y="3"
                      fill="#94a3b8"
                      fontSize="7"
                      fontFamily="monospace"
                      fontWeight="bold"
                      transform={`rotate(${-veh.position.heading})`}
                    >
                      {veh.callsign}
                    </text>
                  )}
                </g>
              );
            })}

          {/* Aircraft Rendering */}
          {flights.map((flight) => {
            const isSelected = selectedFlightId === flight.id;
            const isHeavy = flight.category === 'E';
            const isMid = flight.category === 'D';
            const scale = isHeavy ? 1.35 : isMid ? 1.15 : 0.95;

            // Transponder track color
            const targetColor =
              flight.delayMinutes > 15
                ? '#f59e0b'
                : flight.status === 'CANCELLED'
                ? '#ef4444'
                : flight.status === 'AT_GATE'
                ? '#38bdf8'
                : '#10b981';

            return (
              <g
                key={flight.id}
                transform={`translate(${flight.position.x}, ${flight.position.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  selectFlight(isSelected ? null : flight.id);
                  selectGate(flight.assignedGateId || null);
                  selectRunway(null);
                }}
                className="cursor-pointer"
              >
                {/* Velocity Leader Line (Radar trace vector) */}
                {flight.position.speed > 5 && (
                  <line
                    x1="0"
                    y1="0"
                    x2={Math.cos((flight.position.heading * Math.PI) / 180) * (flight.position.speed * 0.25)}
                    y2={Math.sin((flight.position.heading * Math.PI) / 180) * (flight.position.speed * 0.25)}
                    stroke={targetColor}
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                    opacity="0.8"
                  />
                )}

                {/* Aircraft Silhouette Geometry */}
                <g transform={`rotate(${flight.position.heading}) scale(${scale})`}>
                  {/* Outer Radar Ping ring when selected */}
                  {isSelected && (
                    <circle
                      cx="0"
                      cy="0"
                      r="18"
                      fill="none"
                      stroke="#00e5ff"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      className="animate-spin"
                    />
                  )}

                  {/* Fuselage & Wings */}
                  <path
                    d={
                      isHeavy
                        ? 'M 0 -13 L 2 -4 L 14 3 L 14 6 L 3 4 L 3 9 L 6 12 L 6 14 L 0 13 L -6 14 L -6 12 L -3 9 L -3 4 L -14 6 L -14 3 L -2 -4 Z'
                        : 'M 0 -10 L 1.5 -3 L 10 2 L 10 4 L 2 3 L 2 7 L 4.5 9 L 4.5 11 L 0 10 L -4.5 11 L -4.5 9 L -2 7 L -2 3 L -10 4 L -10 2 L -1.5 -3 Z'
                    }
                    fill={isSelected ? '#00e5ff' : targetColor}
                    stroke="#0b131a"
                    strokeWidth="0.8"
                  />

                  {/* Jet Engines for realism */}
                  <rect x="4.5" y="0" width="1.8" height="4" fill="#1b2836" rx="0.5" />
                  <rect x="-6.3" y="0" width="1.8" height="4" fill="#1b2836" rx="0.5" />
                  {isHeavy && (
                    <>
                      <rect x="8" y="1" width="1.8" height="3.5" fill="#1b2836" rx="0.5" />
                      <rect x="-9.8" y="1" width="1.8" height="3.5" fill="#1b2836" rx="0.5" />
                    </>
                  )}
                </g>

                {/* Radar Data Block Tag (ICAO standard datablock) */}
                {showDataTags && flight.status !== 'AT_GATE' && (
                  <g transform="translate(14, -14)" className="pointer-events-none">
                    <rect
                      x="0"
                      y="-12"
                      width="68"
                      height="30"
                      fill="#070c12ee"
                      stroke={isSelected ? '#00e5ff' : '#1e3044'}
                      strokeWidth="1"
                      rx="2"
                    />
                    <text x="4" y="-2" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">
                      {flight.flightNumber} [{flight.category}]
                    </text>
                    <text x="4" y="8" fill={flight.delayMinutes > 10 ? '#f59e0b' : '#38bdf8'} fontSize="8" fontFamily="monospace">
                      {flight.position.altitude > 0 ? `A${Math.round(flight.position.altitude / 100).toString().padStart(3, '0')}` : 'GND'}{' '}
                      {Math.round(flight.position.speed)}K
                    </text>
                    <text x="4" y="16" fill="#8ca3ba" fontSize="7" fontFamily="monospace">
                      {flight.isArrival ? `ARR -> ${flight.assignedGateId}` : `DEP -> ${flight.assignedRunwayId}`}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating Tactical Overlay Controls */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        {/* Layer Toggles Panel */}
        <div className="bg-[#0c131ce6] backdrop-blur-md border border-[#1d2d3e] p-2 rounded-lg text-xs font-mono-data shadow-xl flex flex-col gap-1.5">
          <div className="flex items-center justify-between pb-1 border-b border-[#1b2b3b] text-[10px] text-[#637d96] font-bold">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-cyan-400" />
              RADAR LAYERS
            </span>
            <span>ZOOM {(zoom * 100).toFixed(0)}%</span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer hover:text-white text-[#94a8bd]">
            <input
              type="checkbox"
              checked={showRadarRings}
              onChange={(e) => setShowRadarRings(e.target.checked)}
              className="rounded accent-cyan-500 cursor-pointer"
            />
            <span>Range Rings (NM)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer hover:text-white text-[#94a8bd]">
            <input
              type="checkbox"
              checked={showTaxiways}
              onChange={(e) => setShowTaxiways(e.target.checked)}
              className="rounded accent-cyan-500 cursor-pointer"
            />
            <span>Taxiway Guidance</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer hover:text-white text-[#94a8bd]">
            <input
              type="checkbox"
              checked={showVehicles}
              onChange={(e) => setShowVehicles(e.target.checked)}
              className="rounded accent-cyan-500 cursor-pointer"
            />
            <span>Ground Vehicles</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer hover:text-white text-[#94a8bd]">
            <input
              type="checkbox"
              checked={showDataTags}
              onChange={(e) => setShowDataTags(e.target.checked)}
              className="rounded accent-cyan-500 cursor-pointer"
            />
            <span>Transponder Tags</span>
          </label>
        </div>
      </div>

      {/* Pan & Zoom On-screen Controls */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 bg-[#0c131ce6] backdrop-blur-md border border-[#1d2d3e] p-1.5 rounded-lg shadow-xl">
        <button
          onClick={() => setZoom((z) => Math.min(3.2, +(z + 0.25).toFixed(2)))}
          className="p-1.5 rounded hover:bg-[#1b2b3d] text-[#8ea5bc] hover:text-white"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
          className="p-1.5 rounded hover:bg-[#1b2b3d] text-[#8ea5bc] hover:text-white"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          className="p-1.5 rounded hover:bg-[#1b2b3d] text-[#8ea5bc] hover:text-white text-[11px] font-mono-data px-2"
          title="Reset Center & Zoom"
        >
          FIT
        </button>
      </div>

      {/* Wind Vector Compass Widget (Top Right) */}
      <div className="absolute top-4 right-4 z-20 bg-[#0c131ce6] backdrop-blur-md border border-[#1d2d3e] p-2.5 rounded-lg shadow-xl flex items-center gap-3 font-mono-data text-xs">
        <div className="relative w-10 h-10 rounded-full border border-[#22364a] flex items-center justify-center bg-[#070b10]">
          {/* Compass North needle */}
          <span className="absolute top-0.5 text-[8px] text-red-400 font-bold">N</span>
          {/* Wind direction arrow */}
          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-700"
            style={{ transform: `rotate(${weather.windDirectionDeg}deg)` }}
          >
            <div className="w-0.5 h-6 bg-cyan-400 relative">
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400 rotate-45" />
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-[#637d96]">WIND COMPONENT</span>
          <span className="text-cyan-300 font-bold">
            {weather.windDirectionDeg}° / {weather.windSpeedKnots} KT
          </span>
          <span className="text-[10px] text-[#8fa7be]">
            X-WIND: {weather.crosswindComponent} KT
          </span>
        </div>
      </div>

      {/* Selected Entity Tactical HUD Inspector (Bottom Right) */}
      {(activeFlight || activeGate || activeRunway || activeVehicle) && (
        <div className="absolute bottom-4 right-4 z-20 w-80 bg-[#0c141eee] backdrop-blur-md border border-[#22364d] rounded-xl p-3.5 shadow-2xl font-mono-data text-xs">
          {/* Flight Details HUD */}
          {activeFlight && (
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#1b2b3d]">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: activeFlight.airline.color }}
                  />
                  <span className="text-base font-bold text-white tracking-wider">
                    {activeFlight.flightNumber}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#162536] text-cyan-300 font-bold">
                    CODE {activeFlight.category}
                  </span>
                </div>
                <button
                  onClick={() => selectFlight(null)}
                  className="text-[#647c94] hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2.5 text-[11px]">
                <div>
                  <span className="text-[#59738c] block text-[10px]">ROUTE</span>
                  <span className="font-semibold text-[#d4e4f5]">
                    {activeFlight.origin} → {activeFlight.destination}
                  </span>
                </div>
                <div>
                  <span className="text-[#59738c] block text-[10px]">AIRCRAFT</span>
                  <span className="font-semibold text-[#d4e4f5] truncate block">
                    {activeFlight.aircraftType}
                  </span>
                </div>
                <div>
                  <span className="text-[#59738c] block text-[10px]">STATUS</span>
                  <span className="font-bold text-emerald-400">{activeFlight.status}</span>
                </div>
                <div>
                  <span className="text-[#59738c] block text-[10px]">ASSIGNED GATE</span>
                  <span className="font-bold text-cyan-300">GATE {activeFlight.assignedGateId}</span>
                </div>
                <div>
                  <span className="text-[#59738c] block text-[10px]">DELAY DELTA</span>
                  <span
                    className={`font-bold ${
                      activeFlight.delayMinutes > 0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {activeFlight.delayMinutes > 0 ? `+${activeFlight.delayMinutes} MIN` : 'ON SCHEDULE'}
                  </span>
                </div>
                <div>
                  <span className="text-[#59738c] block text-[10px]">RUNWAY</span>
                  <span className="font-semibold text-[#d4e4f5]">{activeFlight.assignedRunwayId}</span>
                </div>
              </div>

              {activeFlight.delayHistory.length > 0 && (
                <div className="mt-2.5 p-1.5 rounded bg-[#182330] border border-[#27384c] text-[10px] text-amber-300">
                  <span className="font-bold text-amber-400">TRACEABLE DELAY: </span>
                  {activeFlight.delayHistory[0].message}
                </div>
              )}

              <div className="mt-3 pt-2 border-t border-[#1b2b3d] flex items-center justify-between">
                <button
                  onClick={() => setActiveView('FLIGHTS')}
                  className="text-cyan-400 hover:text-cyan-300 text-[11px] font-semibold flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  View Full Flight Timeline
                </button>
                <button
                  onClick={() => setActiveView('GATES')}
                  className="px-2 py-1 bg-[#192b3d] hover:bg-[#233c56] rounded text-[#c7dbee] text-[10px]"
                >
                  Reassign Gate
                </button>
              </div>
            </div>
          )}

          {/* Gate Details HUD */}
          {activeGate && !activeFlight && (
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#1b2b3d]">
                <div>
                  <span className="text-base font-bold text-white">GATE {activeGate.id}</span>
                  <span className="text-[10px] text-[#6a849e] ml-2">
                    {activeGate.concourse} • {activeGate.terminal}
                  </span>
                </div>
                <button
                  onClick={() => selectGate(null)}
                  className="text-[#647c94] hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2.5 text-[11px]">
                <div>
                  <span className="text-[#59738c] block text-[10px]">MAX ICAO RATING</span>
                  <span className="font-bold text-cyan-300">CODE {activeGate.maxCategory}</span>
                </div>
                <div>
                  <span className="text-[#59738c] block text-[10px]">DUAL JETBRIDGE</span>
                  <span className="font-semibold text-[#d4e4f5]">
                    {activeGate.hasDualJetbridge ? 'YES (Wide-body)' : 'NO'}
                  </span>
                </div>
                <div>
                  <span className="text-[#59738c] block text-[10px]">CURRENT STATUS</span>
                  <span
                    className={`font-bold ${
                      activeGate.status === 'AVAILABLE'
                        ? 'text-emerald-400'
                        : activeGate.status === 'OCCUPIED'
                        ? 'text-cyan-400'
                        : 'text-red-400'
                    }`}
                  >
                    {activeGate.status}
                  </span>
                </div>
                <div>
                  <span className="text-[#59738c] block text-[10px]">ASSIGNED AIRCRAFT</span>
                  <span className="font-semibold text-[#d4e4f5]">
                    {activeGate.currentFlightId
                      ? flights.find((f) => f.id === activeGate.currentFlightId)?.flightNumber
                      : 'NONE'}
                  </span>
                </div>
              </div>

              {activeGate.outOfServiceReason && (
                <div className="mt-2.5 p-1.5 rounded bg-red-950/50 border border-red-800/60 text-[10px] text-red-300">
                  <span className="font-bold text-red-400">OUTAGE REASON: </span>
                  {activeGate.outOfServiceReason}
                </div>
              )}

              <div className="mt-3 pt-2 border-t border-[#1b2b3d] flex items-center justify-between">
                <button
                  onClick={() => toggleGateOutage(activeGate.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                    activeGate.status === 'OUT_OF_SERVICE'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-red-950 hover:bg-red-900 text-red-300 border border-red-800'
                  }`}
                >
                  {activeGate.status === 'OUT_OF_SERVICE' ? 'Restore Gate Service' : 'Trigger Gate Outage'}
                </button>
                <button
                  onClick={() => setActiveView('GATES')}
                  className="text-cyan-400 hover:text-cyan-300 text-[11px]"
                >
                  Open Gantt
                </button>
              </div>
            </div>
          )}

          {/* Runway Details HUD */}
          {activeRunway && !activeFlight && !activeGate && (
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#1b2b3d]">
                <div>
                  <span className="text-base font-bold text-white">{activeRunway.name}</span>
                  <span className="text-[10px] text-[#6a849e] ml-2">{activeRunway.lengthFt.toLocaleString()} FT</span>
                </div>
                <button
                  onClick={() => selectRunway(null)}
                  className="text-[#647c94] hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2.5 text-[11px]">
                <div>
                  <span className="text-[#59738c] block text-[10px]">ILS APPROACH</span>
                  <span className="font-bold text-cyan-300">{activeRunway.ilsCategory}</span>
                </div>
                <div>
                  <span className="text-[#59738c] block text-[10px]">VISUAL RANGE (RVR)</span>
                  <span className="font-semibold text-[#d4e4f5]">{activeRunway.visualRangeRVR} M</span>
                </div>
                <div>
                  <span className="text-[#59738c] block text-[10px]">STATUS</span>
                  <span
                    className={`font-bold ${
                      activeRunway.status === 'ACTIVE' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {activeRunway.status}
                  </span>
                </div>
                <div>
                  <span className="text-[#59738c] block text-[10px]">ACTIVE HEADING</span>
                  <span className="font-semibold text-[#d4e4f5]">RUNWAY {activeRunway.activeHeading}</span>
                </div>
              </div>

              {activeRunway.closureReason && (
                <div className="mt-2.5 p-1.5 rounded bg-red-950/50 border border-red-800/60 text-[10px] text-red-300">
                  <span className="font-bold text-red-400">CLOSURE REASON: </span>
                  {activeRunway.closureReason}
                </div>
              )}

              <div className="mt-3 pt-2 border-t border-[#1b2b3d] flex items-center justify-between">
                <button
                  onClick={() => toggleRunway(activeRunway.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                    activeRunway.status === 'CLOSED'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-red-950 hover:bg-red-900 text-red-300 border border-red-800'
                  }`}
                >
                  {activeRunway.status === 'CLOSED' ? 'Reopen Runway' : 'Issue Runway Closure NOTAM'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
