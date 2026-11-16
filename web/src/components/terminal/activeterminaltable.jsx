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
  Navigation,
  Repeat,
} from 'lucide-react';
import { formatTime, formatCurrency } from '../../utils/formatters';
import { getCollectInfo } from '../../utils/collect';
import { getQuantity } from '../../utils/quantity';
import DeliveryAddress from '../ui/deliveryaddress';
import useMediaQuery from '../../hooks/useMediaQuery';

/**
 * ACTIVE TERMINAL TABLE COMPONENT
 *
 * Renders ONLY when the parent's currentView === 'active_terminal'.
 * All data fetching and mutation logic live in the PARENT (ServiceTerminal)
 * and are passed down as props — this component owns only its Tier 2
 * filter state.
 *
 * TIER 2 FILTERS: All / Pending / In Progress / Ready / Out for Delivery
 * (mapped onto the existing Booking.status values).
 *
 * UPDATED (Responsive): sa desktop (lg: 1024px pataas) table pa rin; sa
 * phone/tablet, CARD LIST na — bawat order ay isang card na kumpleto ang
 * detalye at mga aksyon, kaya walang pahalang na scroll at hindi nasisira
 * ang layout. Iisa lang ang nire-render sa bawat oras (JS media query, hindi
 * CSS hidden) para hindi magulo ang status-dropdown refs.
 *
 * Lahat ng aksyon (Assign, To Dryer, Verify Payment, Assign Rider, Out for
 * Delivery, Mark Delivered, Release to Customer) ay nasa iisang
 * renderOperations() na ginagamit ng table at ng card — walang nabago sa
 * lohika.
 *
 * UI NOTE: icons are lucide-react only — no emojis.
 */

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Ready', 'Out for Delivery', 'Claimed', 'Cancelled'];

const fmtDeliveryDate = (value) => {
  if (!value) return null;
  let text = String(value).trim();
  if (!/(Z|[+-]\d{2}:?\d{2})$/.test(text)) text += 'Z';
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' });
};

const STATUS_FILTERS = [
  { value: 'all',         label: 'All Orders',                    icon: List },
  { value: 'Pending',     label: 'Pending Setup',                 icon: Clock },
  { value: 'In Progress', label: 'In Progress',                   icon: Loader },
  { value: 'Ready',       label: 'Ready for Pickup / Delivery',   icon: PackageCheck },
  { value: 'Out for Delivery', label: 'Out for Delivery',         icon: Truck },
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
  handleOpenDeliveryRiderModal,
}) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

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
      case 'out for delivery': return 'bg-sky-50 text-sky-600 border-sky-100';
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

  // ── Shared pieces (table AT card) ────────────────────────────────────────

  const renderCustomer = (booking) => {
    const isDelivery = booking.fulfillment_mode === 'delivery';
    const isSwitched = Boolean(booking.switched_to_delivery_at);
    const collect = getCollectInfo(booking);
    const deliverOn = isDelivery ? fmtDeliveryDate(booking.delivery_datetime) : null;

    return (
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-[10px] shrink-0">
          {booking.customer_name?.charAt(0).toUpperCase() || 'C'}
        </div>
        <div className="min-w-0">
          <span className="block text-slate-900 font-black text-sm truncate max-w-[150px] sm:max-w-[260px] lg:max-w-[150px]">
            {booking.customer_name}
          </span>
          {/* Delivery address + Open in Maps (delivery lang) */}
          <DeliveryAddress booking={booking} variant="compact" />

          {isDelivery && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {isSwitched && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 text-violet-600 border border-violet-100 text-[9px] font-black uppercase tracking-wide"
                  title="Customer switched this from drop-off to delivery"
                >
                  <Repeat size={9} />
                  Switched
                </span>
              )}
              {deliverOn && (
                <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                  Deliver {deliverOn}
                </span>
              )}
              {collect.amount > 0 && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-black uppercase tracking-wide whitespace-nowrap"
                  title={collect.label}
                >
                  <Banknote size={9} />
                  Collect {formatCurrency(collect.amount)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStatusButton = (booking) => {
    const isDropdownOpen = openStatusDropdownId === booking.id;
    return (
      <button
        type="button"
        ref={(el) => { statusButtonRefs.current[booking.id] = el; }}
        onClick={() => toggleStatusDropdown(booking.id)}
        className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[9px] uppercase font-black tracking-widest border transition-all hover:brightness-95 whitespace-nowrap ${getStatusStyle(booking.status)}`}
      >
        {booking.status}
        <ChevronDown size={11} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>
    );
  };

  const renderOperations = (booking) => {
    const movableToDryerLoads = getMovableToDryerLoads(booking);
    const totalLoads = booking.machine_assignments?.length > 1;
    const isDelivery = booking.fulfillment_mode === 'delivery';
    const hasDeliveryRider = Boolean(booking.delivery_rider_name);

    return (
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

        {/* CASE 'In Progress' — per-load Move to Dryer */}
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

        {/* Online Payment — quick-access verify button */}
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

        {/* Delivery row na hindi pa Ready: "For Delivery" chip + (In Progress) rider */}
        {isDelivery && (booking.status === 'Pending' || booking.status === 'In Progress') && (
          <>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-sky-50 text-sky-600 rounded-xl text-[10px] font-black uppercase tracking-tight border border-sky-100"
              title="This order will be delivered to the customer"
            >
              <Truck size={13} />
              For Delivery
            </span>

            {booking.status === 'In Progress' && (
              hasDeliveryRider ? (
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
              )
            )}
          </>
        )}

        {/* 'Out for Delivery' — nasa daan na ang rider */}
        {booking.status === 'Out for Delivery' && (
          <>
            <button
              onClick={() => handleOpenDeliveryRiderModal(booking)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-sky-50 text-sky-600 rounded-xl text-[10px] font-black uppercase tracking-tight border border-sky-100 hover:bg-sky-100 transition-all active:scale-90"
              title="Tap to change rider"
            >
              <Bike size={13} />
              {booking.delivery_rider_name || 'Rider'}
            </button>
            <button
              onClick={() => handleStatusUpdate(booking.id, 'Claimed')}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-emerald-500 text-white rounded-xl transition-all shadow-sm shadow-emerald-200 hover:bg-emerald-600 active:scale-90 text-[10px] font-black uppercase tracking-tight"
              title="Mark as delivered"
            >
              <CheckCircle size={13} />
              Mark Delivered
            </button>
          </>
        )}

        {/* 'Ready' — Release to Customer (drop-off) vs rider + Out for Delivery */}
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
                  onClick={() => handleStatusUpdate(booking.id, 'Out for Delivery')}
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-sky-500 text-white rounded-xl transition-all shadow-sm shadow-sky-200 hover:bg-sky-600 active:scale-90 text-[10px] font-black uppercase tracking-tight"
                  title="Rider is leaving with the laundry"
                >
                  <Navigation size={13} />
                  Out for Delivery
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
    );
  };

  // ── Views ────────────────────────────────────────────────────────────────

  const renderEmpty = () => (
    <div className="flex flex-col items-center gap-3 text-center py-16 sm:py-32 px-4">
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
  );

  const renderTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-50 bg-slate-50/50">
            {['Time', 'Customer Name', 'Service Type', 'Quantity', 'Machines', 'Price', 'Status', 'Operations'].map(h => (
              <th
                key={h}
                className="text-left px-4 xl:px-8 py-5 xl:py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {filteredRows.map((booking) => {
            const quantity = getQuantity(booking);
            return (
              <tr
                key={booking.id}
                className={`hover:bg-slate-50/50 transition-colors group ${
                  needsMachineAssign(booking) ? 'bg-amber-50/20' : ''
                }`}
              >
                <td className="px-4 xl:px-8 py-6 xl:py-7">
                  <div className="flex items-center gap-2 text-slate-500 font-bold text-xs whitespace-nowrap">
                    <Clock size={14} className="text-slate-300" />
                    {formatTime(booking.booking_timestamp || booking.created_at)}
                  </div>
                </td>

                <td className="px-4 xl:px-8 py-6 xl:py-7">{renderCustomer(booking)}</td>

                <td className="px-4 xl:px-8 py-6 xl:py-7 text-slate-600 font-bold text-xs uppercase tracking-tight">
                  {booking.service_type}
                </td>

                <td className="px-4 xl:px-8 py-6 xl:py-7 text-slate-500 font-black text-sm tracking-tighter whitespace-nowrap">
                  {quantity.value}{' '}
                  <span className="text-[10px] text-slate-300 uppercase">{quantity.unit}</span>
                </td>

                <td className="px-4 xl:px-8 py-6 xl:py-7">
                  <div className="flex items-center gap-2">
                    <HardDrive
                      size={14}
                      className={needsMachineAssign(booking) ? 'text-amber-400' : 'text-sky-400'}
                    />
                    {getMachineDisplay(booking)}
                  </div>
                </td>

                <td className="px-4 xl:px-8 py-6 xl:py-7">
                  <span className="text-emerald-600 font-black text-sm">
                    {formatCurrency(booking.total_price || 0)}
                  </span>
                </td>

                <td className="px-4 xl:px-8 py-6 xl:py-7 relative">{renderStatusButton(booking)}</td>

                <td className="px-4 xl:px-8 py-6 xl:py-7">{renderOperations(booking)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderCards = () => (
    <div className="space-y-3">
      {filteredRows.map((booking) => {
        const quantity = getQuantity(booking);
        return (
          <div
            key={booking.id}
            className={`bg-white rounded-2xl border shadow-sm p-4 ${
              needsMachineAssign(booking) ? 'border-amber-100 bg-amber-50/20' : 'border-slate-100'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              {renderCustomer(booking)}
              <div className="shrink-0">{renderStatusButton(booking)}</div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Service</p>
                <p className="text-slate-600 font-bold text-xs uppercase tracking-tight break-words">
                  {booking.service_type}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Quantity</p>
                <p className="text-slate-500 font-black text-sm tracking-tighter">
                  {quantity.value}{' '}
                  <span className="text-[10px] text-slate-300 uppercase">{quantity.unit}</span>
                </p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Machines</p>
                <div className="flex items-center gap-1.5">
                  <HardDrive
                    size={13}
                    className={needsMachineAssign(booking) ? 'text-amber-400' : 'text-sky-400'}
                  />
                  {getMachineDisplay(booking)}
                </div>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Price</p>
                <p className="text-emerald-600 font-black text-sm">
                  {formatCurrency(booking.total_price || 0)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[11px] mt-3">
              <Clock size={12} className="text-slate-300" />
              {formatTime(booking.booking_timestamp || booking.created_at)}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-50">{renderOperations(booking)}</div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {/* TIER 2: SUB-STATUS FILTER PILLS (nag-i-scroll pahalang sa phone) */}
      <div className="flex items-center gap-1 sm:gap-2 mb-4 overflow-x-auto sm:flex-wrap pb-1">
        {STATUS_FILTERS.map((filter) => {
          const isActive = statusFilter === filter.value;
          const Icon = filter.icon;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={`flex items-center gap-2 text-sm whitespace-nowrap shrink-0 ${
                isActive
                  ? 'border-b-2 border-blue-600 text-blue-600 font-bold px-3 sm:px-4 py-2 transition'
                  : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 px-3 sm:px-4 py-2 transition'
              }`}
            >
              <Icon size={15} />
              {filter.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl lg:rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex flex-col items-center justify-center py-28 lg:py-44">
            <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-sky-500 border-r-transparent mb-4" />
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Loading...</p>
          </div>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="bg-white rounded-2xl lg:rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          {renderEmpty()}
        </div>
      ) : isDesktop ? (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          {renderTable()}
        </div>
      ) : (
        renderCards()
      )}

      {/* PORTAL: Status dropdown menu — fixed positioning sa document.body
          para hindi maputol ng overflow ng table/card. */}
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