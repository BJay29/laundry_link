import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Package,
  Clock,
  CheckCircle,
  PlayCircle,
  Archive,
  HardDrive,
  AlertTriangle,
  Cpu,
  Bell,
  X,
  Loader2,
} from 'lucide-react';
import apiService from '../services/APIservices';
import BookingModal from '../components/modals/bookingmodal';
import AssignMachineModal from '../components/modals/assignmachinemodal';
import { formatTime, formatCurrency } from '../utils/formatters';

/**
 * SERVICE TERMINAL COMPONENT
 * Main operational dashboard for managing the laundry queue.
 * UPDATED:
 * - Bookings created without a machine are shown with status "Pending"
 * - Machine column shows "No Machine" badge for unassigned bookings
 * - "Assign Machine" amber button appears when machines are available
 * - "No Machine Available" indicator when all machines are busy
 * - Toast notification on machine freed up or customer claimed
 */
const ServiceTerminal = () => {
  const [bookings, setBookings]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);
  const [isModalOpen, setIsModalOpen]         = useState(false);
  const [successMessage, setSuccessMessage]   = useState('');

  // Assign Machine Modal state
  const [assignModalOpen, setAssignModalOpen]               = useState(false);
  const [selectedBookingForAssign, setSelectedBookingForAssign] = useState(null);

  // Available machines list (used to decide whether to show Assign button)
  const [availableMachines, setAvailableMachines] = useState([]);

  // Tracks previous busy count to detect when a machine frees up
  const [prevBusyCount, setPrevBusyCount] = useState(null);

  // Live clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // ── Live Clock ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Load Available Machines ────────────────────────────────────────────────
  /**
   * Fetches all machines and filters for available ones.
   * Also detects when a machine transitions from busy → available
   * so we can notify the operator if there are pending bookings.
   */
  const loadAvailableMachines = useCallback(async () => {
    try {
      const machines = await apiService.getMachines();
      const all = machines || [];

      const available = all.filter(m => {
        const s = m.status?.toLowerCase();
        return s === 'available' || s === 'idle' || s === 'ready';
      });

      const currentBusyCount = all.filter(m => {
        const s = m.status?.toLowerCase();
        return s === 'busy' || s === 'in use';
      }).length;

      // If a machine just freed up and there are unassigned pending bookings, show toast
      if (prevBusyCount !== null && currentBusyCount < prevBusyCount) {
        setBookings(prev => {
          const hasPending = prev.some(
            b => b.status === 'Pending' && !b.washer_id && !b.dryer_id
          );
          if (hasPending) {
            showNotification('🔔 Machine now available! Assign it to a pending booking.');
          }
          return prev;
        });
      }

      setPrevBusyCount(currentBusyCount);
      setAvailableMachines(available);
    } catch (err) {
      console.error('Machine fetch error:', err.message);
    }
  }, [prevBusyCount]);

  // ── Load Bookings ──────────────────────────────────────────────────────────
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

  // ── Polling ────────────────────────────────────────────────────────────────
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

  // ── Status Lifecycle ───────────────────────────────────────────────────────
  /**
   * Advances a booking through: Pending → In Progress → Ready → Claimed.
   * Releasing machines happens automatically on the backend.
   */
  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      setRefreshing(true);
      await apiService.updateBookingStatus(bookingId, newStatus);

      if (newStatus === 'Claimed') {
        showNotification('📦 Customer has claimed their laundry.');
      } else {
        showNotification(`✓ Order moved to ${newStatus}`);
      }

      await loadBookings(true);
      await loadAvailableMachines();
    } catch (err) {
      console.error('Lifecycle Transition Error:', err.message);
      alert('Status update failed. Please check backend connectivity.');
    } finally {
      setRefreshing(false);
    }
  };

  // ── Assign Machine ─────────────────────────────────────────────────────────
  const handleOpenAssignModal = (booking) => {
    setSelectedBookingForAssign(booking);
    setAssignModalOpen(true);
  };

  const handleAssignSuccess = (message) => {
    setAssignModalOpen(false);
    setSelectedBookingForAssign(null);
    showNotification(message || '✅ Machine assigned successfully.');
    loadBookings(true);
    loadAvailableMachines();
  };

  // ── Booking Created ────────────────────────────────────────────────────────
  const handleBookingSuccess = (newBooking) => {
    setIsModalOpen(false);
    const hasMachine = newBooking?.washer_id || newBooking?.dryer_id;
    if (!hasMachine) {
      showNotification('🕐 Booking queued as Pending — assign a machine when one is available.');
    } else {
      showNotification('✓ New booking registered in queue');
    }
    loadBookings(true);
    loadAvailableMachines();
  };

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showNotification = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Maps status string to badge CSS classes */
  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'in progress': return 'bg-blue-50 text-blue-500 border-blue-100';
      case 'pending':     return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'ready':       return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'claimed':     return 'bg-slate-100 text-slate-500 border-slate-200';
      default:            return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  /**
   * Renders the machine column content.
   * - Assigned machine(s)  → "W1 • D2"
   * - IDs exist but unresolved → "SYNCING..."
   * - No machine assigned  → amber "No Machine" badge
   */
  const getMachineDisplay = (booking) => {
    const wNum = booking.washer?.machine_number || booking.washer_number;
    const dNum = booking.dryer?.machine_number  || booking.dryer_number;
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

    if (booking.washer_id || booking.dryer_id) {
      return (
        <span className="font-black text-sm text-blue-400 animate-pulse tracking-tighter">
          SYNCING...
        </span>
      );
    }

    // No machine at all — show the amber badge
    return (
      <span className="inline-flex items-center gap-1 font-black text-[10px] text-amber-600 uppercase tracking-tight bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
        <AlertTriangle size={10} />
        No Machine
      </span>
    );
  };

  /**
   * Returns true when a booking is Pending AND has no machine assigned.
   * These are the bookings that need an "Assign Machine" action.
   */
  const needsMachineAssign = (booking) =>
    booking.status === 'Pending' && !booking.washer_id && !booking.dryer_id;

  // Badge count for the header
  const pendingUnassignedCount = bookings.filter(needsMachineAssign).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">

      {/* ── TOAST NOTIFICATION ── */}
      {successMessage && (
        <div className="fixed top-8 right-8 z-[100] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 animate-in fade-in slide-in-from-right-4 max-w-sm">
          <Bell size={18} className="text-emerald-400 shrink-0" />
          <span className="flex-1">{successMessage}</span>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-white/40 hover:text-white transition-colors ml-1"
          >
            <X size={15} />
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
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase">
            Service Terminal
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">
            Manage customer bookings and service orders.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          {/* Live clock */}
          <div className="flex items-center gap-3 bg-white px-5 py-4 rounded-2xl border border-slate-200 shadow-sm">
            <Clock size={18} className="text-sky-500" />
            <span className="text-sm font-black text-slate-700 tabular-nums">
              {currentTime.toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit', second: '2-digit',
              })}
            </span>
            <div className="h-4 w-[1px] bg-slate-200 mx-1" />
            <button
              onClick={() => { loadBookings(true); loadAvailableMachines(); }}
              className={`text-slate-300 hover:text-sky-500 transition-all ${refreshing ? 'animate-spin text-sky-500' : ''}`}
            >
              <RefreshCw size={18} />
            </button>
          </div>

          {/* Pending unassigned badge */}
          {pendingUnassignedCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-4 rounded-2xl font-black text-xs uppercase tracking-tight shadow-sm">
              <AlertTriangle size={15} className="text-amber-500" />
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

      {/* ── MAIN TABLE ── */}
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
                    <th
                      key={h}
                      className="text-left px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400"
                    >
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
                        <p className="text-slate-500 font-black text-base uppercase tracking-tight">
                          Terminal Clear
                        </p>
                        <p className="text-slate-300 text-xs font-bold">
                          No active transactions in the current queue.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className={`hover:bg-slate-50/50 transition-colors group ${
                        needsMachineAssign(booking) ? 'bg-amber-50/20' : ''
                      }`}
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
                          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-[10px] shrink-0">
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
                        {booking.weight}{' '}
                        <span className="text-[10px] text-slate-300">KG</span>
                      </td>

                      {/* Machine — shows badge, syncing, or assigned machines */}
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-2">
                          <HardDrive
                            size={14}
                            className={needsMachineAssign(booking) ? 'text-amber-400' : 'text-sky-400'}
                          />
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
                        <span
                          className={`px-4 py-1.5 rounded-full text-[9px] uppercase font-black tracking-widest border ${getStatusStyle(booking.status)}`}
                        >
                          {booking.status}
                        </span>
                      </td>

                      {/* Operations */}
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-2">

                          {/*
                            ASSIGN MACHINE button:
                            Shown when booking is Pending with no machine AND
                            at least one machine is currently available.
                          */}
                          {needsMachineAssign(booking) && availableMachines.length > 0 && (
                            <button
                              onClick={() => handleOpenAssignModal(booking)}
                              className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-500 text-white rounded-xl transition-all shadow-sm shadow-amber-200 hover:bg-amber-600 active:scale-90 text-[10px] font-black uppercase tracking-tight"
                              title="Assign Machine"
                            >
                              <Cpu size={13} />
                              Assign
                            </button>
                          )}

                          {/*
                            NO MACHINE AVAILABLE indicator:
                            Shown when booking is Pending but all machines are busy.
                          */}
                          {needsMachineAssign(booking) && availableMachines.length === 0 && (
                            <div
                              className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-tight cursor-default"
                              title="No machines available right now"
                            >
                              <HardDrive size={13} />
                              No Machine
                            </div>
                          )}

                          {/*
                            START CYCLE button (Pending → In Progress):
                            Only shown when the booking already has a machine assigned
                            but the operator hasn't started the cycle yet.
                          */}
                          {booking.status === 'Pending' && (booking.washer_id || booking.dryer_id) && (
                            <button
                              onClick={() => handleStatusUpdate(booking.id, 'In Progress')}
                              className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-sky-500 hover:border-sky-200 rounded-xl transition-all shadow-sm active:scale-90"
                              title="Start Cycle"
                            >
                              <PlayCircle size={20} />
                            </button>
                          )}

                          {/* In Progress → Ready */}
                          {booking.status === 'In Progress' && (
                            <button
                              onClick={() => handleStatusUpdate(booking.id, 'Ready')}
                              className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-emerald-500 hover:border-emerald-200 rounded-xl transition-all shadow-sm active:scale-90"
                              title="Mark as Ready"
                            >
                              <CheckCircle size={20} />
                            </button>
                          )}

                          {/* Ready → Claimed */}
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
