import React, { useState } from 'react';
import { Key, Shield, Loader2, CheckCircle2, Circle } from 'lucide-react';
import { updatePassword } from '../../services/APIservices';
import { PASSWORD_MAX, getPasswordChecks, validatePassword } from '../../utils/passwordrules';

/**
 * UPDATED: 8–12 character rule (shared sa utils/passwordrules.js),
 * live checklist, at FIXED ang tawag sa updatePassword — dati
 * updatePassword(userId, {...}) pero isang object lang ang tinatanggap
 * ng function, kaya undefined ang old/new password na napapasa.
 */
const SecuritySettings = ({ onStatusUpdate }) => {
  const [formData, setFormData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);

  const checks = getPasswordChecks(formData.new_password);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const passwordError = validatePassword(formData.new_password);
    if (passwordError) {
      onStatusUpdate('error', passwordError);
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      onStatusUpdate('error', 'New passwords do not match!');
      return;
    }

    if (formData.new_password === formData.old_password) {
      onStatusUpdate('error', 'New password must be different from your current password.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword({
        old_password: formData.old_password,
        new_password: formData.new_password
      });

      setFormData({ old_password: '', new_password: '', confirm_password: '' });
      onStatusUpdate('success', 'Password updated successfully!');
    } catch (err) {
      onStatusUpdate(
        'error',
        err.response?.data?.detail || err.message || 'Failed to update password. Check your current password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
      {/* Current Password (walang length limit, para sa lumang password) */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Current Password</label>
        <div className="relative">
          <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input
            type="password"
            value={formData.old_password}
            onChange={(e) => setFormData({ ...formData, old_password: e.target.value })}
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
              maxLength={PASSWORD_MAX}
              value={formData.new_password}
              onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-slate-900 transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <ul className="ml-2 space-y-1">
            {checks.map((c) => {
              const color = formData.new_password.length === 0
                ? 'text-slate-400'
                : c.ok ? 'text-emerald-600' : 'text-rose-500';
              return (
                <li key={c.id} className={`flex items-center gap-1.5 text-xs font-bold ${color}`}>
                  {c.ok ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                  {c.label}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Confirm New Password</label>
          <div className="relative">
            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input
              type="password"
              maxLength={PASSWORD_MAX}
              value={formData.confirm_password}
              onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-slate-900 transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          {formData.confirm_password.length > 0 && formData.new_password !== formData.confirm_password && (
            <p className="ml-2 text-xs font-bold text-rose-500">Passwords do not match.</p>
          )}
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