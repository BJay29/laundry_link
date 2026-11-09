import React from 'react';
import { MapPin, ExternalLink } from 'lucide-react';

/**
 * DELIVERY ADDRESS
 *
 * Reusable na nagpapakita ng address ng delivery booking at ng
 * "Open in Maps" na link, para iisang component ang gamit sa lahat
 * ng lugar (Mobile Requests table, Active Terminal table, review
 * modal, Assign Rider modal).
 *
 * Binabasa ang mga fields ng BookingResponse (backend):
 *   fulfillment_mode        -> dapat 'delivery'
 *   delivery_address_line   -> ang address na naka-snapshot sa booking
 *   delivery_latitude / delivery_longitude -> para sa Maps link
 *
 * Walang inilalabas kapag drop-off ang booking o walang address.
 *
 * Variants:
 *   'compact' - isang linya, pinaikli (para sa ilalim ng pangalan sa table)
 *   'inline'  - buong address (naka-wrap) + "Open in Maps" (para sa modal)
 *   'full'    - card na may label, address, at Maps button (para sa details)
 *
 * Maps link: kung may latitude at longitude, iyon ang gagamitin (mas
 * eksakto). Kung wala, hahanapin ng Google Maps gamit ang mismong
 * address text.
 */

export const hasDeliveryAddress = (booking) =>
  booking?.fulfillment_mode === 'delivery' && Boolean(booking?.delivery_address_line);

const isValidCoord = (value) =>
  value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

export const getMapsUrl = (booking) => {
  const lat = booking?.delivery_latitude;
  const lng = booking?.delivery_longitude;

  if (isValidCoord(lat) && isValidCoord(lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${Number(lat)},${Number(lng)}`;
  }

  const address = booking?.delivery_address_line;
  return address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;
};

const MapsLink = ({ url, children, className = '' }) => {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      // Hindi dapat ma-trigger ang click ng row/button sa paligid.
      onClick={(e) => e.stopPropagation()}
      className={className}
    >
      {children}
    </a>
  );
};

const DeliveryAddress = ({ booking, variant = 'compact' }) => {
  if (!hasDeliveryAddress(booking)) return null;

  const address = booking.delivery_address_line;
  const url = getMapsUrl(booking);

  if (variant === 'full') {
    return (
      <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <MapPin size={13} className="text-rose-500" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Pickup / Delivery Address
            </p>
          </div>
          <MapsLink
            url={url}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-600 text-[10px] font-black uppercase tracking-tight hover:bg-sky-100 transition-colors"
          >
            <ExternalLink size={11} />
            Open in Maps
          </MapsLink>
        </div>
        <p className="font-bold text-slate-700 text-sm">{address}</p>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-start gap-2">
        <MapPin size={13} className="text-rose-400 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-[11px] text-slate-600 font-bold leading-snug break-words">{address}</p>
          <MapsLink
            url={url}
            className="inline-flex items-center gap-1 mt-1 text-[10px] font-black uppercase tracking-tight text-sky-500 hover:text-sky-700 transition-colors"
          >
            <ExternalLink size={10} />
            Open in Maps
          </MapsLink>
        </div>
      </div>
    );
  }

  // COMPACT (sa ilalim ng pangalan ng customer sa table)
  return (
    <div className="flex items-center gap-1 mt-0.5 max-w-[220px]">
      <MapPin size={11} className="text-rose-400 shrink-0" />
      <span title={address} className="text-[10px] font-bold text-slate-400 truncate">
        {address}
      </span>
      <MapsLink
        url={url}
        className="shrink-0 text-sky-400 hover:text-sky-600 transition-colors"
      >
        <ExternalLink size={11} title="Open in Maps" />
      </MapsLink>
    </div>
  );
};

export default DeliveryAddress;