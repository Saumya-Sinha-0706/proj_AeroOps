import React, { useEffect, useState } from 'react';
import { useOpsStore } from './store/useOpsStore';
import { Header } from './components/Header';
import { MetricsBar } from './components/MetricsBar';
import { AirfieldMap } from './components/AirfieldMap/AirfieldMap';
import { FlightBoard } from './components/FlightBoard/FlightBoard';
import { GateGantt } from './components/GateGantt/GateGantt';
import { DisruptionPanel } from './components/DisruptionPanel/DisruptionPanel';
import { VehicleFleetView } from './components/Vehicles/VehicleFleetView';
import { ShiftHandoverModal } from './components/Handover/ShiftHandoverModal';
import { AlertsDrawer } from './components/Alerts/AlertsDrawer';
import { CommandPalette } from './components/CommandPalette/CommandPalette';

export default function App() {
  const {
    activeView,
    commandPaletteOpen,
    setCommandPaletteOpen,
    shiftReportOpen,
    setShiftReportOpen,
    alertsDrawerOpen,
    setAlertsDrawerOpen,
  } = useOpsStore();

  // Simulation Clock Tick Loop (runs every 1000ms, advancing simulation time based on speed multiplier)
  useEffect(() => {
    const interval = setInterval(() => {
      useOpsStore.getState().tick(1.0); // 1 second real-time tick
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070b10] text-[#c7dbee] overflow-hidden select-none font-sans">
      {/* Top Operations Header */}
      <Header />

      {/* Real-time Telemetry Metrics Bar */}
      <MetricsBar />

      {/* Primary Airfield Viewport */}
      <main className="flex-1 relative flex overflow-hidden">
        {activeView === 'MAP' && <AirfieldMap />}
        {activeView === 'FLIGHTS' && <FlightBoard />}
        {activeView === 'GATES' && <GateGantt />}
        {activeView === 'DISRUPTIONS' && <DisruptionPanel />}
        {activeView === 'VEHICLES' && <VehicleFleetView />}
      </main>

      {/* Duty Manager Shift Handover Modal */}
      {shiftReportOpen && (
        <ShiftHandoverModal onClose={() => setShiftReportOpen(false)} />
      )}

      {/* Alert and Incident Stream Drawer */}
      {alertsDrawerOpen && (
        <AlertsDrawer onClose={() => setAlertsDrawerOpen(false)} />
      )}

      {/* Global Command Dispatch Palette (⌘K) */}
      {commandPaletteOpen && (
        <CommandPalette
          onClose={() => setCommandPaletteOpen(false)}
          onOpenHandover={() => setShiftReportOpen(true)}
        />
      )}
    </div>
  );
}
