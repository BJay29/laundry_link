import React from 'react';
import { Bell } from 'lucide-react';

const LiveFeed = ({ bookings }) => {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 h-full text-left">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-sky-50 text-sky-500 rounded-lg"><Bell size={20} /></div>
        <div>
          <h3 className="font-bold text-slate-800">Live Booking Feed</h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Real-time customer bookings</p>
        </div>
      </div>

      <div className="space-y-4 mb-10">
        {bookings.map((b, i) => (
          <div key={i} className="flex justify-between items-center p-5 bg-sky-50/40 rounded-2xl border border-sky-100/50 hover:bg-sky-50 transition-all cursor-default">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-sky-400"></div>
              <div>
                <p className="font-bold text-sm text-slate-800">{b.name}</p>
                <p className="text-[11px] text-sky-500 font-bold uppercase tracking-wide">{b.machine}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-black text-slate-700">{b.time}</p>
              <p className="text-[9px] text-slate-400 font-bold tracking-tight">{b.status}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-300 italic text-center font-medium">Updates every 5 seconds</p>
    </div>
  );
};

export default LiveFeed;