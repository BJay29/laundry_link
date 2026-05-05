import React from 'react';
import { CheckCircle2, Clock, User, HardDrive, PhilippinePeso, Activity } from 'lucide-react';
import { formatTime } from '../../utils/formatters';

/**
 * BookingTable Component
 * Displays the list of active laundry orders with real-time data
 * from the backend, including specific machine assignments and timestamps.
 */
const BookingTable = ({ bookings, onComplete }) => {
  
  /**
   * UPDATED: Helper function to format the machine display.
   * Prioritizes the nested machine objects (washer/dryer) from the backend schema.
   * This ensures the UI displays human-readable numbers like "W1" instead of UUIDs.
   */
  const renderMachineInfo = (booking) => {
    const parts = [];

    // Check for nested washer object
    if (booking.washer?.machine_number) {
      parts.push(`W${booking.washer.machine_number}`);
    } else if (booking.washer_id && typeof booking.washer_id === 'string') {
      // Fallback for string IDs
      parts.push(`W${booking.washer_id.split('-').pop()}`);
    }

    // Check for nested dryer object
    if (booking.dryer?.machine_number) {
      parts.push(`D${booking.dryer.machine_number}`);
    } else if (booking.dryer_id && typeof booking.dryer_id === 'string') {
      // Fallback for string IDs
      parts.push(`D${booking.dryer_id.split('-').pop()}`);
    }
    
    return parts.length > 0 ? parts.join(' & ') : 'UNASSIGNED';
  };

  return (
    <div className="w-full bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
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
              <tr key={booking.id} className="hover:bg-slate-50/30 transition-colors group">
                {/* Accurate Time from Backend created_at field */}
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                    <Clock size={14} className="text-slate-300" />
                    {booking.created_at ? formatTime(booking.created_at) : '--:-- --'}
                  </div>
                </td>

                {/* Customer Name */}
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                    <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center text-sky-500">
                      <User size={14} />
                    </div>
                    {booking.customer_name}
                  </div>
                </td>

                {/* Service Type */}
                <td className="px-8 py-6">
                  <span className="text-slate-600 font-medium text-sm">
                    {booking.service_type}
                  </span>
                </td>

                {/* Weight */}
                <td className="px-8 py-6">
                  <span className="text-slate-500 font-bold text-sm">
                    {booking.weight} kg
                  </span>
                </td>

                {/* Dynamic Machine Display (e.g., W1 & D2) */}
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    <HardDrive size={14} className="text-orange-400" />
                    <span className="text-orange-500 font-black text-xs uppercase tracking-tighter">
                      {renderMachineInfo(booking)}
                    </span>
                  </div>
                </td>

                {/* Total Price with Peso Sign */}
                <td className="px-8 py-6">
                  <div className="flex items-center gap-1 text-emerald-600 font-black text-sm">
                    <PhilippinePeso size={14} />
                    {booking.total_price}
                  </div>
                </td>

                {/* Status Badge with pulse animation */}
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2 bg-sky-50 text-sky-600 px-3 py-1.5 rounded-full w-fit">
                    <Activity size={12} className="animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-tight">
                      {booking.status || 'In Progress'}
                    </span>
                  </div>
                </td>

                {/* Action Button to update status via onComplete prop */}
                <td className="px-8 py-6">
                  <div className="flex justify-center">
                    <button 
                      onClick={() => onComplete(booking.id)}
                      className="p-2.5 bg-slate-50 text-slate-300 rounded-xl hover:bg-emerald-50 hover:text-emerald-500 transition-all active:scale-90"
                      title="Complete Order"
                    >
                      <CheckCircle2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8" className="px-8 py-20 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                    <Clock size={32} />
                  </div>
                  <p className="text-slate-400 font-bold text-sm">No active bookings found.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default BookingTable;