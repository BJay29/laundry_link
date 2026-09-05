import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, RefreshCcw, Info, Loader2, CheckCircle2, Settings2, Zap, Droplets, Banknote, Clock, Weight, Plus, Trash2, Pencil, X, Power, PackageOpen, AlertTriangle, XCircle, Truck, Ticket } from 'lucide-react';
import apiService from '../services/APIservices';

/**
 * OPTIMIZATION SETTINGS COMPONENT
 *
 * UPDATED: Each service now also has a duration_minutes field — how long
 * the service actually runs on a machine. This drives machine.remaining_time
 * on the backend, so the Machine Monitoring card reflects the shop's own
 * configured duration instead of a hardcoded estimate.
 *
 * UPDATED: Each service now also has a pricing_unit field ("load", "kg",
 * or "piece") — not every service in a shop is priced the same way (hal.
 * Regular Wash = per load, Wash & Fold = per kg, Comforter = per piece).
 * This is a dropdown alongside Price and Duration in both the Add and
 * Edit forms, and is shown next to the price in the services list
 * ("₱210.00 / load").
 *
 * FIXED (white screen crash): FastAPI validation errors (422) return
 * `detail` as an ARRAY of objects like { type, loc, msg, input }, not a
 * string. Rendering that array directly inside a <p> crashes React
 * ("Objects are not valid as a React child"). formatErrorDetail() below
 * normalizes ANY error shape (string, array, or fallback) into plain
 * text before it ever reaches component state / JSX.
 *
 * UPDATED (UX): Deleting a service no longer uses the native
 * window.confirm() dialog (the "localhost says..." browser popup).
 * It now opens a proper in-app confirmation modal. All success/error
 * feedback for service actions (delete, toggle active, etc.) is now
 * surfaced via a toast notification that slides in from the top-right
 * corner instead of a blocking window.alert().
 *
 * NEW: Three additional sections for the mobile-app booking flow —
 * Delivery Settings (has_delivery toggle + delivery_fee), Add-Ons
 * (fabric softener upgrade, rush, atbp.), and Promo Codes. Same CRUD
 * patterns as the Service Catalog section above.
 *
 * FIXED (services disappearing / add-ons not loading): fetchAll() used
 * to call Promise.all() across 5 endpoints — if ANY ONE of them failed
 * (e.g. /addons/ or /settings/profile not yet deployed on the backend),
 * the ENTIRE Promise.all() rejected, so setServiceTypes() never ran even
 * though the service-types request itself had already succeeded. That's
 * why services appeared to "vanish" after adding one — it wasn't gone,
 * it just never got the chance to render. Switched to Promise.allSettled()
 * so each section's data loads and applies independently — a failing
 * Add-Ons or Promo Codes fetch no longer blocks Services/Settings from
 * showing up.
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

const PRICING_UNITS = [
  { value: 'load', label: 'Load' },
  { value: 'kg', label: 'Kg' },
  { value: 'piece', label: 'Piece' },
];

const DISCOUNT_TYPES = [
  { value: 'percent', label: '%' },
  { value: 'fixed', label: '₱' },
];

/* ------------------------------------------------------------------ */
/*  TOAST NOTIFICATION (top-right, auto-dismiss)                       */
/* ------------------------------------------------------------------ */

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    bar: 'bg-emerald-500',
    iconWrap: 'bg-emerald-50 text-emerald-500',
  },
  error: {
    icon: XCircle,
    bar: 'bg-rose-500',
    iconWrap: 'bg-rose-50 text-rose-500',
  },
  info: {
    icon: Info,
    bar: 'bg-sky-500',
    iconWrap: 'bg-sky-50 text-sky-500',
  },
};

const ToastStack = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 w-[340px] max-w-[90vw] pointer-events-none">
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            className="pointer-events-auto relative overflow-hidden bg-white rounded-2xl shadow-2xl shadow-slate-300/50 border-2 border-slate-100 flex items-start gap-3 pl-4 pr-3 py-4 animate-toast-in"
          >
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${style.bar}`} />
            <div className={`p-2 rounded-xl ${style.iconWrap} shrink-0`}>
              <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              {toast.title && (
                <p className="font-black text-sm text-slate-800 leading-tight">{toast.title}</p>
              )}
              {toast.message && (
                <p className="text-xs text-slate-500 font-bold mt-0.5 leading-snug break-words">{toast.message}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-all shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-toast-in {
          animation: toast-in 0.25s ease-out;
        }
      `}</style>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  GENERIC CONFIRM DELETE MODAL (reused for services/add-ons/promos)  */
/* ------------------------------------------------------------------ */

const ConfirmDeleteModal = ({ item, itemLabel, isDeleting, onCancel, onConfirm }) => {
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget && !isDeleting) onCancel(); }}
    >
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl border-2 border-slate-100 p-8 animate-modal-in">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Remove {itemLabel}?</h3>
            <p className="text-sm text-slate-400 font-bold mt-1 leading-snug">
              Are you sure you want to remove{' '}
              <span className="text-slate-600">"{item.name || item.code}"</span>?
              This won't affect past bookings.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-6 py-3 rounded-2xl font-black text-sm text-slate-500 bg-slate-50 hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-100 transition-all active:scale-95 disabled:opacity-60"
          >
            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {isDeleting ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.15s ease-out; }
        .animate-modal-in { animation: modal-in 0.2s ease-out; }
      `}</style>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                      */
/* ------------------------------------------------------------------ */

const OptimizationSettings = () => {
  const [settings, setSettings] = useState({
    electricity_rate: 0,
    water_rate: 0,
    detergent_cost_per_load: 0,
    minimum_weight_kg: 6,
    off_peak_hours: ""
  });

  const [serviceTypes, setServiceTypes] = useState([]);
  const [newService, setNewService] = useState({ name: '', price: '', duration_minutes: '45', pricing_unit: 'load' });
  const [isAddingService, setIsAddingService] = useState(false);
  const [serviceError, setServiceError] = useState('');
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editValues, setEditValues] = useState({ name: '', price: '', duration_minutes: '', pricing_unit: 'load' });
  const [busyServiceId, setBusyServiceId] = useState(null);

  // Delivery settings state
  const [deliverySettings, setDeliverySettings] = useState({ has_delivery: false, delivery_fee: '0' });
  const [isSavingDelivery, setIsSavingDelivery] = useState(false);

  // Add-Ons state
  const [addOns, setAddOns] = useState([]);
  const [newAddOn, setNewAddOn] = useState({ name: '', price: '' });
  const [isAddingAddOn, setIsAddingAddOn] = useState(false);
  const [addOnError, setAddOnError] = useState('');
  const [editingAddOnId, setEditingAddOnId] = useState(null);
  const [editAddOnValues, setEditAddOnValues] = useState({ name: '', price: '' });
  const [busyAddOnId, setBusyAddOnId] = useState(null);
  const [addOnToDelete, setAddOnToDelete] = useState(null);
  const [isDeletingAddOn, setIsDeletingAddOn] = useState(false);

  // Promo Codes state
  const [promoCodes, setPromoCodes] = useState([]);
  const [newPromo, setNewPromo] = useState({ code: '', discount_type: 'percent', discount_value: '', max_uses: '' });
  const [isAddingPromo, setIsAddingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [busyPromoId, setBusyPromoId] = useState(null);
  const [promoToDelete, setPromoToDelete] = useState(null);
  const [isDeletingPromo, setIsDeletingPromo] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [isDeletingService, setIsDeletingService] = useState(false);

  const [toasts, setToasts] = useState([]);
  const toastTimers = useRef({});

  const shopId = apiService.getShopId();

  useEffect(() => {
    fetchAll();
    return () => {
      Object.values(toastTimers.current).forEach(clearTimeout);
    };
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (toastTimers.current[id]) {
      clearTimeout(toastTimers.current[id]);
      delete toastTimers.current[id];
    }
  }, []);

  const showToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    toastTimers.current[id] = setTimeout(() => dismissToast(id), duration);
  }, [dismissToast]);

  /**
   * FIXED — see the top-of-file note. Promise.allSettled() instead of
   * Promise.all() so each section's fetch/apply is independent; one
   * failing endpoint no longer prevents the others from rendering.
   */
  const fetchAll = async () => {
    try {
      setIsLoading(true);

      const results = await Promise.allSettled([
        apiService.getSettings(shopId),
        apiService.getServiceTypes(shopId),
        apiService.getShopProfile(),
        apiService.getAddOns(),
        apiService.getPromoCodes(),
      ]);

      const [settingsResult, servicesResult, shopProfileResult, addOnsResult, promoResult] = results;

      if (settingsResult.status === 'fulfilled' && settingsResult.value) {
        setSettings(settingsResult.value);
      } else if (settingsResult.status === 'rejected') {
        console.error("Failed to load settings:", formatErrorDetail(settingsResult.reason));
      }

      if (servicesResult.status === 'fulfilled') {
        setServiceTypes(servicesResult.value || []);
      } else {
        console.error("Failed to load service types:", formatErrorDetail(servicesResult.reason));
        showToast({ type: 'error', title: 'Services Failed to Load', message: formatErrorDetail(servicesResult.reason) });
      }

      if (shopProfileResult.status === 'fulfilled' && shopProfileResult.value) {
        setDeliverySettings({
          has_delivery: Boolean(shopProfileResult.value.has_delivery),
          delivery_fee: String(shopProfileResult.value.delivery_fee ?? 0),
        });
      } else if (shopProfileResult.status === 'rejected') {
        console.error("Failed to load shop profile / delivery settings:", formatErrorDetail(shopProfileResult.reason));
      }

      if (addOnsResult.status === 'fulfilled') {
        setAddOns(addOnsResult.value || []);
      } else {
        console.error("Failed to load add-ons:", formatErrorDetail(addOnsResult.reason));
      }

      if (promoResult.status === 'fulfilled') {
        setPromoCodes(promoResult.value || []);
      } else {
        console.error("Failed to load promo codes:", formatErrorDetail(promoResult.reason));
      }
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
        showToast({ type: 'error', title: 'Server Error', message: 'Default values could not be loaded.' });
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
      showToast({ type: 'success', title: 'Settings Updated', message: 'Your operational rates have been saved.' });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error("Transaction Failed: Could not update settings:", formatErrorDetail(error));
      setSaveStatus('error');
      showToast({ type: 'error', title: 'Save Failed', message: 'Please check your network connection or user permissions.' });
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
    const pricing_unit = newService.pricing_unit;

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
      const created = await apiService.addServiceType({ name, price, duration_minutes, pricing_unit, is_active: true }, shopId);
      setServiceTypes(prev => [...prev, created]);
      setNewService({ name: '', price: '', duration_minutes: '45', pricing_unit: 'load' });
      showToast({ type: 'success', title: 'Service Added', message: `"${name}" is now available for bookings.` });
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
      duration_minutes: String(service.duration_minutes || 45),
      pricing_unit: service.pricing_unit || 'load'
    });
  };

  const cancelEditing = () => {
    setEditingServiceId(null);
    setEditValues({ name: '', price: '', duration_minutes: '', pricing_unit: 'load' });
  };

  const saveEditing = async (service) => {
    const name = editValues.name.trim();
    const price = parseFloat(editValues.price);
    const duration_minutes = parseInt(editValues.duration_minutes);
    const pricing_unit = editValues.pricing_unit;

    if (!name) {
      showToast({ type: 'error', message: 'Service name cannot be empty.' });
      return;
    }
    if (isNaN(price) || price < 0) {
      showToast({ type: 'error', message: 'Please enter a valid price.' });
      return;
    }
    if (isNaN(duration_minutes) || duration_minutes <= 0) {
      showToast({ type: 'error', message: 'Please enter a valid duration (in minutes).' });
      return;
    }

    try {
      setBusyServiceId(service.id);
      const updated = await apiService.updateServiceType(service.id, { name, price, duration_minutes, pricing_unit }, shopId);
      setServiceTypes(prev => prev.map(s => s.id === service.id ? updated : s));
      cancelEditing();
      showToast({ type: 'success', title: 'Service Updated', message: `"${name}" has been saved.` });
    } catch (error) {
      showToast({ type: 'error', title: 'Update Failed', message: formatErrorDetail(error, "Failed to update service.") });
    } finally {
      setBusyServiceId(null);
    }
  };

  const toggleActive = async (service) => {
    try {
      setBusyServiceId(service.id);
      const updated = await apiService.updateServiceType(service.id, { is_active: !service.is_active }, shopId);
      setServiceTypes(prev => prev.map(s => s.id === service.id ? updated : s));
      showToast({
        type: 'success',
        title: updated.is_active ? 'Service Activated' : 'Service Deactivated',
        message: `"${service.name}" is now ${updated.is_active ? 'available' : 'hidden'} for new bookings.`,
      });
    } catch (error) {
      console.error("Toggle Active Error:", formatErrorDetail(error));
      showToast({ type: 'error', title: 'Action Failed', message: formatErrorDetail(error, 'Could not update service status.') });
    } finally {
      setBusyServiceId(null);
    }
  };

  const handleDeleteService = (service) => {
    setServiceToDelete(service);
  };

  const cancelDeleteService = () => {
    if (isDeletingService) return;
    setServiceToDelete(null);
  };

  const confirmDeleteService = async () => {
    const service = serviceToDelete;
    if (!service) return;

    try {
      setIsDeletingService(true);
      setBusyServiceId(service.id);
      await apiService.deleteServiceType(service.id, shopId);
      setServiceTypes(prev => prev.filter(s => s.id !== service.id));
      setServiceToDelete(null);
      showToast({
        type: 'success',
        title: 'Service Removed',
        message: `"${service.name}" was removed from your catalog.`,
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Removal Failed',
        message: formatErrorDetail(error, "Failed to remove service."),
      });
    } finally {
      setIsDeletingService(false);
      setBusyServiceId(null);
    }
  };

  // --- DELIVERY SETTINGS HANDLERS ---

  const handleDeliveryToggle = () => {
    setDeliverySettings(prev => ({ ...prev, has_delivery: !prev.has_delivery }));
  };

  const handleDeliveryFeeChange = (e) => {
    setDeliverySettings(prev => ({ ...prev, delivery_fee: e.target.value }));
  };

  const saveDeliverySettings = async () => {
    const fee = parseFloat(deliverySettings.delivery_fee);
    if (deliverySettings.has_delivery && (isNaN(fee) || fee < 0)) {
      showToast({ type: 'error', message: 'Please enter a valid delivery fee.' });
      return;
    }

    try {
      setIsSavingDelivery(true);
      await apiService.updateShopProfile(shopId, {
        has_delivery: deliverySettings.has_delivery,
        delivery_fee: isNaN(fee) ? 0 : fee,
      });
      showToast({
        type: 'success',
        title: 'Delivery Settings Saved',
        message: deliverySettings.has_delivery
          ? `Delivery enabled at ₱${fee.toFixed(2)} per booking.`
          : 'Delivery is now disabled for this shop.',
      });
    } catch (error) {
      showToast({ type: 'error', title: 'Save Failed', message: formatErrorDetail(error, 'Could not save delivery settings.') });
    } finally {
      setIsSavingDelivery(false);
    }
  };

  // --- ADD-ON HANDLERS ---

  const handleAddAddOn = async (e) => {
    e.preventDefault();
    setAddOnError('');

    const name = newAddOn.name.trim();
    const price = parseFloat(newAddOn.price);

    if (!name) {
      setAddOnError('Add-on name is required.');
      return;
    }
    if (isNaN(price) || price < 0) {
      setAddOnError('Please enter a valid price.');
      return;
    }

    try {
      setIsAddingAddOn(true);
      const created = await apiService.addAddOn({ name, price, is_active: true });
      setAddOns(prev => [...prev, created]);
      setNewAddOn({ name: '', price: '' });
      showToast({ type: 'success', title: 'Add-On Added', message: `"${name}" is now available in the mobile app.` });
    } catch (error) {
      setAddOnError(formatErrorDetail(error, 'Failed to add add-on.'));
    } finally {
      setIsAddingAddOn(false);
    }
  };

  const startEditingAddOn = (addOn) => {
    setEditingAddOnId(addOn.id);
    setEditAddOnValues({ name: addOn.name, price: String(addOn.price) });
  };

  const cancelEditingAddOn = () => {
    setEditingAddOnId(null);
    setEditAddOnValues({ name: '', price: '' });
  };

  const saveEditingAddOn = async (addOn) => {
    const name = editAddOnValues.name.trim();
    const price = parseFloat(editAddOnValues.price);

    if (!name) {
      showToast({ type: 'error', message: 'Add-on name cannot be empty.' });
      return;
    }
    if (isNaN(price) || price < 0) {
      showToast({ type: 'error', message: 'Please enter a valid price.' });
      return;
    }

    try {
      setBusyAddOnId(addOn.id);
      const updated = await apiService.updateAddOn(addOn.id, { name, price });
      setAddOns(prev => prev.map(a => a.id === addOn.id ? updated : a));
      cancelEditingAddOn();
      showToast({ type: 'success', title: 'Add-On Updated', message: `"${name}" has been saved.` });
    } catch (error) {
      showToast({ type: 'error', title: 'Update Failed', message: formatErrorDetail(error, 'Failed to update add-on.') });
    } finally {
      setBusyAddOnId(null);
    }
  };

  const toggleAddOnActive = async (addOn) => {
    try {
      setBusyAddOnId(addOn.id);
      const updated = await apiService.updateAddOn(addOn.id, { is_active: !addOn.is_active });
      setAddOns(prev => prev.map(a => a.id === addOn.id ? updated : a));
      showToast({
        type: 'success',
        title: updated.is_active ? 'Add-On Activated' : 'Add-On Deactivated',
        message: `"${addOn.name}" is now ${updated.is_active ? 'available' : 'hidden'}.`,
      });
    } catch (error) {
      showToast({ type: 'error', title: 'Action Failed', message: formatErrorDetail(error, 'Could not update add-on status.') });
    } finally {
      setBusyAddOnId(null);
    }
  };

  const confirmDeleteAddOn = async () => {
    const addOn = addOnToDelete;
    if (!addOn) return;

    try {
      setIsDeletingAddOn(true);
      setBusyAddOnId(addOn.id);
      await apiService.deleteAddOn(addOn.id);
      setAddOns(prev => prev.filter(a => a.id !== addOn.id));
      setAddOnToDelete(null);
      showToast({ type: 'success', title: 'Add-On Removed', message: `"${addOn.name}" was removed.` });
    } catch (error) {
      showToast({ type: 'error', title: 'Removal Failed', message: formatErrorDetail(error, 'Failed to remove add-on.') });
    } finally {
      setIsDeletingAddOn(false);
      setBusyAddOnId(null);
    }
  };

  // --- PROMO CODE HANDLERS ---

  const handleAddPromo = async (e) => {
    e.preventDefault();
    setPromoError('');

    const code = newPromo.code.trim();
    const discount_value = parseFloat(newPromo.discount_value);
    const max_uses = newPromo.max_uses ? parseInt(newPromo.max_uses) : null;

    if (!code) {
      setPromoError('Promo code is required.');
      return;
    }
    if (isNaN(discount_value) || discount_value <= 0) {
      setPromoError('Please enter a valid discount value.');
      return;
    }

    try {
      setIsAddingPromo(true);
      const created = await apiService.addPromoCode({
        code,
        discount_type: newPromo.discount_type,
        discount_value,
        max_uses,
        is_active: true,
      });
      setPromoCodes(prev => [created, ...prev]);
      setNewPromo({ code: '', discount_type: 'percent', discount_value: '', max_uses: '' });
      showToast({ type: 'success', title: 'Promo Code Added', message: `"${created.code}" is now active.` });
    } catch (error) {
      setPromoError(formatErrorDetail(error, 'Failed to add promo code.'));
    } finally {
      setIsAddingPromo(false);
    }
  };

  const togglePromoActive = async (promo) => {
    try {
      setBusyPromoId(promo.id);
      const updated = await apiService.updatePromoCode(promo.id, { is_active: !promo.is_active });
      setPromoCodes(prev => prev.map(p => p.id === promo.id ? updated : p));
      showToast({
        type: 'success',
        title: updated.is_active ? 'Promo Activated' : 'Promo Deactivated',
        message: `"${promo.code}" is now ${updated.is_active ? 'active' : 'disabled'}.`,
      });
    } catch (error) {
      showToast({ type: 'error', title: 'Action Failed', message: formatErrorDetail(error, 'Could not update promo status.') });
    } finally {
      setBusyPromoId(null);
    }
  };

  const confirmDeletePromo = async () => {
    const promo = promoToDelete;
    if (!promo) return;

    try {
      setIsDeletingPromo(true);
      setBusyPromoId(promo.id);
      await apiService.deletePromoCode(promo.id);
      setPromoCodes(prev => prev.filter(p => p.id !== promo.id));
      setPromoToDelete(null);
      showToast({ type: 'success', title: 'Promo Code Removed', message: `"${promo.code}" was removed.` });
    } catch (error) {
      showToast({ type: 'error', title: 'Removal Failed', message: formatErrorDetail(error, 'Failed to remove promo code.') });
    } finally {
      setIsDeletingPromo(false);
      setBusyPromoId(null);
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
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <ConfirmDeleteModal
        item={serviceToDelete}
        itemLabel="Service"
        isDeleting={isDeletingService}
        onCancel={cancelDeleteService}
        onConfirm={confirmDeleteService}
      />
      <ConfirmDeleteModal
        item={addOnToDelete}
        itemLabel="Add-On"
        isDeleting={isDeletingAddOn}
        onCancel={() => { if (!isDeletingAddOn) setAddOnToDelete(null); }}
        onConfirm={confirmDeleteAddOn}
      />
      <ConfirmDeleteModal
        item={promoToDelete}
        itemLabel="Promo Code"
        isDeleting={isDeletingPromo}
        onCancel={() => { if (!isDeletingPromo) setPromoToDelete(null); }}
        onConfirm={confirmDeletePromo}
      />

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
                        <select
                          value={editValues.pricing_unit}
                          onChange={(e) => setEditValues(prev => ({ ...prev, pricing_unit: e.target.value }))}
                          className="w-28 bg-slate-50 border-2 border-sky-200 rounded-xl px-3 py-2 font-bold text-slate-700 outline-none cursor-pointer"
                        >
                          {PRICING_UNITS.map((u) => (
                            <option key={u.value} value={u.value}>{u.label}</option>
                          ))}
                        </select>
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
                        <span className={`font-black text-sm w-32 text-right ${service.is_active ? 'text-slate-700' : 'text-slate-300'}`}>
                          ₱{Number(service.price).toFixed(2)}
                          <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">/ {service.pricing_unit || 'load'}</span>
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
            <div className="w-full sm:w-36 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pricing Unit</label>
              <select
                value={newService.pricing_unit}
                onChange={(e) => setNewService(prev => ({ ...prev, pricing_unit: e.target.value }))}
                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-4 ring-sky-50 focus:border-sky-200 outline-none transition-all cursor-pointer"
              >
                {PRICING_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
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

        {/* SECTION 2: DELIVERY SETTINGS */}
        <div className="bg-white p-10 rounded-[48px] border-2 border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
              <Truck size={24} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Delivery Settings</h3>
          </div>
          <p className="text-sm text-slate-400 mb-8 font-bold italic">
            Control whether customers can choose delivery in the mobile app, and how much you charge for it. Drop-off/pick-up at your shop is always available regardless of this setting.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Offer Delivery?</label>
              <button
                type="button"
                onClick={handleDeliveryToggle}
                className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl font-black transition-all ${
                  deliverySettings.has_delivery
                    ? 'bg-emerald-50 border-2 border-emerald-200 text-emerald-600'
                    : 'bg-slate-50/50 border-2 border-slate-100 text-slate-400'
                }`}
              >
                {deliverySettings.has_delivery ? 'Delivery Enabled' : 'Delivery Disabled'}
                <span className={`w-11 h-6 rounded-full relative transition-all ${deliverySettings.has_delivery ? 'bg-emerald-400' : 'bg-slate-300'}`}>
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${deliverySettings.has_delivery ? 'left-6' : 'left-1'}`} />
                </span>
              </button>
            </div>
            <div className="w-full sm:w-48 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Delivery Fee (₱)</label>
              <input
                type="number"
                value={deliverySettings.delivery_fee}
                onChange={handleDeliveryFeeChange}
                disabled={!deliverySettings.has_delivery}
                placeholder="e.g. 50"
                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-4 ring-orange-50 focus:border-orange-200 outline-none transition-all disabled:opacity-50"
              />
            </div>
            <button
              type="button"
              onClick={saveDeliverySettings}
              disabled={isSavingDelivery}
              className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-orange-100 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isSavingDelivery ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save
            </button>
          </div>
        </div>

        {/* SECTION 3: ADD-ONS */}
        <div className="bg-white p-10 rounded-[48px] border-2 border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl">
              <Plus size={24} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Add-Ons</h3>
          </div>
          <p className="text-sm text-slate-400 mb-8 font-bold italic">
            Optional extras customers can select in the mobile app's booking flow (e.g. fabric softener upgrade, rush service).
          </p>

          {addOns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-6 text-center bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200 mb-8">
              <PackageOpen size={28} className="text-slate-300 mb-3" />
              <p className="text-slate-400 text-xs max-w-sm">No add-ons yet — add one below (e.g. "Fabric Softener" — ₱20).</p>
            </div>
          ) : (
            <div className="mb-8 divide-y divide-slate-100 border-2 border-slate-100 rounded-[32px] overflow-hidden">
              {addOns.map((addOn) => {
                const isEditing = editingAddOnId === addOn.id;
                const isBusy = busyAddOnId === addOn.id;
                return (
                  <div key={addOn.id} className={`flex items-center gap-4 px-6 py-4 ${!addOn.is_active ? 'bg-slate-50/60' : 'bg-white'}`}>
                    {isEditing ? (
                      <>
                        <input
                          value={editAddOnValues.name}
                          onChange={(e) => setEditAddOnValues(prev => ({ ...prev, name: e.target.value }))}
                          className="flex-1 bg-slate-50 border-2 border-violet-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none"
                          placeholder="Add-on name"
                        />
                        <div className="relative w-32">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₱</span>
                          <input
                            type="number"
                            value={editAddOnValues.price}
                            onChange={(e) => setEditAddOnValues(prev => ({ ...prev, price: e.target.value }))}
                            className="w-full pl-8 pr-3 bg-slate-50 border-2 border-violet-200 rounded-xl py-2 font-bold text-slate-700 outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => saveEditingAddOn(addOn)}
                          disabled={isBusy}
                          className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all disabled:opacity-50"
                        >
                          {isBusy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditingAddOn}
                          className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <p className={`font-black text-sm ${addOn.is_active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                            {addOn.name}
                          </p>
                          {!addOn.is_active && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Inactive</span>
                          )}
                        </div>
                        <span className={`font-black text-sm w-24 text-right ${addOn.is_active ? 'text-slate-700' : 'text-slate-300'}`}>
                          ₱{Number(addOn.price).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleAddOnActive(addOn)}
                          disabled={isBusy}
                          title={addOn.is_active ? 'Deactivate' : 'Activate'}
                          className={`p-2 rounded-xl transition-all disabled:opacity-50 ${addOn.is_active ? 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                        >
                          {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditingAddOn(addOn)}
                          disabled={isBusy}
                          className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-violet-500 hover:bg-violet-50 transition-all disabled:opacity-50"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddOnToDelete(addOn)}
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

          <form onSubmit={handleAddAddOn} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Add-On Name</label>
              <input
                value={newAddOn.name}
                onChange={(e) => setNewAddOn(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Fabric Softener"
                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-4 ring-violet-50 focus:border-violet-200 outline-none transition-all"
              />
            </div>
            <div className="w-full sm:w-40 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Price (₱)</label>
              <input
                type="number"
                value={newAddOn.price}
                onChange={(e) => setNewAddOn(prev => ({ ...prev, price: e.target.value }))}
                placeholder="e.g. 20"
                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-4 ring-violet-50 focus:border-violet-200 outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isAddingAddOn}
              className="bg-violet-600 hover:bg-violet-500 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-violet-100 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isAddingAddOn ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={3} />}
              Add
            </button>
          </form>
          {addOnError && (
            <p className="mt-3 text-[11px] font-bold text-rose-500 ml-1">{addOnError}</p>
          )}
        </div>

        {/* SECTION 4: PROMO CODES */}
        <div className="bg-white p-10 rounded-[48px] border-2 border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <Ticket size={24} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Promo Codes</h3>
          </div>
          <p className="text-sm text-slate-400 mb-8 font-bold italic">
            Discount codes customers can enter in the mobile app at checkout. Leave "Max Uses" blank for unlimited.
          </p>

          {promoCodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-6 text-center bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200 mb-8">
              <PackageOpen size={28} className="text-slate-300 mb-3" />
              <p className="text-slate-400 text-xs max-w-sm">No promo codes yet — add one below (e.g. "WELCOME10" — 10% off).</p>
            </div>
          ) : (
            <div className="mb-8 divide-y divide-slate-100 border-2 border-slate-100 rounded-[32px] overflow-hidden">
              {promoCodes.map((promo) => {
                const isBusy = busyPromoId === promo.id;
                return (
                  <div key={promo.id} className={`flex items-center gap-4 px-6 py-4 ${!promo.is_active ? 'bg-slate-50/60' : 'bg-white'}`}>
                    <div className="flex-1">
                      <p className={`font-black text-sm ${promo.is_active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                        {promo.code}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        {promo.times_used}{promo.max_uses ? ` / ${promo.max_uses}` : ''} used
                      </p>
                    </div>
                    <span className={`font-black text-sm w-24 text-right ${promo.is_active ? 'text-slate-700' : 'text-slate-300'}`}>
                      {promo.discount_type === 'percent' ? `${promo.discount_value}%` : `₱${Number(promo.discount_value).toFixed(2)}`} off
                    </span>
                    <button
                      type="button"
                      onClick={() => togglePromoActive(promo)}
                      disabled={isBusy}
                      title={promo.is_active ? 'Deactivate' : 'Activate'}
                      className={`p-2 rounded-xl transition-all disabled:opacity-50 ${promo.is_active ? 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                    >
                      {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPromoToDelete(promo)}
                      disabled={isBusy}
                      className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <form onSubmit={handleAddPromo} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Code</label>
              <input
                value={newPromo.code}
                onChange={(e) => setNewPromo(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. WELCOME10"
                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-4 ring-rose-50 focus:border-rose-200 outline-none transition-all"
              />
            </div>
            <div className="w-full sm:w-28 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
              <select
                value={newPromo.discount_type}
                onChange={(e) => setNewPromo(prev => ({ ...prev, discount_type: e.target.value }))}
                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-4 ring-rose-50 focus:border-rose-200 outline-none transition-all cursor-pointer"
              >
                {DISCOUNT_TYPES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-32 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Value</label>
              <input
                type="number"
                value={newPromo.discount_value}
                onChange={(e) => setNewPromo(prev => ({ ...prev, discount_value: e.target.value }))}
                placeholder="e.g. 10"
                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-4 ring-rose-50 focus:border-rose-200 outline-none transition-all"
              />
            </div>
            <div className="w-full sm:w-32 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Max Uses</label>
              <input
                type="number"
                value={newPromo.max_uses}
                onChange={(e) => setNewPromo(prev => ({ ...prev, max_uses: e.target.value }))}
                placeholder="Unlimited"
                className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-4 ring-rose-50 focus:border-rose-200 outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isAddingPromo}
              className="bg-rose-600 hover:bg-rose-500 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-rose-100 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isAddingPromo ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={3} />}
              Add
            </button>
          </form>
          {promoError && (
            <p className="mt-3 text-[11px] font-bold text-rose-500 ml-1">{promoError}</p>
          )}
        </div>

        {/* SECTION 5: BOOKING RULES */}
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

        {/* SECTION 6: UTILITY CALIBRATION */}
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

        {/* SECTION 7: SCHEDULING */}
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
            * Operational rate changes affect real-time analytics and transaction logic immediately once saved. Service, delivery, add-on, and promo changes above save instantly.
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