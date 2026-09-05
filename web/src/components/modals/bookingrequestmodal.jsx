import React, { useState } from 'react';
import { X, Package, Banknote, Clock, CheckCircle2, XCircle, Loader2, ChevronLeft } from 'lucide-react';

/**
 * BOOKING REQUEST MODAL
 *
 * Ipinapakita ang detalye ng isang mobile-app booking request na
 * "Awaiting Approval" pa. Dalawang aksyon: Accept o Decline.
 *
 * Pagka-Accept: status → "Pending", papasok na ito sa normal na
 * Service Terminal list (parehong flow ng manual bookings).
 *
 * Pagka-Decline: HINDI na basta't isang click lang — bubukas muna ang
 * isang "reason step" na may mga preset na dahilan (Fully booked,
 * Closed for the day, Service unavailable) plus custom text field.
 * Required ang reason (hindi pwedeng blangko) dahil ito ang makikita
 * ng customer sa kanilang end kung bakit hindi natuloy ang booking nila
 * — mas maganda ito kaysa sa basta "Declined" na walang paliwanag.
 */

const DECLINE_PRESETS = [
  'Fully booked',
  'Closed for the day',
  'Service unavailable right now',
  'Other',
];

const BookingRequestModal = ({ isOpen, booking, onClose, onAccept, onDecline }) => {
  const [processing, setProcessing] = useState(false);
  const [showDeclineStep, setShowDeclineStep] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [customReason, setCustomReason] = useState('');

  if (!isOpen || !booking) return null;

  const resetDeclineState = () => {
    setShowDeclineStep(false);
    setSelectedPreset('');
    setCustomReason('');
  };

  const handleClose = () => {
    if (processing) return;
    resetDeclineState();
    onClose();
  };

  const handleAccept = async () => {
    setProcessing(true);
    try {
      await onAccept(booking.id);
    } finally {
      setProcessing(false);
    }
  };

  // Isang finalReason lang ang ipapadala — kung "Other" ang preset,
  // gagamitin ang laman ng customReason field; kung hindi, ang preset
  // text mismo.
  const finalReason = selectedPreset === 'Other' ? customReason.trim() : selectedPreset;
  const canSubmitDecline = finalReason.length > 0;

  const handleConfirmDecline = async () => {
    if (!canSubmitDecline) return;
    setProcessing(true);
    try {
      await onDecline(booking.id, finalReason);
      resetDeclineState();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden border border-white/20">

        {/* HEADER */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-50">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              {showDeclineStep && (
                <button
                  onClick={() => { setShowDeclineStep(false); setSelectedPreset(''); setCustomReason(''); }}
                  disabled={processing}
                  className="p-2 -ml-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-all active:scale-90 disabled:opacity-40"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <div>
                <p className="text-[10px] font-black text-sky-500 uppercase tracking-[0.2em] mb-1">
                  {showDeclineStep ? 'Decline Reason' : 'Mobile App Request'}
                </p>
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter">
                  {showDeclineStep ? 'Why decline this?' : 'Booking Request'}
                </h2>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={processing}
              className="p-2.5 hover:bg-rose-50 hover:text-rose-500 rounded-2xl text-slate-300 transition-all active:scale-90 disabled:opacity-40"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {showDeclineStep ? (
          <>
            {/* DECLINE REASON STEP */}
            <div className="px-8 py-6 space-y-3">
              <p className="text-xs font-bold text-slate-400 mb-1">
                This will be shown to {booking.customer_name} so they know why their request wasn't accepted.
              </p>

              {DECLINE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSelectedPreset(preset)}
                  className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 font-bold text-sm transition-all ${
                    selectedPreset === preset
                      ? 'border-rose-400 bg-rose-50 text-rose-600'
                      : 'border-slate-100 bg-slate-50/50 text-slate-600 hover:border-slate-200'
                  }`}
                >
                  {preset}
                </button>
              ))}

              {selectedPreset === 'Other' && (
                <textarea
                  autoFocus
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  maxLength={300}
                  rows={3}
                  placeholder="Type the reason for declining..."
                  className="w-full mt-1 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-rose-300 transition-all resize-none"
                />
              )}
            </div>

            {/* CONFIRM DECLINE ACTION */}
            <div className="px-8 pb-8">
              <button
                type="button"
                onClick={handleConfirmDecline}
                disabled={processing || !canSubmitDecline}
                className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl transition-all shadow-lg shadow-rose-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                Confirm Decline
              </button>
            </div>
          </>
        ) : (
          <>
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
                  <div className="flex items-center gap-2 mb-1">
                    <Package size={13} className="text-sky-500" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service</p>
                  </div>
                  <p className="font-black text-slate-800 text-sm">{booking.service_type}</p>
                </div>

                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Banknote size={13} className="text-emerald-500" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                  </div>
                  <p className="font-black text-emerald-600 text-sm">₱{Number(booking.total_price || 0).toFixed(2)}</p>
                </div>
              </div>

              {(booking.weight > 0 || booking.loads > 0) && (
                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Quantity</p>
                  <p className="font-black text-slate-800 text-sm">
                    {booking.weight > 0 ? `${booking.weight} kg` : `${booking.loads} load(s)`}
                  </p>
                </div>
              )}

              {booking.special_instructions && (
                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Special Instructions</p>
                  <p className="font-bold text-amber-700 text-sm">{booking.special_instructions}</p>
                </div>
              )}

              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold px-1">
                <Clock size={13} />
                Submitted via mobile app — awaiting your decision
              </div>
            </div>

            {/* ACTIONS */}
            <div className="px-8 pb-8 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeclineStep(true)}
                disabled={processing}
                className="flex-1 py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black rounded-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <XCircle size={18} />
                Decline
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={processing}
                className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl transition-all shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                Accept
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BookingRequestModal;
