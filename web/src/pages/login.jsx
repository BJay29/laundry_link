import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Store, MapPin, CheckCircle2 } from 'lucide-react';
import authService from '../services/APIservices';
import laundryLinkLogo from '../assets/Untitled design.png';
import VerifyOtpModal from '../components/modals/verifyotpmodal';

const Login = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  const [pendingSignup, setPendingSignup] = useState(null); // { email, shopName, address }

  const handleSignupSuccess = ({ email, shopName, address }) => {
    setPendingSignup({ email, shopName, address });
  };

  const closeOtpModal = () => setPendingSignup(null);

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">

      {/* Left side — brand / tagline */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 py-12 bg-[#EFF8FF] relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-[0.04] pointer-events-none"
             style={{ backgroundImage: 'radial-gradient(#0ea5e9 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <img src={laundryLinkLogo} alt="LaundryLink" className="h-14" />
            <span className="text-2xl font-black italic">
              <span className="text-sky-500">LAUNDRY</span>
              <span className="text-green-600">LINK</span>
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 leading-tight max-w-lg">
            Manage your laundry shop,{' '}
            <span className="text-sky-500">the smart way.</span>
          </h2>
          <p className="mt-6 text-slate-500 text-lg max-w-md">
            Track machines, handle bookings, and grow your business with
            AI-powered insights all in one dashboard.
          </p>
        </div>
      </div>

      {/* Right side — auth form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div key={mode} className="w-full max-w-[400px] auth-transition">
          {mode === 'login' ? (
            <LoginForm onSwitch={() => setMode('register')} navigate={navigate} />
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
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  SHARED: "OR" divider — dating plain border-t lang, ngayon may      */
/*  visible na linya sa magkabilang gilid ng salitang "OR" sa gitna.   */
/* ------------------------------------------------------------------ */

const OrDivider = () => (
  <div className="flex items-center gap-3 my-6">
    <div className="flex-1 border-t border-slate-200" />
    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Or</span>
    <div className="flex-1 border-t border-slate-200" />
  </div>
);

function LoginForm({ onSwitch, navigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="bg-white w-full rounded-2xl p-8 shadow-lg border border-slate-100">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Log into LaundryLink</h2>

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
            className="w-full bg-slate-50/60 border-2 border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-[15px] focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 focus:bg-white transition-all text-slate-700 placeholder:text-slate-400 shadow-sm"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-500 transition-colors">
            <Lock size={18} />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            required
            className="w-full bg-slate-50/60 border-2 border-slate-200 rounded-2xl py-3.5 pl-11 pr-11 text-[15px] focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 focus:bg-white transition-all text-slate-700 placeholder:text-slate-400 shadow-sm"
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
          className={`w-full bg-sky-500 hover:bg-sky-600 text-white py-3.5 rounded-2xl font-bold text-[15px] shadow-lg shadow-sky-100 transition-all active:scale-[0.98] ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Logging in...' : 'Log in'}
        </button>

        <div className="text-center pt-1">
          <button type="button" className="text-sm text-sky-500 hover:underline font-medium">
            Forgotten password?
          </button>
        </div>
      </form>

      <OrDivider />

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onSwitch}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-bold text-[15px] shadow-lg shadow-emerald-100 transition-all active:scale-[0.98]"
        >
          Create new shop account
        </button>
      </div>
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
    <div className="bg-white w-full rounded-2xl p-8 shadow-lg border border-slate-100">
      <h2 className="text-xl font-bold text-slate-800 mb-1">Register your shop</h2>
      <p className="text-sm text-slate-400 mb-6">It's quick and easy.</p>

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
            className="w-full bg-slate-50/60 border-2 border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-[15px] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 focus:bg-white transition-all text-slate-700 placeholder:text-slate-400 shadow-sm"
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
            className="w-full bg-slate-50/60 border-2 border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-[15px] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 focus:bg-white transition-all text-slate-700 placeholder:text-slate-400 shadow-sm"
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
            className="w-full bg-slate-50/60 border-2 border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-[15px] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 focus:bg-white transition-all text-slate-700 placeholder:text-slate-400 shadow-sm"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
            <Lock size={18} />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            required
            className="w-full bg-slate-50/60 border-2 border-slate-200 rounded-2xl py-3.5 pl-11 pr-11 text-[15px] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 focus:bg-white transition-all text-slate-700 placeholder:text-slate-400 shadow-sm"
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
              className={`w-full border-2 rounded-2xl py-3.5 pl-11 pr-11 text-[15px] focus:outline-none focus:ring-4 transition-all text-slate-700 placeholder:text-slate-400 shadow-sm ${
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
          className={`w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-bold text-[15px] shadow-lg shadow-emerald-100 transition-all active:scale-[0.98] mt-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
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