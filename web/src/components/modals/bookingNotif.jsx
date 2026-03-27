import React from 'react';
import { X, Info, Bell } from 'lucide-react';

const BookingNotif = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop - Click outside to close */}
      <div 
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] transition-opacity" 
        onClick={onClose}
      />
      
      <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full">
        <div className="pointer-events-auto w-screen max-w-sm transform transition duration-500 ease-in-out">
          <div className="flex h-full flex-col bg-[#f8fafc] shadow-2xl border-l border-slate-200">
            
            {/* --- HEADER (Blue Style based on Figma) --- */}
            <div className="bg-[#7dd3fc] p-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Booking Notifications</h2>
                <button 
                  onClick={onClose}
                  className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white transition-all"
                >
                  <X size={20} strokeWidth={3} />
                </button>
              </div>
              <p className="text-[11px] font-bold text-white/90 uppercase tracking-wider">
                0 pending requests awaiting approval
              </p>
            </div>

            {/* --- CONTENT AREA --- */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 bg-sky-100 text-sky-500 rounded-md">
                  <Bell size={16} fill="currentColor" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Pending Requests</h3>
              </div>

              {/* --- EMPTY STATE (Styled) --- */}
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-6">
                  <Info className="text-slate-300" size={32} />
                </div>
                <h4 className="text-base font-bold text-slate-700 mb-1">No pending requests</h4>
                <p className="text-[12px] text-slate-400 leading-relaxed max-w-[200px]">
            
                </p>
              </div>
            </div>

            {/* --- FOOTER ACTION --- */}
            <div className="p-6 border-t border-slate-100 bg-white">
              <button 
                onClick={onClose}
                className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-900 transition-all active:scale-[0.98] shadow-lg shadow-slate-200"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingNotif;