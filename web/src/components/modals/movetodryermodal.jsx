import React, { useState } from 'react';
import { X, HardDrive, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import apiService from '../../services/APIservices';

/**
 * MOVE TO DRYER MODAL
 * NEW COMPONENT (multi-machine assignment feature)
 *
 * Shown for a SINGLE load that is currently in the "washing" phase,
 * letting staff pick an available dryer for it in real time. Dryers are
 * never reserved upfront when the booking's washers are first assigned
 * — the pick genuinely happens at this moment (see the
 * BookingMachineAssignment docstring in models.py for the reasoning).
 *
 * Calls PATCH /bookings/{id}/loads/{load_number}/move-to-dryer with
 * { dryer_id }. Only relevant for "full_service" loads — "wash_only"
 * loads never show this step, and "dry_only" loads start in the drying
 * phase directly (see ServiceTerminal's use of serviceRequiredPhases to
 * decide when to show the trigger button for this modal).
 *
 * Props:
 *  - isOpen: boolean
 *  - booking: the booking object this load belongs to
 *  - loadNumber: the specific load_number being moved
 *  - availableMachines: array of machine objects with status
 *    available/idle/ready (non-Dryer machines are filtered out internally)
 *  - onClose: () => void
 *  - onSuccess: (message: string) => void
 */
const MoveToDryerModal = ({ isOpen, booking, loadNumber, availableMachines, onClose, onSuccess }) => {
  const [selectedDryer, setSelectedDryer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !booking || !loadNumber) return null;

  const dryers = availableMachines.filter(m => m.machine_type === 'Dryer');

  const handleMove = async () => {
    if (!selectedDryer) return;

    setIsSubmitting(true);
    try {
      await apiService.moveLoadToDryer(booking.id, loadNumber, {
        dryer_id: parseInt(selectedDryer),
      });

      const dryer = dryers.find(m => m.id === selectedDryer);
      onSuccess(
        `✅ Load ${loadNumber} moved to Dryer${dryer ? ` D${dryer.machine_number}` : ''} for ${booking.customer_name}.`
      );
    } catch (error) {
      console.error('Move to dryer error:', error);
      const msg = error.response?.data?.detail;
      alert(typeof msg === 'string' ? msg : 'Failed to move load to dryer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-white/20">

        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-slate-50">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Move to Dryer</h2>
              <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.15em] mt-1">
                Load {loadNumber} · {booking.customer_name}
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

        {/* Dryer Selection */}
        <div className="px-8 py-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <HardDrive size={13} className="text-orange-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dryers</span>
          </div>

          {dryers.length === 0 ? (
            <div className="py-4 text-center">
              <span className="text-[10px] font-bold text-slate-300 uppercase italic">No Dryers Available</span>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {dryers
                .sort((a, b) => a.machine_number - b.machine_number)
                .map((machine) => {
                  const isSelected = selectedDryer === machine.id;
                  return (
                    <button
                      key={`dryer-${machine.id}`}
                      type="button"
                      onClick={() => setSelectedDryer(isSelected ? null : machine.id)}
                      className={`h-14 rounded-2xl text-[12px] font-black border-2 transition-all duration-200 relative
                        ${isSelected
                          ? 'bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-200 scale-105'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300 hover:bg-orange-50/30'
                        }`}
                    >
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span>D{machine.machine_number}</span>
                        <span className="text-[7px] opacity-60 uppercase">Available</span>
                      </div>
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-inherit animate-pulse" />
                      )}
                    </button>
                  );
                })}
            </div>
          )}

          {!selectedDryer && dryers.length > 0 && (
            <div className="flex items-center gap-2 text-slate-400 bg-slate-50 rounded-2xl px-4 py-3">
              <AlertTriangle size={14} className="shrink-0" />
              <p className="text-[11px] font-medium">Select a dryer to continue.</p>
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
            onClick={handleMove}
            disabled={!selectedDryer || isSubmitting}
            className={`flex-[2] py-4 rounded-[24px] font-black text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg
              ${!selectedDryer || isSubmitting
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'
              }`}
          >
            {isSubmitting ? (
              <><Loader2 size={18} className="animate-spin" /> Moving...</>
            ) : (
              <><CheckCircle2 size={18} /> Move to Dryer</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default MoveToDryerModal;
