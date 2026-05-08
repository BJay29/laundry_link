import React from 'react';
import MachineCard from "./machinecard";
import apiService from "../../services/APIservices";

/**
 * MachineGrid Component
 * Synchronizes physical shop layout (12 default slots) with live Database telemetry.
 * * FIX APPLIED: 
 * Explicitly maps 'net_profit_accumulated' from the database response 
 * to the 'net_profit' prop used by the MachineCard for display.
 */
const DEFAULT_SLOTS = [
  ...Array.from({ length: 6 }, (_, i) => ({
    _key: `W${i + 1}`,
    machine_number: i + 1,
    machine_type: 'Washer',
    status: 'Offline',
    total_cycles: 0,
    remaining_time: 0,
    profitability_rate: 0,
    net_profit_accumulated: 0, 
    id: null,
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    _key: `D${i + 1}`,
    machine_number: i + 1,
    machine_type: 'Dryer',
    status: 'Offline',
    total_cycles: 0,
    remaining_time: 0,
    profitability_rate: 0,
    net_profit_accumulated: 0, 
    id: null,
  })),
];

const MachineGrid = ({
  machines = [], 
  loading = false,
  onUpdate, 
  onSelect, 
  isSelectionMode = false,
}) => {

  /**
   * Merging Logic:
   * Maps live database records to the physical 12-slot layout.
   * Prioritizes 'net_profit_accumulated' as the primary source of financial data.
   */
  const mergedSlots = DEFAULT_SLOTS.map(slot => {
    const live = machines.find(
      m => m.machine_type === slot.machine_type && m.machine_number === slot.machine_number
    );
    
    if (live) {
      return {
        ...slot,
        ...live, 
        status: live.status || 'Available',
        remaining_time: live.remaining_time || 0,
        // UI SYNC: Ensure the accumulated profit from DB is captured
        net_profit_display: live.net_profit_accumulated || 0,
        profitability_rate: live.profitability_rate || 0,
        total_cycles: live.total_cycles || 0
      };
    }
    return slot;
  });

  /**
   * Extras Logic:
   * Handles any extra machines in the database that exceed the standard 12 slots.
   */
  const extras = machines.filter(m => {
    const isDefaultWasher = m.machine_type === 'Washer' && m.machine_number <= 6;
    const isDefaultDryer  = m.machine_type === 'Dryer'  && m.machine_number <= 6;
    return !isDefaultWasher && !isDefaultDryer;
  }).map(m => ({ 
    ...m, 
    _key: `extra-${m.id}`,
    net_profit_display: m.net_profit_accumulated || 0 
  }));

  const allMachines = [...mergedSlots, ...extras];

  /**
   * Action Handler:
   * Handles maintenance toggles or selection for new bookings.
   */
  const handleClick = async (machine) => {
    if (!machine.id) return; 

    if (isSelectionMode) {
      const status = machine.status?.toLowerCase();
      if (status !== 'available' && status !== 'idle') {
        alert(`Warning: ${machine.machine_type} ${machine.machine_number} is ${status}.`);
        return;
      }
      if (onSelect) onSelect(machine);
      return;
    }

    try {
      await apiService.toggleMaintenance(machine.id);
      if (onUpdate) onUpdate(); 
    } catch (err) {
      console.error("Hardware sync error:", err);
    }
  };

  // Pulse skeleton for initial loading
  if (loading && machines.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="h-64 bg-slate-100 rounded-[40px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {allMachines.map((machine) => (
        <MachineCard
          key={machine._key || machine.id}
          machine_number={machine.machine_number}
          machine_type={machine.machine_type}
          status={machine.status}
          remaining_time={machine.remaining_time}
          profitability_rate={machine.profitability_rate}
         net_profit_accumulated={machine.net_profit_accumulated} 
          total_cycles={machine.total_cycles}
          current_service_type={machine.current_service_type}
          current_price={machine.current_price}
          onClick={machine.id ? () => handleClick(machine) : undefined}
        />
      ))}
    </div>
  );
};

export default MachineGrid;