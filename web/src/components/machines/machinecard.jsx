import React from 'react';
import { Waves, Wind, AlertCircle } from 'lucide-react';

const MachineCard = ({ id, type, status, profitability, cycles, cost, timeRemaining, price }) => {
  const isDryer = type?.toLowerCase() === 'dryer';
  const isActive = status?.toLowerCase() === 'active';
  const isMaintenance = status?.toLowerCase() === 'maintenance';

  return (
    <div className={`p-6 rounded-[32px] border-2 transition-all duration-300 ${
      isMaintenance 
        ? 'border-red-100 bg-red-50/30 ring-1 ring-red-50' 
        : isActive 
          ? 'border-sky-100 bg-white shadow-xl shadow-sky-500/5' 
          : 'border-slate-50 bg-white shadow-sm'
    }`}>
      {/* 1. Header Section: Icon, ID, and Status Badge */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex gap-3">
          <div className={`p-3 rounded-2xl transition-colors ${
            isActive ? 'bg-sky-500 text-white' : 'bg-slate-500 text-white'
          }`}>
            {isDryer ? <Wind size={20} /> : <Waves size={20} />}
          </div>
          <div>
            <h4 className="font-black text-slate-900 text-lg leading-tight">{id}</h4>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{type}</p>
          </div>
        </div>
        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
          isActive ? 'bg-sky-100 text-sky-600' : 
          isMaintenance ? 'bg-red-500 text-white' : 'bg-slate-400 text-white'
        }`}>
          {status || 'Idle'}
        </span>
      </div>

      {/* 2. Middle Section: Conditional Alerts/Status (image_6aac9c.png style) */}
      <div className="min-h-[80px] mb-6">
        {isMaintenance ? (
          <div className="bg-red-100/60 p-4 rounded-2xl flex items-center gap-3 text-red-600 border border-red-100 animate-pulse">
            <AlertCircle size={20} />
            <span className="font-bold text-sm">Needs Service</span>
          </div>
        ) : isActive ? (
          <div className="bg-sky-50/50 p-4 rounded-2xl border border-sky-100/50 flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-sky-600 text-xs font-black uppercase tracking-tighter">Time Left</p>
              <p className="text-xl font-black text-slate-900">{timeRemaining || '0'} min</p>
            </div>
            <div className="text-right">
              <p className="text-emerald-500 text-lg font-black italic">₱{price || '0'}</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-50 rounded-2xl">
            <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">Ready for next cycle</p>
          </div>
        )}
      </div>

      {/* 3. Footer Section: Profitability and Stats (Directly from image_6aac9c.png) */}
      <div className="space-y-4 pt-2">
        <div className="flex justify-between items-end">
          <span className="text-slate-400 text-[11px] font-black uppercase tracking-tight">Profitability</span>
          <span className="text-slate-900 text-sm font-black">{profitability || '0'}%</span>
        </div>
        
        {/* Progress Bar with Dynamic Colors */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ease-out rounded-full ${
              isMaintenance ? 'bg-amber-500' : 
              (profitability > 90 ? 'bg-emerald-500' : 'bg-sky-500')
            }`} 
            style={{ width: `${profitability || 0}%` }}
          ></div>
        </div>

        <div className="flex justify-between text-[11px] font-black text-slate-400 border-t border-slate-50 pt-3">
          <span className="flex items-center gap-1">{cycles || '0'} cycles</span>
          <span className="flex items-center gap-1">₱{cost || '0'} cost</span>
        </div>
      </div>
    </div>
  );
};

export default MachineCard;