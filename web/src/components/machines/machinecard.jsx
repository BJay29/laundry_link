import React from 'react';
import { Waves, Wind, AlertCircle, Clock, TrendingUp, Zap } from 'lucide-react';

/**
 * MachineCard Component
 * Displays real-time telemetry from the Backend PredictionService.
 * UI focus: Hardware-specific cycle time, dynamic profitability bars, and lifetime net earnings.
 */
const MachineCard = ({ 
  machine_number, 
  machine_type, 
  status, 
  profitability_rate = 0, 
  net_profit_accumulated = 0, 
  total_cycles = 0, 
  remaining_time = 0, 
  current_service_type = "None",
  current_price = 0,
  onClick
}) => {
  
  // Logic helpers for UI styling based on machine category
  const isDryer = machine_type?.toLowerCase() === 'dryer';
  const isBusy = status?.toLowerCase() === 'busy';
  const isMaintenance = status?.toLowerCase() === 'maintenance';
  
  // Generates ID labels like W1 or D1 for better UX scannability
  const machineId = `${machine_type?.charAt(0).toUpperCase() || 'M'}${machine_number}`;

  // Formatting currency for the "Net Profit" footer
  const formattedNetProfit = Number(net_profit_accumulated).toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });

  return (
    <div 
      onClick={onClick}
      className={`p-6 rounded-[32px] border-2 transition-all duration-500 cursor-pointer group ${
        isMaintenance 
          ? 'border-rose-100 bg-rose-50/30' 
          : isBusy 
            ? 'border-sky-100 bg-white shadow-xl shadow-sky-500/10 scale-[1.02]' 
            : 'border-slate-50 bg-white hover:border-slate-200'
      }`}
    >
      
      {/* --- 1. HEADER: Machine Identity & Live Status Badge --- */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex gap-3">
          <div className={`p-3 rounded-2xl transition-all duration-300 ${
            isBusy ? 'bg-sky-500 text-white shadow-lg' : 
            isMaintenance ? 'bg-rose-500 text-white' : 'bg-slate-400 text-white'
          }`}>
            {isDryer ? <Wind size={20} /> : <Waves size={20} />}
          </div>
          <div>
            <h4 className="font-black text-slate-900 text-lg">{machineId}</h4>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{machine_type}</p>
          </div>
        </div>
        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
          isBusy ? 'bg-sky-100 text-sky-600 animate-pulse' : 
          isMaintenance ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'
        }`}>
          {status}
        </span>
      </div>

      {/* --- 2. HARDWARE TELEMETRY: Service Selection & Remaining Cycle Time --- */}
      <div className="min-h-[80px] mb-6">
        {isMaintenance ? (
          <div className="bg-rose-50 p-4 rounded-2xl flex items-center gap-3 text-rose-600 border border-rose-100">
            <AlertCircle size={20} />
            <span className="font-bold text-sm">Hardware Maintenance</span>
          </div>
        ) : isBusy ? (
          <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-100/50 flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-sky-600 text-[10px] font-black uppercase tracking-tighter">
                {current_service_type || "Standard Cycle"}
              </p>
              <div className="flex items-center gap-1.5 text-slate-900">
                <Clock size={12} className="text-sky-500" />
                {/* remaining_time now displays the hardware-specific runtime from PredictionService */}
                <p className="text-xl font-black">{remaining_time || 0} min</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-emerald-500 text-lg font-black italic">₱{current_price}</p>
            </div>
          </div>
        ) : (
          <div className="h-full py-6 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
            <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">Available for Cycle</p>
          </div>
        )}
      </div>

      {/* --- 3. PERFORMANCE ANALYTICS: Profit Margin Visualization --- */}
      <div className="space-y-4 pt-2">
        <div className="flex justify-between items-end">
          <div className="flex items-center gap-1">
            <TrendingUp size={12} className="text-slate-400" />
            <span className="text-slate-400 text-[11px] font-black uppercase tracking-tight">Profitability</span>
          </div>
          <span className="text-slate-900 text-sm font-black">
            {/* Displaying the backend-calculated rate */}
            {Math.round(profitability_rate)}%
          </span>
        </div>
        
        {/* Profitability Bar: Visualizes current revenue vs utility overhead */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ease-out rounded-full ${
              isMaintenance ? 'bg-rose-500' : 
              profitability_rate >= 70 ? 'bg-emerald-500' : 
              profitability_rate >= 40 ? 'bg-amber-500' : 'bg-rose-400'
            }`} 
            style={{ width: `${Math.min(profitability_rate, 100)}%` }}
          />
        </div>

        {/* --- FOOTER METRICS: Historical Usage & Lifetime Net Earnings --- */}
        <div className="flex justify-between text-[11px] font-black border-t border-slate-50 pt-3">
          <div className="flex flex-col">
             <span className="text-slate-300 text-[8px] uppercase">Usage History</span>
             <span className="text-slate-700">{total_cycles} Total Cycles</span>
          </div>
          <div className="flex flex-col text-right">
             <span className="text-slate-300 text-[8px] uppercase">Net Profit</span>
             <span className="text-emerald-600 font-black">
                ₱{formattedNetProfit}
             </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MachineCard;