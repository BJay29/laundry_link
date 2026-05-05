import React from 'react';
import MachineCard from "./machinecard";
import apiService from "../../services/APIservices";

// ─── DEFAULT 12 MACHINE SLOTS ─────────────────────────────────────────────────
// Always rendered. Backend data is merged on top when available.
// Status changes from backend (Booking → machine goes Busy/Active).
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
 * MachineGrid
 * - Always shows 12 slots (W1–W6, D1–D6)
 * - Merges live backend data on top (status, cycles, etc.)
 * - Extra machines beyond 12 appended at the end
 */
const MachineGrid = ({
  machines = [],       // live data from backend
  loading = false,
  onUpdate,
  onSelect,
  isSelectionMode = false,
}) => {

  // Merge backend data into the default 12 slots
  const mergedSlots = DEFAULT_SLOTS.map(slot => {
    const live = machines.find(
      m => m.machine_type === slot.machine_type && m.machine_number === slot.machine_number
    );
    if (live) {
      return {
        ...slot,
        ...live,
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

  // Extra machines beyond the standard 12 (W7+, D7+)
  const extras = machines.filter(m => {
    const isDefaultWasher = m.machine_type === 'Washer' && m.machine_number <= 6;
    const isDefaultDryer  = m.machine_type === 'Dryer'  && m.machine_number <= 6;
    return !isDefaultWasher && !isDefaultDryer;
  }).map(m => ({ ...m, _key: `extra-${m.id}` }));

  const allMachines = [...mergedSlots, ...extras];

  // Click: select (booking modal) or toggle maintenance (dashboard)
  const handleClick = async (machine) => {
    if (isSelectionMode) {
      if (!machine.id) return; // placeholder — not in DB yet
      if (onSelect) onSelect(machine);
      return;
    }
    if (!machine.id) return; // placeholder — can't toggle what's not in DB
    try {
      await apiService.toggleMaintenance(machine.id);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Status update failed:", err);
    }
  };

  // Loading skeleton
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
          onClick={() => handleClick(machine)}
        />
      ))}
    </div>
  );
};

export default MachineGrid;
