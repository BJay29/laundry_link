import React, { useState, useEffect } from 'react';
import { X, User, Weight, Banknote, Loader2, CheckCircle2, Calculator, CreditCard } from 'lucide-react';
import apiService from '../../services/APIservices';

/**
 * WEIGHING PRICING MODAL
 *
 * NEW (Weighing / Finalize Pricing feature) — Module B ng Admin
 * Dashboard spec ("Mobile Booking Notification & Pricing Modal"),
 * i-nireconcile sa existing schema (see backend notes).
 *
 * Ipinapakita ang detalye ng isang mobile-app booking na "Awaiting
 * Weighing" na status (na-accept na ng shop, hinihintay pa ang staff
 * na aktwal na timbangin ang laundry at i-finalize ang presyo).
 *
 * DALAWANG INPUT FIELD:
 *   1. Actual Weight/Quantity (required) — ang parehong unit ng
 *      service's pricing_unit (kg, load, o piece). "Weight (kg)" kung
 *      kg ang unit; generic na "Actual Quantity" kung hindi.
 *   2. Add-ons / Extra Charges (optional, plain peso amount) — AD-HOC
 *      na extra na itina-type ng staff habang tinitimbang (hal.
 *      "sobrang dumi, +₱15"), HIWALAY ito sa naka-catalog na AddOn
 *      list na pinili na ng customer sa checkout (ipinapakita lang,
 *      hindi na-eedit dito).
 *
 * AUTO-CALCULATION (frontend preview lang — ang backend ang tunay na
 * pinagmumulan ng katotohanan, computed ulit sa
 * finalize_booking_pricing()):
 *     Total Final Price = (Actual Weight × ServiceType.price) + Add-ons
 *
 * Kinukuha ang ServiceType.price/pricing_unit sa pamamagitan ng
 * apiService.getServiceTypes() (parehong pattern ng BookingModal),
 * dahil hindi ito naka-attach sa Booking object mismo.
 */
const WeighingPricingModal = ({ isOpen, booking, onClose, onConfirm }) => {
  const [serviceRate, setServiceRate] = useState(null); // { price, pricing_unit }
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [finalWeight, setFinalWeight] = useState('');
  const [addonCharges, setAddonCharges] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !booking) return;

    setFinalWeight('');
    setAddonCharges('');
    setError('');

    const fetchRate = async () => {
      try {
        setIsLoadingRate(true);
        const shopId = apiService.getShopId();
        const serviceTypes = await apiService.getServiceTypes(shopId);
        const match = (serviceTypes || []).find((s) => s.name === booking.service_type);
        setServiceRate(match ? { price: match.price, pricing_unit: match.pricing_unit || 'load' } : null);
      } catch (err) {
        console.error('Error fetching service rate:', err.message);
        setServiceRate(null);
      } finally {
        setIsLoadingRate(false);
      }
    };
    fetchRate();
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const unitLabel = serviceRate?.pricing_unit === 'kg'
    ? 'Actual Weight (kg)'
    : `Actual Quantity${serviceRate?.pricing_unit ? ` (${serviceRate.pricing_unit})` : ''}`;

  const weightNum = parseFloat(finalWeight);
  const addonsNum = parseFloat(addonCharges) || 0;
  const isWeightValid = !isNaN(weightNum) && weightNum > 0;

  const previewPrice = isWeightValid && serviceRate
    ? Math.round(((weightNum * serviceRate.price) + addonsNum) * 100) / 100
    : null;

  const isOnlinePayment = booking.payment_method === 'gcash' || booking.payment_method === 'paymaya';

  const handleConfirm = async () => {
    setError('');
    if (!isWeightValid) {
      setError('Please enter a valid actual weight/quantity greater than 0.');
      return;
    }
    if (addonsNum < 0) {
      setError('Add-ons/extra charges cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(booking.id, {
        final_weight: weightNum,
        addon_charges: addonsNum,
      });
    } catch (err) {
      console.error('Finalize Pricing Error:', err.message);
      const backendError = err.response?.data?.detail;
      setError(typeof backendError === 'string' ? backendError : 'Failed to finalize pricing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden border border-white/20">

        {/* HEADER */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-50">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-sky-500 uppercase tracking-[0.2em] mb-1">
                Awaiting Weighing
              </p>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter">
                Weigh & Finalize Price
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2.5 hover:bg-rose-50 hover:text-rose-500 rounded-2xl text-slate-300 transition-all active:scale-90 disabled:opacity-40"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* DETAILS */}
        <div className="px-8 py-6 space-y-4">
          <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
            <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-sm shrink-0">
              {booking.customer_name?.charAt(0).toUpperCase() || 'C'}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</p>
              <p className="font-black text-slate-800">{booking.customer_name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Service</p>
              <p className="font-black text-slate-800 text-sm">{booking.service_type}</p>
            </div>
            <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Est. Quantity</p>
              <p className="font-black text-slate-800 text-sm">
                {booking.estimated_weight != null ? booking.estimated_weight : (booking.weight || '—')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Est. Price</p>
              <p className="font-black text-slate-600 text-sm">
                ₱{Number(booking.estimated_price ?? booking.total_price ?? 0).toFixed(2)}
              </p>
            </div>
            <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-1.5 mb-1">
                <CreditCard size={12} className="text-slate-400" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment</p>
              </div>
              <p className="font-black text-slate-800 text-sm uppercase">{booking.payment_method || 'cash'}</p>
            </div>
          </div>

          {isLoadingRate ? (
            <div className="flex items-center justify-center py-3 gap-2 text-sky-500 font-bold text-xs animate-pulse">
              <Loader2 className="animate-spin" size={14} />
              Loading shop rate...
            </div>
          ) : !serviceRate ? (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
              <p className="text-xs font-bold text-rose-600">
                This service is no longer configured for this shop. Please check Optimization Settings.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase ml-1 flex items-center gap-2 tracking-widest">
                  <Weight size={14} className="text-sky-500" /> {unitLabel}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.01"
                  value={finalWeight}
                  onChange={(e) => setFinalWeight(e.target.value)}
                  placeholder={`e.g. ${booking.estimated_weight || 6}`}
                  className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-slate-800 focus:ring-4 ring-sky-50 focus:border-sky-200 outline-none transition-all"
                  autoFocus
                />
                <p className="text-[10px] text-slate-400 font-medium ml-1">
                  Rate: ₱{Number(serviceRate.price).toFixed(2)} / {serviceRate.pricing_unit}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase ml-1 flex items-center gap-2 tracking-widest">
                  <Banknote size={14} className="text-amber-500" /> Add-ons / Extra Charges (₱)
                  <span className="normal-case text-slate-300 font-bold">optional</span>
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={addonCharges}
                  onChange={(e) => setAddonCharges(e.target.value)}
                  placeholder="e.g. 15"
                  className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 font-bold text-slate-800 focus:ring-4 ring-amber-50 focus:border-amber-200 outline-none transition-all"
                />
              </div>

              <div className="rounded-[24px] p-6 flex justify-between items-center bg-slate-900 shadow-xl shadow-slate-200">
                <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">
                  <Calculator size={14} />
                  Total Final Price
                </div>
                <span className="text-3xl font-black text-white tracking-tighter">
                  {previewPrice !== null ? `₱${previewPrice.toFixed(2)}` : '—'}
                </span>
              </div>

              {isOnlinePayment && (
                <p className="text-[10px] text-sky-500 font-bold text-center px-2">
                  Online payment — booking will move to "Awaiting Payment" until the customer settles via {booking.payment_method?.toUpperCase()}.
                </p>
              )}
            </>
          )}

          {error && (
            <p className="text-[11px] font-bold text-rose-500 text-center">{error}</p>
          )}
        </div>

        {/* ACTION */}
        <div className="px-8 pb-8">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || isLoadingRate || !serviceRate || !isWeightValid}
            className="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-sky-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            Confirm & Finalize Price
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeighingPricingModal;