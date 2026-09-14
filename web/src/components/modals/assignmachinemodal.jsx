import React, { useState, useEffect } from 'react';
import { X, Cpu, HardDrive, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import apiService from '../../services/APIservices';

const AssignMachineModal = ({ isOpen, booking, availableMachines, onClose, onSuccess }) => {
  const [selectedMachineIds, setSelectedMachineIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requiredPhases, setRequiredPhases] = useState('full_service');
  const [isLoadingPhases, setIsLoadingPhases] = useState(false);
  // NEW — true kapag hindi nakahanap ng matching service sa catalog
  // (nag-fallback papuntang full_service). Ipinapakita sa UI mismo
  // para agad na makita kung ito ang dahilan ng maling machine type
  // na lumalabas, sa halip na tahimik lang na mali ang assumption.
  const [serviceNotFound, setServiceNotFound] = useState(false);

  const requiredCount = booking?.loads || 1;

  useEffect(() => {
    if (!isOpen || !booking) return;

    setSelectedMachineIds([]);
    setServiceNotFound(false);

    const fetchRequiredPhases = async () => {
      try {
        setIsLoadingPhases(true);
        const shopId = apiService.getShopId();
        const serviceTypes = await apiService.getServiceTypes(shopId);

        // FIXED — dating exact string match lang (s.name ===
        // booking.service_type), kaya kahit maliit na pagkakaiba
        // (extra space, ibang capitalization) ay bumabagsak sa
        // fallback na "full_service" → Washer, kahit "dry_only" pala
        // ang totoong service. Ginawa nang case-insensitive + trimmed
        // ang comparison para mas matatag ito.
        const normalizedBookingService = (booking.service_type || '').trim().toLowerCase();
        const match = (serviceTypes || []).find(
          (s) => (s.name || '').trim().toLowerCase() === normalizedBookingService
        );

        if (match) {
          setRequiredPhases(match.required_phases || 'full_service');
        } else {
          // DEBUG — kung nakikita mo itong warning sa console, ibig
          // sabihin talagang hindi nagta-tugma ang pangalan ng service
          // sa booking kumpara sa kasalukuyang laman ng catalog
          // (marahil na-rename o na-delete na ang service pagkatapos
          // gawin ang booking na ito).
          console.warn(
            `AssignMachineModal: no catalog match for service "${booking.service_type}". ` +
            `Available names: ${(serviceTypes || []).map((s) => s.name).join(', ')}`
          );
          setServiceNotFound(true);
          setRequiredPhases('full_service');
        }
      } catch (error) {
        console.error('Error fetching service required_phases:', error);
        setServiceNotFound(true);
        setRequiredPhases('full_service');
      } finally {
        setIsLoadingPhases(false);
      }
    };
    fetchRequiredPhases();
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const targetType = requiredPhases === 'dry_only' ? 'Dryer' : 'Washer';
  const candidateMachines = availableMachines.filter(m => m.machine_type === targetType);

  const isFullySelected = selectedMachineIds.length === requiredCount;
  const canSelectMore = selectedMachineIds.length < requiredCount;

  const toggleMachine = (machineId) => {
    setSelectedMachineIds(prev => {
      if (prev.includes(machineId)) {
        return prev.filter(id => id !== machineId);
      }
      if (prev.length >= requiredCount) return prev;
      return [...prev, machineId];
    });
  };

  const handleAssign = async () => {
    if (!isFullySelected) return;

    setIsSubmitting(true);
    try {
      await apiService.assignMachinesToBooking(booking.id, {
        machine_ids: selectedMachineIds.map(id => parseInt(id)),
      });

      const labels = selectedMachineIds
        .map(id => candidateMachines.find(m => m.id === id))
        .filter(Boolean)
        .sort((a, b) => a.machine_number - b.machine_number)
        .map(m => `${targetType === 'Washer' ? 'W' : 'D'}${m.machine_number}`);

      onSuccess(`✅ ${labels.join(', ')} assigned to ${booking.customer_name}.`);
    } catch (error) {
      console.error('Assign machines error:', error);
      const msg = error.response?.data?.detail;
      alert(typeof msg === 'string' ? msg : 'Failed to assign machines. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMachineButtons = () => {
    if (candidateMachines.length === 0) {
      return (
        <div className="col-span-4 py-4 text-center">
          <span className="text-[10px] font-bold text-slate-300 uppercase italic">No {targetType}s Available</span>
        </div>
      );
    }

    return candidateMachines
      .sort((a, b) => a.machine_number - b.machine_number)
      .map((machine) => {
        const isSelected = selectedMachineIds.includes(machine.id);
        const isDisabled = !isSelected && !canSelectMore;
        return (
          <button
            key={`assign-${targetType}-${machine.id}`}
            type="button"
            onClick={() => toggleMachine(machine.id)}
            disabled={isDisabled}
            className={`h-14 rounded-2xl text-[12px] font-black border-2 transition-all duration-200 relative
              ${isSelected
                ? targetType === 'Washer'
                  ? 'bg-sky-500 border-sky-600 text-white shadow-lg shadow-sky-200 scale-105'
                  : 'bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-200 scale-105'
                : isDisabled
                  ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-60'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-sky-300 hover:bg-sky-50/30'
              }`}
          >
            <div className="flex flex-col items-center justify-center leading-tight">
              <span>{targetType === 'Washer' ? 'W' : 'D'}{machine.machine_number}</span>
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
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter">
                Assign Machine{requiredCount > 1 ? 's' : ''}
              </h2>
              <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.15em] mt-1">
                {requiredCount > 1
                  ? `Select ${requiredCount} ${targetType.toLowerCase()}s (one per load)`
                  : `Select a ${targetType.toLowerCase()} for this booking`}
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
                {booking.service_type} · {booking.weight > 0 ? `${booking.weight} KG` : `${requiredCount} ${requiredCount > 1 ? 'Loads' : 'Load'}`}
              </p>
            </div>
            <span className="ml-auto px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[9px] font-black uppercase tracking-widest">
              Pending
            </span>
          </div>
        </div>

        {/* Machine Selection */}
        <div className="px-8 py-6 space-y-6">

          {isLoadingPhases ? (
            <div className="flex items-center justify-center py-4 gap-2 text-sky-500 font-bold animate-pulse">
              <Loader2 className="animate-spin" size={16} />
              <span>Checking service requirements...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  {targetType === 'Washer'
                    ? <Cpu size={13} className="text-sky-500" />
                    : <HardDrive size={13} className="text-orange-500" />}
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{targetType}s</span>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${isFullySelected ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {selectedMachineIds.length} / {requiredCount} selected
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {renderMachineButtons()}
              </div>
            </div>
          )}

          {/* NEW — makikita kaagad kung bakit "Washer" ang lumabas
              kahit "Dry Only" ang service — hindi natugma ang service
              name ng booking sa kasalukuyang catalog. */}
          {!isLoadingPhases && serviceNotFound && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-2xl px-4 py-3">
              <AlertTriangle size={14} className="shrink-0" />
              <p className="text-[11px] font-medium">
                Couldn't find "{booking.service_type}" in your current service catalog — defaulting to
                Wash + Dry. If this service was renamed or removed, update the booking's service or
                re-check your Optimization Settings.
              </p>
            </div>
          )}

          {!isLoadingPhases && requiredPhases === 'full_service' && !serviceNotFound && (
            <div className="flex items-center gap-2 text-sky-500 bg-sky-50 rounded-2xl px-4 py-3">
              <AlertTriangle size={14} className="shrink-0" />
              <p className="text-[11px] font-medium">
                Dryers aren't assigned here — use "Move to Dryer" per load from the terminal once washing finishes.
              </p>
            </div>
          )}

          {!isLoadingPhases && !isFullySelected && (
            <div className="flex items-center gap-2 text-slate-400 bg-slate-50 rounded-2xl px-4 py-3">
              <AlertTriangle size={14} className="shrink-0" />
              <p className="text-[11px] font-medium">
                Select exactly {requiredCount} {targetType.toLowerCase()}{requiredCount > 1 ? 's' : ''} to continue.
              </p>
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
            disabled={!isFullySelected || isSubmitting || isLoadingPhases}
            className={`flex-[2] py-4 rounded-[24px] font-black text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg
              ${!isFullySelected || isSubmitting || isLoadingPhases
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-sky-500 hover:bg-sky-600 shadow-sky-200'
              }`}
          >
            {isSubmitting ? (
              <><Loader2 size={18} className="animate-spin" /> Assigning...</>
            ) : (
              <><CheckCircle2 size={18} /> Assign {requiredCount > 1 ? `${requiredCount} Machines` : 'Machine'}</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AssignMachineModal;