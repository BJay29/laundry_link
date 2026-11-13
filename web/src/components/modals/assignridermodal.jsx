import React, { useState, useEffect } from 'react';
import { X, Bike, User, Phone, Loader2, CheckCircle2, Truck, PackageCheck, Banknote, History } from 'lucide-react';
import apiService from '../../services/APIservices';
import DeliveryAddress from '../ui/deliveryaddress';
import { formatCurrency } from '../../utils/formatters';
import { getCollectInfo } from '../../utils/collect';
import {
  PH_MOBILE_HINT,
  normalizePhMobile,
  sanitizePhoneInput,
  formatPhMobile,
} from '../../utils/phone';

/**
 * ASSIGN RIDER MODAL (NEW — Pickup & Delivery feature)
 *
 * One reusable modal for BOTH rider legs, switched by the `mode` prop:
 *   - mode="pickup"   -> PATCH /bookings/{id}/assign-pickup-rider
 *   - mode="delivery" -> PATCH /bookings/{id}/assign-delivery-rider
 *
 * Manual text-entry only (rider_name + rider_contact) — no rider
 * catalog, no rider accounts, matching the backend's RiderAssignmentInput
 * schema exactly. Both fields are required — the Confirm button stays
 * disabled until both are non-blank, mirroring the backend's own
 * "cannot be empty" validators so the person never sees a raw 422.
 *
 * Pre-fills the existing rider name/contact when the booking already
 * has one assigned for this leg — so re-assigning (e.g. rider changed)
 * is just an edit, not starting from a blank form.
 *
 * UPDATED (Delivery address): ang address ng customer ay ipinapakita na
 * sa itaas ng form (buong address, naka-wrap) kasama ang "Open in Maps"
 * na link, para makita ni staff kung saan ipapadala ang rider bago
 * mag-assign. Para sa delivery bookings lang (see <DeliveryAddress />).
 *
 * UPDATED (Collect + Recent riders): para sa delivery leg, may banner na
 * "Collect ₱X" (see utils/collect.js) para alam ni staff/rider kung
 * magkano ang sisingilin sa pinto. May "Recent riders" na chips din
 * (hanggang 5, naka-save sa browser ng shop — localStorage, walang
 * bagong backend) — isang tap lang para ma-fill ang pangalan at numero.
 *
 * UPDATED (PH number only): tunay na PH mobile number lang ang tinatanggap
 * (11 digits, 09XXXXXXXXX o +639XXXXXXXXX — see utils/phone.js). Mga
 * letra at sobrang haba ay hindi na maita-type; hindi pwedeng i-confirm
 * hangga't hindi valid, at laging normalized (09XXXXXXXXX) ang ipinapadala.
 * Pareho ring validation sa backend (RiderAssignmentInput).
 *
 * onSuccess(message, updatedBooking) is called after a successful save
 * so the parent can refresh its lists and show a toast.
 */
const MAX_RECENT_RIDERS = 5;

const recentRidersKey = () => `recent_riders_${apiService.getShopId?.() || 'shop'}`;

const loadRecentRiders = () => {
  try {
    const raw = localStorage.getItem(recentRidersKey());
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.filter((r) => r?.name && normalizePhMobile(r?.contact))
      : [];
  } catch {
    return [];
  }
};

const saveRecentRider = (name, contact) => {
  try {
    const rest = loadRecentRiders().filter(
      (r) => !(r.name.toLowerCase() === name.toLowerCase() && r.contact === contact)
    );
    localStorage.setItem(
      recentRidersKey(),
      JSON.stringify([{ name, contact }, ...rest].slice(0, MAX_RECENT_RIDERS))
    );
  } catch {
    // Optional convenience lang — hindi dapat mag-fail ang assignment dahil dito.
  }
};

const AssignRiderModal = ({ isOpen, booking, mode, onClose, onSuccess }) => {
  const [riderName, setRiderName] = useState('');
  const [riderContact, setRiderContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [recentRiders, setRecentRiders] = useState([]);

  const isDelivery = mode === 'delivery';

  const existingName = isDelivery ? booking?.delivery_rider_name : booking?.pickup_rider_name;
  const existingContact = isDelivery ? booking?.delivery_rider_contact : booking?.pickup_rider_contact;
  const isReassign = Boolean(existingName);

  // Reset/pre-fill whenever a different booking or leg is opened.
  useEffect(() => {
    if (isOpen) {
      setRiderName(existingName || '');
      setRiderContact(
        existingContact ? normalizePhMobile(existingContact) || existingContact : ''
      );
      setErrorMsg('');
      setRecentRiders(loadRecentRiders());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, booking?.id, mode]);

  if (!isOpen || !booking) return null;

  const trimmedName = riderName.trim();
  const trimmedContact = riderContact.trim();
  const normalizedContact = normalizePhMobile(trimmedContact);
  const contactInvalid = trimmedContact.length > 0 && !normalizedContact;
  const canSubmit = trimmedName.length > 0 && Boolean(normalizedContact);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload = { rider_name: trimmedName, rider_contact: normalizedContact };
      const updated = isDelivery
        ? await apiService.assignDeliveryRider(booking.id, payload)
        : await apiService.assignPickupRider(booking.id, payload);

      saveRecentRider(trimmedName, normalizedContact);

      const message = isDelivery
        ? `${trimmedName} assigned for delivery to ${booking.customer_name}.`
        : `${trimmedName} assigned to pick up ${booking.customer_name}'s laundry.`;

      if (onSuccess) onSuccess(message, updated);
    } catch (err) {
      console.error('Rider assignment error:', err);
      const backendDetail = err.response?.data?.detail;
      setErrorMsg(typeof backendDetail === 'string' ? backendDetail : 'Failed to assign rider. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const Icon = isDelivery ? Truck : PackageCheck;
  const collect = isDelivery ? getCollectInfo(booking) : { amount: 0, label: '' };

  // NOTE: Tailwind's JIT compiler only picks up class names it can see as
  // full static strings in the source — `bg-${accentColor}-500` would be
  // invisible to it and silently render unstyled. So instead of building
  // class names with template literals, every color-dependent class below
  // is written out as a complete literal string per branch.
  const headerBg = isDelivery ? 'bg-sky-50/40' : 'bg-violet-50/40';
  const headerText = isDelivery ? 'text-sky-600' : 'text-violet-600';
  const labelIconColor = isDelivery ? 'text-sky-500' : 'text-violet-500';
  const confirmBtnClass = !canSubmit || isSubmitting
    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
    : isDelivery
      ? 'bg-sky-500 hover:bg-sky-600 shadow-sky-200'
      : 'bg-violet-500 hover:bg-violet-600 shadow-violet-200';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-white/20">

        {/* HEADER */}
        <div className={`px-6 pt-6 pb-4 border-b border-slate-50 flex items-start justify-between ${headerBg}`}>
          <div>
            <div className={`flex items-center gap-1.5 ${headerText} mb-1.5`}>
              <Icon size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {isDelivery ? 'Delivery Leg' : 'Pickup Leg'}
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              {isReassign ? 'Reassign Rider' : 'Assign Rider'}
            </h2>
            <p className="text-slate-400 font-bold text-[11px] mt-0.5">
              {isDelivery
                ? `For delivering to ${booking.customer_name}`
                : `For picking up ${booking.customer_name}'s laundry`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-slate-500 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Booking + address context */}
        <div className="px-6 py-4 bg-slate-50/60 border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-[10px] shrink-0">
              {booking.customer_name?.charAt(0).toUpperCase() || 'C'}
            </div>
            <div>
              <p className="text-slate-900 font-black text-sm">{booking.customer_name}</p>
              <p className="text-slate-500 text-[11px] font-bold">{booking.service_type}</p>
            </div>
          </div>

          {/* Address + Open in Maps (delivery bookings lang) */}
          <DeliveryAddress booking={booking} variant="inline" />

          {/* Collect ₱X — delivery leg lang */}
          {isDelivery && (
            collect.amount > 0 ? (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl px-3 py-2.5">
                <Banknote size={15} className="shrink-0" />
                <p className="text-[11px] font-black uppercase tracking-tight">
                  Collect {formatCurrency(collect.amount)}
                  <span className="font-bold normal-case tracking-normal text-amber-600"> · {collect.label}</span>
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl px-3 py-2.5">
                <CheckCircle2 size={15} className="shrink-0" />
                <p className="text-[11px] font-black uppercase tracking-tight">Fully paid — nothing to collect</p>
              </div>
            )
          )}
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Recent riders — isang tap para ma-fill */}
          {recentRiders.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1.5 tracking-widest mb-1.5">
                <History size={13} className={labelIconColor} /> Recent Riders
              </p>
              <div className="flex flex-wrap gap-2">
                {recentRiders.map((r) => {
                  const active = r.name === trimmedName && r.contact === normalizedContact;
                  return (
                    <button
                      key={`${r.name}-${r.contact}`}
                      type="button"
                      onClick={() => {
                        setRiderName(r.name);
                        setRiderContact(r.contact);
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-[11px] font-black transition-all active:scale-95 ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                      title={formatPhMobile(r.contact)}
                    >
                      {r.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1.5 tracking-widest mb-1.5">
              <User size={13} className={labelIconColor} /> Rider Name
            </label>
            <input
              autoFocus
              value={riderName}
              onChange={(e) => setRiderName(e.target.value)}
              placeholder="e.g. Mark Santos"
              className="w-full border rounded-xl px-4 py-2.5 text-sm font-bold outline-none transition-all bg-slate-50/50 border-slate-200 text-slate-800 focus:ring-4 ring-sky-50 focus:border-sky-300 placeholder:text-slate-300"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1.5 tracking-widest mb-1.5">
              <Phone size={13} className={labelIconColor} /> Rider Contact Number
            </label>
            <input
              value={riderContact}
              onChange={(e) => setRiderContact(sanitizePhoneInput(e.target.value))}
              placeholder="e.g. 09171234567"
              inputMode="tel"
              maxLength={17}
              aria-invalid={contactInvalid}
              className={`w-full border rounded-xl px-4 py-2.5 text-sm font-bold outline-none transition-all bg-slate-50/50 text-slate-800 placeholder:text-slate-300 ${
                contactInvalid
                  ? 'border-rose-300 focus:ring-4 ring-rose-50 focus:border-rose-400'
                  : 'border-slate-200 focus:ring-4 ring-sky-50 focus:border-sky-300'
              }`}
            />
            {contactInvalid && (
              <p className="text-[11px] font-bold text-rose-500 mt-1.5">{PH_MOBILE_HINT}</p>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 text-rose-600 bg-rose-50 rounded-xl px-3 py-2.5">
              <p className="text-[11px] font-bold">{errorMsg}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-2xl border-2 border-slate-100 text-slate-400 font-black text-sm hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className={`flex-[2] py-3 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${confirmBtnClass}`}
            >
              {isSubmitting ? (
                <><Loader2 size={16} className="animate-spin" /> Saving...</>
              ) : (
                <><CheckCircle2 size={16} /> {isReassign ? 'Update Rider' : 'Confirm Rider'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignRiderModal;