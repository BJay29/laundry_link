import React from 'react';
import { Activity } from 'lucide-react';

const MachineCapacity = () => {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 flex flex-col h-full text-left">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-sky-50 text-sky-500 rounded-lg"><Activity size={20} /></div>
        <div>
          <h3 className="font-bold text-slate-800">Machine Capacity</h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Digital capacity tracking</p>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-end mb-3">
          <p className="text-3xl font-black text-[#0ea5e9]">4 <span className="text-xs text-slate-400 font-bold">Available</span></p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">12 Total</p>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className="w-[33%] bg-[#0ea5e9] h-full"></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
          <p className="text-[9px] font-bold text-slate-400 uppercase">Active</p>
          <p className="text-2xl font-black text-slate-800">5</p>
        </div>
        <div className="p-4 bg-[#fffbeb] rounded-2xl border border-yellow-100 text-center">
          <p className="text-[9px] font-bold text-slate-500 uppercase">Busy</p>
          <p className="text-2xl font-black text-slate-800">3</p>
        </div>
        <div className="p-4 bg-[#f0fdf4] rounded-2xl border border-emerald-100 text-center">
          <p className="text-[9px] font-bold text-slate-500 uppercase">Free</p>
          <p className="text-2xl font-black text-slate-800">4</p>
        </div>
      </div>

      <div className="mt-auto bg-[#0ea5e9] p-5 rounded-2xl text-white flex justify-between items-center">
        <div>
          <p className="text-[10px] font-bold opacity-80 uppercase mb-1">Status</p>
          <p className="font-black text-lg">Moderate</p>
        </div>
        <Activity size={24} />
      </div>
    </div>
  );
};

export default MachineCapacity;