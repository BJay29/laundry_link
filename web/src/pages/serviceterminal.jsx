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
import BookingRequestModal from '../components/modals/bookingrequestmodal';
import { useNotifications } from '../context/NotificationContext';
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
 * The status dropdown menu is rendered through a React Portal into
 * document.body with `position: fixed`, computed from the trigger
 * button's on-screen coordinates, escaping the table's overflow clipping.
 *
 * MOBILE APP BOOKING REQUESTS:
 * UPDATED — the WebSocket connection and "Awaiting Approval" list used
 * to live directly in this component, meaning the shop only received
 * real-time booking requests while this exact page was mounted. Both
 * now live in NotificationContext (app/layout level, see App.jsx),
 * which stays connected regardless of which page the user is on. This
 * component now just CONSUMES that shared state via useNotifications()
 * — the bell, dropdown, and modal UI are unchanged, only where the data
 * comes from.
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

  // ── Notification / Booking Request state — now from shared context ───
  const {
    awaitingApproval,
    refreshAwaitingApproval,
    acceptBooking,
    declineBooking,
  } = useNotifications();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const notifBellRef = useRef(null);

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

  // ── Close notification dropdown on outside click ───────────────────────────
  useEffect(() => {
    if (!isNotifOpen) return;
    const handleClickOutside = (e) => {
      if (notifBellRef.current && !notifBellRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotifOpen]);

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

  // ── Polling (bookings + machines only — awaiting-approval polling now
  //     lives inside NotificationContext) ─────────────────────────────
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

  // ── Accept / Decline Booking Request (now delegates to context) ────────
  const handleAcceptRequest = async (bookingId) => {
    try {
      await acceptBooking(bookingId);
      setSelectedRequest(null);
      showNotification('✓ Booking accepted — now showing in the queue as Pending.');
      loadBookings(true);
      loadAvailableMachines();
    } catch (err) {
      console.error('Accept Booking Error:', err.message);
      alert('Failed to accept booking. Please try again.');
    }
  };

  const handleDeclineRequest = async (bookingId, reason) => {
    try {
      await declineBooking(bookingId, reason);
      setSelectedRequest(null);
      showNotification('Booking request declined.');
    } catch (err) {
      console.error('Decline Booking Error:', err.message);
      alert('Failed to decline booking. Please try again.');
    }
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

  const formatRelativeTime = (isoString) => {
    if (!isoString) return '';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    return `${diffHr}h ago`;
  };

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

          {/* Notification Bell — data now from useNotifications() */}
          <div className="relative" ref={notifBellRef}>
            <button
              onClick={() => setIsNotifOpen(prev => !prev)}
              className="relative flex items-center justify-center w-[52px] h-[52px] bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-sky-200 transition-all"
            >
              <Bell size={19} className={awaitingApproval.length > 0 ? 'text-sky-500' : 'text-slate-400'} />
              {awaitingApproval.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                  {awaitingApproval.length}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[95]">
                <div className="px-5 py-4 border-b border-slate-50">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Mobile App Requests
                  </p>
                </div>

                {awaitingApproval.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <Bell size={24} className="text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 text-xs font-bold">No pending requests</p>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                    {awaitingApproval.map((req) => (
                      <button
                        key={req.id}
                        onClick={() => {
                          setSelectedRequest(req);
                          setIsNotifOpen(false);
                        }}
                        className="w-full text-left px-5 py-4 hover:bg-sky-50/50 transition-colors"
                      >
                        <p className="font-black text-sm text-slate-800">{req.customer_name}</p>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-slate-400 font-bold">
                            {req.service_type} · ₱{Number(req.total_price || 0).toFixed(0)}
                          </p>
                          <p className="text-[10px] text-slate-300 font-bold">
                            {formatRelativeTime(req.booking_timestamp || req.created_at)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 bg-white px-5 py-4 rounded-2xl border border-slate-200 shadow-sm">
            <Clock size={18} className="text-sky-500" />
            <span className="text-sm font-black text-slate-700 tabular-nums">
              {currentTime.toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit', second: '2-digit',
              })}
            </span>
            <div className="h-4 w-[1px] bg-slate-200 mx-1" />
            <button
              onClick={() => { loadBookings(true); loadAvailableMachines(); refreshAwaitingApproval(); }}
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

      {/* Booking Request Modal — opened by clicking a notification item */}
      <BookingRequestModal
        isOpen={!!selectedRequest}
        booking={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onAccept={handleAcceptRequest}
        onDecline={handleDeclineRequest}
      />
    </div>
  );
};

export default ServiceTerminal;