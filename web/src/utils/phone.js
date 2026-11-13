/**
 * PH MOBILE NUMBER helpers.
 *
 * Tinatanggap lang ang tunay na PH mobile number — eksaktong 11 digits
 * na nagsisimula sa 09 (09171234567), o ang katumbas nito na +63 / 63
 * (+639171234567, 639171234567). Puwedeng may espasyo, gitling, o
 * panaklong habang nagta-type (0917 123 4567) — tinatanggal ang mga iyon.
 * Mas mahaba o mas maikli ay hindi valid.
 *
 * normalizePhMobile() -> "09XXXXXXXXX" (laging ganito ang format na
 * ipinapadala/sine-save) o null kung hindi valid.
 */
export const PH_MOBILE_HINT = 'Use a valid PH mobile number, e.g. 09171234567 or +639171234567.';

export const normalizePhMobile = (value) => {
  if (value === null || value === undefined) return null;
  const compact = String(value).replace(/[\s\-().]/g, '');
  const match = compact.match(/^(?:\+63|63|0)(9\d{9})$/);
  return match ? `0${match[1]}` : null;
};

export const isValidPhMobile = (value) => normalizePhMobile(value) !== null;

// Para sa input: tanging digits, +, espasyo at gitling lang ang pinapayagan.
export const sanitizePhoneInput = (value) => String(value ?? '').replace(/[^\d+\s-]/g, '').slice(0, 17);

// 09171234567 -> 0917 123 4567
export const formatPhMobile = (value) => {
  const n = normalizePhMobile(value);
  return n ? `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}` : String(value ?? '');
};