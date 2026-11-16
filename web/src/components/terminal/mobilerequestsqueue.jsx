import React, { useState } from 'react';
import { Bell, Weight, Banknote, Inbox, Bike, Lock } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import ScheduleInfo from '../ui/scheduleinfo';
import DeliveryAddress from '../ui/deliveryaddress';
import useMediaQuery from '../../hooks/useMediaQuery';

/**
 * MOBILE REQUESTS QUEUE COMPONENT
 *
 * Rendered only when the parent's currentView === 'mobile_requests'.
 *
 * Three internal sub-tabs, one per queue:
 *   - Requests -> awaitingApproval  -> BookingRequestModal (Accept / Decline)
 *   - Weighing -> awaitingWeighing  -> WeighingPricingModal (Finalize Price)
 *   - Payment  -> pendingVerification -> PaymentVerificationModal (Approve / Reject)
 *
 * Owns no API calls or modals — lists and "open modal" handlers come from
 * the parent.
 *
 * Delivery rows in Weighing: "Assign Rider" muna (Step 1 · Awaiting pickup);
 * kapag may pickup rider na, "Weigh & Price" na ang aktibo (Step 2). Drop-off
 * rows ay hindi naka-gate.
 *
 * UPDATED (Responsive): sa desktop (lg: 1024px pataas) table pa rin; sa
 * phone/tablet, CARD LIST — walang pahalang na scroll at buo ang detalye at
 * aksyon. Iisang renderAction()/renderCustomer() ang gamit ng dalawa.
 */

const SECTIONS = [
  {
    key: 'requests',
    label: 'Requests',
    icon: Bell,
    activeText: 'text-sky-600',
    badge: 'bg-sky-500',
    button: 'bg-sky-500 hover:bg-sky-600 shadow-sky-200',
    buttonLabel: 'Review',
    emptyTitle: 'No pending requests',
    emptyHint: 'New mobile bookings will appear here for Accept / Decline.',
  },
  {
    key: 'weighing',
    label: 'Weighing',
    icon: Weight,
    activeText: 'text-violet-600',
    badge: 'bg-violet-500',
    button: 'bg-violet-500 hover:bg-violet-600 shadow-violet-200',
    buttonLabel: 'Weigh & Price',
    emptyTitle: 'Nothing to weigh right now',
    emptyHint: 'Accepted mobile bookings wait here until the final weight is entered.',
  },
  {
    key: 'payment',
    label: 'Payment',
    icon: Banknote,
    activeText: 'text-emerald-600',
    badge: 'bg-emerald-500',
    button: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200',
    buttonLabel: 'Verify Payment',
    emptyTitle: 'Nothing to verify right now',
    emptyHint: 'GCash / PayMaya proofs of payment will appear here for Approve / Reject.',
  },
];

const TABLE_HEADERS = ['Customer Name', 'Service Type', 'Schedule', 'Amount', 'Received', 'Action'];

const formatRelativeTime = (isoString) => {
  if (!isoString) return '';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
};

const MobileRequestsQueue = ({
  awaitingApproval = [],
  awaitingWeighing = [],
  pendingVerification = [],
  onOpenRequest,
  onOpenWeighing,
  onOpenPayment,
  onOpenPickupRider,
}) => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const lists = {
    requests: awaitingApproval,
    weighing: awaitingWeighing,
    payment: pendingVerification,
  };

  const handlers = {
    requests: onOpenRequest,
    weighing: onOpenWeighing,
    payment: onOpenPayment,
  };

  const [activeSection, setActiveSection] = useState(
    () => SECTIONS.find((s) => lists[s.key].length > 0)?.key || 'requests'
  );

  const section = SECTIONS.find((s) => s.key === activeSection);
  const items = lists[activeSection];
  const SectionIcon = section.icon;

  const getAmount = (item) => {
    if (activeSection === 'weighing') {
      return `Est. ${formatCurrency(item.estimated_price ?? item.total_price ?? 0)}`;
    }
    return formatCurrency(item.total_price || 0);
  };

  const getAmountNote = (item) => {
    if (activeSection === 'payment') {
      return item.payment_method === 'gcash' ? 'GCash' : 'PayMaya';
    }
    return null;
  };

  // ── Shared pieces (table AT card) ────────────────────────────────────────

  const renderCustomer = (item) => (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-[10px] shrink-0">
        {item.customer_name?.charAt(0).toUpperCase() || 'C'}
      </div>
      <div className="min-w-0">
        <span className="block text-slate-900 font-black text-sm truncate max-w-[200px] sm:max-w-[300px] lg:max-w-[180px]">
          {item.customer_name}
        </span>
        <DeliveryAddress booking={item} variant="compact" />
      </div>
    </div>
  );

  const renderAmount = (item) => {
    const note = getAmountNote(item);
    return (
      <>
        <span className="text-emerald-600 font-black text-sm">{getAmount(item)}</span>
        {note && (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">
            {note}
          </p>
        )}
      </>
    );
  };

  const renderAction = (item) => {
    const isDeliveryWeighingRow = activeSection === 'weighing' && item.fulfillment_mode === 'delivery';
    const hasPickupRider = Boolean(item.pickup_rider_name);
    // Weigh & Price is only actionable for a delivery row once a rider is assigned.
    const weighingLocked = isDeliveryWeighingRow && !hasPickupRider;

    return (
      <div className="flex flex-col gap-1.5 items-start">
        {isDeliveryWeighingRow && (
          <span
            className={
              weighingLocked
                ? 'text-[9px] font-black uppercase tracking-widest text-amber-600'
                : 'text-[9px] font-black uppercase tracking-widest text-emerald-600'
            }
          >
            {weighingLocked ? 'Step 1 · Awaiting pickup' : 'Step 2 · Ready to weigh'}
          </span>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {isDeliveryWeighingRow && !hasPickupRider && (
            <button
              type="button"
              onClick={() => onOpenPickupRider?.(item)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-violet-500 text-white rounded-xl transition-all shadow-sm shadow-violet-200 hover:bg-violet-600 active:scale-90 text-[10px] font-black uppercase tracking-tight"
              title="Assign a rider to fetch this laundry"
            >
              <Bike size={13} />
              Assign Rider
            </button>
          )}

          {isDeliveryWeighingRow && hasPickupRider && (
            <button
              type="button"
              onClick={() => onOpenPickupRider?.(item)}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-50 text-violet-600 rounded-xl text-[10px] font-black uppercase tracking-tight border border-violet-100 hover:bg-violet-100 transition-all active:scale-90"
              title="Tap to change rider"
            >
              <Bike size={12} />
              {item.pickup_rider_name}
            </button>
          )}

          <button
            type="button"
            onClick={() => !weighingLocked && handlers[activeSection]?.(item)}
            disabled={weighingLocked}
            title={weighingLocked ? 'Assign a rider to collect the laundry first' : undefined}
            className={
              weighingLocked
                ? 'flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-tight cursor-not-allowed'
                : `flex items-center gap-1.5 px-3 py-2.5 text-white rounded-xl transition-all shadow-sm active:scale-90 text-[10px] font-black uppercase tracking-tight ${section.button}`
            }
          >
            {weighingLocked ? <Lock size={13} /> : <SectionIcon size={13} />}
            {section.buttonLabel}
          </button>
        </div>
      </div>
    );
  };

  // ── Views ────────────────────────────────────────────────────────────────

  const renderEmpty = () => (
    <div className="flex flex-col items-center gap-3 text-center py-16 sm:py-32 px-4">
      <Inbox size={48} className="text-slate-100" />
      <p className="text-slate-500 font-black text-base uppercase tracking-tight">
        {section.emptyTitle}
      </p>
      <p className="text-slate-300 text-xs font-bold">{section.emptyHint}</p>
    </div>
  );

  const renderTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-50 bg-slate-50/50">
            {TABLE_HEADERS.map((h) => (
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
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-4 xl:px-8 py-6 xl:py-7">{renderCustomer(item)}</td>
              <td className="px-4 xl:px-8 py-6 xl:py-7 text-slate-600 font-bold text-xs uppercase tracking-tight">
                {item.service_type}
              </td>
              <td className="px-4 xl:px-8 py-6 xl:py-7">
                <ScheduleInfo booking={item} variant="compact" />
              </td>
              <td className="px-4 xl:px-8 py-6 xl:py-7">{renderAmount(item)}</td>
              <td className="px-4 xl:px-8 py-6 xl:py-7 text-slate-400 font-bold text-xs whitespace-nowrap">
                {formatRelativeTime(item.booking_timestamp || item.created_at)}
              </td>
              <td className="px-4 xl:px-8 py-6 xl:py-7">{renderAction(item)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderCards = () => (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-start justify-between gap-3">
            {renderCustomer(item)}
            <span className="shrink-0 text-slate-400 font-bold text-[11px] whitespace-nowrap">
              {formatRelativeTime(item.booking_timestamp || item.created_at)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Service</p>
              <p className="text-slate-600 font-bold text-xs uppercase tracking-tight break-words">
                {item.service_type}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Amount</p>
              {renderAmount(item)}
            </div>
          </div>

          <div className="mt-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Schedule</p>
            <ScheduleInfo booking={item} variant="compact" />
          </div>

          <div className="mt-3 pt-3 border-t border-slate-50">{renderAction(item)}</div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* SUB-TABS (nag-i-scroll pahalang sa phone) */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto sm:flex-wrap pb-1">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const count = lists[s.key].length;
          const isActive = activeSection === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-tight transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? `bg-white border-slate-200 shadow-sm ${s.activeText}`
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-600 hover:bg-white/60'
              }`}
            >
              <Icon size={15} />
              {s.label}
              {count > 0 && (
                <span
                  className={`min-w-[20px] h-5 px-1.5 ${s.badge} text-white text-[10px] font-black rounded-full flex items-center justify-center`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
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
    </>
  );
};

export default MobileRequestsQueue;