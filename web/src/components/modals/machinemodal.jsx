import React, { useState } from 'react';
import { X, Monitor, Cpu, Layers, AlertCircle } from 'lucide-react';
import apiService from '../../services/APIservices';

/**
 * MachineModal Component
 * Facilitates adding new hardware units to the shop configuration.
 * Connected to the POST /machines/ endpoint.
 *
 * UPDATED: Instead of registering one unit at a time with a manually
 * typed unit number, the user now picks a category (Washer/Dryer) and
 * a quantity. The modal auto-continues numbering from whatever units
 * already exist for that type (e.g. if W1-W2 exist and quantity=3 is
 * submitted, it will create W3, W4, W5).
 *
 * `existingMachines` prop is the current machine list from MachineHub,
 * used purely to compute the next available machine_number per type.
 */
const MachineModal = ({ isOpen, onClose, onRefresh, existingMachines = [] }) => {
  const [formData, setFormData] = useState({
    machine_type: 'Washer',
    quantity: '1',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const resetAndClose = () => {
    setFormData({ machine_type: 'Washer', quantity: '1' });
    setProgress({ current: 0, total: 0 });
    setError('');
    onClose();
  };

  /**
   * Computes the next available machine_number for a given type,
   * based on the highest existing number currently registered.
   */
  const getNextNumber = (type, offset) => {
    const numbersForType = existingMachines
      .filter(m => m.machine_type === type)
      .map(m => m.machine_number || 0);
    const maxExisting = numbersForType.length > 0 ? Math.max(...numbersForType) : 0;
    return maxExisting + offset;
  };

  /**
   * ACTION: Submit new machine(s) to the backend.
   * Registers `quantity` units sequentially, continuing the numbering
   * from the last existing unit of the selected type.
   * There is no bulk-create endpoint on the backend, so requests are
   * sent one at a time and progress is shown to the user.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const qty = parseInt(formData.quantity);
    if (!qty || isNaN(qty) || qty < 1) {
      setError("Please enter a valid quantity (1 or more).");
      return;
    }
    if (qty > 50) {
      setError("Please register 50 or fewer units at a time.");
      return;
    }

    setIsSubmitting(true);
    setProgress({ current: 0, total: qty });

    const shopId = apiService.getShopId();
    let registeredCount = 0;

    try {
      for (let i = 1; i <= qty; i++) {
        const nextNumber = getNextNumber(formData.machine_type, i);

        const machineData = {
          machine_type: formData.machine_type,
          machine_number: nextNumber,
          status: 'Available',
          shop_id: shopId
        };

        await apiService.addMachine(machineData);
        registeredCount += 1;
        setProgress({ current: registeredCount, total: qty });
      }

      resetAndClose();
      onRefresh();
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || "Failed to register machine.";
      if (registeredCount > 0) {
        // Partial success: some units went through before the failure.
        setError(`Registered ${registeredCount} of ${qty} unit(s) before an error occurred: ${detail}`);
        onRefresh();
      } else {
        setError(detail);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-sky-500 p-2 rounded-lg text-white">
              <Cpu size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Add Machine</h2>
              <p className="text-slate-500 text-xs font-medium">Register new hardware to your shop</p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-30"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600 text-sm font-bold">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Machine Type Selection */}
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-400 tracking-widest mb-3">
                Machine Category
              </label>
              <div className="grid grid-cols-2 gap-4">
                {['Washer', 'Dryer'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setFormData({ ...formData, machine_type: type })}
                    className={`py-4 rounded-2xl border-2 font-bold transition-all flex flex-col items-center gap-2 disabled:opacity-50 ${
                      formData.machine_type === type
                        ? 'border-sky-500 bg-sky-50 text-sky-600 shadow-md shadow-sky-100'
                        : 'border-slate-100 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    <Monitor size={24} strokeWidth={formData.machine_type === type ? 2.5 : 2} />
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-400 tracking-widest mb-3">
                Quantity
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Layers size={18} />
                </div>
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  placeholder="e.g. 3"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-sky-500 focus:ring-0 transition-all font-bold text-slate-700 outline-none disabled:opacity-50"
                  required
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-400 font-medium">
                Units will be numbered automatically, continuing from your existing {formData.machine_type.toLowerCase()}s.
              </p>
            </div>

            {/* Progress Indicator */}
            {isSubmitting && progress.total > 0 && (
              <div>
                <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  <span>Registering...</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500 transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-10 flex gap-3">
            <button
              type="button"
              onClick={resetAndClose}
              disabled={isSubmitting}
              className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors disabled:opacity-30"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] py-4 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 text-white font-black rounded-2xl shadow-lg shadow-sky-100 transition-all active:scale-95 flex items-center justify-center"
            >
              {isSubmitting
                ? `Registering ${progress.current}/${progress.total}...`
                : "Add Unit(s)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MachineModal;
