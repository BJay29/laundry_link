import React from 'react';
import MachineCard from "./machinecard";
import apiService from "../../services/APIservices";

/**
 * Static UI layout (6 Washers, 6 Dryers). 
 * These placeholders prevent layout shifts while data loads and define the shop structure.
 * They are initialized with zeroed metrics that get populated by merged live data.
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
   * Merges live Database telemetry into the 12 default UI slots.
   * Ensures profitability and hardware cycle times are passed to the cards.
   */
  const mergedSlots = DEFAULT_SLOTS.map(slot => {
    const live = machines.find(
      m => m.machine_type === slot.machine_type && m.machine_number === slot.machine_number
    );
    
    if (live) {
      // Logic: Prioritize backend metrics (PredictionService results)
      return {
        ...slot,
        ...live, 
        // Syncing specific fields derived from backend PredictionService
        status: live.status || 'Available',
        remaining_time: live.remaining_time || 0,
        profitability_rate: live.profitability_rate || 0,
        net_profit_accumulated: live.net_profit_accumulated || 0,
      };
    }
    return slot;
  });

  /**
   * Append extra machines that exist in the DB but are outside the W1-6 / D1-6 default set.
   * This allows the shop to scale beyond the initial 12-machine footprint.
   */
  const extras = machines.filter(m => {
    const isDefaultWasher = m.machine_type === 'Washer' && m.machine_number <= 6;
    const isDefaultDryer  = m.machine_type === 'Dryer'  && m.machine_number <= 6;
    return !isDefaultWasher && !isDefaultDryer;
  }).map(m => ({ ...m, _key: `extra-${m.id}` }));

  const allMachines = [...mergedSlots, ...extras];

  /**
   * Action Handler:
   * 1. If in Selection Mode (Service Terminal): Selects machine for booking.
   * 2. If in Default Mode (Machine Hub): Toggles hardware maintenance state.
   */
  const handleClick = async (machine) => {
    if (!machine.id) return; // Ignore clicks on unregistered or offline placeholders

    if (isSelectionMode) {
      const status = machine.status?.toLowerCase();
      // Guard clause: Prevent booking machines that are already busy or undergoing repair
      if (status !== 'available' && status !== 'idle') {
        alert(`Warning: This unit is currently ${status}. Please select an idle machine.`);
        return;
      }
      if (onSelect) onSelect(machine);
      return;
    }

    // Toggle maintenance status via API to reflect hardware downtime in telemetry
    try {
      await apiService.toggleMaintenance(machine.id);
      if (onUpdate) onUpdate(); 
    } catch (err) {
      console.error("Hardware status update error:", err);
    }
  };

  // Loading skeleton state: Renders 12 pulsing cards to match the shop's physical layout
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
          total_cycles={machine.total_cycles}
          // PROPS SYNC: Passing backend PredictionService results directly to the card
          remaining_time={machine.remaining_time}
          profitability_rate={machine.profitability_rate}
          net_profit_accumulated={machine.net_profit_accumulated}
          // Dynamic pricing and service details for active transactions
          current_service_type={machine.current_service_type}
          current_price={machine.current_price}
          onClick={machine.id ? () => handleClick(machine) : undefined}
          // Visual feedback for unregistered machine slots
          className={!machine.id ? "opacity-40 grayscale cursor-not-allowed" : "cursor-pointer"}
        />
      ))}
    </div>
  );
};

export default MachineGrid;