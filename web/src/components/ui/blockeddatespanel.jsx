import React, { useState, useEffect, useCallback } from 'react';
import { CalendarX2, Plus, Trash2, Loader2, CalendarCheck } from 'lucide-react';
import apiService from '../../services/APIservices';

/**
 * "Fully Booked Dates" panel (Optimization Settings).
 *
 * Ang owner/staff ang nagmamarka ng petsang fully booked na. Hindi na
 * mapipili ng customer sa mobile ang mga petsang ito, at tinatanggihan
 * din ng backend ang booking sa petsang iyon.
 *
 * Props:
 *   onNotify — ({ type, title, message }) => void  (toast ng parent)
 */

const MAX_REASON = 200;

// Petsa ngayon sa Pilipinas (Asia/Manila) bilang YYYY-MM-DD — "en-CA"
// locale ay nagbibigay ng ISO-style format.
const manilaToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());

// "2026-11-14" -> "Sat, Nov 14, 2026" (walang timezone shift: UTC ang gamit
// sa parehong pag-parse at pag-format).
const formatDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const errorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => e?.msg || 'Invalid value').join(' | ');
  }
  return error?.message || fallback;
};

const BlockedDatesPanel = ({ onNotify }) => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [dateValue, setDateValue] = useState('');
  const [reason, setReason] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const notify = useCallback(
    (payload) => onNotify?.(payload),
    [onNotify]
  );

  const load = useCallback(async () => {
    try {
      setLoadError('');
      const data = await apiService.getBlockedDates();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      setLoadError(errorMessage(error, 'Could not load fully booked dates.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!dateValue) {
      notify({ type: 'error', title: 'Pick a date', message: 'Please choose the date to mark as fully booked.' });
      return;
    }
    if (dateValue < manilaToday()) {
      notify({ type: 'error', title: 'Invalid date', message: "You can't mark a past date as fully booked." });
      return;
    }

    try {
      setIsAdding(true);
      const created = await apiService.addBlockedDate({
        blocked_date: dateValue,
        reason: reason.trim() || null,
      });
      setItems((prev) =>
        [...prev, created].sort((a, b) => a.blocked_date.localeCompare(b.blocked_date))
      );
      setDateValue('');
      setReason('');
      notify({
        type: 'success',
        title: 'Date Marked Fully Booked',
        message: `${formatDate(created.blocked_date)} can no longer be picked by customers.`,
      });
    } catch (error) {
      notify({ type: 'error', title: 'Could Not Save', message: errorMessage(error, 'Could not save the date.') });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (item) => {
    try {
      setDeletingId(item.id);
      await apiService.deleteBlockedDate(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      notify({
        type: 'success',
        title: 'Date Reopened',
        message: `${formatDate(item.blocked_date)} is open for bookings again.`,
      });
    } catch (error) {
      notify({ type: 'error', title: 'Could Not Remove', message: errorMessage(error, 'Could not remove the date.') });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white p-10 rounded-[48px] border-2 border-slate-100 shadow-xl shadow-slate-200/50">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
          <CalendarX2 size={24} />
        </div>
        <h3 className="text-xl font-black text-slate-800 tracking-tight">Fully Booked Dates</h3>
      </div>
      <p className="text-xs text-slate-400 font-bold mb-8 ml-1">
        Mark the dates your shop can't take more bookings. Customers won't be able to pick these dates in the mobile app.
        Existing bookings on these dates are not affected.
      </p>

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 flex-wrap">
        <div className="space-y-2 min-w-[180px]">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
          <input
            type="date"
            value={dateValue}
            min={manilaToday()}
            onChange={(e) => setDateValue(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-black text-slate-800 focus:outline-none focus:border-rose-300"
          />
        </div>
        <div className="flex-1 space-y-2 min-w-[200px]">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
            Reason (optional)
          </label>
          <input
            type="text"
            value={reason}
            maxLength={MAX_REASON}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Holiday rush"
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-rose-300"
          />
        </div>
        <button
          type="submit"
          disabled={isAdding}
          className="bg-rose-600 hover:bg-rose-500 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-rose-100 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 whitespace-nowrap"
        >
          {isAdding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          Mark Fully Booked
        </button>
      </form>

      <div className="mt-8">
        {isLoading ? (
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
            <Loader2 size={16} className="animate-spin" /> Loading dates...
          </div>
        ) : loadError ? (
          <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-100">
            <p className="text-xs font-bold text-rose-600">{loadError}</p>
            <button
              type="button"
              onClick={() => { setIsLoading(true); load(); }}
              className="text-xs font-black text-rose-600 underline"
            >
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center gap-3 p-5 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-slate-400">
            <CalendarCheck size={20} />
            <p className="text-xs font-bold">No fully booked dates. Customers can pick any date.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-rose-50/50 border border-rose-100"
              >
                <div className="min-w-0">
                  <p className="font-black text-sm text-slate-800">{formatDate(item.blocked_date)}</p>
                  {item.reason && (
                    <p className="text-[11px] font-bold text-slate-500 mt-0.5 truncate">{item.reason}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                  title="Reopen this date"
                  className="p-2 rounded-xl bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-50 shrink-0"
                >
                  {deletingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default BlockedDatesPanel;