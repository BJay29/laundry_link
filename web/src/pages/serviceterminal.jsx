import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  RefreshCw,
  Package,
  Clock,
  CheckCircle,
  Archive,
  HardDrive,
  AlertTriangle,
  Cpu,
  Bell,
  X,
  ChevronDown,
} from 'lucide-react';
import apiService from '../services/APIservices';
import BookingModal from '../components/modals/bookingmodal';
import AssignMachineModal from '../components/modals/assignmachinemodal';
import { formatTime, formatCurrency } from '../utils/formatters';

/**
 * SERVICE TERMINAL COMPONENT
 * Main operational dashboard for managing the laundry queue.
 *
 * Status is an editable dropdown instead of a static badge, letting staff
 * manually move a booking through its lifecycle
 * (Pending → In Progress → Ready → Claimed / Cancelled) directly from
 * the table.
 *
 * A booking still CANNOT move to "In Progress" until a machine is
 * assigned. Selecting that option while unassigned shows a blocking
 * message instead of allowing the change.
 *
 * FIXED: The status dropdown menu is now rendered through a React Portal
 * into document.body with `position: fixed`, computed from the trigger
 * button's on-screen coordinates. Previously it was `position: absolute`
 * inside the table's `overflow-x-auto` wrapper — because that wrapper
 * only set overflow-x explicitly, the browser also clipped overflow-y,
 * which silently hid the dropdown menu behind the scroll container. The
 * portal approach escapes that clipping entirely.
 */

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Ready', 'Claimed', 'Cancelled'];

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

  // Tracks which booking's status dropdown is currently open, and where
  // (in fixed-viewport coordinates) to render it via portal.
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState(null); // { top, left }
  const statusButtonRefs = useRef({});

  // ── Live Clock ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Close dropdown on window resize/scroll of the page itself ─────────────
  useEffect(() => {
    if (!openStatusDropdownId) return;
    const closeOnReposition = () => {
      setOpenStatusDropdownId(null);
      setDropdownPosition(null);
    };
    window.addEventListener('resize', closeOnReposition);
    return () => window.removeEventListener('resize', closeOnReposition);
  }, [openStatusDropdownId]);

  // ── Load Available Machines ────────────────────────────────────────────────
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

  /**
   * Called when staff picks a new status from the dropdown.
   * Blocks the "In Progress" transition if no machine is assigned yet —
   * the booking stays a reservation until a washer/dryer is available.
   */
  const handleStatusSelect = (booking, newStatus) => {
    closeStatusDropdown();
    if (newStatus === booking.status) return;

    const hasMachine = booking.washer_id || booking.dryer_id;
    if (newStatus === 'In Progress' && !hasMachine) {
      alert('No machine available yet. Please assign a washer or dryer to this booking first — it will stay Pending as a reservation until then.');
      return;
    }

    handleStatusUpdate(booking.id, newStatus);
  };

  /**
   * Opens the status dropdown for a given booking, computing its
   * fixed-viewport position from the trigger button's bounding box so
   * the portal-rendered menu lines up directly beneath it.
   */
  const toggleStatusDropdown = (bookingId) => {
    if (openStatusDropdownId === bookingId) {
      closeStatusDropdown();
      return;
    }

    const btn = statusButtonRefs.current[bookingId];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
    setOpenStatusDropdownId(bookingId);
  };

  const closeStatusDropdown = () => {
    setOpenStatusDropdownId(null);
    setDropdownPosition(null);
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

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'in progress': return 'bg-blue-50 text-blue-500 border-blue-100';
      case 'pending':     return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'ready':       return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'claimed':     return 'bg-slate-100 text-slate-500 border-slate-200';
      case 'cancelled':   return 'bg-rose-50 text-rose-500 border-rose-100';
      default:            return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

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

    return (
      <span className="inline-flex items-center gap-1 font-black text-[10px] text-amber-600 uppercase tracking-tight bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
        <AlertTriangle size={10} />
        No Machine
      </span>
    );
  };

  const needsMachineAssign = (booking) =>
    booking.status === 'Pending' && !booking.washer_id && !booking.dryer_id;

  const pendingUnassignedCount = bookings.filter(needsMachineAssign).length;

  const openBooking = bookings.find(b => b.id === openStatusDropdownId);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">

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
                  bookings.map((booking) => {
                    const hasMachine = booking.washer_id || booking.dryer_id;
                    const isDropdownOpen = openStatusDropdownId === booking.id;

                    return (
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

                        {/* Machine */}
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

                        {/* Status — editable dropdown (button only; menu is portaled) */}
                        <td className="px-8 py-7 relative">
                          <button
                            type="button"
                            ref={(el) => { statusButtonRefs.current[booking.id] = el; }}
                            onClick={() => toggleStatusDropdown(booking.id)}
                            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[9px] uppercase font-black tracking-widest border transition-all hover:brightness-95 ${getStatusStyle(booking.status)}`}
                          >
                            {booking.status}
                            <ChevronDown size={11} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                        </td>

                        {/* Operations */}
                        <td className="px-8 py-7">
                          <div className="flex items-center gap-2">
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

                            {needsMachineAssign(booking) && availableMachines.length === 0 && (
                              <div
                                className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-tight cursor-default"
                                title="No machines available right now — booking stays as a reservation until one is free."
                              >
                                <HardDrive size={13} />
                                Please Wait
                              </div>
                            )}

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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PORTAL: Status dropdown menu — rendered into document.body with
          fixed positioning so it is never clipped by the table's
          overflow-x-auto wrapper. */}
      {openStatusDropdownId && dropdownPosition && openBooking && ReactDOM.createPortal(
        <>
          <div
            className="fixed inset-0 z-[90]"
            onClick={closeStatusDropdown}
          />
          <div
            className="fixed z-[100] w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
          >
            {STATUS_OPTIONS.map((option) => {
              const isCurrent = option === openBooking.status;
              const hasMachine = openBooking.washer_id || openBooking.dryer_id;
              const isBlockedInProgress = option === 'In Progress' && !hasMachine;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={isCurrent}
                  onClick={() => handleStatusSelect(openBooking, option)}
                  title={isBlockedInProgress ? 'No machine available yet — assign one first.' : undefined}
                  className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center justify-between transition-colors
                    ${isCurrent ? 'bg-slate-50 text-slate-300 cursor-default' : 'text-slate-600 hover:bg-sky-50 hover:text-sky-600'}
                    ${isBlockedInProgress ? 'text-amber-500' : ''}
                  `}
                >
                  <span>{option}</span>
                  {isBlockedInProgress && (
                    <span className="text-[9px] uppercase text-amber-400 flex items-center gap-1">
                      <AlertTriangle size={10} /> No machine
                    </span>
                  )}
                  {isCurrent && (
                    <CheckCircle size={12} className="text-slate-300" />
                  )}
                </button>
              );
            })}
          </div>
        </>,
        document.body
      )}

      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleBookingSuccess}
        actualBookingTime={currentTime}
      />

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
