import React, { useState, useEffect } from 'react';
import { User, Weight, Settings2, CheckCircle2, Hash, Calculator, Edit3, Cpu, HardDrive, Loader2, AlertTriangle, Ban, Droplets, ArrowRight, Receipt, Tag, Calendar, Wallet, RotateCcw } from 'lucide-react';
import apiService from '../../services/APIservices';
import { optimizationLogic } from '../../utils/optimizationlogic';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'gcash', label: 'GCash' },
  { value: 'paymaya', label: 'PayMaya' },
];

// Shared class strings so every field in the compact layout stays consistent.
const LABEL_CLASS = 'text-[10px] font-black text-slate-400 uppercase flex items-center gap-1.5 tracking-widest mb-1.5';
const INPUT_BASE = 'w-full border rounded-xl px-4 py-2.5 text-sm font-bold outline-none transition-all';

/**
 * WALK-IN FORM COMPONENT
 *
 * Embedded in the "Walk-In Entry" tab (always visible while that tab is
 * active) instead of a popup. There is no `isOpen` prop and no backdrop.
 *
 * LAYOUT (compact): header with title + Smart/Manual toggle + Clear, then a
 * two-column body on large screens —
 *   left  : customer, weight/loads, service, payment method, promo code
 *   right : inventory used, total payable, submit
 * On smaller screens it collapses to a single column.
 *
 * FLOW (three steps internally):
 *   'form'    — the embedded form.
 *   'assign'  — modal overlay right after the booking is created.
 *   'receipt' — modal overlay after assign (assigned OR skipped). "Done"
 *               resets everything to a blank form on the SAME tab.
 *
 * onBookingSuccess fires right after the booking is created (Pending, no
 * machines yet). onAssignSuccess fires after a successful machine
 * assignment. Switching Tier-1 tabs unmounts this component.
 *
 * UI NOTE: icons are lucide-react only — no emojis.
 */
const WalkInForm = ({ onBookingSuccess, onAssignSuccess }) => {
  const [step, setStep] = useState('form'); // 'form' | 'assign' | 'receipt'

  const [bookingMode, setBookingMode] = useState('smart');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [machineData, setMachineData] = useState([]);

  const [servicePricing, setServicePricing] = useState({});
  const [serviceUnits, setServiceUnits] = useState({});
  const [serviceRequiredPhases, setServiceRequiredPhases] = useState({});

  const [weightTouched, setWeightTouched] = useState(false);

  const [inventoryData, setInventoryData] = useState([]);
  const [selectedInventory, setSelectedInventory] = useState({});
  const [touchedInventory, setTouchedInventory] = useState({});

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [promoCodeInput, setPromoCodeInput] = useState('');

  const [formData, setFormData] = useState({
    customerName: '',
    serviceType: '',
    itemType: 'Clothes',
    weight: 6,
    calculatedLoads: 1,
    totalPrice: 0
  });

  // --- ASSIGN STEP STATE ---
  const [createdBooking, setCreatedBooking] = useState(null);
  const [assignMachines, setAssignMachines] = useState([]);
  const [selectedAssignIds, setSelectedAssignIds] = useState([]);
  const [isLoadingAssignData, setIsLoadingAssignData] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignServiceNotFound, setAssignServiceNotFound] = useState(false);

  // Remembers which machines were actually assigned (or that the step
  // was skipped), purely for the receipt step's display.
  const [assignedMachineLabels, setAssignedMachineLabels] = useState([]);

  const CAPACITY = {
    CLOTHES_MAX: 6,
    LINENS_MAX: 4
  };

  const normalizeName = (s) => (s || '').trim().toLowerCase();

  const serviceNames = Object.keys(servicePricing).filter(
    (key) => key !== 'detergent_fee' && key !== 'minimum_weight_kg'
  );
  const minimumWeightKg = Number(servicePricing.minimum_weight_kg) || 6;
  const hasConfiguredServices = serviceNames.length > 0;
  const isBelowMinimumWeight = Number(formData.weight) < minimumWeightKg;

  const classifyProjectedStock = (projectedStock, reorderPoint) => {
    if (!reorderPoint || reorderPoint <= 0) return 'OK';
    if (projectedStock <= reorderPoint * 0.5) return 'CRITICAL';
    if (projectedStock <= reorderPoint) return 'LOW';
    return 'OK';
  };

  /**
   * SYNC: fetched once on mount. The component's presence in the DOM (the
   * parent only renders it while the Walk-In Entry tab is active) already
   * serves as the "isOpen" gate. Re-fetches fresh settings each time the
   * tab is switched back to.
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingSettings(true);
        const shopId = apiService.getShopId();

        const [machines, pricing, inventory, serviceTypeList] = await Promise.all([
          apiService.getMachines(shopId),
          apiService.getBookingPricing(shopId),
          apiService.getInventory(shopId),
          apiService.getServiceTypes(shopId)
        ]);

        setMachineData(machines || []);
        setServicePricing(pricing || {});
        setInventoryData(inventory || []);

        const unitsMap = {};
        const phasesMap = {};
        (serviceTypeList || []).forEach((s) => {
          unitsMap[s.name] = s.pricing_unit || 'load';
          phasesMap[normalizeName(s.name)] = s.required_phases || 'full_service';
        });
        setServiceUnits(unitsMap);
        setServiceRequiredPhases(phasesMap);

        const names = Object.keys(pricing || {}).filter(
          (key) => key !== 'detergent_fee' && key !== 'minimum_weight_kg'
        );
        const minW = Number((pricing || {}).minimum_weight_kg) || 6;

        setFormData(prev => ({
          ...prev,
          serviceType: names.includes(prev.serviceType) ? prev.serviceType : (names[0] || ''),
          weight: weightTouched ? prev.weight : minW
        }));
      } catch (error) {
        console.error("Error fetching Walk-In form data:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (bookingMode === 'manual' || isLoadingSettings) return;
    if (!formData.serviceType) {
      setFormData(prev => ({ ...prev, totalPrice: 0, calculatedLoads: 1 }));
      return;
    }

    const unitPrice = Number(servicePricing[formData.serviceType]) || 0;
    let base = 0;
    let loads = 1;

    if (formData.serviceType === 'Full Service') {
      const limit = formData.itemType === 'Clothes' ? CAPACITY.CLOTHES_MAX : CAPACITY.LINENS_MAX;
      loads = Math.ceil(Number(formData.weight) / limit) || 1;
      base = unitPrice * loads;
    }
    else if (formData.serviceType === 'Regular Wash') {
      loads = Math.ceil(Number(formData.weight) / 8) || 1;
      base = unitPrice * loads;
    }
    else if (formData.serviceType === 'Titan Wash') {
      loads = Math.ceil(Number(formData.weight) / 12) || 1;
      base = unitPrice * loads;
    }
    else if (formData.serviceType === 'Comforter') {
      base = unitPrice * Number(formData.weight);
      loads = 1;
    }
    else {
      loads = Math.ceil(Number(formData.weight) / 8) || 1;
      base = unitPrice * loads;
    }

    setFormData(prev => ({
      ...prev,
      totalPrice: Math.round(base),
      calculatedLoads: loads
    }));
  }, [bookingMode, formData.serviceType, formData.itemType, formData.weight, servicePricing, isLoadingSettings]);

  useEffect(() => {
    setSelectedInventory(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach((itemId) => {
        if (touchedInventory[itemId]) return;
        const item = inventoryData.find(i => String(i.id) === String(itemId));
        if (!item) return;
        const suggested = Math.round((formData.calculatedLoads * (item.usage_rate || 0)) * 100) / 100;
        updated[itemId] = suggested;
      });
      return updated;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.calculatedLoads, inventoryData]);

  /**
   * Kept up here next to the other hooks (Rules of Hooks) — the same
   * number of hooks must run on every render, so nothing hook-related
   * should ever sit after an early return.
   */
  const assignRequiredPhases = createdBooking
    ? (serviceRequiredPhases[normalizeName(createdBooking.service_type)] ?? null)
    : null;

  useEffect(() => {
    if (step === 'assign' && createdBooking && assignRequiredPhases === null) {
      setAssignServiceNotFound(true);
    }
  }, [step, createdBooking, assignRequiredPhases]);

  const insufficientStockItem = Object.entries(selectedInventory).find(([itemId, qty]) => {
    const item = inventoryData.find(i => String(i.id) === String(itemId));
    if (!item) return false;
    return Number(qty) > Number(item.current_stock);
  });
  const isBlockedByInventory = Boolean(insufficientStockItem);

  const isBlockedBySmartConfig = bookingMode === 'smart' && !hasConfiguredServices;
  const isBlockedByWeight = isBelowMinimumWeight;
  const isSubmitBlocked = isBlockedBySmartConfig || isBlockedByWeight || isBlockedByInventory;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'weight') setWeightTouched(true);
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value)
    }));
  };

  const toggleInventoryItem = (item) => {
    const itemId = String(item.id);
    setSelectedInventory(prev => {
      const updated = { ...prev };
      if (itemId in updated) {
        delete updated[itemId];
      } else {
        const suggested = Math.round((formData.calculatedLoads * (item.usage_rate || 0)) * 100) / 100;
        updated[itemId] = suggested || 0.01;
      }
      return updated;
    });
    setTouchedInventory(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  const updateInventoryQuantity = (itemId, value) => {
    setSelectedInventory(prev => ({
      ...prev,
      [itemId]: value === '' ? 0 : parseFloat(value)
    }));
    setTouchedInventory(prev => ({ ...prev, [itemId]: true }));
  };

  /**
   * Manual "Clear" — the form is always visible (embedded), so staff need
   * a way to wipe it without completing a booking first. Does NOT touch
   * the assign/receipt step state.
   */
  const handleClearForm = () => {
    setWeightTouched(false);
    setSelectedInventory({});
    setTouchedInventory({});
    setPaymentMethod('cash');
    setPromoCodeInput('');
    setBookingMode('smart');
    setFormData({
      customerName: '',
      serviceType: serviceNames[0] || '',
      itemType: 'Clothes',
      weight: minimumWeightKg,
      calculatedLoads: 1,
      totalPrice: 0
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isBlockedByWeight) {
      alert(`Minimum booking weight is ${minimumWeightKg}kg. Please adjust the weight.`);
      return;
    }
    if (bookingMode === 'smart' && isBlockedBySmartConfig) {
      alert("No services are configured for this shop yet. Please add at least one service in Optimization Settings.");
      return;
    }
    if (bookingMode === 'smart' && !formData.serviceType) {
      alert("Please select a service type.");
      return;
    }
    if (isBlockedByInventory) {
      alert("One of the selected inventory items doesn't have enough stock for this booking. Please adjust the quantity.");
      return;
    }

    setIsSubmitting(true);

    try {
      const inventoryItems = Object.entries(selectedInventory)
        .filter(([, qty]) => Number(qty) > 0)
        .map(([itemId, qty]) => ({
          inventory_item_id: parseInt(itemId),
          quantity_used: parseFloat(qty)
        }));

      const payload = {
        customer_name: String(formData.customerName || '').trim(),
        service_type: String(formData.serviceType),
        category: String(formData.itemType),
        weight: parseFloat(formData.weight || 0),
        loads: parseInt(formData.calculatedLoads || 1),
        total_price: parseFloat(formData.totalPrice || 0),
        washer_id: null,
        dryer_id: null,
        inventory_items: inventoryItems,
        is_rush: false,
        booking_mode: String(bookingMode),
        add_detergent: false,
        add_delivery: false,
        shop_id: parseInt(apiService.getShopId() || 0),
        payment_method: paymentMethod,
        promo_code: promoCodeInput.trim() ? promoCodeInput.trim() : null,
        booking_timestamp: new Date().toISOString()
      };

      const response = await apiService.createBooking(payload);

      if (onBookingSuccess) onBookingSuccess(response);

      setIsLoadingAssignData(true);
      const freshMachines = await apiService.getMachines(apiService.getShopId());
      setAssignMachines(freshMachines || []);
      setIsLoadingAssignData(false);

      setCreatedBooking(response);
      setStep('assign');

    } catch (error) {
      console.error("Booking Submission Error:", error);
      const backendError = error.response?.data?.detail;
      alert(typeof backendError === 'string' ? backendError : "Transaction failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * FULL RESET — called from the RECEIPT step's "Done" button. Wipes
   * everything and drops back to a blank 'form' step, still on the
   * Walk-In Entry tab, ready for the next customer.
   */
  const resetToBlankForm = () => {
    handleClearForm();
    setStep('form');
    setCreatedBooking(null);
    setAssignMachines([]);
    setSelectedAssignIds([]);
    setAssignServiceNotFound(false);
    setAssignedMachineLabels([]);
  };

  const handleSkipAssign = () => {
    setAssignedMachineLabels([]);
    setStep('receipt');
  };

  const resolvedRequiredPhases = assignRequiredPhases ?? 'full_service';
  const assignTargetType = resolvedRequiredPhases === 'dry_only' ? 'Dryer' : 'Washer';
  const assignRequiredCount = createdBooking?.loads || 1;

  const assignCandidateMachines = assignMachines.filter((m) => {
    const s = m.status?.toLowerCase();
    const isAvailable = s === 'available' || s === 'idle' || s === 'ready';
    return isAvailable && m.machine_type === assignTargetType;
  });

  const isAssignFullySelected = selectedAssignIds.length === assignRequiredCount;
  const canSelectMoreAssign = selectedAssignIds.length < assignRequiredCount;

  const toggleAssignMachine = (machineId) => {
    setSelectedAssignIds(prev => {
      if (prev.includes(machineId)) return prev.filter(id => id !== machineId);
      if (prev.length >= assignRequiredCount) return prev;
      return [...prev, machineId];
    });
  };

  const handleConfirmAssign = async () => {
    if (!isAssignFullySelected || !createdBooking) return;

    setIsAssigning(true);
    try {
      await apiService.assignMachinesToBooking(createdBooking.id, {
        machine_ids: selectedAssignIds.map(id => parseInt(id)),
      });

      const labels = selectedAssignIds
        .map(id => assignCandidateMachines.find(m => m.id === id))
        .filter(Boolean)
        .sort((a, b) => a.machine_number - b.machine_number)
        .map(m => `${assignTargetType === 'Washer' ? 'W' : 'D'}${m.machine_number}`);

      if (onAssignSuccess) {
        onAssignSuccess(`${labels.join(', ')} assigned to ${createdBooking.customer_name}.`);
      }

      setAssignedMachineLabels(labels);
      setStep('receipt');
    } catch (error) {
      console.error('Assign machines error:', error);
      const msg = error.response?.data?.detail;
      alert(typeof msg === 'string' ? msg : 'Failed to assign machines. Please try again.');
    } finally {
      setIsAssigning(false);
    }
  };

  const renderInventoryChecklist = () => {
    if (inventoryData.length === 0) {
      return (
        <div className="py-3 text-center">
          <span className="text-[10px] font-bold text-slate-300 uppercase italic">No inventory items configured</span>
        </div>
      );
    }

    return inventoryData.map((item) => {
      const itemId = String(item.id);
      const isSelected = itemId in selectedInventory;
      const quantity = selectedInventory[itemId] ?? 0;
      const exceedsStock = isSelected && Number(quantity) > Number(item.current_stock);
      const projectedStock = Number(item.current_stock) - Number(quantity || 0);
      const projectedStatus = isSelected && !exceedsStock
        ? classifyProjectedStock(projectedStock, item.reorder_point)
        : 'OK';

      return (
        <div
          key={item.id}
          className={`rounded-xl border transition-all ${
            isSelected
              ? exceedsStock
                ? 'border-rose-200 bg-rose-50/50'
                : projectedStatus === 'CRITICAL'
                  ? 'border-rose-100 bg-rose-50/30'
                  : projectedStatus === 'LOW'
                    ? 'border-amber-100 bg-amber-50/30'
                    : 'border-sky-100 bg-sky-50/30'
              : 'border-slate-100 bg-white'
          }`}
        >
          <button
            type="button"
            onClick={() => toggleInventoryItem(item)}
            className="w-full flex items-center justify-between px-3 py-2 text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                isSelected ? 'bg-sky-500 border-sky-600' : 'border-slate-200'
              }`}>
                {isSelected && <CheckCircle2 size={11} className="text-white" />}
              </div>
              <div>
                <p className="text-xs font-black text-slate-700 leading-tight">{item.item_name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-tight">
                  {item.current_stock}{item.unit} in stock · {item.usage_rate}{item.unit}/load
                </p>
              </div>
            </div>
          </button>

          {isSelected && (
            <div className="px-3 pb-2.5 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Qty</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={quantity}
                  onChange={(e) => updateInventoryQuantity(itemId, e.target.value)}
                  className={`flex-1 border rounded-lg px-3 py-1.5 font-bold text-xs outline-none transition-all ${
                    exceedsStock
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'bg-white border-slate-200 text-slate-700 focus:border-sky-300'
                  }`}
                />
                <span className="text-[11px] font-bold text-slate-400">{item.unit}</span>
              </div>

              {exceedsStock && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500">
                  <Ban size={11} className="shrink-0" />
                  Exceeds available stock ({item.current_stock}{item.unit} left).
                </div>
              )}
              {!exceedsStock && projectedStatus === 'CRITICAL' && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500">
                  <AlertTriangle size={11} className="shrink-0" />
                  Leaves stock CRITICAL ({Math.max(projectedStock, 0)}{item.unit} remaining).
                </div>
              )}
              {!exceedsStock && projectedStatus === 'LOW' && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600">
                  <AlertTriangle size={11} className="shrink-0" />
                  Leaves stock LOW ({Math.max(projectedStock, 0)}{item.unit} remaining).
                </div>
              )}
            </div>
          )}
        </div>
      );
    });
  };

  const renderAssignGrid = () => {
    if (assignCandidateMachines.length === 0) {
      return (
        <div className="col-span-4 py-3 text-center">
          <span className="text-[10px] font-bold text-slate-300 uppercase italic">No {assignTargetType}s Available</span>
        </div>
      );
    }

    return assignCandidateMachines
      .sort((a, b) => a.machine_number - b.machine_number)
      .map((machine) => {
        const isSelected = selectedAssignIds.includes(machine.id);
        const isDisabled = !isSelected && !canSelectMoreAssign;
        return (
          <button
            key={`assign-${assignTargetType}-${machine.id}`}
            type="button"
            onClick={() => toggleAssignMachine(machine.id)}
            disabled={isDisabled}
            className={`h-12 rounded-xl text-xs font-black border-2 transition-all duration-200 relative
              ${isSelected
                ? assignTargetType === 'Washer'
                  ? 'bg-sky-500 border-sky-600 text-white shadow-md shadow-sky-200'
                  : 'bg-orange-500 border-orange-600 text-white shadow-md shadow-orange-200'
                : isDisabled
                  ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-60'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-sky-300 hover:bg-sky-50/30'
              }`}
          >
            <div className="flex flex-col items-center justify-center leading-tight">
              <span>{assignTargetType === 'Washer' ? 'W' : 'D'}{machine.machine_number}</span>
              <span className="text-[7px] opacity-60 uppercase">Available</span>
            </div>
          </button>
        );
      });
  };

  /* ------------------------------------------------------------------ */
  /*  OVERLAY — 'receipt' step (modal, floats above whichever tab)       */
  /* ------------------------------------------------------------------ */
  const renderReceiptOverlay = () => {
    if (step !== 'receipt' || !createdBooking) return null;

    const paymentLabel = PAYMENT_METHODS.find(p => p.value === (createdBooking.payment_method || paymentMethod))?.label
      || (createdBooking.payment_method || paymentMethod);
    const hasDiscount = Number(createdBooking.discount_amount || 0) > 0;
    const subtotal = hasDiscount
      ? Number(createdBooking.total_price) + Number(createdBooking.discount_amount)
      : Number(createdBooking.total_price);
    const bookingDate = createdBooking.booking_timestamp
      ? new Date(createdBooking.booking_timestamp)
      : new Date();

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/20 max-h-[92vh]">

          <div className="px-6 pt-7 pb-5 flex flex-col items-center border-b border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
              <CheckCircle2 size={26} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Booking Confirmed</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">
              Receipt #{createdBooking.id}
            </p>
          </div>

          <div className="px-6 py-5 overflow-y-auto custom-scrollbar space-y-4">

            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-sm shrink-0">
                {createdBooking.customer_name?.charAt(0).toUpperCase() || 'C'}
              </div>
              <div>
                <p className="text-slate-900 font-black text-sm">{createdBooking.customer_name}</p>
                <p className="text-slate-400 text-[11px] font-bold flex items-center gap-1.5">
                  <Calendar size={11} />
                  {bookingDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' · '}
                  {bookingDate.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-bold">Service Type</span>
                <span className="text-slate-800 font-black">{createdBooking.service_type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-bold">Weight / Loads</span>
                <span className="text-slate-800 font-black">
                  {createdBooking.weight > 0 ? `${createdBooking.weight} kg` : ''}
                  {createdBooking.weight > 0 && createdBooking.loads ? ' · ' : ''}
                  {createdBooking.loads} {createdBooking.loads > 1 ? 'loads' : 'load'}
                </span>
              </div>

              {assignedMachineLabels.length > 0 ? (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                    <Cpu size={13} /> Machine{assignedMachineLabels.length > 1 ? 's' : ''}
                  </span>
                  <span className="text-sky-600 font-black">{assignedMachineLabels.join(', ')}</span>
                </div>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                    <Cpu size={13} /> Machine
                  </span>
                  <span className="text-amber-500 font-black uppercase text-xs">Not yet assigned</span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                  <Wallet size={13} /> Payment Method
                </span>
                <span className="text-slate-800 font-black">{paymentLabel}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-dashed border-slate-200 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-bold">Subtotal</span>
                <span className="text-slate-600 font-bold">{optimizationLogic.formatCurrency(subtotal)}</span>
              </div>
              {hasDiscount && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-500 font-bold flex items-center gap-1.5">
                    <Tag size={13} /> Promo {createdBooking.promo_code ? `(${createdBooking.promo_code})` : ''}
                  </span>
                  <span className="text-emerald-500 font-bold">
                    -{optimizationLogic.formatCurrency(createdBooking.discount_amount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1.5">
                <span className="text-slate-900 font-black text-base">Total</span>
                <span className="text-slate-900 font-black text-xl tracking-tight">
                  {optimizationLogic.formatCurrency(createdBooking.total_price)}
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 pt-1">
            <button
              type="button"
              onClick={resetToBlankForm}
              className="w-full py-3 rounded-2xl font-black text-sm text-white bg-slate-900 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Receipt size={16} /> Done — Next Customer
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ------------------------------------------------------------------ */
  /*  OVERLAY — 'assign' step (modal, floats above whichever tab)        */
  /* ------------------------------------------------------------------ */
  const renderAssignOverlay = () => {
    if (step !== 'assign' || !createdBooking) return null;

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/20">

          <div className="px-6 pt-6 pb-4 border-b border-slate-50">
            <div className="flex items-center gap-1.5 text-emerald-500 mb-1.5">
              <CheckCircle2 size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Booking Created</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Assign Machine{assignRequiredCount > 1 ? 's' : ''}
            </h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">
              {assignRequiredCount > 1
                ? `Select ${assignRequiredCount} ${assignTargetType.toLowerCase()}s (one per load)`
                : `Select a ${assignTargetType.toLowerCase()} for this booking`}
            </p>
          </div>

          <div className="px-6 py-4 bg-amber-50/60 border-b border-amber-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 font-black text-sm shrink-0">
                {createdBooking.customer_name?.charAt(0).toUpperCase() || 'C'}
              </div>
              <div>
                <p className="text-slate-900 font-black text-sm">{createdBooking.customer_name}</p>
                <p className="text-slate-500 text-[11px] font-bold">
                  {createdBooking.service_type} · {createdBooking.weight > 0 ? `${createdBooking.weight} KG` : `${assignRequiredCount} ${assignRequiredCount > 1 ? 'Loads' : 'Load'}`}
                </p>
              </div>
              <span className="ml-auto px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-[9px] font-black uppercase tracking-widest">
                Pending
              </span>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            {isLoadingAssignData ? (
              <div className="flex items-center justify-center py-3 gap-2 text-sky-500 font-bold text-sm animate-pulse">
                <Loader2 className="animate-spin" size={16} />
                <span>Checking machine availability...</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    {assignTargetType === 'Washer'
                      ? <Cpu size={13} className="text-sky-500" />
                      : <HardDrive size={13} className="text-orange-500" />}
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{assignTargetType}s</span>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isAssignFullySelected ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {selectedAssignIds.length} / {assignRequiredCount} selected
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2.5">
                  {renderAssignGrid()}
                </div>
              </div>
            )}

            {!isLoadingAssignData && assignServiceNotFound && (
              <div className="flex items-start gap-2 text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium">
                  Couldn't find "{createdBooking.service_type}" in your current service catalog — defaulting to
                  Wash + Dry. Check Optimization Settings if this looks wrong.
                </p>
              </div>
            )}

            {!isLoadingAssignData && resolvedRequiredPhases === 'full_service' && !assignServiceNotFound && (
              <div className="flex items-start gap-2 text-sky-500 bg-sky-50 rounded-xl px-3 py-2.5">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium">
                  Dryers aren't assigned here — use "Move to Dryer" per load from the terminal once washing finishes.
                </p>
              </div>
            )}

            {!isLoadingAssignData && !isAssignFullySelected && (
              <div className="flex items-start gap-2 text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium">
                  Select exactly {assignRequiredCount} {assignTargetType.toLowerCase()}{assignRequiredCount > 1 ? 's' : ''}, or skip and assign later.
                </p>
              </div>
            )}
          </div>

          <div className="px-6 pb-6 pt-1 flex gap-3">
            <button
              type="button"
              onClick={handleSkipAssign}
              disabled={isAssigning}
              className="flex-1 py-3 rounded-2xl border-2 border-slate-100 text-slate-400 font-black text-sm hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
            >
              Skip for Now
            </button>
            <button
              type="button"
              onClick={handleConfirmAssign}
              disabled={!isAssignFullySelected || isAssigning || isLoadingAssignData}
              className={`flex-[2] py-3 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md
                ${!isAssignFullySelected || isAssigning || isLoadingAssignData
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-sky-500 hover:bg-sky-600 shadow-sky-200'
                }`}
            >
              {isAssigning ? (
                <><Loader2 size={16} className="animate-spin" /> Assigning...</>
              ) : (
                <><CheckCircle2 size={16} /> Assign {assignRequiredCount > 1 ? `${assignRequiredCount} Machines` : 'Machine'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ------------------------------------------------------------------ */
  /*  EMBEDDED — 'form' (always rendered as part of the page's layout)   */
  /* ------------------------------------------------------------------ */
  return (
    <>
      <div className="bg-white w-full rounded-3xl shadow-sm border border-slate-100 overflow-hidden">

        {/* HEADER: title + mode toggle + clear */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Walk-In Entry</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-0.5">LaundryLink Smart Terminal</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center">
              <button
                type="button"
                onClick={() => setBookingMode('smart')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-black transition-all ${bookingMode === 'smart' ? 'text-sky-600 bg-white shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
              >
                <Calculator size={13} /> SMART CALC
              </button>
              <button
                type="button"
                onClick={() => setBookingMode('manual')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-black transition-all ${bookingMode === 'manual' ? 'text-orange-600 bg-white shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
              >
                <Edit3 size={13} /> MANUAL OVERRIDE
              </button>
            </div>

            <button
              type="button"
              onClick={handleClearForm}
              className="flex items-center gap-1.5 px-3 py-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all active:scale-90 text-[11px] font-black uppercase tracking-tight"
              title="Clear Form"
            >
              <RotateCcw size={13} /> Clear
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isLoadingSettings && (
            <div className="flex items-center justify-center py-2 gap-2 text-sky-500 font-bold text-sm animate-pulse">
              <Loader2 className="animate-spin" size={15} />
              <span>Syncing Live Pricing...</span>
            </div>
          )}

          {!isLoadingSettings && bookingMode === 'smart' && !hasConfiguredServices && (
            <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
              <Ban size={16} className="text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-black text-rose-700 uppercase tracking-wide">No Services Configured</p>
                <p className="text-[11px] text-rose-500 font-medium mt-0.5">
                  This shop hasn't added any services yet. Go to <strong>Optimization Settings</strong> to add at least one service and its price, or switch to <strong>Manual Override</strong> to enter a booking directly.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* LEFT COLUMN — booking details */}
            <div className="lg:col-span-3 space-y-4">

              <div>
                <label className={LABEL_CLASS}>
                  <User size={13} className="text-sky-500" /> Customer Name
                </label>
                <input
                  name="customerName"
                  required
                  value={formData.customerName}
                  onChange={handleChange}
                  className={`${INPUT_BASE} bg-slate-50/50 border-slate-200 text-slate-800 focus:ring-4 ring-sky-50 focus:border-sky-300 placeholder:text-slate-300`}
                  placeholder="Juan Dela Cruz"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLASS}>
                    <Weight size={13} className="text-sky-500" /> Weight (kg)
                    <span className="normal-case text-slate-300 font-bold">min {minimumWeightKg}kg</span>
                  </label>
                  <input
                    name="weight" type="number" step="0.1" min={minimumWeightKg} required
                    value={formData.weight} onChange={handleChange}
                    className={`${INPUT_BASE} ${
                      isBelowMinimumWeight
                        ? 'bg-rose-50/50 border-rose-200 text-rose-600 focus:border-rose-300'
                        : bookingMode === 'manual'
                          ? 'bg-orange-50/30 border-orange-100 text-orange-600 focus:border-orange-200'
                          : 'bg-slate-50/50 border-slate-200 text-slate-800 focus:border-sky-300'
                    }`}
                  />
                  {isBelowMinimumWeight && (
                    <p className="text-[10px] font-bold text-rose-500 mt-1">
                      Minimum is {minimumWeightKg}kg for this shop.
                    </p>
                  )}
                </div>

                <div>
                  <label className={LABEL_CLASS}>
                    <Hash size={13} className="text-sky-500" /> {bookingMode === 'manual' ? 'Manual Loads' : 'Est. Loads'}
                  </label>
                  {bookingMode === 'manual' ? (
                    <input
                      name="calculatedLoads" type="number"
                      value={formData.calculatedLoads} onChange={handleChange}
                      className={`${INPUT_BASE} bg-orange-50/30 border-orange-100 font-black text-orange-600 focus:border-orange-200`}
                    />
                  ) : (
                    <div className={`${INPUT_BASE} bg-slate-100 border-slate-100 font-black text-slate-400`}>
                      {formData.calculatedLoads} {formData.calculatedLoads > 1 ? 'Loads' : 'Load'}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className={LABEL_CLASS}>
                  <Settings2 size={13} className="text-sky-500" /> Service Type
                </label>
                {bookingMode === 'manual' ? (
                  <input
                    name="serviceType" value={formData.serviceType} onChange={handleChange}
                    placeholder="Enter Service"
                    className={`${INPUT_BASE} bg-orange-50/30 border-orange-100 text-orange-600 focus:border-orange-200`}
                  />
                ) : hasConfiguredServices ? (
                  <select
                    name="serviceType" value={formData.serviceType} onChange={handleChange}
                    className={`${INPUT_BASE} bg-slate-50 border-slate-200 text-slate-800 cursor-pointer focus:border-sky-300`}
                  >
                    {serviceNames.map(name => (
                      <option key={name} value={name}>
                        {name} — {optimizationLogic.formatPriceWithUnit(servicePricing[name], serviceUnits[name])}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className={`${INPUT_BASE} bg-slate-100 border-slate-100 text-slate-300 italic`}>
                    No services configured
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* PAYMENT METHOD */}
                <div>
                  <label className={LABEL_CLASS}>
                    <Wallet size={13} className="text-sky-500" /> Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map((pm) => (
                      <button
                        key={pm.value}
                        type="button"
                        onClick={() => setPaymentMethod(pm.value)}
                        className={`py-2.5 rounded-xl font-black text-xs border transition-all ${
                          paymentMethod === pm.value
                            ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                            : 'bg-slate-50/50 border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {pm.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* PROMO CODE */}
                <div>
                  <label className={LABEL_CLASS}>
                    <Tag size={13} className="text-sky-500" /> Promo Code
                    <span className="normal-case text-slate-300 font-bold">(optional)</span>
                  </label>
                  <input
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. WELCOME10"
                    className={`${INPUT_BASE} bg-slate-50/50 border-slate-200 text-slate-800 focus:ring-4 ring-emerald-50 focus:border-emerald-300 placeholder:text-slate-300`}
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium -mt-2">
                The promo discount is validated and applied automatically when you create this booking.
              </p>

              {/* Machine assignment happens in the NEXT step, after creation */}
              <div className="flex items-start gap-2.5 bg-sky-50 border border-sky-100 rounded-xl px-4 py-3">
                <ArrowRight size={15} className="text-sky-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-sky-700 font-medium">
                  <span className="font-black">Machine assignment comes next.</span>{' '}
                  After creating this booking, you'll pick the washer{formData.calculatedLoads > 1 ? 's' : ''} or dryer{formData.calculatedLoads > 1 ? 's' : ''} this service needs.
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN — inventory, total, submit */}
            <div className="lg:col-span-2 space-y-4">

              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5 tracking-widest">
                    <Droplets size={13} className="text-sky-500" /> Inventory Items Used
                  </label>
                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-tight border border-amber-100">
                    Optional
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mb-2.5">
                  Consumables used for this booking. Suggested amounts follow the load count and can be edited.
                </p>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  {renderInventoryChecklist()}
                </div>
              </div>

              <div className={`rounded-2xl px-5 py-4 flex justify-between items-center shadow-lg transition-all duration-500 ${bookingMode === 'manual' ? 'bg-orange-600 shadow-orange-100' : 'bg-slate-900 shadow-slate-200'}`}>
                <span className="font-bold text-white/50 text-[10px] uppercase tracking-[0.3em]">Total Payable</span>
                {bookingMode === 'manual' ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-black text-white/40">₱</span>
                    <input
                      name="totalPrice" type="number"
                      value={formData.totalPrice} onChange={handleChange}
                      className="bg-transparent text-2xl font-black text-white w-24 outline-none border-b-2 border-white/30 focus:border-white transition-all"
                    />
                  </div>
                ) : (
                  <span className="text-2xl font-black text-white tracking-tight">
                    {optimizationLogic.formatCurrency(formData.totalPrice)}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isSubmitBlocked}
                className={`w-full text-white py-3.5 rounded-2xl font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95
                  ${isSubmitting || isSubmitBlocked ? 'opacity-50 cursor-not-allowed' : ''}
                  ${bookingMode === 'manual' ? 'bg-orange-500 hover:bg-orange-400 shadow-orange-200' : 'bg-sky-600 hover:bg-sky-500 shadow-sky-200'}
                `}
              >
                {isSubmitting ? (
                  <><Loader2 size={18} className="animate-spin" /> Creating...</>
                ) : isSubmitBlocked ? (
                  <><Ban size={18} /> {
                    isBlockedByWeight
                      ? `Below ${minimumWeightKg}kg Minimum`
                      : isBlockedByInventory
                        ? 'Insufficient Stock'
                        : 'No Services Configured'
                  }</>
                ) : (
                  <><CheckCircle2 size={18} /> Create & Assign Machine</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {renderAssignOverlay()}
      {renderReceiptOverlay()}
    </>
  );
};

export default WalkInForm;
