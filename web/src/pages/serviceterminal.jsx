import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, RefreshCw, Package, Clock, CheckCircle, PlayCircle, Archive, HardDrive, AlertTriangle, Cpu, X, ChevronRight, Bell } from 'lucide-react';
import apiService from '../services/APIservices';
import BookingModal from '../components/modals/bookingmodal';
import AssignMachineModal from '../components/modals/assignmachinemodal';
import { formatTime, formatCurrency } from '../utils/formatters';

/**
 * SERVICE TERMINAL COMPONENT
 * UPDATED:
 * - Bookings without a machine are shown with status "Pending"
 * - "No Machine Available" label shown in machine column for unassigned bookings
 * - "Assign Machine" button shown for pending/unassigned bookings
 * - Toast notification appears when machines become available or a customer is claimed
 */
const ServiceTerminal = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Assign Machine Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedBookingForAssign, setSelectedBookingForAssign] = useState(null);

  // Tracks previous machine availability to detect when machines free up
  const [prevBusyCount, setPrevBusyCount] = useState(null);
  const [availableMachines, setAvailableMachines] = useState([]);

  // LIVE CLOCK STATE
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /**
   * Fetch available machines for the assign modal and availability notification.
   */
  const loadAvailableMachines = useCallback(async () => {
    try {
      const machines = await apiService.getMachines();
      const available = (machines || []).filter(m => {
        const s = m.status?.toLowerCase();
        return s === 'available' || s === 'idle' || s === 'ready';
      });

      // Detect when machines become available (busy count drops)
      const currentBusyCount = (machines || []).filter(m => {
        const s = m.status?.toLowerCase();
        return s === 'busy' || s === 'in use';
      }).length;

      if (prevBusyCount !== null && currentBusyCount < prevBusyCount) {
        // A machine just freed up — check if there are pending unassigned bookings
        const hasPendingUnassigned = bookings.some(
          b => b.status === 'Pending' && !b.washer_id && !b.dryer_id
        );
        if (hasPendingUnassigned) {
          showNotification('🔔 Machine now available! You can assign it to a pending booking.');
        }
      }

      setPrevBusyCount(currentBusyCount);
      setAvailableMachines(available);
    } catch (err) {
      console.error('Machine fetch error:', err.message);
    }
  }, [prevBusyCount, bookings]);

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

  // Polling: refresh bookings every 30s, machines every 15s
  useEffect(() => {
    loadBookings();
    loadAvailableMachines();
    const bookingInterval = setInterval(() => loadBookings(true), 30000);
    const machineInterval = setInterval(() => loadAvailableMachines(), 15000);
    return () => {
      clearInterval(bookingInterval);
      clearInterval(machineInterval);
    };
  }, [loadBookings, loadAvailableMachines]);

  /**
   * STATUS LIFECYCLE HANDLER
   * Transitions: Pending -> In Progress -> Ready -> Claimed
   */
  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      setRefreshing(true);
      await apiService.updateBookingStatus(bookingId, newStatus);

      // Show notification when customer claims their laundry
      if (newStatus === 'Claimed') {
        showNotification('📦 Customer has claimed their order.');
      } else {
        showNotification(`Order moved to ${newStatus}`);
      }

      await loadBookings(true);
      await loadAvailableMachines();
    } catch (err) {
      console.error('Lifecycle Transition Error:', err.message);
      alert("Status update failed. Please check backend connectivity.");
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * ASSIGN MACHINE HANDLER
   * Opens the assign machine modal for a specific pending booking.
   */
  const handleOpenAssignModal = (booking) => {
    setSelectedBookingForAssign(booking);
    setAssignModalOpen(true);
  };

  /**
   * Called after machine is successfully assigned from the modal.
   */
  const handleAssignSuccess = (message) => {
    setAssignModalOpen(false);
    setSelectedBookingForAssign(null);
    showNotification(message || '✅ Machine assigned successfully.');
    loadBookings(true);
    loadAvailableMachines();
  };

  const showNotification = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleBookingSuccess = (newBooking) => {
    setIsModalOpen(false);

    // If the booking was created without a machine, show a different message
    const hasMachine = newBooking?.washer_id || newBooking?.dryer_id;
    if (!hasMachine) {
      showNotification('🕐 Booking queued as Pending — assign a machine when available.');
    } else {
      showNotification('✓ New booking registered in queue');
    }

    loadBookings(true);
    loadAvailableMachines();
  };

  /**
   * UI HELPER: Status Styling
   */
  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'in progress': return 'bg-blue-50 text-blue-500 border-blue-100';
      case 'pending':     return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'ready':       return 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-500/10';
      case 'claimed':     return 'bg-slate-100 text-slate-500 border-slate-200';
      default:            return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  /**
   * UI HELPER: Machine Column Display
   * UPDATED: Shows "No Machine Available" for pending unassigned bookings
   * and "Assign Machine" button.
   */
  const getMachineDisplay = (booking) => {
    const wNum = booking.washer?.machine_number || booking.washer_number;
    const dNum = booking.dryer?.machine_number || booking.dryer_number;
    const parts = [];

    if (wNum) parts.push(`W${wNum}`);
    if (dNum) parts.push(`D${dNum}`);

    if (parts.length > 0) {
      return (
        <span className="font-black text-sm text-sky-600 tracking-tighter">
          {parts.join(' • ')}
        </span>
      );
    }

    // IDs exist but numbers not resolved yet
    if (booking.washer_id || booking.dryer_id) {
      return (
        <span className="font-black text-sm text-blue-400 animate-pulse tracking-tighter">
          SYNCING...
        </span>
      );
    }

    // No machine assigned at all
    return (
      <span className="font-black text-[11px] text-amber-500 uppercase tracking-tight bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
        No Machine
      </span>
    );
  };

  /**
   * Checks whether this booking needs a machine assignment action.
   * True when: status is Pending AND no washer or dryer assigned.
   */
  const needsMachineAssign = (booking) => {
    return (
      booking.status === 'Pending' &&
      !booking.washer_id &&
      !booking.dryer_id
    );
  };

  // Count pending bookings with no machine for the header badge
  const pendingUnassignedCount = bookings.filter(needsMachineAssign).length;

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">

      {/* ── SUCCESS / NOTIFICATION TOAST ── */}
      {successMessage && (
        <div className="fixed top-8 right-8 z-[100] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 animate-in fade-in slide-in-from-right-4 max-w-sm">
          <Bell size={18} className="text-emerald-400 shrink-0" />
          <span className="flex-1">{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="text-white/40 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start mb-10 gap-6">
        <div>
          <h2 className="text-slate-900 font-bold text-lg mb-1 tracking-tight">
            {localStorage.getItem('shop_name') || 'Laundromat Terminal'}
          </h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4 opacity-60">
            Real-Time Performance Dashboard
          </p>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase">Service Terminal</h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">Manage customer bookings and service orders.</p>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          {/* Real-time Clock */}
          <div className="flex items-center gap-3 bg-white px-5 py-4 rounded-2xl border border-slate-200 shadow-sm">
            <Clock size={18} className="text-sky-500" />
            <span className="text-sm font-black text-slate-700 tabular-nums">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <div className="h-4 w-[1px] bg-slate-200 mx-1" />
            <button
              onClick={() => { loadBookings(true); loadAvailableMachines(); }}
              className={`text-slate-300 hover:text-sky-500 transition-all ${refreshing ? 'animate-spin text-sky-500' : ''}`}
            >
              <RefreshCw size={18} />
            </button>
          </div>

          {/* Pending badge */}
          {pendingUnassignedCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-4 rounded-2xl font-black text-xs uppercase tracking-tight shadow-sm">
              <AlertTriangle size={16} className="text-amber-500" />
              {pendingUnassignedCount} Pending
            </div>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 lg:flex-none bg-sky-500 hover:bg-sky-600 text-white px-10 py-4 rounded-2xl font-black transition-all shadow-lg shadow-sky-200 active:scale-95 flex items-center justify-center gap-2"
          >
            + ADD BOOKING
          </button>
        </div>
      </div>

      {/* ── MAIN QUEUE TABLE ── */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-44">
            <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-sky-500 border-r-transparent mb-4" />
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Loading...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-50 bg-slate-50/50">
                  {['Time', 'Customer Name', 'Service Type', 'Weight', 'Machines', 'Price', 'Status', 'Operations'].map(h => (
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
                    <tr
                      key={booking.id}
                      className={`hover:bg-slate-50/50 transition-colors group ${needsMachineAssign(booking) ? 'bg-amber-50/30' : ''}`}
                    >
                      {/* Time */}
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-xs whitespace-nowrap">
                          <Clock size={14} className="text-slate-300" />
                          {formatTime(booking.booking_timestamp || booking.created_at)}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-[10px]">
                            {booking.customer_name?.charAt(0).toUpperCase() || 'C'}
                          </div>
                          <span className="text-slate-900 font-black text-sm truncate max-w-[150px]">
                            {booking.customer_name}
                          </span>
                        </div>
                      </td>

                      {/* Service Type */}
                      <td className="px-8 py-7 text-slate-600 font-bold text-xs uppercase tracking-tight">
                        {booking.service_type}
                      </td>

                      {/* Weight */}
                      <td className="px-8 py-7 text-slate-500 font-black text-sm tracking-tighter">
                        {booking.weight} <span className="text-[10px] text-slate-300">KG</span>
                      </td>

                      {/* Machine Column — UPDATED */}
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-2">
                          <HardDrive size={14} className={needsMachineAssign(booking) ? "text-amber-400" : "text-sky-400"} />
                          {getMachineDisplay(booking)}
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-8 py-7">
                        <span className="text-emerald-600 font-black text-sm">
                          {formatCurrency(booking.total_price || 0)}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="px-8 py-7">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] uppercase font-black tracking-widest border ${getStatusStyle(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>

                      {/* Operations Column — UPDATED */}
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-2">

                          {/* ── ASSIGN MACHINE BUTTON ──
                              Shows when booking is Pending with no machine assigned.
                              Only shows if there are available machines. */}
                          {needsMachineAssign(booking) && availableMachines.length > 0 && (
                            <button
                              onClick={() => handleOpenAssignModal(booking)}
                              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-xl transition-all shadow-sm shadow-amber-200 hover:bg-amber-600 active:scale-90 text-[10px] font-black uppercase tracking-tight"
                              title="Assign Machine"
                            >
                              <Cpu size={14} />
                              Assign
                            </button>
                          )}

                          {/* ── NO MACHINE AVAILABLE indicator ──
                              Shows when booking is Pending but no machines are free. */}
                          {needsMachineAssign(booking) && availableMachines.length === 0 && (
                            <div
                              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-tight cursor-default"
                              title="No machines available right now"
                            >
                              <HardDrive size={14} />
                              No Machine
                            </div>
                          )}

                          {/* ── PENDING → IN PROGRESS ──
                              Only show if machine is assigned (washer_id or dryer_id exists) */}
                          {booking.status === 'Pending' && (booking.washer_id || booking.dryer_id) && (
                            <button
                              onClick={() => handleStatusUpdate(booking.id, 'In Progress')}
                              className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-sky-500 hover:border-sky-200 rounded-xl transition-all shadow-sm active:scale-90"
                              title="Start Cycle"
                            >
                              <PlayCircle size={20} />
                            </button>
                          )}

                          {/* ── IN PROGRESS → READY ── */}
                          {booking.status === 'In Progress' && (
                            <button
                              onClick={() => handleStatusUpdate(booking.id, 'Ready')}
                              className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-emerald-500 hover:border-emerald-200 rounded-xl transition-all shadow-sm active:scale-90"
                              title="Mark as Ready"
                            >
                              <CheckCircle size={20} />
                            </button>
                          )}

                          {/* ── READY → CLAIMED ── */}
                          {booking.status === 'Ready' && (
                            <button
                              onClick={() => handleStatusUpdate(booking.id, 'Claimed')}
                              className="p-3 bg-sky-500 text-white rounded-xl transition-all shadow-lg shadow-sky-100 hover:bg-sky-600 active:scale-90"
                              title="Customer Claimed"
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

      {/* ── BOOKING CREATION MODAL ── */}
      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleBookingSuccess}
        actualBookingTime={currentTime}
      />

      {/* ── ASSIGN MACHINE MODAL ── */}
      {assignModalOpen && selectedBookingForAssign && (
        <AssignMachineModal
          isOpen={assignModalOpen}
          booking={selectedBookingForAssign}
          availableMachines={availableMachines}
          onClose={() => {
            setAssignModalOpen(false);
            setSelectedBookingForAssign(null);
          }}
          onSuccess={handleAssignSuccess}
        />
      )}
    </div>
  );
};

export default ServiceTerminal;
