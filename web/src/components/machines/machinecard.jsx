import React from 'react';
import { Waves, Wind, AlertCircle, Clock, TrendingUp } from 'lucide-react';

/**
 * MachineCard Component
 *
 * UPDATED (reverted to per-service durations): ang cycle countdown ay
 * hindi na ibinabase sa tinanggal nang `configured_duration_minutes`
 * (per-machine). Ngayon, ang PARENT na ang naghahanap ng tamang
 * duration mula sa ServiceType ng kasalukuyang cycle
 * (washer_duration_minutes o dryer_duration_minutes, depende sa
 * machine_type), at ipinapasa ito dito bilang `service_duration_minutes`.
 * Kung wala ito (hal. hindi nahanap ang service record), babalik ito sa
 * static `remaining_time` display bilang fallback.
 */
const MachineCard = ({ 
  machine_number, 
  machine_type, 
  status, 
  profitability_rate = 0, 
  net_profit_accumulated = 0, 
  total_cycles = 0, 
  remaining_time = 0, 
  service_duration_minutes,
  cycle_started_at,
  now,
  current_service_type = "None",
  current_price = 0,
  onClick
}) => {
  
  const isDryer = machine_type?.toLowerCase() === 'dryer';
  const isBusy = status?.toLowerCase() === 'busy';
  const isMaintenance = status?.toLowerCase() === 'maintenance';
  
  const machineId = `${machine_type?.charAt(0).toUpperCase() || 'M'}${machine_number}`;

  const formattedNetProfit = Number(net_profit_accumulated).toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });

  /**
   * UPDATED — kino-compute ang live countdown gamit ang
   * service_duration_minutes (galing sa ServiceType, resolved na ng
   * parent) at cycle_started_at. Walang hardcoded na 45 dito — kung
   * walang duration na naipasa, fallback na lang sa static
   * remaining_time galing sa backend.
   */
  const getLiveDisplay = () => {
    if (isBusy && service_duration_minutes && cycle_started_at && now) {
      const totalSeconds = service_duration_minutes * 60;
      const startedAt = new Date(cycle_started_at);
      const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
      const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      return {
        text: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
        isLive: true,
        isEndingSoon: remainingSeconds <= 60,
      };
    }
    return {
      text: `${remaining_time || 0} min`,
      isLive: false,
      isEndingSoon: false,
    };
  };

  const liveDisplay = getLiveDisplay();

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
      
      {/* --- 1. HEADER --- */}
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

      {/* --- 2. TELEMETRY --- */}
      <div className="min-h-[80px] mb-6">
        {isMaintenance ? (
          <div className="bg-rose-50 p-4 rounded-2xl flex items-center gap-3 text-rose-600 border border-rose-100">
            <AlertCircle size={20} />
            <span className="font-bold text-sm">Hardware Maintenance</span>
          </div>
        ) : isBusy ? (
          <div className={`p-4 rounded-2xl border flex justify-between items-center ${
            liveDisplay.isLive && liveDisplay.isEndingSoon
              ? 'bg-rose-50/50 border-rose-100/50'
              : 'bg-sky-50/50 border-sky-100/50'
          }`}>
            <div className="space-y-1">
              <p className={`text-[10px] font-black uppercase tracking-tighter ${
                liveDisplay.isLive && liveDisplay.isEndingSoon ? 'text-rose-600' : 'text-sky-600'
              }`}>
                {current_service_type || "Standard Cycle"}
              </p>
              <div className={`flex items-center gap-1.5 ${
                liveDisplay.isLive && liveDisplay.isEndingSoon ? 'text-rose-700' : 'text-slate-900'
              }`}>
                <Clock size={12} className={liveDisplay.isLive && liveDisplay.isEndingSoon ? 'text-rose-500' : 'text-sky-500'} />
                <p className="text-xl font-black tabular-nums">{liveDisplay.text}</p>
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

      {/* --- 3. PERFORMANCE --- */}
      <div className="space-y-4 pt-2">
        <div className="flex justify-between items-end">
          <div className="flex items-center gap-1">
            <TrendingUp size={12} className="text-slate-400" />
            <span className="text-slate-400 text-[11px] font-black uppercase tracking-tight">Profitability</span>
          </div>
          <span className="text-slate-900 text-sm font-black">
            {Math.round(profitability_rate)}%
          </span>
        </div>
        
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