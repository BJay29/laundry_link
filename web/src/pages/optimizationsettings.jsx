import React, { useState, useEffect } from 'react';
import { Save, RefreshCcw, Info, Loader2, CheckCircle2, Settings2, Zap, Droplets, Banknote, Clock } from 'lucide-react';
import apiService from '../services/APIservices'; 

/**
 * OPTIMIZATION SETTINGS COMPONENT
 * Provides a centralized interface for shop owners to configure business parameters.
 * These values drive the 'Smart Calc' logic in the Booking Modal and the 
 * Profitability Telemetry in the Machine Hub.
 */
const OptimizationSettings = () => {
  // State synchronized with PostgreSQL 'settings' table schema
  const [settings, setSettings] = useState({
    full_service_price: 0,
    regular_wash_price: 0,
    titan_wash_price: 0,
    comforter_price: 0,
    electricity_rate: 0,
    water_rate: 0,
    detergent_cost_per_load: 0,
    off_peak_hours: ""
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // Valid values: 'success' | 'error' | null

  const shopId = apiService.getShopId();

  // Lifecycle: Pull live configurations on component mount
  useEffect(() => {
    fetchSettings();
  }, []);

  /**
   * DATA SYNC: Retrieves active shop configurations from the Database.
   * This ensures the UI reflects the current operational 'Source of Truth'.
   */
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getSettings(shopId);
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error("Critical: Failed to load shop settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * FACTORY RESET: Loads hardcoded system defaults for the Naga City region.
   * Note: This only updates the local state; 'Save Changes' must be clicked to persist.
   */
  const handleLoadDefaults = async () => {
    const confirmReset = window.confirm(
      "Restore system defaults? This will overwrite your current inputs. You must click 'Save Changes' to finalize."
    );

    if (confirmReset) {
      try {
        setIsLoading(true);
        const defaults = await apiService.getSystemDefaults();
        setSettings(prev => ({
          ...prev,
          ...defaults
        }));
      } catch (error) {
        console.error("System Error: Could not retrieve default config:", error);
        alert("Server communication failure. Default values could not be loaded.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  /**
   * REVERT ACTION: Discards unsaved local edits.
   * Re-triggers a fetch from the database to reset state to the last saved point.
   */
  const handleDiscard = () => {
    if (window.confirm("Discard all unsaved changes? This action cannot be undone.")) {
      fetchSettings();
    }
  };

  /**
   * INPUT HANDLER: Processes numeric and string inputs.
   * Sanitizes numeric values to prevent NaN issues during calculation logic.
   */
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    const processedValue = type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value;
    
    setSettings(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  /**
   * PERSISTENCE LOGIC: Commits local state to the Backend API.
   * Success here immediately updates price calculations in the Booking Modal system-wide.
   */
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveStatus(null);
      
      await apiService.updateSettings(shopId, settings);
      
      setSaveStatus('success');
      // Auto-clear the success indicator after 3 seconds for a clean UI
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error("Transaction Failed: Could not update settings:", error);
      setSaveStatus('error');
      alert("Save failed. Please check your network connection or user permissions.");
    } finally {
      setIsSaving(false);
    }
  };

  // UI STATE: Loading Overlay
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="animate-spin text-sky-500 mb-4" size={48} />
        <p className="text-slate-500 font-bold tracking-tight">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen custom-scrollbar">
      {/* SECTION: PAGE HEADER & PRIMARY ACTION */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Optimization Settings</h1>
          <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-wider italic">Configure pricing and service parameters</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-3 ${
            saveStatus === 'success' ? 'bg-emerald-500 shadow-emerald-100' : 'bg-sky-600 hover:bg-sky-500 shadow-sky-100'
          } text-white px-8 py-4 rounded-[24px] font-black shadow-2xl transition-all active:scale-95 disabled:opacity-70`}
        >
          {isSaving ? <Loader2 className="animate-spin" size={20} /> : saveStatus === 'success' ? <CheckCircle2 size={20} /> : <Save size={20} />}
          {isSaving ? 'Processing...' : saveStatus === 'success' ? 'Settings Updated' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-8 max-w-7xl">
        
        {/* SECTION 1: CONSUMER PRICING (BOOKING MODAL DRIVERS) */}
        <div className="bg-white p-10 rounded-[48px] border-2 border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl">
              <Banknote size={24} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Service Pricing</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { label: 'Regular Wash', name: 'regular_wash_price' },
              { label: 'Titan Wash', name: 'titan_wash_price' },
              { label: 'Comforter', name: 'comforter_price' },
              { label: 'Full Service', name: 'full_service_price' }
            ].map((field) => (
              <div key={field.name} className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{field.label} (₱)</label>
                <input 
                  type="number" name={field.name} value={settings[field.name]} onChange={handleInputChange}
                  className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-700 focus:ring-4 ring-sky-50 focus:border-sky-200 outline-none transition-all"
                />
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2: UTILITY CALIBRATION (ANALYTICS ENGINE) */}
        <div className="bg-white p-10 rounded-[48px] border-2 border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8">
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl" title="Calibration: CASURECO II & MNWD Rates">
              <Info size={20} />
            </div>
          </div>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Zap size={24} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Operational Unit Rates</h3>
          </div>
          <p className="text-sm text-slate-400 mb-8 font-bold italic">Critical for accurate Net Profit and AI efficiency telemetry.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Droplets size={14} className="text-emerald-500" /> Detergent (Per Load)
              </label>
              <input 
                type="number" name="detergent_cost_per_load" value={settings.detergent_cost_per_load} onChange={handleInputChange}
                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-700 focus:ring-4 ring-emerald-50 focus:border-emerald-200 outline-none transition-all"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Zap size={14} className="text-emerald-500" /> Electricity (₱/kWh)
              </label>
              <input 
                type="number" name="electricity_rate" value={settings.electricity_rate} onChange={handleInputChange}
                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-700 focus:ring-4 ring-emerald-50 focus:border-emerald-200 outline-none transition-all"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Droplets size={14} className="text-emerald-500" /> Water (₱/m³)
              </label>
              <input 
                type="number" name="water_rate" value={settings.water_rate} onChange={handleInputChange}
                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-700 focus:ring-4 ring-emerald-50 focus:border-emerald-200 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: SCHEDULING (TIME-OF-USE OPTIMIZATION) */}
        <div className="bg-white p-10 rounded-[48px] border-2 border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Clock size={24} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Optimization Windows</h3>
          </div>
          
          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">🕒 Off-Peak Hours Schedule</label>
            <input 
              type="text" name="off_peak_hours" value={settings.off_peak_hours} onChange={handleInputChange}
              className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-700 focus:ring-4 ring-amber-50 focus:border-amber-200 outline-none transition-all"
              placeholder="e.g., 8:00 AM - 11:00 AM"
            />
          </div>
        </div>

        {/* SECTION: FOOTER ACTIONS */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center md:text-left">
            * Adjusting these rates affects real-time analytics and transaction logic immediately.
          </p>
          <div className="flex items-center gap-8">
            <button 
              onClick={handleLoadDefaults}
              className="flex items-center gap-2 text-rose-400 hover:text-rose-600 font-black text-[11px] uppercase tracking-tighter transition-all active:scale-90"
            >
              <Settings2 size={16} />
              Reset to Factory Defaults
            </button>

            <button 
              onClick={handleDiscard}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-black text-[11px] uppercase tracking-tighter transition-all active:scale-90"
            >
              <RefreshCcw size={16} />
              Discard Unsaved Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizationSettings;