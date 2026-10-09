import React, { useState, useEffect, useRef } from 'react';
import {
  X, Banknote, Wallet, AlertTriangle, CheckCircle2, XCircle, Loader2,
  ImageOff, ZoomIn, ShieldCheck, History, Hash, BadgeCheck, Lock, ChevronDown,
} from 'lucide-react';
import apiService from '../../services/APIservices';
import { useAuth } from '../../context/authcontext';

/**
 * PAYMENT VERIFICATION MODAL
 *
 * UPDATED (Secure Payment Verification System):
 *  1. RBAC — staff/manager/owner lang ang puwedeng gumamit nito
 *     (UX guard lang ito; ang backend pa rin ang source of truth).
 *  2. Dynamic watermark sa ibabaw ng resibo: "FOR SYSTEM VERIFICATION
 *     ONLY - [staff email]" (pati sa fullscreen lightbox).
 *  3. Anti-copy deterrents sa resibo: walang right-click, walang drag,
 *     walang text/image selection, hindi lumalabas sa print.
 *  4. Dual-check: kapag ang halaga ay >= ₱5,000, kailangang i-check ang
 *     ledger confirmation bago ma-enable ang Approve, at ipinapasa ito
 *     sa backend bilang manual_verification_confirmed.
 *  5. Audit trail: pagbukas ng modal, tinatawag ang GET /audit-trail
 *     (nagla-log ng "VIEW" sa backend) at ipinapakita ang history.
 *  6. Ipinapakita ang reference number, OCR status, at babala kung ang
 *     amount na nabasa ng OCR ay hindi tugma sa halagang dapat bayaran.
 *
 * Approve → apiService.markBookingPaid(id, null, confirmed). Ang `null`
 * sa 2nd argument ay kritikal: hindi dapat ma-overwrite ang payment_method.
 */

// Dapat tumugma sa DUAL_CHECK_THRESHOLD ng backend (booking_controller.py)
const DUAL_CHECK_THRESHOLD = 5000;
const ALLOWED_ROLES = ['staff', 'manager', 'owner'];

const escapeXml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** Paulit-ulit na diagonal watermark (SVG tile bilang background). */
const Watermark = ({ email }) => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="180">` +
    `<g transform="rotate(-25 180 90)" font-family="Arial, sans-serif" font-weight="700" ` +
    `text-anchor="middle" fill="rgba(30,41,59,0.38)" stroke="rgba(255,255,255,0.55)" ` +
    `stroke-width="0.6" paint-order="stroke">` +
    `<text x="180" y="84" font-size="12">FOR SYSTEM VERIFICATION ONLY -</text>` +
    `<text x="180" y="102" font-size="12">${escapeXml(email)}</text>` +
    `</g></svg>`;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none"
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`,
        backgroundRepeat: 'repeat',
      }}
    />
  );
};

const ACTION_STYLES = {
  VIEW: 'bg-slate-100 text-slate-500',
  APPROVE: 'bg-emerald-50 text-emerald-600',
  REJECT: 'bg-rose-50 text-rose-600',
};

const formatDateTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const PaymentVerificationModal = ({ isOpen, booking, onClose, onSuccess }) => {
  const { user } = useAuth();

  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [imageFailedToLoad, setImageFailedToLoad] = useState(false);

  const [ledgerConfirmed, setLedgerConfirmed] = useState(false);

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Para hindi madoble ang "VIEW" log (React StrictMode runs effects
  // twice in dev) at para hindi mag-apply ng lumang response.
  const loggedViewForRef = useRef(null);
  const activeBookingIdRef = useRef(null);

  const staffEmail = user?.email || localStorage.getItem('user_email') || 'unknown-staff';
  const role = (localStorage.getItem('role') || '').toLowerCase();
  const canVerify = ALLOWED_ROLES.includes(role);

  // ── Reset + audit trail fetch tuwing bubuksan ang modal ──────────────
  useEffect(() => {
    if (!isOpen || !booking?.id) {
      loggedViewForRef.current = null;
      activeBookingIdRef.current = null;
      return;
    }
    if (!canVerify) return;
    if (loggedViewForRef.current === booking.id) return;

    loggedViewForRef.current = booking.id;
    activeBookingIdRef.current = booking.id;
    const bookingId = booking.id;

    setIsApproving(false);
    setIsRejecting(false);
    setShowRejectForm(false);
    setRejectReason('');
    setRejectError('');
    setIsImageExpanded(false);
    setImageFailedToLoad(false);
    setLedgerConfirmed(false);
    setShowHistory(false);
    setAuditLogs([]);
    setAuditError('');
    setAuditLoading(true);

    // Ang tawag na ito mismo ang nagla-log ng "VIEW" sa backend.
    apiService
      .getPaymentAuditTrail(bookingId)
      .then((logs) => {
        if (activeBookingIdRef.current !== bookingId) return;
        setAuditLogs(Array.isArray(logs) ? logs : []);
      })
      .catch((err) => {
        if (activeBookingIdRef.current !== bookingId) return;
        console.error('Audit Trail Error:', err);
        setAuditError('Could not load the audit history.');
      })
      .finally(() => {
        if (activeBookingIdRef.current !== bookingId) return;
        setAuditLoading(false);
      });
  }, [isOpen, booking?.id, canVerify]);

  if (!isOpen || !booking) return null;

  // ── RBAC: hindi pinapayagan ang role ─────────────────────────────────
  if (!canVerify) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
        <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl p-8 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 flex items-center justify-center">
            <Lock size={24} className="text-rose-500" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Access Restricted</h2>
          <p className="text-sm text-slate-500 font-medium">
            Your account doesn't have permission to verify payments.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl font-black text-sm text-white bg-slate-900 hover:bg-slate-800 transition-all active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const paymentMethodLabel =
    booking.payment_method === 'gcash' ? 'GCash'
      : booking.payment_method === 'paymaya' ? 'PayMaya'
        : booking.payment_method === 'online_qr' ? 'Online (QR Ph)'
          : booking.payment_method;

  // Parehong rule ng backend: final_price muna, kung wala, total_price.
  const amountDue = Number(booking.final_price ?? booking.total_price ?? 0);
  const requiresDualCheck = amountDue >= DUAL_CHECK_THRESHOLD;

  const extractedAmount =
    booking.extracted_amount !== null && booking.extracted_amount !== undefined
      ? Number(booking.extracted_amount)
      : null;
  const amountMismatch = extractedAmount !== null && Math.abs(extractedAmount - amountDue) > 0.009;

  const isSandbox = (booking.reference_number || '').toUpperCase().startsWith('TEST-');
  const isBusy = isApproving || isRejecting;
  const approveDisabled = isBusy || (requiresDualCheck && !ledgerConfirmed);

  const handleApprove = async () => {
    if (approveDisabled) return;
    try {
      setIsApproving(true);
      // 2nd arg = null → hindi ginagalaw ang payment_method ng booking.
      await apiService.markBookingPaid(booking.id, null, requiresDualCheck && ledgerConfirmed);
      if (onSuccess) onSuccess(`Payment approved for ${booking.customer_name}'s booking.`);
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

  // Anti-copy handlers para sa resibo
  const blockContextMenu = (e) => e.preventDefault();
  const blockDrag = (e) => e.preventDefault();

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
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount Due</p>
                    <p className="text-xs font-black text-emerald-600">₱{amountDue.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Reference number + OCR status */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <Hash size={12} /> Reference No.
                  </span>
                  <span className="text-xs font-black text-slate-700 tracking-wide break-all text-right">
                    {booking.reference_number || '—'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {booking.is_verified_by_ocr && !isSandbox && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                      <BadgeCheck size={12} /> OCR verified
                    </span>
                  )}
                  {isSandbox && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 text-[9px] font-black uppercase tracking-widest border border-violet-100">
                      Sandbox · OCR skipped
                    </span>
                  )}
                  {!booking.is_verified_by_ocr && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest border border-amber-100">
                      Not OCR verified
                    </span>
                  )}
                  {extractedAmount !== null && !isSandbox && (
                    <span className="text-[10px] font-bold text-slate-400">
                      Receipt shows ₱{extractedAmount.toFixed(2)}
                    </span>
                  )}
                </div>

                {amountMismatch && !isSandbox && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                    <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-amber-700">
                      The amount read from the receipt (₱{extractedAmount.toFixed(2)}) doesn't match the
                      amount due (₱{amountDue.toFixed(2)}). Check the receipt carefully before approving.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Proof of payment image (watermarked, copy-protected) */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase ml-1 tracking-widest">Proof of Payment</label>
              {booking.proof_of_payment_url && !imageFailedToLoad ? (
                <button
                  type="button"
                  onClick={() => setIsImageExpanded(true)}
                  onContextMenu={blockContextMenu}
                  className="relative w-full rounded-[28px] overflow-hidden border-2 border-slate-100 bg-slate-50 group select-none print:hidden"
                  style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' }}
                >
                  <img
                    src={booking.proof_of_payment_url}
                    alt="Proof of payment"
                    draggable={false}
                    onDragStart={blockDrag}
                    onContextMenu={blockContextMenu}
                    onError={() => setImageFailedToLoad(true)}
                    className="w-full max-h-96 object-contain pointer-events-none select-none"
                  />
                  <Watermark email={staffEmail} />
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all flex items-center justify-center pointer-events-none">
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
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 ml-1">
                <ShieldCheck size={12} /> For verification only. Your views and decisions are logged.
              </p>
            </div>

            {/* Audit history */}
            <div className="border-2 border-slate-100 rounded-[24px] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50/60 transition-colors"
              >
                <span className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                  <History size={14} className="text-sky-500" />
                  Audit History
                  {!auditLoading && !auditError && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px]">
                      {auditLogs.length}
                    </span>
                  )}
                </span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
              </button>

              {showHistory && (
                <div className="px-5 pb-4 space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                  {auditLoading && (
                    <div className="flex items-center gap-2 text-sky-500 text-xs font-bold py-2">
                      <Loader2 size={14} className="animate-spin" /> Loading history...
                    </div>
                  )}
                  {!auditLoading && auditError && (
                    <p className="text-[11px] font-bold text-rose-500 py-2">{auditError}</p>
                  )}
                  {!auditLoading && !auditError && auditLogs.length === 0 && (
                    <p className="text-[11px] font-bold text-slate-300 py-2">No activity recorded yet.</p>
                  )}
                  {!auditLoading && !auditError && auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 py-2 border-t border-slate-50 first:border-t-0">
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0 ${ACTION_STYLES[log.action_performed] || 'bg-slate-100 text-slate-500'}`}>
                        {log.action_performed}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-slate-700 truncate">{log.staff_email}</p>
                        <p className="text-[10px] font-bold text-slate-400">{formatDateTime(log.timestamp)}</p>
                        {log.rejection_reason && (
                          <p className="text-[10px] font-bold text-rose-500 mt-0.5 break-words">
                            Reason: {log.rejection_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reject reason form */}
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
          <div className="px-8 py-6 border-t border-slate-50 shrink-0 space-y-4">

            {/* Dual-check (>= ₱5,000) */}
            {!showRejectForm && requiresDualCheck && (
              <label
                className={`flex items-start gap-3 rounded-2xl border-2 px-4 py-3 cursor-pointer transition-all ${
                  ledgerConfirmed ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={ledgerConfirmed}
                  onChange={(e) => setLedgerConfirmed(e.target.checked)}
                  disabled={isBusy}
                  className="mt-0.5 w-4 h-4 accent-emerald-500 shrink-0"
                />
                <span className="text-[11px] font-bold text-slate-600 leading-snug">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-amber-600 mb-0.5">
                    High-value transaction · ₱{amountDue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                  I confirm I manually validated this transaction against our official bank / e-wallet
                  app history.
                </span>
              </label>
            )}

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
                  disabled={approveDisabled}
                  title={requiresDualCheck && !ledgerConfirmed ? 'Confirm the ledger check first' : undefined}
                  className="flex-[1.5] flex items-center justify-center gap-2 py-4 rounded-[24px] font-black text-sm text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
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

      {/* Fullscreen image lightbox (watermarked, copy-protected) */}
      {isImageExpanded && booking.proof_of_payment_url && (
        <div
          className="fixed inset-0 z-[95] bg-slate-900/90 flex items-center justify-center p-6 select-none print:hidden"
          onClick={() => setIsImageExpanded(false)}
          onContextMenu={blockContextMenu}
        >
          <div className="relative inline-block">
            <img
              src={booking.proof_of_payment_url}
              alt="Proof of payment (expanded)"
              draggable={false}
              onDragStart={blockDrag}
              onContextMenu={blockContextMenu}
              className="block max-w-[90vw] max-h-[88vh] object-contain rounded-2xl pointer-events-none select-none"
            />
            <Watermark email={staffEmail} />
          </div>
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