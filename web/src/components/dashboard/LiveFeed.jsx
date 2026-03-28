import React from 'react';
import { Bell, Inbox, Loader2 } from 'lucide-react';

const LiveFeed = ({ bookings = [] }) => {
  // Check kung empty ang bookings array
  const isEmpty = bookings.length === 0;

  return (
    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 h-full text-left flex flex-col transition-all hover:shadow-md">
      
      {/* Header Section */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-sky-50 text-sky-500 rounded-xl shadow-sm shadow-sky-50">
          <Bell size={20} />
        </div>
        <div>
          <h3 className="font-black text-slate-800 tracking-tight leading-none">Live Booking Feed</h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1.5">
            Real-time customer bookings
          </p>
        </div>
      </div>

      {/* Feed Content Area */}
      <div className="flex-1 space-y-4 mb-8">
        {!isEmpty ? (
          // Mapping if there is data
          bookings.map((b, i) => (
            <div 
              key={i} 
              className="flex justify-between items-center p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-sky-50 hover:border-sky-100 transition-all cursor-default group"
            >
              <div className="flex items-center gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-sky-400 group-hover:animate-pulse"></div>
                <div>
                  <p className="font-black text-sm text-slate-800 tracking-tight">{b.name}</p>
                  <p className="text-[10px] text-sky-500 font-bold uppercase tracking-widest mt-0.5">
                    {b.machine}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-black text-slate-700">{b.time}</p>
                <p className="text-[10px] text-slate-400 font-bold tracking-tight uppercase">
                  {b.status}
                </p>
              </div>
            </div>
          ))
        ) : (
          // Empty State Placeholder
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-200">
              <Inbox size={32} />
            </div>
            <h4 className="text-slate-800 font-bold">No Active Bookings</h4>
            <p className="text-[11px] text-slate-400 max-w-[180px] mt-1 font-medium leading-relaxed">
              Waiting for new transactions from the database...
            </p>
            <div className="flex items-center gap-2 mt-6 text-sky-400">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Listening</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-auto pt-4 border-t border-slate-50">
        <p className="text-[10px] text-slate-300 italic text-center font-bold tracking-tighter uppercase">
          Updates every 5 seconds • Real-time Sync Active
        </p>
      </div>
    </div>
  );
};

export default LiveFeed;