import React, { useState, useEffect, useRef } from 'react';
import { X, Mail } from 'lucide-react';
import authService from '../../services/APIservices';

const RESEND_COOLDOWN_SECONDS = 60;

/// Modal para sa OTP verification, ipinapakita pagkatapos ng
/// successful signUp() sa Login page. Parehong logic ng ginawa nating
/// verify_otp_page.dart sa Flutter — verify OTP, tapos tawagin ang
/// POST /auth/register-shop (dahil sa web side, hiwalay na hakbang
/// ang paggawa ng Shop entity, hindi bahagi ng webhook sync).
///
/// ⚠️ ASSUMPTION: ginamit ko ang mga generic na Tailwind classes
/// (bg-white, rounded-2xl, shadow-lg, sky-500 accents) para tumugma sa
/// itsura ng Login form mo. Kapag naipasa mo na ang isa sa existing
/// modals mo (hal. bookingmodal.jsx), pwede nating i-adjust ito para
/// eksaktong tumugma sa convention ng backdrop/overlay/close button
/// niyo.
export default function VerifyOtpModal({ isOpen, email, shopName, address, onClose, onVerified }) {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendSecondsLeft, setResendSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const timerRef = useRef(null);

  const startResendCooldown = () => {
    setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Nag-re-restart ang cooldown tuwing bubukas ang modal (fresh na
  // OTP code na naipadala kasabay ng signUp()).
  useEffect(() => {
    if (isOpen) {
      setCode('');
      setErrorMessage('');
      startResendCooldown();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.trim().length < 6) {
      setErrorMessage('Enter the code sent to your email.');
      return;
    }

    setVerifying(true);
    setErrorMessage('');

    try {
      await authService.verifyOtp({ email, code: code.trim() });

      // Matapos ma-verify, may session na tayo sa Supabase side.
      // Kailangan pa nating tawagin ang register-shop endpoint dito
      // (hiwalay na hakbang, hindi bahagi ng webhook sync sa web side)
      // para malikha ang Shop entity at ma-link sa User.
      setVerifying(false);
      setSyncing(true);
      await authService.registerShop({ shopName, address });

      setSyncing(false);
      onVerified();
    } catch (error) {
      setVerifying(false);
      setSyncing(false);
      setErrorMessage(error.message || 'Invalid or expired code. Please try again.');
    }
  };

  const handleResend = async () => {
    setResending(true);
    setErrorMessage('');
    try {
      await authService.resendOtp(email);
      startResendCooldown();
    } catch (error) {
      setErrorMessage(error.message || 'Unable to resend the code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const busy = verifying || syncing;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
      <div className="bg-white w-full max-w-[420px] rounded-2xl p-8 shadow-xl border border-slate-100 relative">
        {/* Close button — sinasadyang hindi sinasara ang modal sa
            pag-click sa labas (walang onClick sa backdrop div sa
            itaas), para hindi aksidenteng ma-dismiss habang nagta-type
            ng code. Dapat i-explicitly close lang. */}
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"
        >
          <X size={20} />
        </button>

        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full bg-sky-50 flex items-center justify-center">
            <Mail size={28} className="text-sky-500" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-800 text-center mb-1">Verify your email</h2>
        <p className="text-sm text-slate-500 text-center mb-6">
          We sent a code to<br /><span className="font-medium text-slate-700">{email}</span>
        </p>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-lg">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={8}
            autoFocus
            className="w-full text-center text-2xl font-bold tracking-[0.5em] bg-slate-50 border border-slate-300 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-slate-700 placeholder:text-slate-300"
            placeholder="------"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />

          <button
            type="submit"
            disabled={busy}
            className={`w-full bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-lg font-bold text-[15px] transition-all active:scale-[0.98] ${busy ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {syncing ? 'Setting up your shop...' : verifying ? 'Verifying...' : 'Verify account'}
          </button>
        </form>

        <div className="text-center mt-5">
          <span className="text-sm text-slate-500">Didn't receive a code? </span>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || busy || resendSecondsLeft > 0}
            className="text-sm text-sky-500 font-semibold hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
          >
            {resending ? 'Sending...' : resendSecondsLeft > 0 ? `Resend in ${resendSecondsLeft}s` : 'Resend'}
          </button>
        </div>
      </div>
    </div>
  );
}