import React from 'react';
import { CalendarDays, Clock, Bike, Store, Truck } from 'lucide-react';
import DeliveryAddress from './deliveryaddress';

/**
 * SCHEDULE INFO
 *
 * Nagpapakita ng schedule ng mobile booking para alam ni staff kung
 * KAILAN ang drop-off o pickup. Binabasa ang mga totoong fields ng
 * BookingResponse (backend):
 *
 *   fulfillment_mode: 'dropoff' | 'delivery'
 *   dropoff_datetime, dropoff_window   -> drop-off bookings (OPTIONAL)
 *   pickup_datetime,  pickup_window    -> delivery bookings (REQUIRED ang datetime)
 *   window: 'morning' | 'afternoon' | 'evening' | 'anytime' | null
 *
 * UPDATED (Switch to Delivery): para sa booking na ginawang delivery ng
 * customer mula sa drop-off (switched_to_delivery_at), walang pickup leg
 * (nasa shop na ang laundry) — kaya ang ipinapakita ay ang "Delivery"
 * row: ang preferred na petsa ng hatid (delivery_datetime, optional).
 * Ang orihinal na delivery bookings ay pickup row pa rin, at kung may
 * delivery_datetime, may dagdag na Delivery row.
 *
 * UPDATED (Delivery address): ang address block sa 'full' variant ay
 * galing na sa shared <DeliveryAddress /> component, kaya may
 * "Open in Maps" na link na rin (gamit ang delivery_latitude /
 * delivery_longitude, o ang address text kung walang coordinates).
 *
 * NOTE: laging Asia/Manila ang pagpapakita ng oras, para pareho ang
 * makikita ng staff kahit anong timezone ng browser nila.
 *
 * Props:
 *   booking  - ang booking object
 *   variant  - 'compact' (table cell) | 'full' (modal)
 */

const TZ = 'Asia/Manila';

const WINDOW_LABELS = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  anytime: 'Anytime',
};

const parse = (value) => {
  if (!value) return null;
  let text = String(value).trim();
  // Kung walang timezone ang string (naive timestamp mula sa DB), UTC
  // ito — kung hindi, ituturing ng browser na local at 8 oras ang mali.
  if (!/(Z|[+-]\d{2}:?\d{2})$/.test(text)) text += 'Z';
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d;
};

const fmtDate = (d) =>
  d.toLocaleDateString('en-PH', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric' });

const fmtTime = (d) =>
  d.toLocaleTimeString('en-PH', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });

const buildRows = (booking) => {
  const isDelivery = booking?.fulfillment_mode === 'delivery';

  if (isDelivery) {
    const deliveryDate = parse(booking.delivery_datetime);
    const deliveryRow = {
      key: 'delivery',
      label: 'Delivery',
      hint: booking.switched_to_delivery_at ? 'Switched from drop-off' : 'Rider maghahatid',
      icon: Truck,
      tone: 'text-sky-500',
      date: deliveryDate ? fmtDate(deliveryDate) : null,
      // Petsa lang ang pinipili ng customer (naka-save bilang 12:00 PM),
      // kaya hindi ipinapakita ang oras.
      time: null,
      windowLabel: null,
      emptyText: 'No preferred delivery date',
      emptyIsWarning: false,
    };

    // Na-switch mula drop-off: walang pickup leg.
    if (booking.switched_to_delivery_at) return [deliveryRow];

    const d = parse(booking.pickup_datetime);
    const pickupRow = {
        key: 'pickup',
        label: 'Pickup',
        hint: 'Rider kukuha ng labada',
        icon: Bike,
        tone: 'text-violet-500',
        date: d ? fmtDate(d) : null,
        time: d ? fmtTime(d) : null,
        windowLabel: WINDOW_LABELS[booking.pickup_window] || null,
        emptyText: 'Pickup schedule not set',
        emptyIsWarning: true,
    };
    return deliveryDate ? [pickupRow, deliveryRow] : [pickupRow];
  }

  const d = parse(booking?.dropoff_datetime);
  return [
    {
      key: 'dropoff',
      label: 'Drop-off',
      hint: 'Customer pupunta sa shop',
      icon: Store,
      tone: 'text-emerald-500',
      date: d ? fmtDate(d) : null,
      time: d ? fmtTime(d) : null,
      windowLabel: WINDOW_LABELS[booking?.dropoff_window] || null,
      // Optional ang drop-off time, kaya hindi ito "error" kapag wala.
      emptyText: 'No preferred time — walk-in anytime',
      emptyIsWarning: false,
    },
  ];
};

const WindowChip = ({ label }) => (
  <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-black uppercase tracking-wide">
    {label}
  </span>
);

const ScheduleInfo = ({ booking, variant = 'compact' }) => {
  if (!booking) return null;
  const rows = buildRows(booking);

  if (variant === 'full') {
    return (
      <div className="space-y-3">
        {rows.map((row) => {
          const Icon = row.icon;
          const missing = !row.date && !row.windowLabel;
          return (
            <div key={row.key} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={13} className={row.tone} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {row.label}
                </p>
                <span className="text-[10px] font-bold text-slate-300">· {row.hint}</span>
              </div>

              {missing ? (
                <p
                  className={`text-sm font-black ${
                    row.emptyIsWarning ? 'text-amber-500' : 'text-slate-400'
                  }`}
                >
                  {row.emptyText}
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                  {row.date && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <CalendarDays size={14} className="text-slate-400" />
                        <span className="font-black text-slate-800 text-sm">{row.date}</span>
                      </div>
                      {row.time && (
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} className="text-slate-400" />
                          <span className="font-black text-slate-800 text-sm">{row.time}</span>
                        </div>
                      )}
                    </>
                  )}
                  {row.windowLabel && <WindowChip label={row.windowLabel} />}
                  {!row.date && row.windowLabel && (
                    <span className="text-xs font-bold text-slate-400">Exact time not specified</span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Address + Open in Maps (delivery lang; walang inilalabas kung wala) */}
        <DeliveryAddress booking={booking} variant="full" />
      </div>
    );
  }

  // COMPACT (table cell)
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row) => {
        const Icon = row.icon;
        const missing = !row.date && !row.windowLabel;
        return (
          <div key={row.key} className="flex items-start gap-1.5">
            <Icon size={12} className={`${row.tone} mt-0.5 shrink-0`} />
            <div className="leading-tight">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                {row.label}
              </span>
              {missing ? (
                <p
                  className={`text-[11px] font-black ${
                    row.emptyIsWarning ? 'text-amber-500' : 'text-slate-400'
                  }`}
                >
                  {row.emptyIsWarning ? 'Not set' : 'Anytime'}
                </p>
              ) : (
                <>
                  {row.date && (
                    <p className="text-[11px] font-black text-slate-700 whitespace-nowrap">
                      {row.date}{row.time ? ` · ${row.time}` : ''}
                    </p>
                  )}
                  {row.windowLabel && (
                    <p className="text-[10px] font-black text-sky-600 uppercase tracking-wide">
                      {row.windowLabel}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ScheduleInfo;