import React, { useState } from 'react';
import { Save, RefreshCcw, Info } from 'lucide-react';

const OptimizationSettings = () => {
  // State for all settings
  const [settings, setSettings] = useState({
    washPrice: 40,
    dryPrice: 30,
    fullPrice: 60,
    detergentCost: 15,
    electricityCost: 25,
    waterCost: 12,
    offPeakDiscount: 10,
    offPeakHours: "8:00 AM - 11:00 AM"
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Optimization Settings</h1>
          <p className="text-slate-500 font-medium mt-1">Configure pricing and service parameters for maximum efficiency.</p>
        </div>
        <button className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-sky-500/30 transition-all active:scale-95">
          <Save size={20} />
          Save Changes
        </button>
      </div>

      <div className="space-y-6 max-w-6xl">
        
        {/* Section 1: Service Pricing */}
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
            Service Pricing
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">₱ Wash Only (per kg)</label>
              <input 
                type="number" name="washPrice" value={settings.washPrice} onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">₱ Dry Only (per kg)</label>
              <input 
                type="number" name="dryPrice" value={settings.dryPrice} onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">₱ Full Service (per kg)</label>
              <input 
                type="number" name="fullPrice" value={settings.fullPrice} onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Operating Costs (The "Brain" of your Income Optimizer) */}
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg" title="Required for Profit Calculation">
              <Info size={18} />
            </div>
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-2">Operating Costs</h3>
          <p className="text-sm text-slate-400 mb-6 font-medium text-balance">Estimated expenses per cycle to calculate true profitability.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Detergent Cost (per cycle)</label>
              <input 
                type="number" name="detergentCost" value={settings.detergentCost} onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Electricity Cost (per cycle)</label>
              <input 
                type="number" name="electricityCost" value={settings.electricityCost} onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Water Cost (per cycle)</label>
              <input 
                type="number" name="waterCost" value={settings.waterCost} onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Discount Settings */}
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-6">Discount Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">% Off-Peak Discount (%)</label>
              <input 
                type="number" name="offPeakDiscount" value={settings.offPeakDiscount} onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sky-600 focus:ring-2 focus:ring-sky-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">🕒 Off-Peak Hours</label>
              <input 
                type="text" name="offPeakHours" value={settings.offPeakHours} onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                placeholder="e.g. 8:00 AM - 11:00 AM"
              />
            </div>
          </div>
        </div>

        {/* Bottom Action Section */}
        <div className="pt-4 flex items-center justify-between">
          <p className="text-xs text-slate-400 font-medium italic">
            * Changes here will reflect immediately on the Financial Forecast predictions.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors"
          >
            <RefreshCcw size={16} />
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

export default OptimizationSettings;