import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import {
  Package,
  Clock,
  CheckCircle,
  Archive,
  HardDrive,
  AlertTriangle,
  Cpu,
  ChevronDown,
  Banknote,
  List,
  Loader,
  PackageCheck,
  Truck,
  Bike,
  Phone,
} from 'lucide-react';
import { formatTime, formatCurrency } from '../../utils/formatters';

/**
 * ACTIVE TERMINAL TABLE COMPONENT
 *
 * Extracted from ServiceTerminal.jsx's main table markup as part of the
 * 2-tier navigation restructure (Tier 1: page-level workflow tabs in
 * ServiceTerminal.jsx; Tier 2: this component's own sub-status filter
 * pills, scoped only to the "Active Terminal" view).
 *
 * Renders ONLY when the parent's currentView === 'active_terminal'.
 * All data fetching, polling, and mutation logic (loadBookings,
 * handleStatusUpdate, handleOpenAssignModal, etc.) live in the PARENT
 * and are passed down as props — this component owns no API calls, only
 * its local Tier 2 filter state.
 *
 * TIER 2 FILTER MAPPING (onto the EXISTING Booking.status values — no
 * new backend field):
 *   - All Orders                     -> no filter
 *   - Pending Setup                  -> status === 'Pending'
 *   - In Progress                    -> status === 'In Progress'
 *   - Ready for Pickup / Delivery    -> status === 'Ready'
 * "Awaiting Weighing" / "Awaiting Payment" / "Awaiting Approval" never
 * appear in `bookings` — the backend's get_active_bookings() excludes
 * them (see the Mobile Requests tab instead).
 *
 * UPDATED (Rider Assignment feature — Pickup & Delivery): a 'Ready'
 * booking with fulfillment_mode === 'delivery' USED TO show a static,
 * non-interactive "For Delivery" label (no rider/dispatch feature
 * existed yet). It now shows either:
 *   - an "Assign Rider" button (opens AssignRiderModal in "delivery"
 *     mode) when booking.delivery_rider_name is still empty, or
 *   - a small rider badge (name + phone icon) once assigned, which is
 *     itself clickable to reassign, PLUS a "Mark Delivered" button that
 *     runs the existing handleStatusUpdate(booking.id, 'Claimed') flow.
 * The backend's assign_delivery_rider() only allows this while the
 * booking is 'In Progress' or 'Ready' — since this table only ever
 * shows 'Ready' rows reaching this branch, no extra client-side status
 * gate is needed here beyond the existing isDelivery + Ready check.
 *
 * Drop-off/counter bookings keep the original "Release to Customer"
 * action (handleStatusUpdate -> 'Claimed') unchanged — riders don't
 * apply to them.
 *
 * UI NOTE: icons are lucide-react only — no emojis.
 */

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Ready', 'Claimed', 'Cancelled'];

const STATUS_FILTERS = [
  { value: 'all',         label: 'All Orders',                    icon: List },
  { value: 'Pending',     label: 'Pending Setup',                 icon: Clock },
  { value: 'In Progress', label: 'In Progress',                   icon: Loader },
  { value: 'Ready',       label: 'Ready for Pickup / Delivery',   icon: PackageCheck },
];

const ActiveTerminalTable = ({
  bookings,
  loading,
  availableMachines,
  serviceRequiredPhases,
  needsMachineAssign,
  bookingHasMachine,
  openStatusDropdownId,
  dropdownPosition,
  statusButtonRefs,
  toggleStatusDropdown,
  closeStatusDropdown,
  handleStatusSelect,
  handleStatusUpdate,
  handleOpenAssignModal,
  handleOpenMoveToDryerModal,
  handleOpenPaymentVerification,
  // NEW (Rider Assignment feature — Pickup & Delivery)
  handleOpenDeliveryRiderModal,
}) => {
  // --- TIER 2: SUB-STATUS FILTER ---
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredRows = bookings.filter((item) =>
    statusFilter === 'all' ? true : item.status === statusFilter
  );

  const openBooking = bookings.find((b) => b.id === openStatusDropdownId);

  // ── Helpers ──────────────────────────────────────────────────────────────

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
    const assignments = booking.machine_assignments || [];

    if (assignments.length > 0) {
      const sorted = [...assignments].sort((a, b) => a.load_number - b.load_number);
      return (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {sorted.map((a) => {
            const isDrying = a.phase === 'drying' || (a.phase === 'done' && a.dryer_number);
            const label = isDrying
              ? (a.dryer_number ? `D${a.dryer_number}` : '—')
              : (a.washer_number ? `W${a.washer_number}` : (a.dryer_number ? `D${a.dryer_number}` : '—'));
            return (
              <span
                key={a.id}
                className={`font-black text-[11px] tracking-tighter ${isDrying ? 'text-orange-500' : 'text-sky-600'}`}
              >
                {sorted.length > 1 ? `L${a.load_number}: ` : ''}{label}
              </span>
            );
          })}
        </div>
      );
    }

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

  const getMovableToDryerLoads = (booking) => {
    const requiredPhases = serviceRequiredPhases[booking.service_type] || 'full_service';
    if (requiredPhases === 'wash_only') return [];
    return (booking.machine_assignments || []).filter((a) => a.phase === 'washing');
  };

  return (
    <>
      {/* TIER 2: SUB-STATUS FILTER PILLS */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {STATUS_FILTERS.map((filter) => {
          const isActive = statusFilter === filter.value;
          const Icon = filter.icon;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={`flex items-center gap-2 text-sm ${
                isActive
                  ? 'border-b-2 border-blue-600 text-blue-600 font-bold px-4 py-2 transition'
                  : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 px-4 py-2 transition'
              }`}
            >
              <Icon size={15} />
              {filter.label}
            </button>
          );
        })}
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
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-32">
                      <div className="flex flex-col items-center gap-3">
                        <Package size={48} className="text-slate-100" />
                        <p className="text-slate-500 font-black text-base uppercase tracking-tight">
                          {statusFilter === 'all' ? 'Terminal Clear' : 'No Matching Orders'}
                        </p>
                        <p className="text-slate-300 text-xs font-bold">
                          {statusFilter === 'all'
                            ? 'No active transactions in the current queue.'
                            : 'Try a different filter, or check "All Orders".'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((booking) => {
                    const isDropdownOpen = openStatusDropdownId === booking.id;
                    const movableToDryerLoads = getMovableToDryerLoads(booking);
                    const totalLoads = booking.machine_assignments?.length > 1;
                    const isDelivery = booking.fulfillment_mode === 'delivery';
                    const hasDeliveryRider = Boolean(booking.delivery_rider_name);

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

                        {/* Status */}
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
                          <div className="flex flex-wrap items-center gap-2">
                            {/* CASE 'Pending' — Assign Machine */}
                            {needsMachineAssign(booking) && availableMachines.length > 0 && (
                              <button
                                onClick={() => handleOpenAssignModal(booking)}
                                className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-500 text-white rounded-xl transition-all shadow-sm shadow-amber-200 hover:bg-amber-600 active:scale-90 text-[10px] font-black uppercase tracking-tight"
                                title={`Assign ${booking.loads > 1 ? `${booking.loads} Machines` : 'Machine'}`}
                              >
                                <Cpu size={13} />
                                Assign{booking.loads > 1 ? ` (${booking.loads})` : ''}
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

                            {/* CASE 'In Progress' — per-load Move to Dryer
                                (the row-level "Mark as Done" for a fully
                                finished cycle is still the Status dropdown
                                -> Ready, same as before) */}
                            {movableToDryerLoads.map((assignment) => (
                              <button
                                key={assignment.id}
                                onClick={() => handleOpenMoveToDryerModal(booking, assignment.load_number)}
                                className="flex items-center gap-1.5 px-3 py-2.5 bg-orange-500 text-white rounded-xl transition-all shadow-sm shadow-orange-200 hover:bg-orange-600 active:scale-90 text-[10px] font-black uppercase tracking-tight"
                                title={`Move Load ${assignment.load_number} to Dryer`}
                              >
                                <HardDrive size={13} />
                                {totalLoads ? `L${assignment.load_number} to Dryer` : 'To Dryer'}
                              </button>
                            ))}

                            {/* Online Payment feature — quick-access verify
                                button, shown when pending_verification. */}
                            {booking.payment_status === 'pending_verification' && (
                              <button
                                onClick={() => handleOpenPaymentVerification(booking)}
                                className="flex items-center gap-1.5 px-3 py-2.5 bg-emerald-500 text-white rounded-xl transition-all shadow-sm shadow-emerald-200 hover:bg-emerald-600 active:scale-90 text-[10px] font-black uppercase tracking-tight"
                                title="Verify Online Payment"
                              >
                                <Banknote size={13} />
                                Verify Payment
                              </button>
                            )}

                            {/* CASE 'Ready' — Release to Customer (drop-off /
                                counter) vs rider assignment + Mark Delivered
                                (delivery). UPDATED (Rider Assignment
                                feature): the old static "For Delivery"
                                label is now interactive. */}
                            {booking.status === 'Ready' && (
                              isDelivery ? (
                                <>
                                  {hasDeliveryRider ? (
                                    <button
                                      onClick={() => handleOpenDeliveryRiderModal(booking)}
                                      className="flex items-center gap-1.5 px-3 py-2.5 bg-sky-50 text-sky-600 rounded-xl text-[10px] font-black uppercase tracking-tight border border-sky-100 hover:bg-sky-100 transition-all active:scale-90"
                                      title="Tap to change rider"
                                    >
                                      <Bike size={13} />
                                      {booking.delivery_rider_name}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleOpenDeliveryRiderModal(booking)}
                                      className="flex items-center gap-1.5 px-3 py-2.5 bg-sky-500 text-white rounded-xl transition-all shadow-sm shadow-sky-200 hover:bg-sky-600 active:scale-90 text-[10px] font-black uppercase tracking-tight"
                                      title="Assign a rider for this delivery"
                                    >
                                      <Truck size={13} />
                                      Assign Rider
                                    </button>
                                  )}

                                  {hasDeliveryRider && (
                                    <button
                                      onClick={() => handleStatusUpdate(booking.id, 'Claimed')}
                                      className="flex items-center gap-1.5 px-3 py-2.5 bg-emerald-500 text-white rounded-xl transition-all shadow-sm shadow-emerald-200 hover:bg-emerald-600 active:scale-90 text-[10px] font-black uppercase tracking-tight"
                                      title="Mark as delivered / claimed"
                                    >
                                      <CheckCircle size={13} />
                                      Mark Delivered
                                    </button>
                                  )}
                                </>
                              ) : (
                                <button
                                  onClick={() => handleStatusUpdate(booking.id, 'Claimed')}
                                  className="flex items-center gap-1.5 px-3 py-2.5 bg-sky-500 text-white rounded-xl transition-all shadow-lg shadow-sky-100 hover:bg-sky-600 active:scale-90 text-[10px] font-black uppercase tracking-tight"
                                  title="Release to Customer"
                                >
                                  <Archive size={13} />
                                  Release to Customer
                                </button>
                              )
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
              const isBlockedInProgress = option === 'In Progress' && !bookingHasMachine(openBooking);
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
    </>
  );
};

export default ActiveTerminalTable;
