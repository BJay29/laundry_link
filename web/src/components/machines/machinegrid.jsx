import React from 'react';
import MachineCard from "./machinecard";
import apiService from "../../services/APIservices";

/**
 * DEFAULT_SLOTS
 * Provides a consistent UI layout of 12 machines (6 Washers, 6 Dryers).
 * These act as placeholders until the backend data is merged on top.
 */
const DEFAULT_SLOTS = [
  ...Array.from({ length: 6 }, (_, i) => ({
    _key: `W${i + 1}`,
    machine_number: i + 1,
    machine_type: 'Washer',
    status: 'Available',
    profitability_score: 0,
    total_cycles: 0,
    maintenance_cost: 0,
    current_price: 0,
    remaining_time: 0,
    id: null,
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    _key: `D${i + 1}`,
    machine_number: i + 1,
    machine_type: 'Dryer',
    status: 'Available',
    profitability_score: 0,
    total_cycles: 0,
    maintenance_cost: 0,
    current_price: 0,
    remaining_time: 0,
    id: null,
  })),
];

/**
 * MachineGrid Component
 * - Renders a responsive grid of laundry machines.
 * - Merges live backend data with 12 default UI slots for layout stability.
 * - Handles both Management (toggle maintenance) and Selection (booking) modes.
 */
const MachineGrid = ({
  machines = [],       // Live data array from FastAPI
  loading = false,
  onUpdate,            // Callback to refresh data after an action
  onSelect,            // Callback for BookingModal selection
  isSelectionMode = false,
}) => {

  /**
   * DATA MERGING LOGIC
   * Maps through the 12 default slots and replaces placeholder values with
   * live data if a machine with the same type and number exists in the DB.
   */
  const mergedSlots = DEFAULT_SLOTS.map(slot => {
    const live = machines.find(
      m => m.machine_type === slot.machine_type && m.machine_number === slot.machine_number
    );
    
    if (live) {
      return {
        ...slot,
        ...live, // Overwrite defaults with real DB values (id, status, etc.)
        _key: slot._key,
        status: live.status || 'Available',
        profitability_score: live.profitability_score || 0,
        total_cycles: live.total_cycles || 0,
        maintenance_cost: live.maintenance_cost || 0,
        current_price: live.current_price || 0,
        remaining_time: live.remaining_time || 0,
      };
    }
    return slot;
  });

  /**
   * EXTRA MACHINES
   * Captures any machines from the backend that exceed the default 1-6 numbering
   * (e.g., Washer #7 or Dryer #10) and appends them to the end of the grid.
   */
  const extras = machines.filter(m => {
    const isDefaultWasher = m.machine_type === 'Washer' && m.machine_number <= 6;
    const isDefaultDryer  = m.machine_type === 'Dryer'  && m.machine_number <= 6;
    return !isDefaultWasher && !isDefaultDryer;
  }).map(m => ({ ...m, _key: `extra-${m.id}` }));

  const allMachines = [...mergedSlots, ...extras];

  /**
   * CLICK HANDLER
   * Determines action based on the 'isSelectionMode' prop.
   */
  const handleClick = async (machine) => {
    // Safety Check: If machine.id is null, it exists in UI but not in the Database
    if (!machine.id) {
      console.warn("Action Ignored: Machine placeholder is not registered in the database.");
      return;
    }

    if (isSelectionMode) {
      /**
       * SELECTION MODE (Booking)
       * Triggered when selecting a machine for a new laundry order.
       * Only 'Available' or 'Idle' machines should typically be selectable.
       */
      const status = machine.status?.toLowerCase();
      if (status !== 'available' && status !== 'idle') {
        alert(`This ${machine.machine_type} is currently ${status}.`);
        return;
      }
      
      if (onSelect) onSelect(machine);
      return;
    }

    /**
     * MANAGEMENT MODE (Dashboard)
     * Toggles the machine between 'Available' and 'Maintenance' states.
     */
    try {
      await apiService.toggleMaintenance(machine.id);
      if (onUpdate) onUpdate(); // Refresh the parent state to show new status
    } catch (err) {
      console.error("Maintenance toggle failed:", err);
      alert("Failed to update machine status. Please check connection.");
    }
  };

  /**
   * LOADING STATE
   * Renders skeleton cards to prevent layout shift during initial data fetch.
   */
  if (loading && machines.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="h-64 bg-slate-100 rounded-[40px] border-2 border-slate-50" />
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
          maintenance_cost={machine.maintenance_cost}
          current_price={machine.current_price}
          time_remaining={machine.remaining_time}
          profitability_score={machine.profitability_score}
          // Only show pointer cursor if the machine exists in the database
          onClick={machine.id ? () => handleClick(machine) : undefined}
          className={!machine.id ? "opacity-50 grayscale cursor-not-allowed" : "cursor-pointer"}
        />
      ))}
    </div>
  );
};

export default MachineGrid;