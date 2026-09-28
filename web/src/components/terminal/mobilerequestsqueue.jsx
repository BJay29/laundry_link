import React, { useState } from 'react';
import { Bell, Weight, Banknote, Inbox, Bike, PackageCheck, Lock } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

/**
 * MOBILE REQUESTS QUEUE COMPONENT
 *
 * Replaces the three separate bell dropdowns that used to sit in
 * ServiceTerminal.jsx's header. Rendered only when the parent's
 * currentView === 'mobile_requests'.
 *
 * Three internal sub-tabs, one per existing queue (each has a different
 * action, so they stay separate instead of being merged into one list):
 *   - Requests -> awaitingApproval      -> opens BookingRequestModal (Accept / Decline)
 *   - Weighing -> awaitingWeighing      -> opens WeighingPricingModal (Finalize Price)
 *   - Payment  -> pendingVerification   -> opens PaymentVerificationModal (Approve / Reject)
 *
 * Like ActiveTerminalTable, this component owns no API calls or modals.
 * The lists and the "open modal" handlers come from the parent — this
 * component only displays the queues and reports which row was clicked.
 *
 * UPDATED (Rider Assignment feature — Pickup & Delivery, flow clarity
 * fix): the Weighing sub-tab is where a delivery booking sits while the
 * pickup rider is still en route to the customer's address (the
 * laundry hasn't reached the shop yet, so it can't be weighed).
 *
 * PREVIOUSLY both "Assign Rider" and "Weigh & Price" showed side by
 * side for every delivery row, regardless of whether a rider had been
 * assigned yet — this made the two-step sequence (assign rider FIRST,
 * weigh only once the laundry has actually reached the counter) look
 * like two equally-valid, unordered choices, which confused staff.
 *
 * NOW, for a delivery row with fulfillment_mode === 'delivery':
 *   - No rider assigned yet: "Assign Rider" is the ONLY active button.
 *     "Weigh & Price" renders disabled/greyed-out with a lock icon and
 *     a tooltip explaining why, plus a small "Awaiting pickup" status
 *     chip above the actions.
 *   - Rider assigned: "Weigh & Price" becomes the active/primary
 *     button. The rider assignment collapses into a smaller secondary
 *     badge (still tappable, to reassign if needed) next to it, and
 *     the status chip changes to "Ready to weigh".
 * Drop-off rows are completely unaffected — they only ever show an
 * active "Weigh & Price", same as before.
 *
 * This is a UI-only clarity fix — no backend gating was added. Staff
 * could, in principle, still finalize pricing for a delivery booking
 * before a rider is picked up (the backend doesn't forbid it), but the
 * interface now visually guides them through the intended order
 * instead of presenting both actions as interchangeable.
 *
 * The parent's Tier 1 badge count is
 *   awaitingApproval.length + awaitingWeighing.length + pendingVerification.length
 * so it always matches the three sub-tab counts shown here.
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

  return (
    <>
      {/* SUB-TABS */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const count = lists[s.key].length;
          const isActive = activeSection === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-tight transition-all ${
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

      {/* QUEUE TABLE */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/50">
                {['Customer Name', 'Service Type', 'Amount', 'Received', 'Action'].map((h) => (
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
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-32">
                    <div className="flex flex-col items-center gap-3">
                      <Inbox size={48} className="text-slate-100" />
                      <p className="text-slate-500 font-black text-base uppercase tracking-tight">
                        {section.emptyTitle}
                      </p>
                      <p className="text-slate-300 text-xs font-bold">{section.emptyHint}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const note = getAmountNote(item);
                  const isDeliveryWeighingRow = activeSection === 'weighing' && item.fulfillment_mode === 'delivery';
                  const hasPickupRider = Boolean(item.pickup_rider_name);
                  // NEW (flow clarity fix) — Weigh & Price is only
                  // meaningfully actionable for a delivery row once a
                  // rider has actually been assigned to fetch the
                  // laundry. Drop-off rows are never gated.
                  const weighingLocked = isDeliveryWeighingRow && !hasPickupRider;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Customer */}
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-[10px] shrink-0">
                            {item.customer_name?.charAt(0).toUpperCase() || 'C'}
                          </div>
                          <span className="text-slate-900 font-black text-sm truncate max-w-[180px]">
                            {item.customer_name}
                          </span>
                        </div>
                      </td>

                      {/* Service */}
                      <td className="px-8 py-7 text-slate-600 font-bold text-xs uppercase tracking-tight">
                        {item.service_type}
                      </td>

                      {/* Amount */}
                      <td className="px-8 py-7">
                        <span className="text-emerald-600 font-black text-sm">{getAmount(item)}</span>
                        {note && (
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">
                            {note}
                          </p>
                        )}
                      </td>

                      {/* Received */}
                      <td className="px-8 py-7 text-slate-400 font-bold text-xs whitespace-nowrap">
                        {formatRelativeTime(item.booking_timestamp || item.created_at)}
                      </td>

                      {/* Action */}
                      <td className="px-8 py-7">
                        <div className="flex flex-col gap-1.5 items-start">
                          {/* NEW (flow clarity fix) — small status chip
                              above the buttons, only for delivery rows
                              in the Weighing sub-tab, so staff see at a
                              glance which step this booking is on. */}
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
                              title={
                                weighingLocked
                                  ? 'Assign a rider to collect the laundry first'
                                  : undefined
                              }
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default MobileRequestsQueue;