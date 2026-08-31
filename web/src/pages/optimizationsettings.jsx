import React, { useState, useEffect } from 'react';
import { Save, RefreshCcw, Info, Loader2, CheckCircle2, Settings2, Zap, Droplets, Banknote, Clock, Weight, Plus, Trash2, Pencil, X, Power, PackageOpen } from 'lucide-react';
import apiService from '../services/APIservices';

/**
 * OPTIMIZATION SETTINGS COMPONENT
 *
 * UPDATED: Each service now also has a duration_minutes field — how long
 * the service actually runs on a machine. This drives machine.remaining_time
 * on the backend, so the Machine Monitoring card reflects the shop's own
 * configured duration instead of a hardcoded estimate.
 *
 * FIXED (white screen crash): FastAPI validation errors (422) return
 * `detail` as an ARRAY of objects like { type, loc, msg, input }, not a
 * string. Rendering that array directly inside a <p> crashes React
 * ("Objects are not valid as a React child"). formatErrorDetail() below
 * normalizes ANY error shape (string, array, or fallback) into plain
 * text before it ever reaches component state / JSX.
 */

/**
 * Normalizes FastAPI error responses into a displayable string.
 * Handles: plain string detail, array of Pydantic validation errors,
 * or a generic JS error with no response at all.
 */
const formatErrorDetail = (error, fallback = "Something went wrong.") => {
  const detail = error?.response?.data?.detail;

  if (!detail) return error?.message || fallback;
  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((err) => {
        if (typeof err === 'string') return err;
        const field = Array.isArray(err?.loc) ? err.loc[err.loc.length - 1] : '';
        const msg = err?.msg || 'Invalid value';
        return field ? `${field}: ${msg}` : msg;
      })
      .join(' | ');
  }

  return fallback;
};

const OptimizationSettings = () => {
  const [settings, setSettings] = useState({
    electricity_rate: 0,
    water_rate: 0,
    detergent_cost_per_load: 0,
    minimum_weight_kg: 6,
    off_peak_hours: ""
  });

  const [serviceTypes, setServiceTypes] = useState([]);
  const [newService, setNewService] = useState({ name: '', price: '', duration_minutes: '45' });
  const [isAddingService, setIsAddingService] = useState(false);
  const [serviceError, setServiceError] = useState('');
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editValues, setEditValues] = useState({ name: '', price: '', duration_minutes: '' });
  const [busyServiceId, setBusyServiceId] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const shopId = apiService.getShopId();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setIsLoading(true);
      const [settingsData, servicesData] = await Promise.all([
        apiService.getSettings(shopId),
        apiService.getServiceTypes(shopId)
      ]);
      if (settingsData) setSettings(settingsData);
      setServiceTypes(servicesData || []);
    } catch (error) {
      console.error("Critical: Failed to load shop settings:", formatErrorDetail(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadDefaults = async () => {
    const confirmReset = window.confirm(
      "Restore default operational rates (electricity, water, detergent, minimum weight)? Your configured services will NOT be affected. You must click 'Save Changes' to finalize."
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
        console.error("System Error: Could not retrieve default config:", formatErrorDetail(error));
        alert("Server communication failure. Default values could not be loaded.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDiscard = () => {
    if (window.confirm("Discard all unsaved changes? This action cannot be undone.")) {
      fetchAll();
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    const processedValue = type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value;

    setSettings(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveStatus(null);

      await apiService.updateSettings(shopId, settings);

      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error("Transaction Failed: Could not update settings:", formatErrorDetail(error));
      setSaveStatus('error');
      alert("Save failed. Please check your network connection or user permissions.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- SERVICE CATALOG HANDLERS ---

  const handleAddService = async (e) => {
    e.preventDefault();
    setServiceError('');

    const name = newService.name.trim();
    const price = parseFloat(newService.price);
    const duration_minutes = parseInt(newService.duration_minutes);

    if (!name) {
      setServiceError("Service name is required.");
      return;
    }
    if (isNaN(price) || price < 0) {
      setServiceError("Please enter a valid price.");
      return;
    }
    if (isNaN(duration_minutes) || duration_minutes <= 0) {
      setServiceError("Please enter a valid duration (in minutes).");
      return;
    }

    try {
      setIsAddingService(true);
      const created = await apiService.addServiceType({ name, price, duration_minutes, is_active: true }, shopId);
      setServiceTypes(prev => [...prev, created]);
      setNewService({ name: '', price: '', duration_minutes: '45' });
    } catch (error) {
      setServiceError(formatErrorDetail(error, "Failed to add service."));
    } finally {
      setIsAddingService(false);
    }
  };

  const startEditing = (service) => {
    setEditingServiceId(service.id);
    setEditValues({
      name: service.name,
      price: String(service.price),
      duration_minutes: String(service.duration_minutes || 45)
    });
  };

  const cancelEditing = () => {
    setEditingServiceId(null);
    setEditValues({ name: '', price: '', duration_minutes: '' });
  };

  const saveEditing = async (service) => {
    const name = editValues.name.trim();
    const price = parseFloat(editValues.price);
    const duration_minutes = parseInt(editValues.duration_minutes);

    if (!name) {
      alert("Service name cannot be empty.");
      return;
    }
    if (isNaN(price) || price < 0) {
      alert("Please enter a valid price.");
      return;
    }
    if (isNaN(duration_minutes) || duration_minutes <= 0) {
      alert("Please enter a valid duration (in minutes).");
      return;
    }

    try {
      setBusyServiceId(service.id);
      const updated = await apiService.updateServiceType(service.id, { name, price, duration_minutes }, shopId);
      setServiceTypes(prev => prev.map(s => s.id === service.id ? updated : s));
      cancelEditing();
    } catch (error) {
      alert(formatErrorDetail(error, "Failed to update service."));
    } finally {
      setBusyServiceId(null);
    }
  };

  const toggleActive = async (service) => {
    try {
      setBusyServiceId(service.id);
      const updated = await apiService.updateServiceType(service.id, { is_active: !service.is_active }, shopId);
      setServiceTypes(prev => prev.map(s => s.id === service.id ? updated : s));
    } catch (error) {
      console.error("Toggle Active Error:", formatErrorDetail(error));
    } finally {
      setBusyServiceId(null);
    }
  };

  const handleDeleteService = async (service) => {
    const confirmDelete = window.confirm(
      `Remove "${service.name}" from your service catalog? This will not affect past bookings, but staff won't be able to select it for new bookings.`
    );
    if (!confirmDelete) return;

    try {
      setBusyServiceId(service.id);
      await apiService.deleteServiceType(service.id, shopId);
      setServiceTypes(prev => prev.filter(s => s.id !== service.id));
    } catch (error) {
      alert(formatErrorDetail(error, "Failed to remove service."));
    } finally {
      setBusyServiceId(null);
    }
  };

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
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Optimization Settings</h1>
          <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-wider italic">Configure your services, pricing, and operational parameters</p>
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

        {/* SECTION 1: SERVICE CATALOG */}
        <div className="bg-white p-10 rounded-[48px] border-2 border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl">
              <Banknote size={24} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Your Services</h3>
          </div>
          <p className="text-sm text-slate-400 mb-8 font-bold italic">
            Add the services your shop offers, their prices, and how long each one takes. These populate the Service Type dropdown in the Create Booking modal and drive machine cycle timers.
          </p>

          {serviceTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200 mb-8">
              <PackageOpen size={32} className="text-slate-300 mb-3" />
              <h4 className="text-slate-700 font-black uppercase tracking-tight text-sm mb-1">No Services Yet</h4>
              <p className="text-slate-400 text-xs max-w-sm">
                Add your first service below (e.g. "Full Service" — ₱210, 45 min) so staff can start creating bookings.
              </p>
            </div>
          ) : (
            <div className="mb-8 divide-y divide-slate-100 border-2 border-slate-100 rounded-[32px] overflow-hidden">
              {serviceTypes.map((service) => {
                const isEditing = editingServiceId === service.id;
                const isBusy = busyServiceId === service.id;
                return (
                  <div key={service.id} className={`flex items-center gap-4 px-6 py-4 ${!service.is_active ? 'bg-slate-50/60' : 'bg-white'}`}>
                    {isEditing ? (
                      <>
                        <input
                          value={editValues.name}
                          onChange={(e) => setEditValues(prev => ({ ...prev, name: e.target.value }))}
                          className="flex-1 bg-slate-50 border-2 border-sky-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none"
                          placeholder="Service name"
                        />
                        <div className="relative w-32">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₱</span>
                          <input
                            type="number"
                            value={editValues.price}
                            onChange={(e) => setEditValues(prev => ({ ...prev, price: e.target.value }))}
                            className="w-full pl-8 pr-3 bg-slate-50 border-2 border-sky-200 rounded-xl py-2 font-bold text-slate-700 outline-none"
                          />
                        </div>
                        <div className="relative w-32">
                          <input
                            type="number"
                            value={editValues.duration_minutes}
                            onChange={(e) => setEditValues(prev => ({ ...prev, duration_minutes: e.target.value }))}
                            className="w-full pl-3 pr-10 bg-slate-50 border-2 border-sky-200 rounded-xl py-2 font-bold text-slate-700 outline-none"
                            placeholder="min"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold uppercase">min</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => saveEditing(service)}
                          disabled={isBusy}
                          className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all disabled:opacity-50"
                        >
                          {isBusy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <p className={`font-black text-sm ${service.is_active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                            {service.name}
                          </p>
                          {!service.is_active && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Inactive</span>
                          )}
                        </div>
                        <span className={`inline-flex items-center gap-1 font-black text-[10px] uppercase tracking-tight px-2.5 py-1 rounded-lg ${service.is_active ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-100 text-slate-300'}`}>
                          <Clock size={11} />
                          {service.duration_minutes || 45} min
                        </span>
                        <span className={`font-black text-sm w-24 text-right ${service.is_active ? 'text-slate-700' : 'text-slate-300'}`}>
                          ₱{Number(service.price).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleActive(service)}
                          disabled={isBusy}
                          title={service.is_active ? 'Deactivate' : 'Activate'}
                          className={`p-2 rounded-xl transition-all disabled:opacity-50 ${service.is_active ? 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                        >
                          {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditing(service)}
                          disabled={isBusy}
                          className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-sky-500 hover:bg-sky-50 transition-all disabled:opacity-50"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteService(service)}
                          disabled={isBusy}
                          className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ADD NEW SERVICE FORM */}
          <form onSubmit={handleAddService} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Name</label>
              <input
                value={newService.name}
                onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Full Service"
                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-4 ring-sky-50 focus:border-sky-200 outline-none transition-all"
              />
            </div>
            <div className="w-full sm:w-40 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Price (₱)</label>
              <input
                type="number"
                value={newService.price}
                onChange={(e) => setNewService(prev => ({ ...prev, price: e.target.value }))}
                placeholder="e.g. 210"
                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-4 ring-sky-50 focus:border-sky-200 outline-none transition-all"
              />
            </div>
            <div className="w-full sm:w-40 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duration (min)</label>
              <input
                type="number"
                value={newService.duration_minutes}
                onChange={(e) => setNewService(prev => ({ ...prev, duration_minutes: e.target.value }))}
                placeholder="e.g. 45"
                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-4 ring-sky-50 focus:border-sky-200 outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isAddingService}
              className="bg-sky-600 hover:bg-sky-500 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-sky-100 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isAddingService ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={3} />}
              Add Service
            </button>
          </form>
          {serviceError && (
            <p className="mt-3 text-[11px] font-bold text-rose-500 ml-1">{serviceError}</p>
          )}
        </div>

        {/* SECTION 2: BOOKING RULES */}
        <div className="bg-white p-10 rounded-[48px] border-2 border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Weight size={24} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Booking Rules</h3>
          </div>

          <div className="max-w-xs space-y-3">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Minimum Booking Weight (kg)</label>
            <input
              type="number" step="0.5" min="0.5" name="minimum_weight_kg"
              value={settings.minimum_weight_kg} onChange={handleInputChange}
              className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-700 focus:ring-4 ring-indigo-50 focus:border-indigo-200 outline-none transition-all"
            />
            <p className="text-[10px] text-slate-400 font-medium ml-1">Bookings below this weight will be blocked in the Create Booking modal. Defaults to 6kg.</p>
          </div>
        </div>

        {/* SECTION 3: UTILITY CALIBRATION */}
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

        {/* SECTION 4: SCHEDULING */}
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

        {/* FOOTER ACTIONS */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center md:text-left">
            * Operational rate changes affect real-time analytics and transaction logic immediately once saved. Service changes above save instantly.
          </p>
          <div className="flex items-center gap-8">
            <button
              onClick={handleLoadDefaults}
              className="flex items-center gap-2 text-rose-400 hover:text-rose-600 font-black text-[11px] uppercase tracking-tighter transition-all active:scale-90"
            >
              <Settings2 size={16} />
              Reset Rates to Defaults
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