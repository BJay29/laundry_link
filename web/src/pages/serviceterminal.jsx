import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw,
  Clock,
  AlertTriangle,
  Bell,
  X,
  Plus,
  LayoutDashboard,
  UserPlus,
  Smartphone,
} from 'lucide-react';
import apiService from '../services/APIservices';
import AssignMachineModal from '../components/modals/assignmachinemodal';
import MoveToDryerModal from '../components/modals/movetodryermodal';
import BookingRequestModal from '../components/modals/bookingrequestmodal';
import PaymentVerificationModal from '../components/modals/paymentverificationmodal';
import WeighingPricingModal from '../components/modals/weighingpricingmodal';
import AssignRiderModal from '../components/modals/assignridermodal';
import ActiveTerminalTable from '../components/terminal/activeterminaltable';
import WalkInForm from '../components/terminal/walkinform';
import MobileRequestsQueue from '../components/terminal/mobilerequestsqueue';
import { useNotifications } from '../context/notificationcontext';

/**
 * SERVICE TERMINAL COMPONENT
 * Main operational dashboard for managing the laundry queue.
 *
 * 2-tier navigation:
 *   TIER 1 (this file): page-level workflow tabs driven by `currentView`
 *     - 'active_terminal' -> <ActiveTerminalTable />  (Tier 2 status pills live inside it)
 *     - 'walk_in'         -> <WalkInForm />
 *     - 'mobile_requests' -> <MobileRequestsQueue />
 *
 * This file is the SHELL: it keeps ALL data loading, polling, status
 * lifecycle handlers, and the modals (assign, move-to-dryer, booking
 * request, payment verification, weighing/pricing, rider assignment).
 * The three sub-views are presentational and receive data + handlers as
 * props. Their modals stay here so they always float above whichever
 * tab is active.
 *
 * UPDATED (Rider Assignment feature — Pickup & Delivery): a single
 * <AssignRiderModal /> instance handles BOTH the pickup leg (opened
 * from MobileRequestsQueue's Weighing sub-tab, while a delivery booking
 * is still waiting for its laundry to reach the shop) and the delivery
 * leg (opened from ActiveTerminalTable's 'Ready' rows). Which leg it's
 * assigning is controlled by `riderModalMode` ('pickup' | 'delivery').
 *
 * UI NOTE: all icons come from lucide-react — no emojis anywhere in the
 * tabs, buttons, or toast messages.
 *
 * "Awaiting Approval", "Awaiting Weighing" and "Awaiting Payment" statuses
 * never appear in the Active Terminal table — the backend's
 * get_active_bookings() excludes them, so they only show up in the
 * Mobile Requests tab.
 */

const VIEWS = [
  { key: 'active_terminal', label: 'Active Terminal', icon: LayoutDashboard },
  { key: 'walk_in',         label: 'Walk-In Entry',   icon: UserPlus },
  { key: 'mobile_requests', label: 'Mobile Requests', icon: Smartphone },
];

const needsMachineAssign = (booking) =>
  booking.status === 'Pending' &&
  !booking.washer_id &&
  !booking.dryer_id &&
  (!booking.machine_assignments || booking.machine_assignments.length === 0);

const bookingHasMachine = (booking) =>
  Boolean(
    booking.washer_id ||
    booking.dryer_id ||
    (booking.machine_assignments && booking.machine_assignments.length > 0)
  );

const ServiceTerminal = () => {
  // --- TIER 1 NAVIGATION ---
  const [currentView, setCurrentView] = useState('active_terminal');

  const [bookings, setBookings]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);
  const [successMessage, setSuccessMessage]   = useState('');

  const [assignModalOpen, setAssignModalOpen]               = useState(false);
  const [selectedBookingForAssign, setSelectedBookingForAssign] = useState(null);

  const [moveToDryerModalOpen, setMoveToDryerModalOpen] = useState(false);
  const [moveToDryerTarget, setMoveToDryerTarget]       = useState(null);

  const [availableMachines, setAvailableMachines] = useState([]);
  const [serviceRequiredPhases, setServiceRequiredPhases] = useState({});
  const [prevBusyCount, setPrevBusyCount] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Status dropdown state — lives here because handleStatusSelect /
  // toggleStatusDropdown are parent handlers; the dropdown itself is
  // rendered by ActiveTerminalTable.
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState(null);
  const statusButtonRefs = useRef({});

  const {
    awaitingApproval,
    refreshAwaitingApproval,
    acceptBooking,
    declineBooking,
    awaitingWeighing,
    refreshAwaitingWeighing,
    finalizePricing,
  } = useNotifications();
  const [selectedRequest, setSelectedRequest] = useState(null);

  // --- PAYMENT VERIFICATION STATE (Online Payment feature) ---
  const [pendingVerification, setPendingVerification] = useState([]);
  const [selectedVerificationBooking, setSelectedVerificationBooking] = useState(null);

  // --- AWAITING WEIGHING STATE ---
  const [selectedWeighingBooking, setSelectedWeighingBooking] = useState(null);

  // --- RIDER ASSIGNMENT STATE (NEW — Pickup & Delivery feature) ---
  // One modal, two modes. `riderModalBooking` holds whichever booking —
  // from either the Weighing queue (pickup) or the Active Terminal's
  // Ready rows (delivery) — triggered the modal.
  const [riderModalBooking, setRiderModalBooking] = useState(null);
  const [riderModalMode, setRiderModalMode] = useState('pickup'); // 'pickup' | 'delivery'

  // Tier 1 badge: everything in the Mobile Requests tab that needs staff action.
  const mobileRequestsCount =
    awaitingApproval.length + awaitingWeighing.length + pendingVerification.length;

  // ── Live Clock ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Close dropdown on window resize ───────────────────────────────────────
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
          const hasPending = prev.some(needsMachineAssign);
          if (hasPending) {
            showNotification('Machine now available! Assign it to a pending booking.');
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

  // ── Load Service Required Phases ──
  const loadServiceRequiredPhases = useCallback(async () => {
    try {
      const shopId = apiService.getShopId();
      const serviceTypes = await apiService.getServiceTypes(shopId);
      const map = {};
      (serviceTypes || []).forEach((s) => {
        map[s.name] = s.required_phases || 'full_service';
      });
      setServiceRequiredPhases(map);
    } catch (err) {
      console.error('Service types fetch error:', err.message);
    }
  }, []);

  // ── Load Pending Payment Verification (Online Payment feature) ──────
  const loadPendingVerification = useCallback(async () => {
    try {
      const data = await apiService.getPendingVerificationBookings();
      setPendingVerification(data || []);
    } catch (err) {
      console.error('Pending Verification fetch error:', err.message);
    }
  }, []);

  // ── Polling ──────────────────────────────────────────────────
  useEffect(() => {
    loadBookings();
    loadAvailableMachines();
    loadServiceRequiredPhases();
    loadPendingVerification();
    const bookingInterval = setInterval(() => loadBookings(true), 30000);
    const machineInterval = setInterval(() => loadAvailableMachines(), 15000);
    const paymentInterval = setInterval(() => loadPendingVerification(), 20000);
    return () => {
      clearInterval(bookingInterval);
      clearInterval(machineInterval);
      clearInterval(paymentInterval);
    };
  }, [loadBookings, loadAvailableMachines, loadServiceRequiredPhases, loadPendingVerification]);

  // ── Tier 1 tab switch ──────────────────────────────────────────────────────
  const handleViewChange = (view) => {
    closeStatusDropdown();
    setCurrentView(view);
  };

  // ── Status Lifecycle ───────────────────────────────────────────────────────
  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      setRefreshing(true);
      await apiService.updateBookingStatus(bookingId, newStatus);

      if (newStatus === 'Claimed') {
        showNotification('Customer has claimed their laundry.');
      } else {
        showNotification(`Order moved to ${newStatus}.`);
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

  const handleStatusSelect = (booking, newStatus) => {
    closeStatusDropdown();
    if (newStatus === booking.status) return;

    if (newStatus === 'In Progress' && !bookingHasMachine(booking)) {
      alert('No machine available yet. Please assign a washer or dryer to this booking first — it will stay Pending as a reservation until then.');
      return;
    }

    handleStatusUpdate(booking.id, newStatus);
  };

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

  // ── Shared refresh + toast after any successful machine action ────────────
  const refreshAfterAssign = (message) => {
    showNotification(message || 'Machine assigned successfully.');
    loadBookings(true);
    loadAvailableMachines();
  };

  // ── Assign Machine ──────────
  const handleOpenAssignModal = (booking) => {
    setSelectedBookingForAssign(booking);
    setAssignModalOpen(true);
  };

  const handleAssignSuccess = (message) => {
    setAssignModalOpen(false);
    setSelectedBookingForAssign(null);
    refreshAfterAssign(message);
  };

  // Called by WalkInForm after its own assign step succeeds.
  const handleWalkInAssignSuccess = (message) => {
    refreshAfterAssign(message);
  };

  // ── Move to Dryer ────────────────────────────────────────
  const handleOpenMoveToDryerModal = (booking, loadNumber) => {
    setMoveToDryerTarget({ booking, loadNumber });
    setMoveToDryerModalOpen(true);
  };

  const handleMoveToDryerClose = () => {
    setMoveToDryerModalOpen(false);
    setMoveToDryerTarget(null);
  };

  const handleMoveToDryerSuccess = (message) => {
    setMoveToDryerModalOpen(false);
    setMoveToDryerTarget(null);
    refreshAfterAssign(message);
  };

  // ── Walk-In Booking Created (fired by WalkInForm) ─────────────────────────
  const handleBookingSuccess = (newBooking) => {
    showNotification(
      `Booking for ${newBooking?.customer_name || 'the customer'} created — assign machine(s) next.`
    );
    loadBookings(true);
    loadAvailableMachines();
  };

  // ── Accept / Decline Booking Request ────────
  const handleAcceptRequest = async (bookingId) => {
    try {
      await acceptBooking(bookingId);
      setSelectedRequest(null);
      showNotification('Booking accepted — now Awaiting Weighing.');
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

  // ── Payment Verification Handlers (Online Payment feature) ──────────
  const handleOpenPaymentVerification = (booking) => {
    setSelectedVerificationBooking(booking);
  };

  const handlePaymentVerificationSuccess = (message) => {
    setSelectedVerificationBooking(null);
    showNotification(message || 'Payment verification updated.');
    loadPendingVerification();
    loadBookings(true);
  };

  // ── Awaiting Weighing Handlers ──
  const handleOpenWeighingModal = (booking) => {
    setSelectedWeighingBooking(booking);
  };

  /**
   * Tinatawag ng WeighingPricingModal's "Confirm & Finalize Price".
   * Kapag cash/cod, lalabas agad ito sa Active Terminal (Pending) sa
   * susunod na loadBookings() — kaya rine-refresh din natin ang table.
   */
  const handleConfirmWeighingPricing = async (bookingId, pricingData) => {
    const updated = await finalizePricing(bookingId, pricingData);
    setSelectedWeighingBooking(null);
    showNotification(
      updated.status === 'Pending'
        ? `Price finalized (₱${Number(updated.final_price || 0).toFixed(2)}) — now Pending, ready to assign a machine.`
        : `Price finalized (₱${Number(updated.final_price || 0).toFixed(2)}) — waiting for customer payment.`
    );
    loadBookings(true);
    return updated;
  };

  // ── Rider Assignment Handlers (NEW — Pickup & Delivery feature) ───────────
  // Pickup: opened from MobileRequestsQueue's Weighing sub-tab, while the
  // booking is still "Awaiting Weighing" and its laundry hasn't reached
  // the shop yet.
  const handleOpenPickupRiderModal = (booking) => {
    setRiderModalMode('pickup');
    setRiderModalBooking(booking);
  };

  // Delivery: opened from ActiveTerminalTable's 'Ready' rows, once the
  // laundry itself is done and needs to go back out.
  const handleOpenDeliveryRiderModal = (booking) => {
    setRiderModalMode('delivery');
    setRiderModalBooking(booking);
  };

  const handleRiderAssignSuccess = (message) => {
    setRiderModalBooking(null);
    showNotification(message || 'Rider assigned.');
    // Pickup assignments update a booking still sitting in the Weighing
    // queue (context-owned list) — refresh it so the badge/name there
    // reflects the new rider immediately. Delivery assignments update a
    // booking in the Active Terminal table — refresh that instead.
    if (riderModalMode === 'pickup') {
      refreshAwaitingWeighing();
    } else {
      loadBookings(true);
    }
  };

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showNotification = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const pendingUnassignedCount = bookings.filter(needsMachineAssign).length;

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

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start mb-8 gap-6">
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

        <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
          <div className="flex items-center gap-3 bg-white px-5 py-4 rounded-2xl border border-slate-200 shadow-sm">
            <Clock size={18} className="text-sky-500" />
            <span className="text-sm font-black text-slate-700 tabular-nums">
              {currentTime.toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit', second: '2-digit',
              })}
            </span>
            <div className="h-4 w-[1px] bg-slate-200 mx-1" />
            <button
              onClick={() => {
                loadBookings(true);
                loadAvailableMachines();
                refreshAwaitingApproval();
                refreshAwaitingWeighing();
                loadPendingVerification();
              }}
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
            onClick={() => handleViewChange('walk_in')}
            className="flex-1 lg:flex-none bg-sky-500 hover:bg-sky-600 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-lg shadow-sky-200 active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus size={18} strokeWidth={3} />
            ADD BOOKING
          </button>
        </div>
      </div>

      {/* TIER 1: WORKFLOW TABS */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {VIEWS.map((view) => {
          const isActive = currentView === view.key;
          const Icon = view.icon;
          return (
            <button
              key={view.key}
              type="button"
              onClick={() => handleViewChange(view.key)}
              className={`flex items-center gap-2 text-sm ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm rounded-lg py-2 px-5'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg py-2 px-5 transition-all'
              }`}
            >
              <Icon size={16} />
              {view.label}
              {view.key === 'mobile_requests' && mobileRequestsCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                  {mobileRequestsCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* VIEW ROUTING */}
      {currentView === 'active_terminal' && (
        <ActiveTerminalTable
          bookings={bookings}
          loading={loading}
          availableMachines={availableMachines}
          serviceRequiredPhases={serviceRequiredPhases}
          needsMachineAssign={needsMachineAssign}
          bookingHasMachine={bookingHasMachine}
          openStatusDropdownId={openStatusDropdownId}
          dropdownPosition={dropdownPosition}
          statusButtonRefs={statusButtonRefs}
          toggleStatusDropdown={toggleStatusDropdown}
          closeStatusDropdown={closeStatusDropdown}
          handleStatusSelect={handleStatusSelect}
          handleStatusUpdate={handleStatusUpdate}
          handleOpenAssignModal={handleOpenAssignModal}
          handleOpenMoveToDryerModal={handleOpenMoveToDryerModal}
          handleOpenPaymentVerification={handleOpenPaymentVerification}
          handleOpenDeliveryRiderModal={handleOpenDeliveryRiderModal}
        />
      )}

      {currentView === 'walk_in' && (
        <WalkInForm
          onBookingSuccess={handleBookingSuccess}
          onAssignSuccess={handleWalkInAssignSuccess}
        />
      )}

      {currentView === 'mobile_requests' && (
        <MobileRequestsQueue
          awaitingApproval={awaitingApproval}
          awaitingWeighing={awaitingWeighing}
          pendingVerification={pendingVerification}
          onOpenRequest={setSelectedRequest}
          onOpenWeighing={handleOpenWeighingModal}
          onOpenPayment={handleOpenPaymentVerification}
          onOpenPickupRider={handleOpenPickupRiderModal}
        />
      )}

      {/* MODALS — kept in the shell so they float above any active tab */}
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

      {moveToDryerModalOpen && moveToDryerTarget && (
        <MoveToDryerModal
          isOpen={moveToDryerModalOpen}
          booking={moveToDryerTarget.booking}
          loadNumber={moveToDryerTarget.loadNumber}
          availableMachines={availableMachines}
          onClose={handleMoveToDryerClose}
          onSuccess={handleMoveToDryerSuccess}
        />
      )}

      <BookingRequestModal
        isOpen={!!selectedRequest}
        booking={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onAccept={handleAcceptRequest}
        onDecline={handleDeclineRequest}
      />

      <PaymentVerificationModal
        isOpen={!!selectedVerificationBooking}
        booking={selectedVerificationBooking}
        onClose={() => setSelectedVerificationBooking(null)}
        onSuccess={handlePaymentVerificationSuccess}
      />

      <WeighingPricingModal
        isOpen={!!selectedWeighingBooking}
        booking={selectedWeighingBooking}
        onClose={() => setSelectedWeighingBooking(null)}
        onConfirm={handleConfirmWeighingPricing}
      />

      <AssignRiderModal
        isOpen={!!riderModalBooking}
        booking={riderModalBooking}
        mode={riderModalMode}
        onClose={() => setRiderModalBooking(null)}
        onSuccess={handleRiderAssignSuccess}
      />
    </div>
  );
};

export default ServiceTerminal;
