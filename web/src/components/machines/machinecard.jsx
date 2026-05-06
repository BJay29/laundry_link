import React from 'react';
import { Waves, Wind, AlertCircle, Clock, TrendingUp } from 'lucide-react';

/**
 * MachineCard Component
 * Displays real-time telemetry and predictive metrics for individual hardware units.
 * Now aligned with the backend's persistent metrics and cost hierarchy.
 */
const MachineCard = ({ 
  machine_number, 
  machine_type, 
  status, 
  profitability_score = 0, 
  total_cycles = 0, 
  maintenance_cost = 0, // Used here as Total Revenue/Overhead context
  time_remaining = 0, 
  current_price = 0,
  onClick
}) => {
  // Identify hardware category for icon mapping
  const isDryer = machine_type?.toLowerCase() === 'dryer';
  
  // Normalize status strings from the FastAPI backend
  const isBusy = status?.toLowerCase() === 'busy' || status?.toLowerCase() === 'active' || status?.toLowerCase() === 'processing';
  const isMaintenance = status?.toLowerCase() === 'maintenance';
  const isAvailable = status?.toLowerCase() === 'available' || status?.toLowerCase() === 'idle';

  // Format hardware identifier (e.g., W1 for Washer 1, D6 for Dryer 6)
  const machineId = `${machine_type === 'Washer' ? 'W' : 'D'}${machine_number}`;    

  return (
    <div 
      onClick={onClick}
      className={`p-6 rounded-[32px] border-2 transition-all duration-500 cursor-pointer group ${
      isMaintenance 
        ? 'border-rose-100 bg-rose-50/30 ring-1 ring-rose-50' 
        : isBusy 
          ? 'border-sky-100 bg-white shadow-xl shadow-sky-500/10 scale-[1.02]' 
          : 'border-slate-50 bg-white shadow-sm hover:shadow-md hover:border-slate-200'
    }`}>
      
      {/* 1. HEADER: Machine Identity and Live Status */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex gap-3">
          <div className={`p-3 rounded-2xl transition-all duration-500 ${
            isBusy ? 'bg-sky-500 text-white shadow-lg shadow-sky-200' : 
            isMaintenance ? 'bg-rose-500 text-white' : 'bg-slate-400 text-white'
          }`}>
            {isDryer ? <Wind size={20} /> : <Waves size={20} />}
          </div>
          <div>
            <h4 className="font-black text-slate-900 text-lg leading-tight">{machineId}</h4>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{machine_type}</p>
          </div>
        </div>
        
        {/* Status Badge with semantic coloring */}
        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${
          isBusy ? 'bg-sky-100 text-sky-600' : 
          isMaintenance ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'
        }`}>
          {status || 'Idle'}
        </span>
      </div>

      {/* 2. OPERATIONAL CONTEXT: Timer, Price, or Maintenance Alerts */}
      <div className="min-h-[80px] mb-6">
        {isMaintenance ? (
          <div className="bg-rose-50 p-4 rounded-2xl flex items-center gap-3 text-rose-600 border border-rose-100 animate-pulse">
            <AlertCircle size={20} />
            <span className="font-bold text-sm">Under Maintenance</span>
          </div>
        ) : isBusy ? (
          <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-100/50 flex justify-between items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-sky-500" />
                <p className="text-sky-600 text-[10px] font-black uppercase tracking-tighter">Time Remaining</p>
              </div>
              <p className="text-xl font-black text-slate-900">{time_remaining} min</p>
            </div>
            <div className="text-right">
              <p className="text-emerald-500 text-lg font-black italic">₱{current_price}</p>
            </div>
          </div>
        ) : (
          <div className="h-full py-6 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl group-hover:border-sky-100 transition-colors">
            <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest group-hover:text-sky-400 transition-colors">
              {isAvailable ? 'Standby / Ready' : 'Unit Offline'}
            </p>
          </div>
        )}
      </div>

      {/* 3. PERFORMANCE ANALYTICS: Profitability and Lifetime Metrics */}
      <div className="space-y-4 pt-2">
        <div className="flex justify-between items-end">
          <div className="flex items-center gap-1">
            <TrendingUp size={12} className="text-slate-400" />
            <span className="text-slate-400 text-[11px] font-black uppercase tracking-tight">Performance Index</span>
          </div>
          <span className="text-slate-900 text-sm font-black">{profitability_score}%</span>
        </div>
        
        {/* Predictive Progress Bar: Reflects the profitability score calculated by the backend */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative">
          <div 
            className={`h-full transition-all duration-1000 ease-out rounded-full relative z-10 ${
              isMaintenance ? 'bg-rose-500' : 
              (profitability_score > 80 ? 'bg-emerald-500' : 'bg-sky-500')
            }`} 
            style={{ width: `${profitability_score}%` }}
          >
            {isBusy && (
              <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] skew-x-[-20deg]"></div>
            )}
          </div>
        </div>

        {/* Node Telemetry Footer: Displays cycle counts and total tracked revenue/costs */}
        <div className="flex justify-between text-[11px] font-black text-slate-400 border-t border-slate-50 pt-3">
          <div className="flex flex-col">
             <span className="text-slate-300 text-[8px] uppercase tracking-tighter">Utilization</span>
             <span className="text-slate-700">{total_cycles} Total Cycles</span>
          </div>
          <div className="flex flex-col text-right">
             <span className="text-slate-300 text-[8px] uppercase tracking-tighter">Accrued Revenue</span>
             <span className="text-slate-900 font-black">₱{maintenance_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Dynamic CSS for Shimmer effect on active progress bars */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-150%) skewX(-20deg); }
          100% { transform: translateX(150%) skewX(-20deg); }
        }
      `}</style>
    </div>
  );
};

export default MachineCard;