import React from 'react';
import { Activity, Zap } from 'lucide-react';

const MachineCapacity = ({ total = 0, active = 0, busy = 0, free = 0 }) => {
  // Logic para sa progress bar percentage
  const percentage = total > 0 ? (free / total) * 100 : 0;
  
  // Dynamic status text base sa availability
  const getStatus = () => {
    if (total === 0) return "Disconnected";
    if (free === 0) return "Full Capacity";
    if (free > (total / 2)) return "Optimized";
    return "Moderate";
  };

  return (
    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col h-full text-left transition-all hover:shadow-md">
      {/* Isang Header lang dapat ang nandito */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-sky-50 text-sky-500 rounded-xl shadow-sm shadow-sky-50">
          <Activity size={20} />
        </div>
        <div>
          <h3 className="font-black text-slate-800 tracking-tight leading-none">Machine Capacity</h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1.5">
            Digital capacity tracking
          </p>
        </div>
      </div>

      {/* Progress Section */}
      <div className="mb-8">
        <div className="flex justify-between items-end mb-3">
          <div>
            <p className="text-4xl font-black text-sky-500 tracking-tighter leading-none">
              {free} <span className="text-xs text-slate-400 font-bold uppercase tracking-widest ml-1">Available</span>
            </p>
          </div>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
            {total} Total Units
          </p>
        </div>
        <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <div 
            className="bg-sky-500 h-full transition-all duration-1000 ease-out shadow-lg shadow-sky-100"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>

      {/* Grid Stats Section */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center transition-colors hover:bg-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Active</p>
          <p className="text-2xl font-black text-slate-800 leading-none">{active}</p>
        </div>
        <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 text-center transition-colors hover:bg-amber-100/50">
          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1 font-bold">Accepted</p>
          <p className="text-2xl font-black text-slate-800 leading-none">{busy}</p>
        </div>
        <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-center transition-colors hover:bg-emerald-100/50">
          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 font-bold">Free</p>
          <p className="text-2xl font-black text-slate-800 leading-none">{free}</p>
        </div>
      </div>

      {/* Bottom Status Card - Ginamit ang mt-auto para laging nasa baba */}
      <div className={`${total > 0 ? 'bg-sky-500' : 'bg-slate-400'} mt-auto p-5 rounded-[1.5rem] text-white flex justify-between items-center shadow-lg shadow-sky-100 transition-all duration-500`}>
        <div>
          <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mb-1">Operational Status</p>
          <p className="font-black text-xl tracking-tight">{getStatus()}</p>
        </div>
        <Zap size={24} className={total > 0 ? "animate-pulse" : ""} />
      </div>
    </div>
  );
};

export default MachineCapacity;