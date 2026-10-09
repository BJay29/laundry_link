import React, { useState, useEffect, useRef } from 'react';
import {
  X, Mail, KeyRound, Lock, Eye, EyeOff, CheckCircle2, Circle, Loader2, ArrowLeft,
} from 'lucide-react';
import apiService from '../../services/APIservices';
import {
  PASSWORD_MAX,
  getPasswordChecks,
  validatePassword,
} from '../../utils/passwordrules';

/**
 * FORGOT PASSWORD MODAL (OTP flow, 3 hakbang)
 *   1. email        -> apiService.requestPasswordReset()
 *   2. code         -> apiService.verifyRecoveryOtp()
 *   3. new password -> apiService.setNewPassword()  (sign out pagkatapos)
 *
 * Kailangang may {{ .Token }} ang "Reset Password" email template sa
 * Supabase para code ang matanggap ng user at hindi link.
 *
 * NOTE: pagkatapos ng verifyRecoveryOtp, may recovery session na ang
 * browser. Kapag isinara ang modal bago matapos ang hakbang 3, sine-sign
 * out natin ang session para hindi maiwang naka-login ang user nang
 * hindi nagse-set ng password.
 */
const RESEND_COOLDOWN_SECONDS = 60;

const INPUT_CLASS =
  'w-full bg-slate-50/60 border-2 border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-[15px] focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 focus:bg-white transition-all text-slate-700 placeholder:text-slate-400 shadow-sm';

const ForgotPasswordModal = ({ isOpen, initialEmail = '', onClose, onDone }) => {
  const [step, setStep] = useState('email'); // 'email' | 'code' | 'password'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);

  // True kapag na-verify na ang code (may recovery session na).
  const hasRecoverySession = useRef(false);
  const timerRef = useRef(null);

  // Reset tuwing bubuksan.
  useEffect(() => {
    if (!isOpen) return;
    setStep('email');
    setEmail(initialEmail || '');
    setCode('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirm(false);
    setLoading(false);
    setErrorMessage('');
    setInfoMessage('');
    setResendSecondsLeft(0);
    hasRecoverySession.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  if (!isOpen) return null;

  const startCooldown = () => {
    setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const handleClose = async () => {
    if (loading) return;
    if (hasRecoverySession.current) {
      try {
        await apiService.cancelPasswordRecovery();
      } catch (_) {
        // walang magagawa kung pumalya; hindi ito dapat humarang sa pagsara
      }
      hasRecoverySession.current = false;
    }
    onClose?.();
  };

  // ── Hakbang 1 ──────────────────────────────────────────────────
  const handleSendCode = async (e, isResend = false) => {
    e?.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await apiService.requestPasswordReset(cleanEmail);
      startCooldown();
      setStep('code');
      setInfoMessage(
        isResend
          ? 'A new code was sent if that email has an account.'
          : 'If that email has an account, a code was sent.'
      );
    } catch (error) {
      setErrorMessage(error.message || 'Could not send the code. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  // ── Hakbang 2 ──────────────────────────────────────────────────
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    const cleanCode = code.trim();
    if (cleanCode.length < 6) {
      setErrorMessage('Enter the code sent to your email.');
      return;
    }

    setLoading(true);
    try {
      await apiService.verifyRecoveryOtp({ email: email.trim(), code: cleanCode });
      hasRecoverySession.current = true;
      setStep('password');
    } catch (error) {
      setErrorMessage('Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Hakbang 3 ──────────────────────────────────────────────────
  const handleSavePassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const passwordError = validatePassword(password);
    if (passwordError) {
      setErrorMessage(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await apiService.setNewPassword(password);
      hasRecoverySession.current = false; // na-sign out na sa loob ng setNewPassword
      onDone?.(email.trim());
    } catch (error) {
      setErrorMessage(error.message || 'Could not update your password. Please start again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const checks = getPasswordChecks(password);

  const titles = {
    email: ['Forgot password?', "Enter your account email and we'll send you a code."],
    code: ['Enter the code', `We sent a code to ${email.trim()}`],
    password: ['Set new password', 'Choose a new password for your account.'],
  };
  const [title, subtitle] = titles[step];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-[420px] rounded-3xl shadow-2xl border border-white/20 overflow-hidden">

        {/* HEADER */}
        <div className="px-8 pt-8 pb-4 flex justify-between items-start">
          <div className="flex items-start gap-3">
            {step === 'code' && (
              <button
                type="button"
                onClick={() => { setStep('email'); setCode(''); setErrorMessage(''); setInfoMessage(''); }}
                disabled={loading}
                className="mt-1 p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors disabled:opacity-50"
                title="Use a different email"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-slate-800">{title}</h2>
              <p className="text-sm text-slate-400 mt-1 break-words">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="p-2 rounded-xl text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-all disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="px-8 pb-8">
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-lg">
              {errorMessage}
            </div>
          )}
          {infoMessage && !errorMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium rounded-lg">
              {infoMessage}
            </div>
          )}

          {/* STEP 1: EMAIL */}
          {step === 'email' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-500 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  autoFocus
                  className={INPUT_CLASS}
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-sky-500 hover:bg-sky-600 text-white py-3.5 rounded-2xl font-bold text-[15px] shadow-lg shadow-sky-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? 'Sending...' : 'Send code'}
              </button>
            </form>
          )}

          {/* STEP 2: CODE */}
          {step === 'code' && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-500 transition-colors">
                  <KeyRound size={18} />
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={8}
                  className={`${INPUT_CLASS} text-center text-xl font-bold tracking-[0.5em] pr-4`}
                  placeholder="------"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-sky-500 hover:bg-sky-600 text-white py-3.5 rounded-2xl font-bold text-[15px] shadow-lg shadow-sky-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? 'Verifying...' : 'Verify code'}
              </button>

              <div className="text-center text-sm text-slate-500">
                Didn't receive a code?{' '}
                <button
                  type="button"
                  disabled={loading || resendSecondsLeft > 0}
                  onClick={(e) => handleSendCode(e, true)}
                  className="text-sky-500 font-semibold hover:underline disabled:text-slate-300 disabled:no-underline disabled:cursor-not-allowed"
                >
                  {resendSecondsLeft > 0 ? `Resend in ${resendSecondsLeft}s` : 'Resend'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: NEW PASSWORD */}
          {step === 'password' && (
            <form onSubmit={handleSavePassword} className="space-y-4">
              <div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-500 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    maxLength={PASSWORD_MAX}
                    className={`${INPUT_CLASS} pr-11`}
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <ul className="mt-2 ml-1 space-y-1">
                  {checks.map((c) => {
                    const color = password.length === 0
                      ? 'text-slate-400'
                      : c.ok ? 'text-emerald-600' : 'text-rose-500';
                    return (
                      <li key={c.id} className={`flex items-center gap-1.5 text-xs font-medium ${color}`}>
                        {c.ok ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                        {c.label}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <div className="relative group">
                  <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${
                    passwordsMismatch ? 'text-rose-400' : passwordsMatch ? 'text-emerald-500' : 'text-slate-400 group-focus-within:text-sky-500'
                  }`}>
                    <Lock size={18} />
                  </div>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    maxLength={PASSWORD_MAX}
                    className={`w-full border-2 rounded-2xl py-3.5 pl-11 pr-11 text-[15px] focus:outline-none focus:ring-4 transition-all text-slate-700 placeholder:text-slate-400 shadow-sm ${
                      passwordsMismatch
                        ? 'bg-rose-50/40 border-rose-300 focus:ring-rose-400/10 focus:border-rose-400'
                        : passwordsMatch
                          ? 'bg-emerald-50/40 border-emerald-300 focus:ring-emerald-400/10 focus:border-emerald-400'
                          : 'bg-slate-50/60 border-slate-200 focus:ring-sky-500/10 focus:border-sky-400 focus:bg-white'
                    }`}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {passwordsMatch ? (
                    <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-emerald-500">
                      <CheckCircle2 size={18} />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  )}
                </div>
                {passwordsMismatch && (
                  <p className="mt-1.5 ml-1 text-xs font-medium text-rose-500">Passwords do not match.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-bold text-[15px] shadow-lg shadow-emerald-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;