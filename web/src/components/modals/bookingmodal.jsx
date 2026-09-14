import React, { useState, useEffect } from 'react';
import { X, User, Weight, Settings2, CheckCircle2, Hash, Calculator, Edit3, Cpu, Loader2, AlertTriangle, Ban, Droplets } from 'lucide-react';
import apiService from '../../services/APIservices';
import { optimizationLogic } from '../../utils/optimizationlogic';
import AssignMachineModal from './assignmachinemodal';

/**
 * BOOKING MODAL COMPONENT
 * Handles new laundry order creation with Smart Calculation and Manual Override modes.
 *
 * Service Type is fully dynamic, fetched from Optimization Settings via
 * apiService.getBookingPricing(). If the shop hasn't configured any
 * services yet, the Service Type dropdown is empty and submission is
 * blocked with a message pointing to Optimization Settings.
 *
 * Weight (kg) defaults to whatever minimum_weight_kg is configured in
 * Optimization Settings (falls back to 6kg if unset), and this is
 * enforced as a HARD LIMIT — the field carries a native `min` attribute
 * and submission is blocked (not just flagged) if the value goes below
 * it, matching the same limit the backend enforces in
 * booking_controller.create_booking().
 *
 * MACHINE ASSIGNMENT (UPDATED — multi-machine assignment feature):
 * - Every booking created here is ALWAYS "Pending", with NO machine
 *   assigned at creation time — regardless of load count. The inline
 *   single-washer/single-dryer picker that used to live in this modal
 *   has been REMOVED.
 * - Why: the backend's BookingCreate schema only ever supported ONE
 *   washer_id + ONE dryer_id (legacy path), and that legacy path does
 *   NOT check the service's required_phases — it would happily let you
 *   attach a washer to a "Dry Clean only" booking. The new
 *   POST /bookings/{id}/assign-machines endpoint (used by
 *   AssignMachineModal) is the one that correctly resolves washer vs.
 *   dryer from ServiceType.required_phases, and it also handles N
 *   machines at once (one per load). So ALL machine assignment — even
 *   for a single-load booking — now happens as a separate step, right
 *   after creation, via AssignMachineModal.
 * - This also removes the need to fetch machine data in this modal
 *   up front; machine data is only fetched on-demand, right after a
 *   booking is successfully created (see "CHAINED ASSIGN STEP" below).
 *
 * CHAINED ASSIGN STEP (NEW):
 * - Right after a booking is created, instead of just closing, this
 *   modal swaps straight into rendering <AssignMachineModal> for the
 *   booking that was just made — so the staff flow still feels like
 *   one continuous action, even though it's two backend calls
 *   (POST /bookings/ then POST /bookings/{id}/assign-machines).
 * - `onSubmit(response)` is still called immediately once the booking
 *   exists (so the parent's booking list updates right away, showing
 *   it as Pending), but `onClose()` is deferred until the chained
 *   Assign step is either completed or skipped ("Cancel" in
 *   AssignMachineModal just skips it — the booking stays Pending and
 *   can be assigned later from the terminal, same as before).
 * - Assumes the parent only uses `onClose` to actually unmount/hide
 *   this modal (not `onSubmit`) — if the parent closes the modal on
 *   `onSubmit` too, the chained Assign step would never be visible.
 *
 * INVENTORY (MULTI-ITEM):
 * - Shop's inventory items are fetched and shown as a checklist.
 * - Selecting an item auto-suggests a quantity = calculatedLoads × usage_rate
 *   (usage_rate is PER LOAD, not per day — see inventory_controller.py).
 * - The suggested quantity is editable — staff can override it manually.
 * - Once manually edited, that item's quantity is no longer auto-recalculated
 *   when loads changes (same "touched" pattern as the Weight field).
 * - A warning banner appears (non-blocking) if the deduction would push
 *   an item's stock into LOW or CRITICAL, or if it would exceed available
 *   stock entirely (blocking, since the backend would reject it anyway).
 * - On submit, selected items are sent as inventory_items: [{ inventory_item_id,
 *   quantity_used }], matching the backend's multi-item BookingCreate schema.
 *
 * PRICING UNIT:
 * - servicePricing (from getBookingPricing) is a flat { name: price } map
 *   with no unit info — that endpoint predates pricing_unit. To show
 *   "₱65.00 / load" in the Service Type dropdown, we ALSO fetch
 *   getServiceTypes() (which does carry pricing_unit) and build a
 *   serviceUnits lookup { name: pricing_unit }. Falls back to "load" for
 *   any name not found (shouldn't normally happen, but keeps the dropdown
 *   from crashing if the two lists are ever briefly out of sync).
 */
const BookingModal = ({ isOpen, onClose, onSubmit, onAssignSuccess, actualBookingTime }) => {
  const [bookingMode, setBookingMode] = useState('smart');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  // --- CHAINED ASSIGN STEP STATE (NEW) ---
  // Holds the booking just returned by createBooking() while the
  // chained AssignMachineModal step is showing. Non-null = we're in
  // the assign step, not the create-booking form.
  const [createdBooking, setCreatedBooking] = useState(null);
  const [chainAvailableMachines, setChainAvailableMachines] = useState([]);
  const [isLoadingChainMachines, setIsLoadingChainMachines] = useState(false);

  // --- PROMO CODE STATE (NEW) ---
  // Full list of the shop's promo codes (active and inactive), fetched
  // once when the modal opens, so the code typed by staff can be
  // validated and previewed client-side. The backend is still the
  // authoritative source of truth — it re-validates and re-computes the
  // discount itself in create_booking(), so this preview can never be
  // used to under-pay.
  const [availablePromoCodes, setAvailablePromoCodes] = useState([]);
  const [promoCodeInput, setPromoCodeInput] = useState('');

  // --- PAYMENT METHOD STATE (NEW) ---
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Dynamic Pricing State (Fetched from Backend)
  // Shape: { [serviceName]: price, detergent_fee: number, minimum_weight_kg: number }
  const [servicePricing, setServicePricing] = useState({});

  // { [serviceName]: pricing_unit } lookup, built from getServiceTypes()
  // since getBookingPricing() itself doesn't carry pricing_unit.
  const [serviceUnits, setServiceUnits] = useState({});

  // Tracks whether the person has manually edited the weight field yet.
  // Prevents the auto-filled minimum from overwriting their input once
  // they've started typing their own value.
  const [weightTouched, setWeightTouched] = useState(false);

  // --- INVENTORY STATE ---
  // Full list of inventory items for this shop, used to render the checklist.
  const [inventoryData, setInventoryData] = useState([]);
  // Map of { [inventoryItemId]: quantityUsed } — only contains SELECTED items.
  const [selectedInventory, setSelectedInventory] = useState({});
  // Set of item IDs whose quantity was manually edited by the person —
  // these stop being auto-recalculated when calculatedLoads changes,
  // same pattern as weightTouched above.
  const [touchedInventory, setTouchedInventory] = useState({});

  const [formData, setFormData] = useState({
    customerName: '',
    serviceType: '',
    itemType: 'Clothes',
    weight: 6,
    calculatedLoads: 1,
    totalPrice: 0
  });

  // Business Logic: Weight limits per load based on item category
  const CAPACITY = {
    CLOTHES_MAX: 6,
    LINENS_MAX: 4
  };

  // Derived: list of actual service names the shop has configured
  const serviceNames = Object.keys(servicePricing).filter(
    (key) => key !== 'detergent_fee' && key !== 'minimum_weight_kg'
  );
  const minimumWeightKg = Number(servicePricing.minimum_weight_kg) || 6;
  const hasConfiguredServices = serviceNames.length > 0;
  const isBelowMinimumWeight = Number(formData.weight) < minimumWeightKg;

  /**
   * NEW (promo code) — client-side preview only. Mirrors the same
   * checks _apply_promo_code() runs on the backend (active, not
   * expired, under max_uses) so staff sees the discount before
   * submitting — but the backend re-validates and re-computes this
   * independently in create_booking(), so a stale/tampered preview
   * here can never result in an under-charged booking.
   */
  const matchedPromo = promoCodeInput.trim()
    ? availablePromoCodes.find(
        (p) => p.code.toUpperCase() === promoCodeInput.trim().toUpperCase()
      )
    : null;

  const promoValidationError = (() => {
    if (!promoCodeInput.trim()) return '';
    if (!matchedPromo) return 'Promo code not found.';
    if (!matchedPromo.is_active) return 'This promo code is no longer active.';
    if (matchedPromo.expires_at && new Date(matchedPromo.expires_at) < new Date()) {
      return 'This promo code has expired.';
    }
    if (matchedPromo.max_uses !== null && matchedPromo.max_uses !== undefined
        && matchedPromo.times_used >= matchedPromo.max_uses) {
      return 'This promo code has reached its usage limit.';
    }
    return '';
  })();

  const isPromoValid = Boolean(matchedPromo) && !promoValidationError;

  const promoPreviewDiscount = isPromoValid
    ? Math.round(
        Math.min(
          matchedPromo.discount_type === 'percent'
            ? formData.totalPrice * (matchedPromo.discount_value / 100)
            : matchedPromo.discount_value,
          formData.totalPrice
        ) * 100
      ) / 100
    : 0;

  const promoPreviewTotal = Math.max(0, Math.round((formData.totalPrice - promoPreviewDiscount) * 100) / 100);

  const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'gcash', label: 'GCash' },
    { value: 'paymaya', label: 'PayMaya' },
  ];

  /**
   * INVENTORY HELPER: mirrors classify_stock_status() in
   * inventory_controller.py — CRITICAL at <=50% of reorder_point, LOW at
   * <=100%, otherwise OK. Kept in sync manually since this is client-side
   * only for warning display; the backend remains the source of truth.
   */
  const classifyProjectedStock = (projectedStock, reorderPoint) => {
    if (!reorderPoint || reorderPoint <= 0) return 'OK';
    if (projectedStock <= reorderPoint * 0.5) return 'CRITICAL';
    if (projectedStock <= reorderPoint) return 'LOW';
    return 'OK';
  };

  /**
   * SYNC: Fetch dynamic service pricing, service types (for pricing_unit),
   * and inventory items from the backend. Also pre-fills the Weight field
   * with the shop's configured minimum, unless the person has already
   * started editing it.
   *
   * NOTE (multi-machine assignment feature): machine data is NO LONGER
   * fetched here — this modal never assigns machines anymore, so there's
   * nothing here that needs it.
   */
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          setIsLoadingSettings(true);
          const shopId = apiService.getShopId();

          const [pricing, inventory, serviceTypeList, promoCodeList] = await Promise.all([
            apiService.getBookingPricing(shopId),
            apiService.getInventory(shopId),
            apiService.getServiceTypes(shopId),
            apiService.getPromoCodes()
          ]);

          setServicePricing(pricing || {});
          setInventoryData(inventory || []);
          setAvailablePromoCodes(promoCodeList || []);

          // Build { name: pricing_unit } lookup from the full service
          // type list, since getBookingPricing() doesn't carry it.
          const unitsMap = {};
          (serviceTypeList || []).forEach((s) => {
            unitsMap[s.name] = s.pricing_unit || 'load';
          });
          setServiceUnits(unitsMap);

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
          console.error("Error fetching modal data:", error);
        } finally {
          setIsLoadingSettings(false);
        }
      };
      fetchData();
    } else {
      // Reset so the next time the modal opens, it pre-fills the
      // configured minimum weight fresh again.
      setWeightTouched(false);
      setSelectedInventory({});
      setTouchedInventory({});
      // NEW — also clear any in-progress chained Assign step, in case
      // the parent force-closes this modal from outside mid-chain.
      setCreatedBooking(null);
      setChainAvailableMachines([]);
      setPromoCodeInput('');
      setPaymentMethod('cash');
    }
  }, [isOpen]);

  /**
   * LOGIC: Auto-calculate pricing and load count.
   */
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
      // Generic fallback for any custom service name the owner configured
      loads = Math.ceil(Number(formData.weight) / 8) || 1;
      base = unitPrice * loads;
    }

    setFormData(prev => ({
      ...prev,
      totalPrice: Math.round(base),
      calculatedLoads: loads
    }));
  }, [bookingMode, formData.serviceType, formData.itemType, formData.weight, servicePricing, isLoadingSettings]);

  /**
   * INVENTORY: recalculate suggested quantities whenever calculatedLoads
   * changes, but ONLY for items the person hasn't manually edited yet
   * (same "touched" pattern used for the Weight field above).
   */
  useEffect(() => {
    setSelectedInventory(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach((itemId) => {
        if (touchedInventory[itemId]) return; // respect manual override
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
   * NEW (chained Assign step) — fetches currently-available machines
   * and switches this modal into rendering <AssignMachineModal> for the
   * booking that was just created. `booking.loads` (already on the
   * response) tells AssignMachineModal how many machines to require.
   *
   * NOTE: these four helpers must stay ABOVE the early-return /
   * chained-render block right below — that block calls
   * handleAssignSkip/handleAssignSuccess during render, and `const`
   * declarations are not accessible before their own line runs
   * ("temporal dead zone"). Defining them here, before that block,
   * avoids a "Cannot access before initialization" crash.
   */
  const openAssignStepFor = async (booking) => {
    setCreatedBooking(booking);
    try {
      setIsLoadingChainMachines(true);
      const shopId = apiService.getShopId();
      const machines = await apiService.getMachines(shopId);
      const available = (machines || []).filter((m) => {
        const s = m.status?.toLowerCase();
        return s === 'available' || s === 'idle' || s === 'ready';
      });
      setChainAvailableMachines(available);
    } catch (error) {
      console.error('Error fetching machines for the Assign step:', error);
      setChainAvailableMachines([]);
    } finally {
      setIsLoadingChainMachines(false);
    }
  };

  /**
   * NEW (chained Assign step) — resets the whole modal (create-booking
   * form fields AND the assign-step state) and calls the parent's
   * onClose(). Shared by both "skip" and "assigned successfully" exits.
   */
  const finishAndClose = () => {
    setCreatedBooking(null);
    setChainAvailableMachines([]);
    onClose();

    setWeightTouched(false);
    setSelectedInventory({});
    setTouchedInventory({});
    setPromoCodeInput('');
    setPaymentMethod('cash');
    setFormData({
      customerName: '',
      serviceType: serviceNames[0] || '',
      itemType: 'Clothes',
      weight: minimumWeightKg,
      calculatedLoads: 1,
      totalPrice: 0
    });
  };

  /**
   * NEW (chained Assign step) — "Cancel" inside the chained
   * AssignMachineModal. The booking stays Pending (already created)
   * and can still be assigned later from the Service Terminal.
   */
  const handleAssignSkip = () => {
    finishAndClose();
  };

  /**
   * NEW (chained Assign step) — machines were assigned successfully.
   * Bubbles the confirmation message up to the parent (e.g. for a
   * toast) if it wants one, then closes out the whole flow.
   */
  const handleAssignSuccess = (message) => {
    if (onAssignSuccess) onAssignSuccess(message);
    finishAndClose();
  };

  if (!isOpen && !createdBooking) return null;

  // NEW (chained Assign step) — a booking was just created; briefly show
  // a loading state while fetching current machine availability, then
  // render AssignMachineModal for it instead of the create-booking form.
  if (createdBooking && isLoadingChainMachines) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
        <div className="bg-white rounded-[32px] px-10 py-8 flex items-center gap-3 text-sky-500 font-bold">
          <Loader2 className="animate-spin" size={20} />
          <span>Loading available machines...</span>
        </div>
      </div>
    );
  }

  if (createdBooking) {
    return (
      <AssignMachineModal
        isOpen={true}
        booking={createdBooking}
        availableMachines={chainAvailableMachines}
        onClose={handleAssignSkip}
        onSuccess={handleAssignSuccess}
      />
    );
  }

  // INVENTORY: does any selected item exceed available stock? This would
  // be rejected by the backend anyway, so it's treated as a hard block
  // rather than just a warning.
  const insufficientStockItem = Object.entries(selectedInventory).find(([itemId, qty]) => {
    const item = inventoryData.find(i => String(i.id) === String(itemId));
    if (!item) return false;
    return Number(qty) > Number(item.current_stock);
  });
  const isBlockedByInventory = Boolean(insufficientStockItem);

  // HARD LIMIT: block submission when Smart Calc has no configured
  // service, when the weight is below the shop's configured minimum,
  // or when a selected inventory item doesn't have enough stock.
  const isBlockedBySmartConfig = bookingMode === 'smart' && !hasConfiguredServices;
  const isBlockedByWeight = isBelowMinimumWeight;
  const isBlockedByPromo = Boolean(promoCodeInput.trim()) && !isPromoValid;
  const isSubmitBlocked = isBlockedBySmartConfig || isBlockedByWeight || isBlockedByInventory || isBlockedByPromo;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'weight') {
      setWeightTouched(true);
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value)
    }));
  };

  /**
   * INVENTORY: toggles an item on/off the "used in this booking" list.
   * Selecting an item auto-fills the suggested quantity (loads × usage_rate).
   * Deselecting removes it from both selectedInventory and touchedInventory.
   */
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
      delete updated[itemId]; // reset touched state on toggle
      return updated;
    });
  };

  /**
   * INVENTORY: manual override of a selected item's quantity. Marks the
   * item as "touched" so the loads-based auto-recalculation effect above
   * no longer overwrites it.
   */
  const updateInventoryQuantity = (itemId, value) => {
    setSelectedInventory(prev => ({
      ...prev,
      [itemId]: value === '' ? 0 : parseFloat(value)
    }));
    setTouchedInventory(prev => ({ ...prev, [itemId]: true }));
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
      // INVENTORY: build the multi-item list from selectedInventory,
      // dropping any items with a zero/invalid quantity.
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
        // NEW (multi-machine assignment feature) — machine assignment
        // never happens at creation time anymore, for ANY load count.
        // Every booking is created "Pending" and gets its machine(s)
        // assigned as a separate step via AssignMachineModal
        // (POST /bookings/{id}/assign-machines), which correctly
        // resolves washer vs. dryer from the service's required_phases.
        washer_id: null,
        dryer_id: null,
        inventory_items: inventoryItems,
        is_rush: false,
        booking_mode: String(bookingMode),
        add_detergent: false,
        add_delivery: false,
        // NEW (promo code) — sent as typed; the backend independently
        // re-validates and computes the actual discount server-side
        // (see _apply_promo_code() in booking_controller.py), so this
        // is never trusted blindly even though we preview it here.
        promo_code: isPromoValid ? matchedPromo.code : null,
        // NEW (payment method) — chosen up front for walk-in bookings,
        // same field the mobile app already uses at checkout.
        payment_method: paymentMethod,
        shop_id: parseInt(apiService.getShopId() || 0),
        booking_timestamp: actualBookingTime
          ? (actualBookingTime instanceof Date ? actualBookingTime.toISOString() : actualBookingTime)
          : new Date().toISOString()
      };

      const response = await apiService.createBooking(payload);

      // Let the parent update its booking list right away — it's
      // already a real Pending booking at this point.
      if (onSubmit) onSubmit(response);

      // NEW — chain straight into the Assign step for this booking
      // instead of closing. The form reset + onClose() now happen once
      // that step is completed or skipped (see finishAndClose below).
      await openAssignStepFor(response);

    } catch (error) {
      console.error("Booking Submission Error:", error);
      const backendError = error.response?.data?.detail;
      alert(typeof backendError === 'string' ? backendError : "Transaction failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * INVENTORY: renders the checklist of items with per-item quantity
   * input and projected stock warnings.
   */
  const renderInventoryChecklist = () => {
    if (inventoryData.length === 0) {
      return (
        <div className="py-4 text-center">
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
          className={`rounded-[20px] border-2 transition-all ${
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
            className="w-full flex items-center justify-between px-5 py-3 text-left"
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                isSelected ? 'bg-sky-500 border-sky-600' : 'border-slate-200'
              }`}>
                {isSelected && <CheckCircle2 size={14} className="text-white" />}
              </div>
              <div>
                <p className="text-[12px] font-black text-slate-700">{item.item_name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  {item.current_stock}{item.unit} in stock · {item.usage_rate}{item.unit}/load
                </p>
              </div>
            </div>
          </button>

          {isSelected && (
            <div className="px-5 pb-4 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quantity</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={quantity}
                  onChange={(e) => updateInventoryQuantity(itemId, e.target.value)}
                  className={`flex-1 border-2 rounded-[14px] px-4 py-2 font-bold text-[12px] outline-none transition-all ${
                    exceedsStock
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'bg-white border-slate-200 text-slate-700 focus:border-sky-300'
                  }`}
                />
                <span className="text-[11px] font-bold text-slate-400">{item.unit}</span>
              </div>

              {exceedsStock && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-rose-500">
                  <Ban size={12} className="shrink-0" />
                  Exceeds available stock ({item.current_stock}{item.unit} left).
                </div>
              )}
              {!exceedsStock && projectedStatus === 'CRITICAL' && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-rose-500">
                  <AlertTriangle size={12} className="shrink-0" />
                  This will leave stock CRITICAL ({Math.max(projectedStock, 0)}{item.unit} remaining).
                </div>
              )}
              {!exceedsStock && projectedStatus === 'LOW' && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-amber-600">
                  <AlertTriangle size={12} className="shrink-0" />
                  This will leave stock LOW ({Math.max(projectedStock, 0)}{item.unit} remaining).
                </div>
              )}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-white/20">

        {/* HEADER SECTION */}
        <div className="px-10 pt-10 pb-6 border-b border-slate-50 shrink-0">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Create Booking</h2>
              <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em] mt-1">LaundryLink Smart Terminal</p>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-rose-50 hover:text-rose-500 rounded-2xl text-slate-300 transition-all active:scale-90">
              <X size={24} />
            </button>
          </div>

          <div className="bg-slate-100/80 p-1.5 rounded-[24px] flex items-center">
            <button type="button" onClick={() => setBookingMode('smart')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[18px] text-[11px] font-black transition-all ${bookingMode === 'smart' ? 'text-sky-600 bg-white shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}>
              <Calculator size={14} /> SMART CALC
            </button>
            <button type="button" onClick={() => setBookingMode('manual')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[18px] text-[11px] font-black transition-all ${bookingMode === 'manual' ? 'text-orange-600 bg-white shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}>
              <Edit3 size={14} /> MANUAL OVERRIDE
            </button>
          </div>
        </div>

        {/* FORM CONTENT */}
        <form onSubmit={handleSubmit} className="px-10 py-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          {isLoadingSettings && (
            <div className="flex items-center justify-center py-4 gap-2 text-sky-500 font-bold animate-pulse">
              <Loader2 className="animate-spin" size={16} />
              <span>Syncing Live Pricing...</span>
            </div>
          )}

          {!isLoadingSettings && bookingMode === 'smart' && !hasConfiguredServices && (
            <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-[20px] px-5 py-4">
              <Ban size={18} className="text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-black text-rose-700 uppercase tracking-wide">No Services Configured</p>
                <p className="text-[11px] text-rose-500 font-medium mt-0.5">
                  This shop hasn't added any services yet. Go to <strong>Optimization Settings</strong> to add at least one service and its price, or switch to <strong>Manual Override</strong> to enter a booking directly.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-3 col-span-2">
              <label className="text-[11px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2 tracking-widest">
                <User size={14} className="text-sky-500" /> Customer Name
              </label>
              <input name="customerName" required value={formData.customerName} onChange={handleChange} className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-[24px] px-6 py-4 font-bold text-slate-800 focus:ring-4 ring-sky-50 focus:border-sky-200 outline-none transition-all placeholder:text-slate-300" placeholder="Juan Dela Cruz" />
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2 tracking-widest">
                <Weight size={14} className="text-sky-500" /> Weight (kg)
                <span className="normal-case text-slate-300 font-bold">min {minimumWeightKg}kg</span>
              </label>
              <input
                name="weight" type="number" step="0.1" min={minimumWeightKg} required
                value={formData.weight} onChange={handleChange}
                className={`w-full border-2 rounded-[24px] px-6 py-4 font-bold outline-none transition-all ${
                  isBelowMinimumWeight
                    ? 'bg-rose-50/50 border-rose-200 text-rose-600 focus:border-rose-300'
                    : bookingMode === 'manual'
                      ? 'bg-orange-50/30 border-orange-100 text-orange-600 focus:border-orange-200'
                      : 'bg-slate-50/50 border-slate-100 text-slate-800 focus:border-sky-200'
                }`}
              />
              {isBelowMinimumWeight && (
                <p className="text-[10px] font-bold text-rose-500 ml-2">
                  Minimum is {minimumWeightKg}kg for this shop. Increase the weight to continue.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2 tracking-widest">
                <Hash size={14} className="text-sky-500" /> {bookingMode === 'manual' ? 'Manual Loads' : 'Est. Loads'}
              </label>
              {bookingMode === 'manual' ? (
                <input name="calculatedLoads" type="number" value={formData.calculatedLoads} onChange={handleChange} className="w-full bg-orange-50/30 border-2 border-orange-100 rounded-[24px] px-6 py-4 font-black text-orange-600 focus:border-orange-200 outline-none" />
              ) : (
                <div className="w-full bg-slate-100 border-2 border-slate-100 rounded-[24px] px-6 py-4 font-black text-slate-400">{formData.calculatedLoads} {formData.calculatedLoads > 1 ? 'Loads' : 'Load'}</div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2 tracking-widest">
              <Settings2 size={14} className="text-sky-500" /> Service Type
            </label>
            {bookingMode === 'manual' ? (
              <input name="serviceType" value={formData.serviceType} onChange={handleChange} placeholder="Enter Service" className="w-full bg-orange-50/30 border-2 border-orange-100 rounded-[24px] px-6 py-4 font-bold text-orange-600 focus:border-orange-200 outline-none" />
            ) : hasConfiguredServices ? (
              <select name="serviceType" value={formData.serviceType} onChange={handleChange} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] px-6 py-4 font-bold text-slate-800 outline-none cursor-pointer focus:border-sky-200">
                {serviceNames.map(name => (
                  <option key={name} value={name}>
                    {name} — {optimizationLogic.formatPriceWithUnit(servicePricing[name], serviceUnits[name])}
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full bg-slate-100 border-2 border-slate-100 rounded-[24px] px-6 py-4 font-bold text-slate-300 italic">
                No services configured
              </div>
            )}
          </div>

          {/* INVENTORY ITEMS USED */}
          <div className="space-y-4 p-8 bg-slate-50/50 rounded-[40px] border-2 border-slate-100">
            <div className="flex justify-between items-center px-2">
              <label className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-2 tracking-[0.2em]">
                <Droplets size={14} className="text-sky-500" /> Inventory Items Used
              </label>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full uppercase tracking-tighter border border-amber-100">
                Optional
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium px-2 -mt-2">
              Select consumables used for this booking (e.g. detergent, fabric conditioner). Suggested amounts are based on load count and can be edited.
            </p>
            <div className="space-y-3">
              {renderInventoryChecklist()}
            </div>
          </div>

          {/* MACHINE ASSIGNMENT — NEW (multi-machine assignment feature):
              always deferred to a separate step after creation, for ANY
              load count, so this is now purely informational. */}
          <div className="space-y-4 p-8 bg-sky-50/60 rounded-[40px] border-2 border-sky-100">
            <div className="flex justify-between items-center px-2">
              <label className="text-[11px] font-black text-sky-700 uppercase flex items-center gap-2 tracking-[0.2em]">
                <Cpu size={14} className="text-sky-500" /> Machine Assignment
              </label>
              <span className="text-[10px] font-bold text-sky-600 bg-white px-3 py-1 rounded-full uppercase tracking-tighter border border-sky-100">
                Next Step
              </span>
            </div>
            <div className="flex items-start gap-3 px-2">
              <Cpu size={18} className="text-sky-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-sky-700 font-medium">
                This booking will be created as <strong>Pending</strong> with {formData.calculatedLoads}{' '}
                {formData.calculatedLoads > 1 ? 'loads' : 'load'}. Right after, you'll be asked to assign{' '}
                {formData.calculatedLoads > 1 ? 'the machines' : 'a machine'} for it — the picker shows the correct
                machine type (washer or dryer) for this service. You can also skip that and assign later from the
                Service Terminal.
              </p>
            </div>
          </div>

          {/* PROMO CODE (NEW) */}
          <div className="space-y-3 p-8 bg-rose-50/40 rounded-[40px] border-2 border-rose-100">
            <div className="flex justify-between items-center px-2">
              <label className="text-[11px] font-black text-rose-600 uppercase flex items-center gap-2 tracking-[0.2em]">
                Promo Code
              </label>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full uppercase tracking-tighter border border-amber-100">
                Optional
              </span>
            </div>
            <input
              value={promoCodeInput}
              onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. SAVE20-X7K9"
              className={`w-full border-2 rounded-[24px] px-6 py-4 font-bold uppercase tracking-wide outline-none transition-all ${
                promoValidationError
                  ? 'bg-rose-50/60 border-rose-300 text-rose-600 focus:border-rose-400'
                  : isPromoValid
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-700 focus:border-emerald-300'
                    : 'bg-white border-rose-100 text-slate-700 focus:border-rose-200'
              }`}
            />
            {promoValidationError && (
              <p className="text-[10px] font-bold text-rose-500 px-2">{promoValidationError}</p>
            )}
            {isPromoValid && (
              <p className="text-[10px] font-bold text-emerald-600 px-2">
                Applied — {matchedPromo.discount_type === 'percent'
                  ? `${matchedPromo.discount_value}% off`
                  : `₱${Number(matchedPromo.discount_value).toFixed(2)} off`} (−{optimizationLogic.formatCurrency(promoPreviewDiscount)})
              </p>
            )}
          </div>

          {/* PAYMENT METHOD (NEW) */}
          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2 tracking-widest">
              Payment Method
            </label>
            <div className="bg-slate-100/80 p-1.5 rounded-[24px] flex items-center gap-1.5">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  className={`flex-1 py-3 rounded-[18px] text-[11px] font-black transition-all ${
                    paymentMethod === method.value
                      ? 'text-slate-900 bg-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-500'
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`rounded-[32px] p-8 flex justify-between items-center shadow-2xl transition-all duration-500 ${bookingMode === 'manual' ? 'bg-orange-600 shadow-orange-100' : 'bg-slate-900 shadow-slate-200'}`}>
            <div className="flex flex-col">
              <span className="font-bold text-white/40 text-[10px] uppercase tracking-[0.4em]">Total Payable</span>
              {isPromoValid && (
                <span className="text-white/50 text-xs font-bold line-through mt-1">
                  {optimizationLogic.formatCurrency(formData.totalPrice)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 bg-white/10 p-3 px-6 rounded-[24px] border border-white/20">
              {bookingMode === 'manual' ? (
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black text-white/30">₱</span>
                  <input name="totalPrice" type="number" value={formData.totalPrice} onChange={handleChange} className="bg-transparent text-4xl font-black text-white w-28 outline-none border-b-4 border-white/20 focus:border-white transition-all" />
                </div>
              ) : (
                <span className="text-4xl font-black text-white tracking-tighter">
                  {optimizationLogic.formatCurrency(isPromoValid ? promoPreviewTotal : formData.totalPrice)}
                </span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isSubmitBlocked}
            className={`w-full text-white py-6 rounded-[32px] font-black text-2xl shadow-xl transition-all flex items-center justify-center gap-4 active:scale-95
              ${isSubmitting || isSubmitBlocked ? 'opacity-50 cursor-not-allowed' : ''}
              ${bookingMode === 'manual' ? 'bg-orange-500 hover:bg-orange-400 shadow-orange-200' : 'bg-sky-600 hover:bg-sky-500 shadow-sky-200'}
            `}
          >
            {isSubmitting ? (
              <><Loader2 size={24} className="animate-spin" /> Processing...</>
            ) : isSubmitBlocked ? (
              <><Ban size={24} /> {
                isBlockedByWeight
                  ? `Below ${minimumWeightKg}kg Minimum`
                  : isBlockedByInventory
                    ? 'Insufficient Stock'
                    : isBlockedByPromo
                      ? 'Invalid Promo Code'
                      : 'No Services Configured'
              }</>
            ) : (
              <>
                <CheckCircle2 size={28} />
                Create Booking (Pending)
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;
