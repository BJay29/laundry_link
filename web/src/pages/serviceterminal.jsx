import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, RefreshCw, Package, Clock, User, CheckCircle, PlayCircle, Archive, HardDrive } from 'lucide-react';
import apiService from '../services/APIservices';
import BookingModal from '../components/modals/bookingmodal';
import { formatTime, formatCurrency } from '../utils/formatters';

/**
 * Service Terminal Component
 * Primary interface for managing real-time laundry transactions and machine status.
 */
const ServiceTerminal = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  /**
   * Synchronizes active bookings from the backend server.
   * Filters results based on the logged-in user's shop_id.
   */
  const loadBookings = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      
      // Fetches active transactions using the apiService logic
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

  /**
   * Initializes component state and establishes a 30-second polling interval
   * to ensure the dashboard reflects real-time changes from other terminals.
   */
  useEffect(() => {
    loadBookings();
    const interval = setInterval(() => loadBookings(true), 30000);
    return () => clearInterval(interval);
  }, [loadBookings]);

  /**
   * Transitions a booking through its operational lifecycle (Pending -> Progress -> Ready -> Claimed).
   * Triggers machine release logic on the backend when status reaches 'Claimed'.
   */
  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      setRefreshing(true);
      await apiService.updateBookingStatus(bookingId, newStatus);
      
      // Visual feedback for the operator
      setSuccessMessage(`✓ Order marked as ${newStatus}`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Re-sync data to update UI and release machine locks if applicable
      loadBookings(true);
    } catch (err) {
      console.error('Status update failed:', err.message);
      alert("Failed to update status. Please check your network connection.");
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Success handler for the BookingModal submission.
   */
  const handleBookingSuccess = () => {
    setIsModalOpen(false);
    setSuccessMessage('✓ Booking created successfully');
    setTimeout(() => setSuccessMessage(''), 4000);
    loadBookings(true);
  };

  /**
   * Dynamic styling for status indicators.
   */
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
   * Formats the assigned machine labels (e.g., "W1 & D2").
   * Leverages nested machine objects retrieved via backend joinedload.
   */
  const getMachineLabel = (booking) => {
    const parts = [];

    // Check for washer assignment
    if (booking.washer && booking.washer.machine_number != null) {
      parts.push(`W${booking.washer.machine_number}`);
    }

    // Check for dryer assignment
    if (booking.dryer && booking.dryer.machine_number != null) {
      parts.push(`D${booking.dryer.machine_number}`);
    }

    return parts.length > 0 ? parts.join(' & ') : 'Unassigned';
  };

  /**
   * Logic to apply highlight colors to machine assignments.
   */
  const getMachineLabelColor = (booking) => {
    const hasAssignment = (booking.washer?.machine_number != null) || (booking.dryer?.machine_number != null);
    return hasAssignment ? 'text-sky-600' : 'text-slate-400';
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">

      {/* Real-time Toast Notifications */}
      {successMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Dashboard Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-slate-900 font-bold text-lg mb-1">
            {localStorage.getItem('shop_name') || 'Laundromat Terminal'}
          </h2>
          <p className="text-slate-500 text-sm font-medium mb-4">
            {localStorage.getItem('shop_address') || 'Service Point • Operational Dashboard'}
          </p>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Service Terminal</h1>
          <p className="text-slate-500 text-sm mt-1">Monitor active laundry cycles and customer deliveries.</p>
        </div>

        <div className="flex flex-col items-end gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              <Calendar size={18} className="text-slate-400" />
              <span className="text-sm font-bold text-slate-700">
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <button
              onClick={() => loadBookings(true)}
              disabled={refreshing}
              className={`p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-sky-500 transition-all shadow-sm ${refreshing ? 'animate-spin text-sky-500' : ''}`}
              title="Manual Sync"
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

      {/* Main Transactions Grid */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500 mx-auto mb-4" />
              <p className="text-slate-400 font-bold">Connecting to Cloud Server...</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Time', 'Customer', 'Service', 'Weight', 'Machine', 'Price', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-8 py-5 text-xs font-black uppercase tracking-wider text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-32">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center border-2 border-dashed border-slate-200 text-slate-300">
                          <Package size={32} />
                        </div>
                        <p className="text-slate-500 font-bold">No Active Transactions Found</p>
                        <p className="text-slate-300 text-sm">Created bookings for today will appear here.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                          <Clock size={14} className="text-slate-300" />
                          {formatTime(booking.created_at)}
                        </div>
                      </td>

                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                          <div className="w-7 h-7 rounded-full bg-sky-50 flex items-center justify-center text-sky-500">
                            <User size={12} />
                          </div>
                          {booking.customer_name}
                        </div>
                      </td>

                      <td className="px-8 py-6">
                        <span className="text-slate-600 font-semibold text-sm">{booking.service_type}</span>
                      </td>

                      <td className="px-8 py-6 text-slate-500 font-bold text-sm">
                        {booking.weight} kg
                      </td>

                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <HardDrive size={14} className="text-slate-300" />
                          <span className={`font-black text-sm uppercase tracking-tight ${getMachineLabelColor(booking)}`}>
                            {getMachineLabel(booking)}
                          </span>
                        </div>
                      </td>

                      <td className="px-8 py-6">
                        <span className="text-emerald-600 font-black text-sm">
                          {formatCurrency(booking.total_price || 0)}
                        </span>
                      </td>

                      <td className="px-8 py-6">
                        <span className={`px-3 py-1.5 rounded-full text-[10px] uppercase font-black tracking-tight ${getStatusStyle(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>

                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          {/* Start Cycle: Transitions from Pending to In Progress */}
                          {booking.status === 'Pending' && (
                            <button
                              onClick={() => handleStatusUpdate(booking.id, 'In Progress')}
                              className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                              title="Begin Cycle"
                            >
                              <PlayCircle size={18} />
                            </button>
                          )}
                          
                          {/* Finish Cycle: Transitions from In Progress to Ready */}
                          {booking.status === 'In Progress' && (
                            <button
                              onClick={() => handleStatusUpdate(booking.id, 'Ready')}
                              className="p-2.5 bg-slate-50 text-slate-400 hover:text-green-500 hover:bg-green-50 rounded-xl transition-all active:scale-90"
                              title="Mark as Finished"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}
                          
                          {/* Complete Transaction: Transitions from Ready to Claimed (Archive) */}
                          {booking.status === 'Ready' && (
                            <button
                              onClick={() => handleStatusUpdate(booking.id, 'Claimed')}
                              className="p-2.5 bg-slate-50 text-slate-400 hover:text-sky-500 hover:bg-sky-100 rounded-xl transition-all active:scale-90"
                              title="Complete Order"
                            >
                              <Archive size={18} />
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

      {/* New Booking Interface */}
      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleBookingSuccess}
      />
    </div>
  );
};

export default ServiceTerminal;