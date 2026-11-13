import React, { useState, useEffect, useCallback } from 'react';
import { Store, Loader2, Save, Clock, Wifi, WifiOff, Power } from 'lucide-react';
import apiService from '../../services/APIservices';

/**
 * "Shop Status" panel (Optimization Settings).
 *
 * Bukas ang shop sa mobile app lang kapag LAHAT ay totoo:
 *   1. naka-ON ang "Accepting bookings" (manual, dito),
 *   2. nasa loob ng operating hours (kung nakatakda; oras sa Pilipinas),
 *   3. konektado ang terminal (heartbeat — may 3 minutong grace period).
 *
 * Props:
 *   onNotify — ({ type, title, message }) => void  (toast ng parent)
 */

const errorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || 'Invalid value').join(' | ');
  return fallback;
};

const fmt12 = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

const ShopStatusPanel = ({ onNotify }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingToggle, setSavingToggle] = useState(false);
  const [savingHours, setSavingHours] = useState(false);

  const [useHours, setUseHours] = useState(false);
  const [opening, setOpening] = useState('08:00');
  const [closing, setClosing] = useState('20:00');

  const applyStatus = useCallback((s, { syncForm = false } = {}) => {
    setStatus(s);
    if (syncForm) {
      setUseHours(Boolean(s.opening_time && s.closing_time));
      if (s.opening_time) setOpening(s.opening_time);
      if (s.closing_time) setClosing(s.closing_time);
    }
  }, []);

  const load = useCallback(
    async (syncForm = false) => {
      try {
        applyStatus(await apiService.getShopStatus(), { syncForm });
      } catch (err) {
        if (syncForm) {
          onNotify?.({ type: 'error', title: 'Shop Status Failed to Load', message: errorMessage(err, 'Please try again.') });
        }
      } finally {
        setLoading(false);
      }
    },
    [applyStatus, onNotify]
  );

  useEffect(() => {
    load(true);
    // Refresh lang ng chip (hindi ng form) para makita ang live na status.
    const timer = setInterval(() => load(false), 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleAccepting = async () => {
    if (!status || savingToggle) return;
    const next = !status.accepting_bookings;
    setSavingToggle(true);
    try {
      applyStatus(await apiService.updateShopStatus({ accepting_bookings: next }));
      onNotify?.({
        type: 'success',
        title: next ? 'Accepting Bookings' : 'Bookings Paused',
        message: next
          ? 'Customers can book again while your terminal is online.'
          : 'Customers can no longer book until you turn this back on.',
      });
    } catch (err) {
      onNotify?.({ type: 'error', title: 'Update Failed', message: errorMessage(err, 'Please try again.') });
    } finally {
      setSavingToggle(false);
    }
  };

  const hoursInvalid = useHours && (!opening || !closing || opening === closing);

  const saveHours = async () => {
    if (savingHours || hoursInvalid) return;
    setSavingHours(true);
    try {
      applyStatus(
        await apiService.updateShopStatus({
          opening_time: useHours ? opening : null,
          closing_time: useHours ? closing : null,
        }),
        { syncForm: true }
      );
      onNotify?.({
        type: 'success',
        title: 'Operating Hours Saved',
        message: useHours ? `Open daily ${fmt12(opening)} – ${fmt12(closing)}.` : 'Operating hours removed.',
      });
    } catch (err) {
      onNotify?.({ type: 'error', title: 'Save Failed', message: errorMessage(err, 'Please try again.') });
    } finally {
      setSavingHours(false);
    }
  };

  const savedHoursChanged =
    status &&
    ((useHours ? opening : null) !== (status.opening_time || null) ||
      (useHours ? closing : null) !== (status.closing_time || null));

  return (
    <div className="bg-white p-10 rounded-[48px] border-2 border-slate-100 shadow-xl shadow-slate-200/50">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 bg-sky-50 rounded-2xl text-sky-500">
          <Store size={22} />
        </div>
        <h3 className="text-xl font-black text-slate-900 tracking-tight">Shop Status</h3>
      </div>
      <p className="text-slate-400 text-sm font-medium mb-8">
        Your shop shows as Open in the mobile app only when bookings are on, it's within your operating hours,
        and your terminal is online.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
          <Loader2 size={16} className="animate-spin" /> Loading...
        </div>
      ) : !status ? (
        <p className="text-sm font-bold text-rose-500">Couldn't load the shop status.</p>
      ) : (
        <div className="space-y-6">
          {/* LIVE STATUS */}
          <div
            className={`flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4 border ${
              status.is_open ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white ${
                status.is_open ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            >
              {status.is_open ? 'Open' : 'Closed'}
            </span>
            <span className="text-sm font-bold text-slate-600 flex-1 min-w-[200px]">
              {status.is_open ? 'Customers can book from the mobile app.' : status.closed_reason}
            </span>
            <span
              className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-tight ${
                status.terminal_connected ? 'text-emerald-600' : 'text-amber-600'
              }`}
              title="Terminal connection"
            >
              {status.terminal_connected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {status.terminal_connected ? 'Terminal online' : 'Terminal offline'}
            </span>
          </div>

          {/* ACCEPTING TOGGLE */}
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 px-5 py-4">
            <div>
              <p className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Power size={15} className="text-sky-500" /> Accepting bookings
              </p>
              <p className="text-xs font-medium text-slate-400 mt-0.5">
                Turn off to pause new mobile bookings (e.g. lunch break, no staff today). Ongoing orders aren't affected.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={status.accepting_bookings}
              onClick={toggleAccepting}
              disabled={savingToggle}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                status.accepting_bookings ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  status.accepting_bookings ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* OPERATING HOURS */}
          <div className="rounded-2xl border border-slate-100 px-5 py-4 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useHours}
                onChange={(e) => setUseHours(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Clock size={15} className="text-sky-500" /> Set operating hours
              </span>
            </label>

            {useHours && (
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Opens</p>
                  <input
                    type="time"
                    value={opening}
                    onChange={(e) => setOpening(e.target.value)}
                    className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 bg-slate-50/50 outline-none focus:ring-4 ring-sky-50 focus:border-sky-300"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Closes</p>
                  <input
                    type="time"
                    value={closing}
                    onChange={(e) => setClosing(e.target.value)}
                    className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 bg-slate-50/50 outline-none focus:ring-4 ring-sky-50 focus:border-sky-300"
                  />
                </div>
                <p className="text-xs font-medium text-slate-400 pb-3">Philippine time, every day. Overnight hours (e.g. 8 PM – 2 AM) work too.</p>
              </div>
            )}

            {hoursInvalid && (
              <p className="text-[11px] font-bold text-rose-500">Choose different opening and closing times.</p>
            )}

            <button
              type="button"
              onClick={saveHours}
              disabled={savingHours || hoursInvalid || !savedHoursChanged}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 text-white text-xs font-black uppercase tracking-tight shadow-sm shadow-sky-200 hover:bg-sky-600 transition-all active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {savingHours ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save hours
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopStatusPanel;