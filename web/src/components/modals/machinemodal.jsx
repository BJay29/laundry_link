import React, { useState } from 'react';
import { X, Monitor, Cpu, Hash, AlertCircle } from 'lucide-react';
import apiService from '../../services/APIservices';

/**
 * MachineModal Component
 * Facilitates adding new hardware units to the shop configuration.
 * Connected to the POST /machines/ endpoint.
 */
const MachineModal = ({ isOpen, onClose, onRefresh }) => {
  const [formData, setFormData] = useState({
    machine_number: '',
    machine_type: 'Washer',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  /**
   * ACTION: Submit new machine data to the backend.
   * Validates input and triggers a refresh of the Machine Hub table upon success.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Basic validation for machine numbering
      if (!formData.machine_number || isNaN(formData.machine_number)) {
        throw new Error("Please enter a valid numeric machine number.");
      }

      const machineData = {
          ...formData,
          machine_number: parseInt(formData.machine_number),
          status: 'Available', // Default status for new units
          shop_id: apiService.getShopId() // Automatically attach the current shop context
      };

      await apiService.addMachine(machineData);
      
      // Reset form and notify parent to refresh data
      setFormData({ machine_number: '', machine_type: 'Washer' });
      onRefresh(); 
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Failed to register machine.");
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
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors"
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
                    onClick={() => setFormData({ ...formData, machine_type: type })}
                    className={`py-4 rounded-2xl border-2 font-bold transition-all flex flex-col items-center gap-2 ${
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

            {/* Machine Number Input */}
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-400 tracking-widest mb-3">
                Unit Number
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Hash size={18} />
                </div>
                <input
                  type="text"
                  placeholder="e.g. 7"
                  value={formData.machine_number}
                  onChange={(e) => setFormData({ ...formData, machine_number: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-sky-500 focus:ring-0 transition-all font-bold text-slate-700 outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-10 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] py-4 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 text-white font-black rounded-2xl shadow-lg shadow-sky-100 transition-all active:scale-95 flex items-center justify-center"
            >
              {isSubmitting ? "Registering..." : "Add Unit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MachineModal;