import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import authService from '../services/APIservices';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // State to toggle password visibility
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      // API call to FastAPI backend via the authentication service
      const response = await authService.login(email, password);

      console.log("Authentication Successful:", response);
      
      // Navigate to dashboard based on user role defined in PostgreSQL
      // Session management (localStorage) is handled within authService.login
      if (response.user.role === 'owner') {
        navigate('/dashboard'); 
      } else {
        // Staff/Admin also directed to dashboard for current prototype scope
        navigate('/dashboard'); 
      }
      
    } catch (error) {
      // Extract specific error details from FastAPI (e.g., 401 Unauthorized)
      const errorDetail = error.response?.data?.detail || error.message || 'Invalid email or password.';
      setErrorMessage(errorDetail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden text-left">
      
      {/* Background Pattern for Professional Aesthetic */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#0ea5e9 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}>
      </div>

      <div className="z-10 w-full max-w-[440px] flex flex-col items-center">
        
        {/* System Branding - Service Income Optimization Focus */}
        <div className="mb-10 text-center">
          <div className="flex items-center justify-center mb-3">
             <div className="flex gap-1.5 items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full bg-[#5d2ca8]"></div>
                <div className="w-8 h-1.5 bg-[#5d2ca8] rounded-full"></div>
                <div className="w-5 h-5 rounded-full border-[5px] border-[#22c55e]"></div>
             </div>
          </div>
          <h1 className="text-4xl font-black tracking-tighter flex justify-center italic">
            <span className="text-[#5d2ca8]">LAUNDRY</span>
            <span className="text-[#22c55e]">LINK</span>
          </h1>
          <p className="text-slate-500 text-xs mt-2 font-bold tracking-widest uppercase">Income Optimization System</p>
        </div>

        {/* Authentication Card */}
        <div className="bg-white w-full rounded-[48px] p-10 shadow-2xl shadow-slate-200/60 border border-slate-100/50">
          <h2 className="text-3xl font-black text-slate-800 text-center mb-10 tracking-tight">Sign In</h2>

          {/* Error Alert Display */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold rounded-xl animate-pulse">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Email Input */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-sky-400 group-focus-within:text-sky-500 transition-colors">
                <Mail size={20} />
              </div>
              <input
                type="email"
                required
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4.5 pl-14 pr-6 focus:outline-none focus:ring-4 focus:ring-sky-400/10 focus:border-sky-400 transition-all text-slate-700 placeholder:text-slate-400 font-medium"
                placeholder="Enter registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password Input with Visibility Toggle */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-sky-400 group-focus-within:text-sky-500 transition-colors">
                <Lock size={20} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4.5 pl-14 pr-14 focus:outline-none focus:ring-4 focus:ring-sky-400/10 focus:border-sky-400 transition-all text-slate-700 placeholder:text-slate-400 font-medium"
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

            {/* Password Recovery Link */}
            <div className="flex justify-end px-1">
              <button type="button" className="text-sm font-bold text-sky-400 hover:text-sky-500 transition-colors">
                Forgot Password?
              </button>
            </div>

            {/* Submission Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-[#0ea5e9] text-white py-4.5 rounded-2xl font-black text-lg shadow-xl shadow-sky-100 hover:bg-sky-500 hover:shadow-sky-200 transition-all active:scale-[0.98] mt-4 uppercase tracking-wider ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-slate-400 text-xs font-medium">
              Access restricted. <span className="text-sky-400 font-bold cursor-pointer hover:underline">Contact System Admin</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;