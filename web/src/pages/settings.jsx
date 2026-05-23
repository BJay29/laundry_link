import React, { useState, useEffect } from 'react';
import { 
  User, 
  Shield, 
  Store, 
  CheckCircle2, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import ProfileSettings from '../components/ui/profilesettings';
import SecuritySettings from '../components/ui/securitysettings';

/**
 * ACCOUNT SETTINGS PAGE
 * Central hub for Account and Security management.
 * Accessible via /account-settings route from the sidebar.
 * Features:
 * - Profile tab: update shop name, address, and email
 * - Security tab: change account password
 * - Shared status feedback toast for both tabs
 */
const Settings = () => {
  // Tab navigation state — 'profile' or 'security'
  const [activeTab, setActiveTab] = useState('profile');

  // Shared status message state used by both child components
  const [message, setMessage] = useState({ type: '', text: '' });

  // Initial profile data loaded from localStorage after login
  const [initialData, setInitialData] = useState({
    shop_name: '',
    address: '',
    email: ''
  });

  const [fetching, setFetching] = useState(true);

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

      {/* SHARED FEEDBACK ALERT — shown for both profile and security actions */}
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
        </div>

        {/* MAIN CONTENT PANEL */}
        <div className="lg:col-span-3 bg-white p-10 rounded-[56px] border border-slate-100 shadow-sm">
          
          {/* Tab header changes based on active tab */}
          {activeTab === 'profile' ? (
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
          ) : (
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
        </div>
      </div>
    </div>
  );
};

export default Settings;
