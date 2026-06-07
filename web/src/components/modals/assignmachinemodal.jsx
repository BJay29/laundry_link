import React, { useState } from 'react';
import { X, Cpu, HardDrive, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import apiService from '../../services/APIservices';

/**
 * ASSIGN MACHINE MODAL
 * NEW COMPONENT
 * Shown when a booking is Pending with no machine assigned.
 * Allows the user to pick an available washer and/or dryer and assign them.
 * 
 * Props:
 *  - isOpen: boolean
 *  - booking: the pending booking object
 *  - availableMachines: array of machine objects with status available/idle/ready
 *  - onClose: () => void
 *  - onSuccess: (message: string) => void
 */
const AssignMachineModal = ({ isOpen, booking, availableMachines, onClose, onSuccess }) => {
  const [selectedWasher, setSelectedWasher] = useState(null);
  const [selectedDryer, setSelectedDryer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !booking) return null;

  const washers = availableMachines.filter(m => m.machine_type === 'Washer');
  const dryers = availableMachines.filter(m => m.machine_type === 'Dryer');

  const hasMachineSelected = selectedWasher || selectedDryer;

  const handleAssign = async () => {
    if (!hasMachineSelected) return;

    setIsSubmitting(true);
    try {
      await apiService.assignMachineToBooking(booking.id, {
        washer_id: selectedWasher ? parseInt(selectedWasher) : null,
        dryer_id: selectedDryer ? parseInt(selectedDryer) : null,
      });

      const parts = [];
      if (selectedWasher) {
        const w = washers.find(m => m.id === selectedWasher);
        if (w) parts.push(`W${w.machine_number}`);
      }
      if (selectedDryer) {
        const d = dryers.find(m => m.id === selectedDryer);
        if (d) parts.push(`D${d.machine_number}`);
      }

      onSuccess(`✅ Machine${parts.length > 1 ? 's' : ''} ${parts.join(' & ')} assigned to ${booking.customer_name}.`);
    } catch (error) {
      console.error('Assign machine error:', error);
      const msg = error.response?.data?.detail;
      alert(typeof msg === 'string' ? msg : 'Failed to assign machine. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMachineButtons = (machines, type, selectedId, setSelected) => {
    if (machines.length === 0) {
      return (
        <div className="col-span-3 py-4 text-center">
          <span className="text-[10px] font-bold text-slate-300 uppercase italic">No {type}s Available</span>
        </div>
      );
    }

    return machines
      .sort((a, b) => a.machine_number - b.machine_number)
      .map((machine) => {
        const isSelected = selectedId === machine.id;
        return (
          <button
            key={`assign-${type}-${machine.id}`}
            type="button"
            onClick={() => setSelected(isSelected ? null : machine.id)}
            className={`h-14 rounded-2xl text-[12px] font-black border-2 transition-all duration-200 relative
              ${isSelected
                ? type === 'Washer'
                  ? 'bg-sky-500 border-sky-600 text-white shadow-lg shadow-sky-200 scale-105'
                  : 'bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-200 scale-105'
                : 'bg-white border-slate-200 text-slate-600 hover:border-sky-300 hover:bg-sky-50/30'
              }`}
          >
            <div className="flex flex-col items-center justify-center leading-tight">
              <span>{type === 'Washer' ? 'W' : 'D'}{machine.machine_number}</span>
              <span className="text-[7px] opacity-60 uppercase">Available</span>
            </div>
            {isSelected && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-inherit animate-pulse" />
            )}
          </button>
        );
      });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-white/20">

        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-slate-50">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Assign Machine</h2>
              <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.15em] mt-1">
                Select a machine for this booking
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-rose-50 hover:text-rose-500 rounded-2xl text-slate-300 transition-all active:scale-90"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Booking Info */}
        <div className="px-8 py-5 bg-amber-50/60 border-b border-amber-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 font-black text-sm shrink-0">
              {booking.customer_name?.charAt(0).toUpperCase() || 'C'}
            </div>
            <div>
              <p className="text-slate-900 font-black text-sm">{booking.customer_name}</p>
              <p className="text-slate-500 text-[11px] font-bold">
                {booking.service_type} · {booking.weight} KG
              </p>
            </div>
            <span className="ml-auto px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[9px] font-black uppercase tracking-widest">
              Pending
            </span>
          </div>
        </div>

        {/* Machine Selection */}
        <div className="px-8 py-6 space-y-6">

          {/* Washer Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Cpu size={13} className="text-sky-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Washers</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {renderMachineButtons(washers, 'Washer', selectedWasher, setSelectedWasher)}
            </div>
          </div>

          {/* Dryer Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <HardDrive size={13} className="text-orange-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dryers</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {renderMachineButtons(dryers, 'Dryer', selectedDryer, setSelectedDryer)}
            </div>
          </div>

          {/* No selection warning */}
          {!hasMachineSelected && (
            <div className="flex items-center gap-2 text-slate-400 bg-slate-50 rounded-2xl px-4 py-3">
              <AlertTriangle size={14} className="shrink-0" />
              <p className="text-[11px] font-medium">Select at least one machine to assign.</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-8 pb-8 pt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 rounded-[24px] border-2 border-slate-100 text-slate-400 font-black text-sm hover:bg-slate-50 transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={!hasMachineSelected || isSubmitting}
            className={`flex-[2] py-4 rounded-[24px] font-black text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg
              ${!hasMachineSelected || isSubmitting
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-sky-500 hover:bg-sky-600 shadow-sky-200'
              }`}
          >
            {isSubmitting ? (
              <><Loader2 size={18} className="animate-spin" /> Assigning...</>
            ) : (
              <><CheckCircle2 size={18} /> Assign Machine</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AssignMachineModal;
