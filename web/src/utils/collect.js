/**
 * COLLECT INFO (Switch to Delivery) — magkano ang kokolektahin ng rider
 * sa pinto para sa isang delivery booking.
 *
 *   - Hindi pa bayad (cash/COD)           -> buong total_price (kasama na ang delivery fee)
 *   - Bayad na, orihinal na delivery      -> 0 (kasama na sa binayaran ang fee)
 *   - Bayad na, na-switch mula drop-off   -> delivery fee lang (hindi na-update ang total
 *                                            na binayaran na — see backend request_delivery)
 *
 * Ibinabalik: { amount, label } — amount 0 kung walang kokolektahin.
 */
export const getCollectInfo = (booking) => {
  if (!booking || booking.fulfillment_mode !== 'delivery') {
    return { amount: 0, label: '' };
  }

  const settled =
    booking.payment_status === 'paid' || booking.payment_status === 'pending_verification';
  const switched = Boolean(booking.switched_to_delivery_at);

  if (settled) {
    const fee = switched ? Number(booking.delivery_fee_charged || 0) : 0;
    return { amount: fee, label: 'Delivery fee' };
  }

  return { amount: Number(booking.total_price || 0), label: 'Cash on delivery' };
};