import React, { useState } from 'react';
import { X, User, Banknote, Wallet, AlertTriangle, CheckCircle2, XCircle, Loader2, ImageOff, ZoomIn } from 'lucide-react';
import apiService from '../../services/APIservices';

/**
 * PAYMENT VERIFICATION MODAL (NEW — Online Payment feature)
 *
 * Ipinapakita ang na-upload na proof_of_payment_url ng customer para sa
 * isang GCash/PayMaya booking na "pending_verification", kasama ang
 * booking details (customer name, service, amount, payment method).
 * Dalawang aksyon:
 *   - "Approve" → tumatawag sa apiService.markBookingPaid(booking.id)
 *     nang WALANG 2nd argument — kritikal ito: kung may ipapasa tayong
 *     'cash' dito, mao-overwrite ang tamang payment_method (gcash/
 *     paymaya) pabalik sa 'cash'. Ang backend ngayon (Optional[str] =
 *     None) ay hindi na gagalaw sa existing value kapag walang ibinigay.
 *   - "Reject" → binubuksan ang isang reason input, tapos tumatawag sa
 *     apiService.rejectPayment(booking.id, reason).
 *
 * Naka-fullscreen preview ang proof image kapag na-click (simpleng
 * lightbox, walang external library).
 */

const PaymentVerificationModal = ({ isOpen, booking, onClose, onSuccess }) => {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [imageFailedToLoad, setImageFailedToLoad] = useState(false);

  if (!isOpen || !booking) return null;

  const paymentMethodLabel = booking.payment_method === 'gcash' ? 'GCash' : booking.payment_method === 'paymaya' ? 'PayMaya' : booking.payment_method;

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      // CRITICAL: walang 2nd argument dito. Ito ang nagpapanatili sa
      // tamang payment_method (gcash/paymaya) ng booking — hindi ito
      // dapat ma-overwrite pabalik sa "cash".
      await apiService.markBookingPaid(booking.id);
      if (onSuccess) onSuccess(`✅ Payment approved for ${booking.customer_name}'s booking.`);
    } catch (error) {
      console.error('Approve Payment Error:', error);
      const detail = error?.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : 'Failed to approve payment. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectClick = () => {
    setShowRejectForm(true);
    setRejectError('');
  };

  const handleCancelReject = () => {
    setShowRejectForm(false);
    setRejectReason('');
    setRejectError('');
  };

  const handleConfirmReject = async () => {
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectError('Please provide a reason for rejecting this payment.');
      return;
    }
    if (reason.length > 300) {
      setRejectError('Reason must be 300 characters or fewer.');
      return;
    }

    try {
      setIsRejecting(true);
      await apiService.rejectPayment(booking.id, reason);
      if (onSuccess) onSuccess(`Payment proof rejected for ${booking.customer_name}'s booking.`);
    } catch (error) {
      console.error('Reject Payment Error:', error);
      const detail = error?.response?.data?.detail;
      setRejectError(typeof detail === 'string' ? detail : 'Failed to reject payment. Please try again.');
    } finally {
      setIsRejecting(false);
    }
  };

  const isBusy = isApproving || isRejecting;

  return (
    <>
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
        <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-white/20">

          {/* HEADER */}
          <div className="px-8 pt-8 pb-5 border-b border-slate-50 shrink-0 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Verify Payment</h2>
              <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em] mt-1">
                Online Payment · {paymentMethodLabel}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isBusy}
              className="p-3 hover:bg-rose-50 hover:text-rose-500 rounded-2xl text-slate-300 transition-all active:scale-90 disabled:opacity-50"
            >
              <X size={22} />
            </button>
          </div>

          {/* CONTENT */}
          <div className="px-8 py-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">

            {/* Booking summary */}
            <div className="bg-slate-50/60 rounded-[28px] border-2 border-slate-100 p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-xs shrink-0">
                  {booking.customer_name?.charAt(0).toUpperCase() || 'C'}
                </div>
                <div>
                  <p className="font-black text-slate-800 text-sm">{booking.customer_name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{booking.service_type}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <Wallet size={14} className="text-sky-500 shrink-0" />
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Method</p>
                    <p className="text-xs font-black text-slate-700">{paymentMethodLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Banknote size={14} className="text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount</p>
                    <p className="text-xs font-black text-emerald-600">₱{Number(booking.total_price || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Proof of payment image */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase ml-1 tracking-widest">Proof of Payment</label>
              {booking.proof_of_payment_url && !imageFailedToLoad ? (
                <button
                  type="button"
                  onClick={() => setIsImageExpanded(true)}
                  className="relative w-full rounded-[28px] overflow-hidden border-2 border-slate-100 bg-slate-50 group"
                >
                  <img
                    src={booking.proof_of_payment_url}
                    alt="Proof of payment"
                    className="w-full max-h-96 object-contain"
                    onError={() => setImageFailedToLoad(true)}
                  />
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all flex items-center justify-center">
                    <ZoomIn size={28} className="text-white opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                </button>
              ) : (
                <div className="w-full h-48 rounded-[28px] border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-2 text-slate-300">
                  <ImageOff size={28} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {imageFailedToLoad ? 'Image failed to load' : 'No proof uploaded'}
                  </span>
                </div>
              )}
            </div>

            {/* Reject reason form (shown only after clicking Reject) */}
            {showRejectForm && (
              <div className="bg-rose-50/60 border-2 border-rose-100 rounded-[28px] p-6 space-y-3">
                <label className="text-[11px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle size={14} /> Reason for Rejection
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Amount doesn't match, unclear screenshot, wrong reference number..."
                  rows={3}
                  maxLength={300}
                  className="w-full bg-white border-2 border-rose-200 rounded-2xl px-5 py-4 font-bold text-sm text-slate-700 outline-none focus:border-rose-300 resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-rose-400">{rejectReason.length}/300</span>
                  {rejectError && <span className="text-[10px] font-bold text-rose-600">{rejectError}</span>}
                </div>
              </div>
            )}
          </div>

          {/* FOOTER ACTIONS */}
          <div className="px-8 py-6 border-t border-slate-50 shrink-0">
            {!showRejectForm ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRejectClick}
                  disabled={isBusy}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-[24px] font-black text-sm text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  <XCircle size={18} /> Reject
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isBusy}
                  className="flex-[1.5] flex items-center justify-center gap-2 py-4 rounded-[24px] font-black text-sm text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-60"
                >
                  {isApproving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  {isApproving ? 'Approving...' : 'Approve Payment'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCancelReject}
                  disabled={isRejecting}
                  className="flex-1 py-4 rounded-[24px] font-black text-sm text-slate-500 bg-slate-50 hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={isRejecting}
                  className="flex-[1.5] flex items-center justify-center gap-2 py-4 rounded-[24px] font-black text-sm text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-100 transition-all active:scale-95 disabled:opacity-60"
                >
                  {isRejecting ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                  {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen image lightbox */}
      {isImageExpanded && booking.proof_of_payment_url && (
        <div
          className="fixed inset-0 z-[95] bg-slate-900/90 flex items-center justify-center p-6"
          onClick={() => setIsImageExpanded(false)}
        >
          <img
            src={booking.proof_of_payment_url}
            alt="Proof of payment (expanded)"
            className="max-w-full max-h-full object-contain rounded-2xl"
          />
          <button
            type="button"
            onClick={() => setIsImageExpanded(false)}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all"
          >
            <X size={24} />
          </button>
        </div>
      )}
    </>
  );
};

export default PaymentVerificationModal;