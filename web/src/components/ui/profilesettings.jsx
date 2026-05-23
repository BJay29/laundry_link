import React, { useState } from 'react';
import { Store, Mail, MapPin, Save, Loader2 } from 'lucide-react';
import { updateShopProfile } from '../../services/APIservices';

const ProfileSettings = ({ initialData, onStatusUpdate }) => {
  const [formData, setFormData] = useState({
    shop_name: initialData?.shop_name || '',
    address: initialData?.address || '',
    email: initialData?.email || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const shopId = localStorage.getItem('shop_id');
      await updateShopProfile(shopId, formData);
      
      // Update local storage to keep UI consistent
      localStorage.setItem('shop_name', formData.shop_name);
      localStorage.setItem('shop_address', formData.address);
      localStorage.setItem('user_email', formData.email);
      
      onStatusUpdate('success', 'Profile updated successfully!');
    } catch (err) {
      onStatusUpdate('error', err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shop Name */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Shop Name</label>
          <div className="relative">
            <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text"
              value={formData.shop_name}
              onChange={(e) => setFormData({...formData, shop_name: e.target.value})}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-slate-900 transition-all"
              placeholder="LaundryLink Branch"
              required
            />
          </div>
        </div>

        {/* Contact Email */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Contact Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-slate-900 transition-all"
              placeholder="shop@example.com"
              required
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Business Address</label>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input 
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-slate-900 transition-all"
            placeholder="123 Street, City, Philippines"
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
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} 
          SAVE CHANGES
        </button>
      </div>
    </form>
  );
};

export default ProfileSettings;