import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { LogOut, Loader2 } from 'lucide-react';
import apiService from '../../services/APIservices';

/**
 * LOGOUT MODAL (simple confirmation)
 *
 * Reusable — ginagamit ng staff Sidebar at ng Rider page. Kapag
 * kinumpirma, tinatawag ang apiService.logout() (nagsa-sign out sa
 * Supabase, nag-cl-clear ng cached data, at dinadala sa /login).
 *
 * NOTE: nire-render gamit ang portal papunta sa document.body, dahil ang
 * sidebar wrapper ay may CSS `transform` (see layout.jsx) na magiging dahilan
 * para hindi sumakop sa buong screen ang `fixed` na modal kung nasa loob nito.
 *
 * Props: isOpen (bool), onClose ()
 */
const LogoutModal = ({ isOpen, onClose }) => {
  const [loggingOut, setLoggingOut] = useState(false);

  if (!isOpen) return null;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await apiService.logout();
    } catch {
      // Kahit mag-error ang signOut, i-clear pa rin at ibalik sa login.
      localStorage.clear();
      window.location.href = '/login';
    }
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4"
      onClick={loggingOut ? undefined : onClose}
    >
      <div
        className="bg-white w-full max-w-sm rounded-[28px] shadow-2xl border border-white/20 p-7 text-center"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
          <LogOut size={26} />
        </div>
        <h3 className="text-xl font-black text-slate-900 tracking-tight mt-4">Log out?</h3>
        <p className="text-sm font-bold text-slate-400 mt-1.5">You'll need to sign in again to continue.</p>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loggingOut}
            className="flex-1 py-3 rounded-2xl border-2 border-slate-100 text-slate-500 font-black text-sm hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex-1 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-sm shadow-lg shadow-rose-100 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loggingOut ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Logging out...
              </>
            ) : (
              'Log out'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LogoutModal;