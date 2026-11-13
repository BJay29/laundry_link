import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Store, MapPin, CheckCircle2, Circle } from 'lucide-react';
import authService from '../services/APIservices';
import laundryLinkLogo from '../assets/Untitled design.png';
import VerifyOtpModal from '../components/modals/verifyotpmodal';
import ForgotPasswordModal from '../components/modals/forgotpasswordmodal';
import { PASSWORD_MAX, getPasswordChecks, validatePassword } from '../utils/passwordrules';

const Login = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  const [pendingSignup, setPendingSignup] = useState(null); // { email, shopName, address }

  // Forgot password
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetNotice, setResetNotice] = useState('');
  const [prefilledEmail, setPrefilledEmail] = useState('');

  const handleSignupSuccess = ({ email, shopName, address }) => {
    setPendingSignup({ email, shopName, address });
  };

  const closeOtpModal = () => setPendingSignup(null);

  const openForgot = (emailFromForm) => {
    setForgotEmail(emailFromForm || '');
    setResetNotice('');
    setForgotOpen(true);
  };

  const handleForgotDone = (email) => {
    setForgotOpen(false);
    setPrefilledEmail(email);
    setResetNotice('Password updated. Please log in with your new password.');
    setMode('login');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">

      {/* Left side — brand panel (logo + tagline) */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[44%] relative overflow-hidden flex-col justify-center p-14 text-white bg-gradient-to-br from-sky-600 via-sky-500 to-emerald-500">
        {/* Decorative bubbles */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10" />
        <div className="absolute top-1/3 -left-20 w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute -bottom-28 right-10 w-96 h-96 rounded-full bg-white/10" />
        <div className="absolute bottom-40 right-1/3 w-8 h-8 rounded-full bg-white/20" />
        <div className="absolute top-1/4 right-1/4 w-5 h-5 rounded-full bg-white/20" />

        <div className="relative z-10 max-w-lg">
          {/* Malaking logo + pangalan sa katabi */}
          <div className="flex items-center gap-5">
            <div className="bg-white rounded-3xl p-3 shadow-xl shadow-sky-900/15 shrink-0">
              <img src={laundryLinkLogo} alt="LaundryLink" className="h-20 w-20 object-contain" />
            </div>
            <span className="text-4xl xl:text-5xl font-black italic tracking-tight">LAUNDRYLINK</span>
          </div>

          <h2 className="mt-10 text-3xl xl:text-5xl font-extrabold leading-tight tracking-tight">
            Run your laundry shop, all in one place.
          </h2>
        </div>

        <p className="absolute bottom-8 left-14 z-10 text-sm text-white/70 font-medium">
          &copy; {new Date().getFullYear()} LaundryLink
        </p>
      </div>

      {/* Right side — auth form (no card) */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-10 bg-white min-h-screen lg:min-h-0 overflow-y-auto">
        {/* Compact brand — mobile/tablet lang */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <img src={laundryLinkLogo} alt="LaundryLink" className="h-10 w-10 object-contain" />
          <span className="text-xl font-black italic">
            <span className="text-sky-500">LAUNDRY</span>
            <span className="text-green-600">LINK</span>
          </span>
        </div>

        <div key={mode} className="w-full max-w-[420px] auth-transition">
          {mode === 'login' ? (
            <LoginForm
              onSwitch={() => { setResetNotice(''); setMode('register'); }}
              navigate={navigate}
              onForgotPassword={openForgot}
              notice={resetNotice}
              prefilledEmail={prefilledEmail}
            />
          ) : (
            <RegisterForm onSwitch={() => setMode('login')} onSignupSuccess={handleSignupSuccess} />
          )}
        </div>
      </div>

      <VerifyOtpModal
        isOpen={pendingSignup !== null}
        email={pendingSignup?.email}
        shopName={pendingSignup?.shopName}
        address={pendingSignup?.address}
        onClose={closeOtpModal}
        onVerified={() => {
          setPendingSignup(null);
          navigate('/dashboard');
        }}
      />

      <ForgotPasswordModal
        isOpen={forgotOpen}
        initialEmail={forgotEmail}
        onClose={() => setForgotOpen(false)}
        onDone={handleForgotDone}
      />
    </div>
  );
};

const OrDivider = () => (
  <div className="flex items-center gap-3 my-6">
    <div className="flex-1 border-t border-slate-200" />
    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Or</span>
    <div className="flex-1 border-t border-slate-200" />
  </div>
);

/**
 * Live checklist ng password rules. Kulay abo habang walang laman,
 * berde kapag pasado, pula kapag may laman pero hindi pasado.
 */
const PasswordRules = ({ password }) => {
  const checks = getPasswordChecks(password);
  return (
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
  );
};

function LoginForm({ onSwitch, navigate, onForgotPassword, notice, prefilledEmail }) {
  const [email, setEmail] = useState(prefilledEmail || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Ipasok ang email pagkatapos ng successful na password reset.
  useEffect(() => {
    if (prefilledEmail) setEmail(prefilledEmail);
  }, [prefilledEmail]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      await authService.login(email, password);
      navigate('/dashboard');
    } catch (error) {
      setErrorMessage(error.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome back</h2>
      <p className="text-slate-500 font-medium mt-2 mb-8">Log in to manage your shop.</p>

      {notice && !errorMessage && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium rounded-lg">
          {notice}
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-lg">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-500 transition-colors">
            <Mail size={18} />
          </div>
          <input
            type="email"
            required
            className="w-full bg-slate-50/60 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 text-[15px] focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 focus:bg-white transition-all text-slate-700 placeholder:text-slate-400"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Walang length limit dito sa login, sinadya. */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-500 transition-colors">
            <Lock size={18} />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            required
            className="w-full bg-slate-50/60 border border-slate-200 rounded-xl py-3.5 pl-11 pr-11 text-[15px] focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 focus:bg-white transition-all text-slate-700 placeholder:text-slate-400"
            placeholder="Password"
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

        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-sky-500 hover:bg-sky-600 text-white py-3.5 rounded-xl font-bold text-[15px] shadow-md shadow-sky-200/60 transition-all active:scale-[0.98] ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Logging in...' : 'Log in'}
        </button>

        <div className="text-right -mt-1">
          <button
            type="button"
            onClick={() => onForgotPassword(email)}
            className="text-sm text-sky-600 hover:underline font-semibold"
          >
            Forgot password?
          </button>
        </div>
      </form>

      <OrDivider />

      <button
        type="button"
        onClick={onSwitch}
        className="w-full border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 py-3 rounded-xl font-bold text-[15px] transition-all active:scale-[0.98]"
      >
        Create a shop account
      </button>
    </div>
  );
}

function RegisterForm({ onSwitch, onSignupSuccess }) {
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const passwordError = validatePassword(password);
    if (passwordError) {
      setErrorMessage(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }

    setLoading(true);

    try {
      await authService.signUp({
        fullName: shopName,
        shopName,
        address,
        email,
        password,
      });

      onSignupSuccess({ email, shopName, address });
    } catch (error) {
      console.error("Registration Error Object:", error);
      setErrorMessage(error.message || 'Unable to create shop account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Register your shop</h2>
      <p className="text-slate-500 font-medium mt-2 mb-8">Set up your LaundryLink account in a few minutes.</p>

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-medium rounded-lg overflow-x-auto">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
            <Store size={18} />
          </div>
          <input
            type="text"
            required
            className="w-full bg-slate-50/60 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 text-[15px] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 focus:bg-white transition-all text-slate-700 placeholder:text-slate-400"
            placeholder="Shop name"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
          />
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
            <MapPin size={18} />
          </div>
          <input
            type="text"
            required
            className="w-full bg-slate-50/60 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 text-[15px] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 focus:bg-white transition-all text-slate-700 placeholder:text-slate-400"
            placeholder="Shop address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
            <Mail size={18} />
          </div>
          <input
            type="email"
            required
            className="w-full bg-slate-50/60 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 text-[15px] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 focus:bg-white transition-all text-slate-700 placeholder:text-slate-400"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
              <Lock size={18} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              maxLength={PASSWORD_MAX}
              className="w-full bg-slate-50/60 border border-slate-200 rounded-xl py-3.5 pl-11 pr-11 text-[15px] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 focus:bg-white transition-all text-slate-700 placeholder:text-slate-400"
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
          <PasswordRules password={password} />
        </div>

        <div>
          <div className="relative group">
            <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${
              passwordsMismatch ? 'text-rose-400' : passwordsMatch ? 'text-emerald-500' : 'text-slate-400 group-focus-within:text-emerald-500'
            }`}>
              <Lock size={18} />
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              maxLength={PASSWORD_MAX}
              className={`w-full border rounded-xl py-3.5 pl-11 pr-11 text-[15px] focus:outline-none focus:ring-4 transition-all text-slate-700 placeholder:text-slate-400 ${
                passwordsMismatch
                  ? 'bg-rose-50/40 border-rose-300 focus:ring-rose-400/10 focus:border-rose-400'
                  : passwordsMatch
                    ? 'bg-emerald-50/40 border-emerald-300 focus:ring-emerald-400/10 focus:border-emerald-400'
                    : 'bg-slate-50/60 border-slate-200 focus:ring-emerald-500/10 focus:border-emerald-400 focus:bg-white'
              }`}
              placeholder="Confirm password"
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
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            )}
          </div>
          {passwordsMismatch && (
            <p className="mt-1.5 ml-1 text-xs font-medium text-rose-500">
              Passwords do not match.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold text-[15px] shadow-md shadow-emerald-200/60 transition-all active:scale-[0.98] mt-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>

      <OrDivider />

      <div className="text-center">
        <p className="text-sm text-slate-500">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitch}
            className="text-sky-500 font-semibold hover:underline"
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;