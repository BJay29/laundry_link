import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * LOADING SCREEN
 * Iisang loading style para sa lahat ng page.
 * - fullScreen (default): buong page ang sakop
 * - fullScreen={false}: para sa loob ng card/section
 */
const LoadingScreen = ({ message = 'Loading...', fullScreen = true }) => (
  <div
    className={`flex items-center justify-center ${
      fullScreen ? 'min-h-screen bg-slate-50' : 'py-16'
    }`}
  >
    <div className="flex flex-col items-center gap-3">
      <Loader2 size={28} className="animate-spin text-sky-500" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
        {message}
      </p>
    </div>
  </div>
);

export default LoadingScreen;
