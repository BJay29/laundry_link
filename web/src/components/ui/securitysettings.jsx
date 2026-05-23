import React, { useState } from 'react';
import { Key, Shield, Loader2 } from 'lucide-react';
import { updatePassword } from '../../services/APIservices';

const SecuritySettings = ({ onStatusUpdate }) => {
  const [formData, setFormData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Frontend validation
    if (formData.new_password !== formData.confirm_password) {
      onStatusUpdate('error', 'New passwords do not match!');
      return;
    }

    if (formData.new_password.length < 6) {
      onStatusUpdate('error', 'Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const userId = localStorage.getItem('user_id');
      await updatePassword(userId, {
        old_password: formData.old_password,
        new_password: formData.new_password
      });

      // Clear form on success
      setFormData({ old_password: '', new_password: '', confirm_password: '' });
      onStatusUpdate('success', 'Password updated successfully!');
    } catch (err) {
      onStatusUpdate('error', err.response?.data?.detail || 'Failed to update password. Check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
      {/* Current Password */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Current Password</label>
        <div className="relative">
          <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input 
            type="password"
            value={formData.old_password}
            onChange={(e) => setFormData({...formData, old_password: e.target.value})}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-slate-900 transition-all"
            placeholder="••••••••"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* New Password */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">New Password</label>
          <div className="relative">
            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="password"
              value={formData.new_password}
              onChange={(e) => setFormData({...formData, new_password: e.target.value})}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-slate-900 transition-all"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Confirm New Password</label>
          <div className="relative">
            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="password"
              value={formData.confirm_password}
              onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
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
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Key size={18} />} 
          UPDATE PASSWORD
        </button>
      </div>
    </form>
  );
};

export default SecuritySettings;