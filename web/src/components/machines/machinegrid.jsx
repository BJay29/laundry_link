import React from 'react';
import MachineCard from "./machinecard";
import apiService from "../../services/APIservices";

/**
 * MachineGrid Component
 *
 * UPDATED (reverted to per-service durations): tumatanggap na ng
 * `serviceDurations` map — { [serviceName]: { washer, dryer } } —
 * galing sa parent (Dashboard). Para sa bawat Busy na machine,
 * hinahanap dito ang duration ng service na kasalukuyang tumatakbo
 * (machine.current_service_type), at pinipili ang washer o dryer
 * value base sa machine.machine_type, bago ipasa sa MachineCard.
 * Pinapalitan nito ang dating per-machine
 * `configured_duration_minutes` na tinanggal na sa backend.
 */
const MachineGrid = ({
  machines = [],
  loading = false,
  onUpdate,
  onSelect,
  isSelectionMode = false,
  now,
  serviceDurations = {},
}) => {

  /**
   * NEW — resolves the correct phase duration for a given machine from
   * the service durations map. Returns undefined if the service isn't
   * found (deleted/renamed since the cycle started) — MachineCard then
   * falls back to the static remaining_time display.
   */
  const resolveDuration = (machine) => {
    const service = serviceDurations[machine.current_service_type];
    if (!service) return undefined;
    return machine.machine_type === 'Washer' ? service.washer : service.dryer;
  };

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

  if (loading && machines.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
        {[...Array(6)].map((_, i) => ( 
          <div key={i} className="h-64 bg-slate-100 rounded-[40px]" />
        ))}
      </div>
    );
  }

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
          service_duration_minutes={resolveDuration(machine)}
          cycle_started_at={machine.cycle_started_at}
          now={now}
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