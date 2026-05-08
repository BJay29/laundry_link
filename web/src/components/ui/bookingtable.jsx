import React from 'react';
import { CheckCircle2, Clock, User, HardDrive, PhilippinePeso, Activity, Loader2 } from 'lucide-react';
import { formatTime } from '../../utils/formatters';

/**
 * BookingTable Component
 * Displays the list of active laundry orders with real-time data.
 * Optimized to handle joined machine data from the FastAPI backend.
 */
const BookingTable = ({ bookings = [], onComplete }) => {
  
  /**
   * Enhanced helper function to format machine display.
   * Checks for both nested objects (from joinedload) and flattened numbers 
   * (from the Pydantic validator) to eliminate the "Waiting" label.
   */
  const renderMachineInfo = (booking) => {
    const parts = [];

    // 1. Check for Washer assignment (Nested object OR direct number)
    const washerNum = booking.washer?.machine_number || booking.washer_number;
    if (washerNum) {
      parts.push(`W${washerNum}`);
    }

    // 2. Check for Dryer assignment (Nested object OR direct number)
    const dryerNum = booking.dryer?.machine_number || booking.dryer_number;
    if (dryerNum) {
      parts.push(`D${dryerNum}`);
    }

    // Return the formatted string (e.g., "W1 & D2")
    if (parts.length > 0) {
      return (
        <span className="text-orange-600 font-black text-xs uppercase tracking-tighter">
          {parts.join(' & ')}
        </span>
      );
    }

    // 3. Handling Transition States
    // If IDs exist but numbers aren't resolved yet, show a syncing state
    if (booking.washer_id || booking.dryer_id) {
      return (
        <div className="flex items-center gap-1 text-blue-500 animate-pulse">
          <Loader2 size={12} className="animate-spin" />
          <span className="text-[10px] font-black uppercase">Assigning...</span>
        </div>
      );
    }

    // 4. Default Fallback
    return <span className="text-slate-300 font-bold text-[10px]">UNASSIGNED</span>;
  };

  return (
    <div className="w-full bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Time</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Service</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Weight</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Machine</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Price</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {bookings.length > 0 ? (
              bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-sky-50/20 transition-colors group">
                  
                  {/* Intake Time: Fallback to created_at if booking_timestamp is null */}
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-slate-600 font-bold text-sm whitespace-nowrap">
                      <Clock size={14} className="text-slate-300" />
                      {booking.booking_timestamp ? formatTime(booking.booking_timestamp) : formatTime(booking.created_at)}
                    </div>
                  </td>

                  {/* Customer Identity */}
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3 text-slate-900 font-black text-sm whitespace-nowrap">
                      <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 shadow-sm">
                        <User size={14} />
                      </div>
                      <span className="truncate max-w-[150px]">
                        {booking.customer_name || 'Walk-in Client'}
                      </span>
                    </div>
                  </td>

                  {/* Service Detail */}
                  <td className="px-8 py-6">
                    <span className="text-slate-600 font-semibold text-sm">
                      {booking.service_type}
                    </span>
                  </td>

                  {/* Weight Metric */}
                  <td className="px-8 py-6">
                    <span className="text-slate-500 font-bold text-sm">
                      {booking.weight} kg
                    </span>
                  </td>

                  {/* Machine Assignment: The critical fix for the WAITING label */}
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <HardDrive size={14} className="text-orange-400" />
                      {renderMachineInfo(booking)}
                    </div>
                  </td>

                  {/* Financial Detail: Displaying in PHP (Philippine Peso) */}
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-1 text-emerald-600 font-black text-sm">
                      <PhilippinePeso size={14} />
                      {parseFloat(booking.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </td>

                  {/* Live Status Badge */}
                  <td className="px-8 py-6">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full w-fit ${
                      ['Claimed', 'Ready'].includes(booking.status) ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600'
                    }`}>
                      <Activity size={12} className={!['Claimed', 'Cancelled', 'Ready'].includes(booking.status) ? "animate-pulse" : ""} />
                      <span className="text-[10px] font-black uppercase tracking-tight">
                        {booking.status || 'In Progress'}
                      </span>
                    </div>
                  </td>

                  {/* Transaction Actions */}
                  <td className="px-8 py-6">
                    <div className="flex justify-center">
                      <button 
                        onClick={() => onComplete(booking.id)}
                        disabled={['Claimed', 'Ready'].includes(booking.status)}
                        className={`p-2.5 rounded-xl transition-all active:scale-90 ${
                          ['Claimed', 'Ready'].includes(booking.status) 
                          ? 'bg-slate-50 text-slate-200 cursor-not-allowed' 
                          : 'bg-slate-50 text-slate-300 hover:bg-emerald-50 hover:text-emerald-500 shadow-sm'
                        }`}
                        title="Mark as Ready"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              /* Empty State UI */
              <tr>
                <td colSpan="8" className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-60">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                      <Clock size={32} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-500 font-black text-sm">No Active Cycles</p>
                      <p className="text-slate-400 text-xs">The terminal queue is currently empty.</p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BookingTable;