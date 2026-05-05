import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, RefreshCw, Package, Clock, User, CheckCircle, PlayCircle, Archive, HardDrive } from 'lucide-react';
import apiService from '../services/APIservices'; 
import BookingModal from '../components/modals/bookingmodal';
import { formatTime, formatCurrency } from '../utils/formatters';

const ServiceTerminal = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadBookings = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await apiService.getActiveBookings();
      setBookings(data || []);
    } catch (err) {
      console.error('Failed to load bookings:', err.message);
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
    const interval = setInterval(() => loadBookings(true), 30000);
    return () => clearInterval(interval);
  }, [loadBookings]);

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      setRefreshing(true);
      await apiService.updateBookingStatus(bookingId, newStatus);
      setSuccessMessage(`✓ Order marked as ${newStatus}`);
      setTimeout(() => setSuccessMessage(''), 3000);
      loadBookings(true);
    } catch (err) {
      console.error('Status update failed:', err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleBookingSuccess = (newBooking) => {
    setIsModalOpen(false);
    setSuccessMessage(`✓ Booking created for ${newBooking.customer_name}`);
    setTimeout(() => setSuccessMessage(''), 4000);
    loadBookings(true);
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'in progress': return 'bg-blue-50 text-blue-500 border border-blue-100';
      case 'pending':     return 'bg-yellow-50 text-yellow-600 border border-yellow-100';
      case 'ready':       return 'bg-green-50 text-green-600 border border-green-100';
      case 'claimed':     return 'bg-slate-50 text-slate-400 border border-slate-100';
      default:            return 'bg-slate-50 text-slate-400 border border-slate-100';
    }
  };

  /**
   * UPDATED: Gets the actual machine numbers assigned during booking.
   * Logic handles if it's a washer, dryer, or both.
   */
  const getMachineLabel = (booking) => {
    const parts = [];
    if (booking.selected_washer_id) parts.push(`W-${booking.selected_washer_id.split('-').pop()}`);
    if (booking.selected_dryer_id) parts.push(`D-${booking.selected_dryer_id.split('-').pop()}`);
    
    // Fallback if no machine IDs but objects exist (from your schema)
    if (parts.length === 0) {
        if (booking.washer?.machine_number) parts.push(`W${booking.washer.machine_number}`);
        if (booking.dryer?.machine_number) parts.push(`D${booking.dryer.machine_number}`);
    }

    return parts.length > 0 ? parts.join(' & ') : 'SELF-SERVICE';
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-slate-900 font-bold text-lg mb-1">
            {localStorage.getItem('shop_name') || 'Fresh & Clean Laundromat'}
          </h2>
          <p className="text-slate-500 text-sm font-medium mb-4">Naga City Branch • Terminal #1</p>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Service Terminal</h1>
          <p className="text-slate-500 text-sm mt-1">Manage active laundry cycles and customer orders.</p>
        </div>

        <div className="flex flex-col items-end gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              <Calendar size={18} className="text-slate-400" />
              <span className="text-sm font-bold text-slate-700">May 05, 2026</span>
            </div>
            <button
              onClick={() => loadBookings(true)}
              className={`p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-sky-500 transition-all shadow-sm ${refreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={18} />
            </button>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-sky-500 hover:bg-sky-600 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
          >
            + New Booking
          </button>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500 mx-auto mb-4"></div>
              <p className="text-slate-400 font-bold">Synchronizing Database...</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Time', 'Customer', 'Service', 'Weight', 'Machine', 'Price', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-8 py-5 text-xs font-black uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-32">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center border-2 border-dashed border-slate-200">
                          <Package size={32} className="text-slate-300" />
                        </div>
                        <div className="text-center">
                          <p className="text-slate-500 font-bold text-base">No Active Transactions</p>
                          <p className="text-slate-400 text-sm">Start by clicking "+ New Booking" above.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      {/* ACCURATE TIME */}
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                          <Clock size={14} className="text-slate-300" />
                          {formatTime(booking.created_at)}
                        </div>
                      </td>

                      {/* CUSTOMER */}
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                          <div className="w-7 h-7 rounded-full bg-sky-50 flex items-center justify-center text-sky-500">
                            <User size={12} />
                          </div>
                          {booking.customer_name}
                        </div>
                      </td>

                      {/* SERVICE */}
                      <td className="px-8 py-6">
                        <span className="text-slate-600 font-semibold text-sm">{booking.service_type}</span>
                      </td>

                      {/* WEIGHT */}
                      <td className="px-8 py-6 text-slate-500 font-bold text-sm">
                        {booking.weight} kg
                      </td>

                      {/* ACCURATE MACHINE DISPLAY */}
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <HardDrive size={14} className="text-orange-400" />
                          <span className="text-orange-600 font-black text-xs uppercase tracking-tight">
                            {getMachineLabel(booking)}
                          </span>
                        </div>
                      </td>

                      {/* PRICE */}
                      <td className="px-8 py-6">
                        <span className="text-emerald-600 font-black text-sm">
                          {formatCurrency(booking.total_price || 0)}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1.5 rounded-full text-[10px] uppercase font-black tracking-tight ${getStatusStyle(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          {booking.status === 'In Progress' && (
                            <button 
                              onClick={() => handleStatusUpdate(booking.id, 'Ready')}
                              className="p-2.5 bg-slate-50 text-slate-400 hover:text-green-500 hover:bg-green-50 rounded-xl transition-all active:scale-90"
                              title="Mark as Ready"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}
                          {booking.status === 'Ready' && (
                            <button 
                              onClick={() => handleStatusUpdate(booking.id, 'Claimed')}
                              className="p-2.5 bg-slate-50 text-slate-400 hover:text-sky-500 hover:bg-sky-100 rounded-xl transition-all active:scale-90"
                              title="Mark as Claimed"
                            >
                              <Archive size={18} />
                            </button>
                          )}
                          {booking.status === 'Pending' && (
                            <button 
                              onClick={() => handleStatusUpdate(booking.id, 'In Progress')}
                              className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                              title="Start Washing"
                            >
                              <PlayCircle size={18} />
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