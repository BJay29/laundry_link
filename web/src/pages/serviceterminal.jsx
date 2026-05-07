import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, RefreshCw, Package, Clock, CheckCircle, PlayCircle, Archive, HardDrive } from 'lucide-react';
import apiService from '../services/APIservices';
import BookingModal from '../components/modals/bookingmodal';
import { formatTime, formatCurrency } from '../utils/formatters';

/**
 * SERVICE TERMINAL COMPONENT
 * Main operational interface for managing live laundry transactions.
 * Acts as the control center for order lifecycles and machine occupancy.
 */
const ServiceTerminal = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  /**
   * DATA SYNCHRONIZATION
   * Fetches only active transactions (Pending, In Progress, Ready).
   * 'Claimed' orders are archived and removed from this view to keep the queue clean.
   */
  const loadBookings = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      
      const data = await apiService.getActiveBookings();
      setBookings(data || []);
    } catch (err) {
      console.error('Terminal Sync Error:', err.message);
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /**
   * POLLING LIFECYCLE
   * Establishes a 30-second heartbeat to ensure staff members see 
   * real-time updates across different workstations.
   */
  useEffect(() => {
    loadBookings();
    const interval = setInterval(() => loadBookings(true), 30000);
    return () => clearInterval(interval);
  }, [loadBookings]);

  /**
   * TRANSACTION LIFECYCLE HANDLER
   * Transitions: Pending -> In Progress -> Ready -> Claimed.
   * 
   * NOTE: Transitioning to 'Claimed' is critical as it triggers 
   * the backend logic to unlock the linked Machine IDs.
   */
  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      setRefreshing(true);
      await apiService.updateBookingStatus(bookingId, newStatus);
      
      // Visual feedback for the operator
      showNotification(`Order successfully moved to ${newStatus}`);
      
      // Immediate refresh to update machine availability UI
      await loadBookings(true);
    } catch (err) {
      console.error('Lifecycle Transition Error:', err.message);
      alert("System could not update status. Check backend connection.");
    } finally {
      setRefreshing(false);
    }
  };

  const showNotification = (msg) => {
    setSuccessMessage(`✓ ${msg}`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleBookingSuccess = () => {
    setIsModalOpen(false);
    showNotification('New booking registered in queue');
    loadBookings(true);
  };

  /**
   * UI HELPER METHODS
   */
  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'in progress': return 'bg-blue-50 text-blue-500 border-blue-100';
      case 'pending':     return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'ready':       return 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-500/10';
      default:            return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  const getMachineDisplay = (booking) => {
    const parts = [];
    if (booking.washer?.machine_number) parts.push(`W${booking.washer.machine_number}`);
    if (booking.dryer?.machine_number)  parts.push(`D${booking.dryer.machine_number}`);
    return parts.length > 0 ? parts.join(' • ') : 'WAITING';
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">

      {/* Dynamic Action Notifications */}
      {successMessage && (
        <div className="fixed top-8 right-8 z-[100] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
          <CheckCircle size={20} className="text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Terminal Command Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start mb-10 gap-6">
        <div>
          <h2 className="text-slate-900 font-bold text-lg mb-1 tracking-tight">
            {localStorage.getItem('shop_name') || 'Laundromat Terminal'}
          </h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4 opacity-60">
            Internal Operations Node
          </p>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase">Service Terminal</h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">Manage order fulfillment and monitor hardware occupancy.</p>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-3 bg-white px-5 py-4 rounded-2xl border border-slate-200 shadow-sm">
            <Calendar size={18} className="text-sky-500" />
            <span className="text-sm font-black text-slate-700">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <div className="h-4 w-[1px] bg-slate-200 mx-1" />
            <button
              onClick={() => loadBookings(true)}
              className={`text-slate-300 hover:text-sky-500 transition-all ${refreshing ? 'animate-spin text-sky-500' : ''}`}
            >
              <RefreshCw size={18} />
            </button>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 lg:flex-none bg-sky-500 hover:bg-sky-600 text-white px-10 py-4 rounded-2xl font-black transition-all shadow-lg shadow-sky-200 active:scale-95 flex items-center justify-center gap-2"
          >
            + ADD BOOKING
          </button>
        </div>
      </div>

      {/* LIVE QUEUE TABLE */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-44">
            <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-sky-500 border-r-transparent mb-4" />
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Syncing Active Queue...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-50 bg-slate-50/50">
                  {['Intake Time', 'Customer Name', 'Service Plan', 'Weight', 'Hardware', 'Balance', 'Lifecycle', 'Operations'].map(h => (
                    <th key={h} className="text-left px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-32">
                      <div className="flex flex-col items-center gap-3">
                        <Package size={48} className="text-slate-100" />
                        <p className="text-slate-500 font-black text-base uppercase tracking-tight">Terminal Clear</p>
                        <p className="text-slate-300 text-xs font-bold">No active transactions in the current queue.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-xs">
                          <Clock size={14} className="text-slate-300" />
                          {formatTime(booking.created_at)}
                        </div>
                      </td>

                      <td className="px-8 py-7">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-[10px]">
                            {booking.customer_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-slate-900 font-black text-sm">{booking.customer_name}</span>
                        </div>
                      </td>

                      <td className="px-8 py-7 text-slate-600 font-bold text-xs uppercase tracking-tight">
                        {booking.service_type}
                      </td>

                      <td className="px-8 py-7 text-slate-500 font-black text-sm tracking-tighter">
                        {booking.weight} <span className="text-[10px] text-slate-300">KG</span>
                      </td>

                      <td className="px-8 py-7">
                        <div className="flex items-center gap-2">
                          <HardDrive size={14} className="text-sky-400" />
                          <span className="font-black text-sm text-sky-600 tracking-tighter">
                            {getMachineDisplay(booking)}
                          </span>
                        </div>
                      </td>

                      <td className="px-8 py-7">
                        <span className="text-emerald-600 font-black text-sm">
                          {formatCurrency(booking.total_price || 0)}
                        </span>
                      </td>

                      <td className="px-8 py-7">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] uppercase font-black tracking-widest border ${getStatusStyle(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>

                      <td className="px-8 py-7">
                        <div className="flex items-center gap-2">
                          {/* TRANSITION: Pending -> In Progress */}
                          {booking.status === 'Pending' && (
                            <button
                              onClick={() => handleStatusUpdate(booking.id, 'In Progress')}
                              className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-sky-500 hover:border-sky-200 rounded-xl transition-all shadow-sm active:scale-90"
                              title="Engage Machine"
                            >
                              <PlayCircle size={20} />
                            </button>
                          )}
                          
                          {/* TRANSITION: In Progress -> Ready */}
                          {booking.status === 'In Progress' && (
                            <button
                              onClick={() => handleStatusUpdate(booking.id, 'Ready')}
                              className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-emerald-500 hover:border-emerald-200 rounded-xl transition-all shadow-sm active:scale-90"
                              title="Cycle Complete"
                            >
                              <CheckCircle size={20} />
                            </button>
                          )}
                          
                          {/* TRANSITION: Ready -> Claimed (Archive transaction and Release Hardware) */}
                          {booking.status === 'Ready' && (
                            <button
                              onClick={() => handleStatusUpdate(booking.id, 'Claimed')}
                              className="p-3 bg-sky-500 text-white rounded-xl transition-all shadow-lg shadow-sky-100 hover:bg-sky-600 active:scale-90"
                              title="Release Machine & Archive"
                            >
                              <Archive size={20} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleBookingSuccess}
      />
    </div>
  );
};

export default ServiceTerminal;