import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Store, MapPin, CheckCircle2 } from 'lucide-react';
import authService from '../services/APIservices';
import laundryLinkLogo from '../assets/Untitled design.png';

const Login = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'

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
        <div key={mode} className="w-full max-w-[440px] auth-transition">
          {mode === 'login' ? (
            <LoginForm onSwitch={() => setMode('register')} navigate={navigate} />
          ) : (
            <RegisterForm onSwitch={() => setMode('login')} navigate={navigate} />
          )}
        </div>
      </div>
    </div>
  );
};

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
      const response = await authService.login(email, password);
      console.log('Authentication Successful:', response);

      if (response.user.role === 'owner') {
        navigate('/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      const errorDetail = error.response?.data?.detail || error.message || 'Invalid email or password.';
      setErrorMessage(errorDetail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white w-full rounded-[48px] p-10 shadow-2xl shadow-slate-200/60 border border-slate-100/50">
      <h2 className="text-2xl font-bold text-slate-800 text-center mb-10 tracking-tight">Log in</h2>

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-semibold rounded-xl">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-6">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-sky-400 group-focus-within:text-sky-500 transition-colors">
            <Mail size={20} />
          </div>
          <input
            type="email"
            required
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4.5 pl-14 pr-6 focus:outline-none focus:ring-4 focus:ring-sky-400/10 focus:border-sky-400 transition-all text-slate-700 placeholder:text-slate-400"
            placeholder="Enter registered email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-sky-400 group-focus-within:text-sky-500 transition-colors">
            <Lock size={20} />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            required
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4.5 pl-14 pr-14 focus:outline-none focus:ring-4 focus:ring-sky-400/10 focus:border-sky-400 transition-all text-slate-700 placeholder:text-slate-400"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-6 flex items-center text-slate-300 hover:text-sky-500 transition-colors"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <div className="flex justify-end px-1">
          <button type="button" className="text-sm font-semibold text-sky-500 hover:text-sky-600 transition-colors">
            Forgot Password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-[#0ea5e9] text-white py-4.5 rounded-2xl font-semibold text-lg shadow-xl shadow-sky-100 hover:bg-sky-500 hover:shadow-sky-200 transition-all active:scale-[0.98] mt-4 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Authenticating...' : 'Log in'}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-slate-500 text-sm">
          Don't have a shop account?{' '}
          <button
            type="button"
            onClick={onSwitch}
            className="text-sky-500 font-semibold cursor-pointer hover:underline"
          >
            Register your shop
          </button>
        </p>
      </div>
    </div>
  );
}

function RegisterForm({ onSwitch, navigate }) {
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Only starts showing the mismatch state once the person has actually
  // typed something in confirmPassword — avoids showing a red border
  // the instant they focus the field before typing anything.
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Client-side check only — confirmPassword is never sent to the
    // backend. It just needs to match `password` before we bother
    // calling the API at all.
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }

    setLoading(true);

    try {
      // NOTE: verify this matches the actual method in src/services/APIservices.js
      await authService.register(shopName, address, email, password);
      onSwitch(); // back to login after successful registration
    } catch (error) {
      const errorDetail = error.response?.data?.detail || error.message || 'Unable to create shop account.';
      setErrorMessage(errorDetail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white w-full rounded-[48px] p-10 shadow-2xl shadow-slate-200/60 border border-slate-100/50">
      <h2 className="text-2xl font-bold text-slate-800 text-center mb-10 tracking-tight">Register Shop</h2>

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-semibold rounded-xl">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-6">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-sky-400 group-focus-within:text-sky-500 transition-colors">
            <Store size={20} />
          </div>
          <input
            type="text"
            required
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4.5 pl-14 pr-6 focus:outline-none focus:ring-4 focus:ring-sky-400/10 focus:border-sky-400 transition-all text-slate-700 placeholder:text-slate-400"
            placeholder="Shop name"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
          />
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-sky-400 group-focus-within:text-sky-500 transition-colors">
            <MapPin size={20} />
          </div>
          <input
            type="text"
            required
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4.5 pl-14 pr-6 focus:outline-none focus:ring-4 focus:ring-sky-400/10 focus:border-sky-400 transition-all text-slate-700 placeholder:text-slate-400"
            placeholder="Shop address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-sky-400 group-focus-within:text-sky-500 transition-colors">
            <Mail size={20} />
          </div>
          <input
            type="email"
            required
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4.5 pl-14 pr-6 focus:outline-none focus:ring-4 focus:ring-sky-400/10 focus:border-sky-400 transition-all text-slate-700 placeholder:text-slate-400"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-sky-400 group-focus-within:text-sky-500 transition-colors">
            <Lock size={20} />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            required
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4.5 pl-14 pr-14 focus:outline-none focus:ring-4 focus:ring-sky-400/10 focus:border-sky-400 transition-all text-slate-700 placeholder:text-slate-400"
            placeholder="Create password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-6 flex items-center text-slate-300 hover:text-sky-500 transition-colors"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* CONFIRM PASSWORD FIELD (NEW) */}
        <div>
          <div className={`relative group`}>
            <div className={`absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none transition-colors ${
              passwordsMismatch
                ? 'text-rose-400'
                : passwordsMatch
                  ? 'text-emerald-500'
                  : 'text-sky-400 group-focus-within:text-sky-500'
            }`}>
              <Lock size={20} />
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              className={`w-full bg-slate-50 border rounded-2xl py-4.5 pl-14 pr-14 focus:outline-none focus:ring-4 transition-all text-slate-700 placeholder:text-slate-400 ${
                passwordsMismatch
                  ? 'border-rose-300 focus:ring-rose-400/10 focus:border-rose-400'
                  : passwordsMatch
                    ? 'border-emerald-300 focus:ring-emerald-400/10 focus:border-emerald-400'
                    : 'border-slate-100 focus:ring-sky-400/10 focus:border-sky-400'
              }`}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {/* Show a checkmark instead of the eye toggle once passwords match,
                as a quick visual confirmation without hiding the show/hide control. */}
            {passwordsMatch ? (
              <span className="absolute inset-y-0 right-0 pr-6 flex items-center text-emerald-500">
                <CheckCircle2 size={20} />
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-6 flex items-center text-slate-300 hover:text-sky-500 transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            )}
          </div>
          {passwordsMismatch && (
            <p className="mt-2 ml-2 text-xs font-semibold text-rose-500">
              Passwords do not match.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-[#0ea5e9] text-white py-4.5 rounded-2xl font-semibold text-lg shadow-xl shadow-sky-100 hover:bg-sky-500 hover:shadow-sky-200 transition-all active:scale-[0.98] mt-4 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {loading ? 'Creating Account...' : 'Create Shop Account'}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-slate-500 text-sm">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitch}
            className="text-sky-500 font-semibold cursor-pointer hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;