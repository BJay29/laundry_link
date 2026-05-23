import React, { useState, useEffect } from 'react';
import { 
  User, 
  Shield, 
  Store, 
  Save, 
  Key, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import apiService from '../services/APIservices';

/**
 * SETTINGS PAGE
 * Central hub for Account and Security management.
 * Features: Profile Update (Shop info) and Security (Password change).
 */
const Settings = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState('profile');
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form States
  const [profileForm, setProfileForm] = useState({
    shop_name: '',
    address: '',
    email: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

  // Load initial shop data
  useEffect(() => {
    const fetchShopData = async () => {
      try {
        setFetching(true);
        const shopId = localStorage.getItem('shop_id');
        // Fetching shop settings from API
        const data = await apiService.getSettings(shopId);
        
        // Populate profile form with data from localStorage as a fallback
        setProfileForm({
          shop_name: localStorage.getItem('shop_name') || '',
          address: localStorage.getItem('shop_address') || '',
          email: localStorage.getItem('user_email') || ''
        });
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setFetching(false);
      }
    };
    fetchShopData();
  }, []);

  // Show status feedback
  const showStatus = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  /**
   * HANDLER: PROFILE UPDATE
   * Sends updated shop information to the server and updates local storage.
   */
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const shopId = localStorage.getItem('shop_id');
      await apiService.updateShopProfile(shopId, profileForm);
      
      // Update LocalStorage to keep UI in sync
      localStorage.setItem('shop_name', profileForm.shop_name);
      localStorage.setItem('shop_address', profileForm.address);
      localStorage.setItem('user_email', profileForm.email);
      
      showStatus('success', 'Shop profile updated successfully!');
    } catch (err) {
      showStatus('error', err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * HANDLER: PASSWORD CHANGE
   * Verifies new passwords and sends a request to update user credentials.
   */
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      return showStatus('error', 'New passwords do not match!');
    }

    setLoading(true);
    try {
      const userId = localStorage.getItem('user_id');
      await apiService.updatePassword(userId, {
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password
      });
      
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
      showStatus('success', 'Password changed successfully!');
    } catch (err) {
      showStatus('error', err.response?.data?.detail || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
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
      
      {/* HEADER SECTION */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-slate-900 rounded-xl shadow-lg">
            <Store size={18} className="text-white" />
          </div>
          <h2 className="text-slate-900 font-black text-lg tracking-tight uppercase">Control Center</h2>
        </div>
        <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic uppercase">System Settings</h1>
      </div>

      {/* FEEDBACK ALERT */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="font-bold text-sm">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* SIDEBAR NAVIGATION (Tabs) */}
        <div className="lg:col-span-1 space-y-2">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black transition-all ${
              activeTab === 'profile' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 hover:bg-slate-100'
            }`}
          >
            <User size={20} /> PROFILE
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black transition-all ${
              activeTab === 'security' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 hover:bg-slate-100'
            }`}
          >
            <Shield size={20} /> SECURITY
          </button>
        </div>

        {/* MAIN SETTINGS CONTENT */}
        <div className="lg:col-span-3 bg-white p-10 rounded-[56px] border border-slate-100 shadow-sm">
          
          {activeTab === 'profile' ? (
            <div className="animate-in fade-in duration-500">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Store size={24} /></div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Shop Profile</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Public identity and contact information</p>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Shop Name</label>
                    <div className="relative">
                      <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="text"
                        value={profileForm.shop_name}
                        onChange={(e) => setProfileForm({...profileForm, shop_name: e.target.value})}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-slate-900 transition-all"
                        placeholder="LaundryLink Branch"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Contact Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-slate-900 transition-all"
                        placeholder="shop@example.com"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Business Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="text"
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({...profileForm, address: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-slate-900 transition-all"
                      placeholder="123 Street, Manila, Philippines"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex justify-end">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} SAVE CHANGES
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Shield size={24} /></div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Security Credentials</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Manage your access and system passwords</p>
                </div>
              </div>

              <form onSubmit={handlePasswordUpdate} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Current Password</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="password"
                      value={passwordForm.old_password}
                      onChange={(e) => setPasswordForm({...passwordForm, old_password: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-slate-900 transition-all"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">New Password</label>
                    <div className="relative">
                      <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="password"
                        value={passwordForm.new_password}
                        onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-slate-900 transition-all"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Confirm New Password</label>
                    <div className="relative">
                      <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="password"
                        value={passwordForm.confirm_password}
                        onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-slate-900 transition-all"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex justify-end">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Key size={18} />} UPDATE PASSWORD
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;