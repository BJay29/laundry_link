/**
 * QUANTITY HELPERS
 *
 * Ang service na per-LOAD ang presyo (hal. "Full Service") ay naka-save
 * sa database na may `weight = 0` at `loads = N` — sinadya ito ng
 * backend (_map_quantity_to_booking_fields). Kaya kapag direktang
 * `booking.weight` ang ipinakita sa table, "0 KG" ang lumalabas kahit
 * tama naman ang data.
 *
 * Ang helper na ito ay nagpapakita ng kilo kung may kilo, at ng bilang
 * ng loads kung wala.
 *
 *   weight > 0  -> { value: 6.5, unit: 'kg' }      -> "6.5 kg"
 *   weight = 0  -> { value: 2,   unit: 'loads' }   -> "2 loads"
 *                  { value: 1,   unit: 'load'  }   -> "1 load"
 */
export const getQuantity = (booking) => {
  const weight = Number(booking?.weight || 0);
  if (weight > 0) {
    return { value: weight, unit: 'kg' };
  }

  const loads = Number(booking?.loads || 1);
  return { value: loads, unit: loads === 1 ? 'load' : 'loads' };
};

/** Plain-text na bersyon, hal. "6.5 kg" o "2 loads". */
export const formatQuantity = (booking) => {
  const { value, unit } = getQuantity(booking);
  return `${value} ${unit}`;
};