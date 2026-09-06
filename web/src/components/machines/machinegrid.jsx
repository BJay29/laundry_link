import React from 'react';
import MachineCard from "./machinecard";
import apiService from "../../services/APIservices";

/**
 * MachineGrid Component
 * Renders EXACTLY the machines that exist in the database — no fixed
 * slot count, no phantom "Offline" placeholders. Whatever is configured
 * in the Machine Hub is what shows here, 1:1.
 *
 * FIXED: Previously hardcoded a DEFAULT_SLOTS array (6 Washers + 6
 * Dryers) and merged live data into those fixed slots — meaning a shop
 * with only 2 machines still showed 12 cards (2 real + 10 fake
 * "Offline" placeholders with id: null). Removed entirely; now maps
 * directly over the `machines` prop.
 */
const MachineGrid = ({
  machines = [],
  loading = false,
  onUpdate,
  onSelect,
  isSelectionMode = false,
}) => {

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
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-64 bg-slate-100 rounded-[40px]" />
        ))}
      </div>
    );
  }

  // No machines configured yet — show an empty state instead of fake cards
  if (!loading && machines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200">
        <p className="text-slate-400 font-black text-sm uppercase tracking-widest">
          No Machines Configured
        </p>
        <p className="text-slate-400 text-xs max-w-sm mt-2">
          Add washers and dryers from the Machine Hub to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {machines.map((machine) => (
        <MachineCard
          key={machine.id}
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