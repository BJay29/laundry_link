import React from 'react';
import { LogOut, X } from 'lucide-react';

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-slate-100 transform transition-all scale-100 text-left">
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-start">
          <div className="p-3 bg-red-50 text-red-500 rounded-2xl mb-6">
            <LogOut size={28} />
          </div>

          <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">
            Confirm Logout
          </h3>
          <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
            Are you sure you want to log out of LaundryLink?
          </p>

          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-100 hover:bg-red-600 transition-all active:scale-95"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;