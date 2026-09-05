import React, { useState, useEffect } from 'react';
import { 
  User, 
  Shield, 
  Store, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  UserPlus,
  Eye,
  EyeOff,
  ShieldCheck,
  Users
} from 'lucide-react';
import ProfileSettings from '../components/ui/profilesettings';
import SecuritySettings from '../components/ui/securitysettings';
import { apiService } from '../services/APIservices';

/**
 * ACCOUNT SETTINGS PAGE
 * Central hub for Account, Security, and Staff management.
 * Accessible via /account-settings route from the sidebar.
 * Features:
 * - Profile tab: update shop name, address, and email
 * - Security tab: change account password
 * - Staff Management tab (NEW, Owner-only): create staff/manager accounts
 *   under the same shop via POST /auth/register/staff
 * - Shared status feedback toast for all tabs
 */
const Settings = () => {
  // Tab navigation state — 'profile', 'security', or 'staff'
  const [activeTab, setActiveTab] = useState('profile');

  // Shared status message state used by all child components
  const [message, setMessage] = useState({ type: '', text: '' });

  // Initial profile data loaded from localStorage after login
  const [initialData, setInitialData] = useState({
    shop_name: '',
    address: '',
    email: ''
  });

  const [fetching, setFetching] = useState(true);

  const role = apiService.getRole();
  const isOwner = role === 'owner';

  /**
   * Load profile data from localStorage on mount.
   * localStorage is populated during login so no extra API call is needed here.
   */
  useEffect(() => {
    setInitialData({
      shop_name: localStorage.getItem('shop_name') || '',
      address: localStorage.getItem('shop_address') || '',
      email: localStorage.getItem('user_email') || ''
    });
    setFetching(false);
  }, []);

  /**
   * Show a status feedback message for 5 seconds then auto-dismiss.
   * Passed down to child components as a callback.
   */
  const showStatus = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  if (fetching) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-sky-500" size={48} />
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      
      {/* PAGE HEADER */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-slate-900 rounded-xl shadow-lg">
            <Store size={18} className="text-white" />
          </div>
          <h2 className="text-slate-900 font-black text-lg tracking-tight uppercase">Account Management</h2>
        </div>
        <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic uppercase">Account Settings</h1>
      </div>

      {/* SHARED FEEDBACK ALERT — shown for profile, security, and staff actions */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
            : 'bg-rose-50 text-rose-700 border border-rose-100'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="font-bold text-sm">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* SIDEBAR TAB NAVIGATION */}
        <div className="lg:col-span-1 space-y-2">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black transition-all ${
              activeTab === 'profile' 
                ? 'bg-slate-900 text-white shadow-xl' 
                : 'bg-white text-slate-400 hover:bg-slate-100'
            }`}
          >
            <User size={20} /> PROFILE
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black transition-all ${
              activeTab === 'security' 
                ? 'bg-slate-900 text-white shadow-xl' 
                : 'bg-white text-slate-400 hover:bg-slate-100'
            }`}
          >
            <Shield size={20} /> SECURITY
          </button>

          {/* NEW — Staff Management tab, Owner-only. Staff/Manager accounts
              never see this tab at all, matching the backend's
              require_role("owner") on POST /auth/register/staff. */}
          {isOwner && (
            <button 
              onClick={() => setActiveTab('staff')}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black transition-all ${
                activeTab === 'staff' 
                  ? 'bg-slate-900 text-white shadow-xl' 
                  : 'bg-white text-slate-400 hover:bg-slate-100'
              }`}
            >
              <Users size={20} /> STAFF
            </button>
          )}
        </div>

        {/* MAIN CONTENT PANEL */}
        <div className="lg:col-span-3 bg-white p-10 rounded-[56px] border border-slate-100 shadow-sm">
          
          {/* Tab header changes based on active tab */}
          {activeTab === 'profile' && (
            <>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <Store size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Shop Profile</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                    Public identity and contact information
                  </p>
                </div>
              </div>
              {/* Profile form component — receives initial data and shared status callback */}
              <ProfileSettings initialData={initialData} onStatusUpdate={showStatus} />
            </>
          )}

          {activeTab === 'security' && (
            <>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Security Credentials</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                    Manage your access and system passwords
                  </p>
                </div>
              </div>
              {/* Security form component — receives shared status callback */}
              <SecuritySettings onStatusUpdate={showStatus} />
            </>
          )}

          {activeTab === 'staff' && isOwner && (
            <>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Staff Management</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                    Create login accounts for your staff and managers
                  </p>
                </div>
              </div>
              <StaffManagement onStatusUpdate={showStatus} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * STAFF MANAGEMENT (NEW)
 *
 * Form for an Owner to create individual login accounts for staff and
 * managers under their own shop, via apiService.registerStaff() →
 * POST /auth/register/staff (Owner-only, enforced by the backend).
 *
 * Each created account logs in through the SAME /auth/login page as
 * everyone else — there is no separate staff login flow. This is what
 * makes the Activity Log meaningful: actions get attributed to the real
 * person who performed them instead of a shared account.
 */
function StaffManagement({ onStatusUpdate }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'staff'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdStaff, setCreatedStaff] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      onStatusUpdate('error', 'Full name is required.');
      return;
    }
    if (!formData.email.trim()) {
      onStatusUpdate('error', 'Email is required.');
      return;
    }
    if (formData.password.length < 6) {
      onStatusUpdate('error', 'Password must be at least 6 characters.');
      return;
    }

    try {
      setSubmitting(true);
      const created = await apiService.registerStaff(formData);

      setCreatedStaff(prev => [created, ...prev]);
      onStatusUpdate('success', `Account created for ${formData.full_name}. They can now log in using this email and password.`);

      setFormData({ full_name: '', email: '', password: '', role: 'staff' });
    } catch (error) {
      const detail = error.response?.data?.detail || error.message || 'Failed to create staff account.';
      onStatusUpdate('error', typeof detail === 'string' ? detail : 'Failed to create staff account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">

      {/* CREATE STAFF FORM */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Full Name</label>
            <input
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Juan Dela Cruz"
              className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-4 ring-sky-50 focus:border-sky-200 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none cursor-pointer focus:border-sky-200"
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Email Address</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="staff@example.com"
            className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-4 ring-sky-50 focus:border-sky-200 outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Temporary Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
              className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl px-6 py-4 pr-14 font-bold text-slate-700 focus:ring-4 ring-sky-50 focus:border-sky-200 outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-300 hover:text-sky-500 transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 font-medium ml-2">
            Share this password with the staff member directly. They can log in right away using this email and password.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto bg-sky-600 hover:bg-sky-500 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-sky-100 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} strokeWidth={3} />}
          {submitting ? 'Creating Account...' : 'Create Staff Account'}
        </button>
      </form>

      {/* RECENTLY CREATED (this session only — not a full roster view) */}
      {createdStaff.length > 0 && (
        <div className="pt-8 border-t border-slate-100">
          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">
            Created This Session
          </h4>
          <div className="space-y-3">
            {createdStaff.map((staff) => (
              <div key={staff.id} className="flex items-center gap-4 px-6 py-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ShieldCheck size={18} />
                </div>
                <div className="flex-1">
                  <p className="font-black text-sm text-slate-800">{staff.full_name || staff.email}</p>
                  <p className="text-xs text-slate-400 font-medium">{staff.email}</p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-tight px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-500">
                  {staff.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;