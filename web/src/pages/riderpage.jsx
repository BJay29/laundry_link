import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bike,
  LogOut,
  RefreshCw,
  Phone,
  MapPin,
  Navigation,
  PackageCheck,
  Truck,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Clock,
  Loader2,
  StickyNote,
  Inbox,
  X,
  Hourglass,
} from 'lucide-react';
import apiService from '../services/APIservices';
import { formatCurrency } from '../utils/formatters';
import { formatPhMobile } from '../utils/phone';

/**
 * RIDER PAGE (NEW — Rider accounts)
 *
 * Sariling page ng naka-login na RIDER (role = "rider"). Walang sidebar,
 * walang dashboard — mga job lang na naka-assign sa kanya, na dinisenyo
 * para sa phone (isang kamay, malalaking button).
 *
 * Dalawang uri ng job:
 *   - PICKUP   : kunin ang maruming damit sa customer  → "Confirm Pickup"
 *   - DELIVERY : ihatid ang malinis na damit           → "Start Delivery" → "Mark Delivered"
 *
 * Sa delivery, kung may sisingilin (COD/cash na hindi pa bayad), kailangang
 * i-check ng rider na natanggap na niya ang pera bago ma-mark na delivered.
 *
 * Nagre-refresh mag-isa kada 30 segundo at kapag binalikan ang tab.
 */

const POLL_MS = 30000;

const fmtDateTime = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const WINDOW_LABEL = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  anytime: 'Anytime',
};

const mapsUrl = (job) => {
  if (job.latitude != null && job.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${job.latitude},${job.longitude}`;
  }
  if (job.address_line) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address_line)}`;
  }
  return null;
};

// Naka-literal ang bawat class para makita ng Tailwind JIT.
const LEG_STYLE = {
  pickup: {
    label: 'Pickup',
    Icon: PackageCheck,
    badge: 'bg-violet-50 text-violet-600',
    bar: 'bg-violet-500',
    btn: 'bg-violet-500 hover:bg-violet-600 shadow-violet-200',
  },
  delivery: {
    label: 'Delivery',
    Icon: Truck,
    badge: 'bg-sky-50 text-sky-600',
    bar: 'bg-sky-500',
    btn: 'bg-sky-500 hover:bg-sky-600 shadow-sky-200',
  },
};

const STAGE_CHIP = {
  pickup_pending: { text: 'To pick up', cls: 'bg-amber-50 text-amber-600' },
  picked_up: { text: 'Picked up', cls: 'bg-emerald-50 text-emerald-600' },
  waiting: { text: 'Being washed', cls: 'bg-slate-100 text-slate-500' },
  ready: { text: 'Ready to deliver', cls: 'bg-emerald-50 text-emerald-600' },
  on_the_way: { text: 'On the way', cls: 'bg-sky-50 text-sky-600' },
  done: { text: 'Delivered', cls: 'bg-emerald-50 text-emerald-600' },
};

const ACTION_LABEL = {
  picked_up: 'Confirm Pickup',
  start_delivery: 'Start Delivery',
  delivered: 'Mark as Delivered',
};

/* ------------------------------------------------------------------ */
/* Confirm bottom sheet                                                */
/* ------------------------------------------------------------------ */
const ConfirmSheet = ({ job, onCancel, onConfirm, busy, error }) => {
  const [cashReceived, setCashReceived] = useState(false);

  if (!job) return null;

  const needsCash = job.action === 'delivered' && job.collect_amount > 0;
  const canConfirm = !busy && (!needsCash || cashReceived);

  const titles = {
    picked_up: 'Confirm pickup?',
    start_delivery: 'Start delivery?',
    delivered: 'Mark as delivered?',
  };
  const texts = {
    picked_up: `You have received ${job.customer_name}'s laundry. The customer will be notified.`,
    start_delivery: `You are leaving the shop with ${job.customer_name}'s laundry. The customer will be notified.`,
    delivered: `You handed the laundry to ${job.customer_name}. This completes the order.`,
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4">
      <div className="bg-white w-full sm:max-w-sm rounded-t-[32px] sm:rounded-3xl shadow-2xl p-6 pb-8 sm:pb-6 animate-in slide-in-from-bottom-8 duration-200">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">{titles[job.action]}</h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="text-slate-300 hover:text-slate-500 p-1 -mr-1"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-sm font-bold text-slate-500 leading-relaxed">{texts[job.action]}</p>

        {needsCash && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 text-amber-700 rounded-2xl px-4 py-3">
              <Banknote size={22} className="shrink-0" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest">Collect from customer</p>
                <p className="text-2xl font-black tracking-tight">{formatCurrency(job.collect_amount)}</p>
              </div>
            </div>
            <label className="flex items-start gap-3 cursor-pointer select-none bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
              <input
                type="checkbox"
                checked={cashReceived}
                onChange={(e) => setCashReceived(e.target.checked)}
                className="mt-0.5 h-5 w-5 accent-emerald-500"
              />
              <span className="text-sm font-black text-slate-700">I received the full amount in cash</span>
            </label>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 text-rose-600 bg-rose-50 rounded-xl px-3 py-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 py-3.5 rounded-2xl border-2 border-slate-100 text-slate-400 font-black text-sm active:scale-95 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(needsCash ? cashReceived : false)}
            disabled={!canConfirm}
            className={`flex-[2] py-3.5 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all ${
              canConfirm
                ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
                : 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed'
            }`}
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} /> Confirm
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Job card                                                            */
/* ------------------------------------------------------------------ */
const JobCard = ({ job, onAction }) => {
  const leg = LEG_STYLE[job.leg] || LEG_STYLE.delivery;
  const LegIcon = leg.Icon;
  const chip = STAGE_CHIP[job.stage] || STAGE_CHIP.waiting;
  const maps = mapsUrl(job);
  const when =
    job.leg === 'pickup'
      ? fmtDateTime(job.pickup_datetime) || (job.pickup_window ? WINDOW_LABEL[job.pickup_window] : null)
      : null;
  const doneAt =
    job.leg === 'pickup' ? fmtDateTime(job.picked_up_at) : fmtDateTime(job.completed_at);
  const hasAction = Boolean(job.action);

  return (
    <article className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className={`h-1.5 ${leg.bar}`} />
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${leg.badge}`}
          >
            <LegIcon size={13} /> {leg.label}
          </span>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${chip.cls}`}>
              {chip.text}
            </span>
            <span className="text-[10px] font-black text-slate-300">#{job.booking_id}</span>
          </div>
        </div>

        {/* Customer */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center shrink-0">
            {job.customer_name?.charAt(0).toUpperCase() || 'C'}
          </div>
          <div className="min-w-0">
            <p className="font-black text-slate-900 text-base leading-tight truncate">{job.customer_name}</p>
            <p className="text-xs font-bold text-slate-400 truncate">
              {job.service_type}
              {job.loads ? ` · ${job.loads} load${job.loads > 1 ? 's' : ''}` : ''}
              {job.weight ? ` · ${job.weight} kg` : ''}
            </p>
          </div>
        </div>

        {/* Address */}
        {job.address_line && (
          <div className="flex items-start gap-2.5 bg-slate-50 rounded-2xl px-4 py-3">
            <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="text-sm font-bold text-slate-700 leading-snug">{job.address_line}</p>
          </div>
        )}

        {/* Schedule / done time */}
        {(when || doneAt) && (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Clock size={14} className="text-slate-300" />
            {job.stage === 'done' || job.stage === 'picked_up'
              ? `Completed ${doneAt || ''}`
              : `Pickup time: ${when}`}
          </div>
        )}

        {/* Special instructions */}
        {job.special_instructions && (
          <div className="flex items-start gap-2.5 bg-amber-50/70 border border-amber-100 rounded-2xl px-4 py-3">
            <StickyNote size={15} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-amber-700 leading-snug">{job.special_instructions}</p>
          </div>
        )}

        {/* Collect banner (delivery) */}
        {job.leg === 'delivery' && job.stage !== 'done' && (
          job.collect_amount > 0 ? (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 text-amber-700 rounded-2xl px-4 py-3">
              <Banknote size={20} className="shrink-0" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest">Collect on delivery</p>
                <p className="text-xl font-black tracking-tight leading-tight">
                  {formatCurrency(job.collect_amount)}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl px-4 py-2.5">
              <CheckCircle2 size={16} className="shrink-0" />
              <p className="text-[11px] font-black uppercase tracking-tight">Fully paid — nothing to collect</p>
            </div>
          )
        )}

        {/* Call / Maps */}
        {job.stage !== 'done' && job.stage !== 'picked_up' && (
          <div className="grid grid-cols-2 gap-3">
            {job.customer_phone ? (
              <a
                href={`tel:${job.customer_phone}`}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-slate-100 text-slate-700 font-black text-sm active:scale-95 transition-all hover:bg-slate-50"
              >
                <Phone size={16} className="text-emerald-500" />
                <span className="truncate">{formatPhMobile(job.customer_phone)}</span>
              </a>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-100 text-slate-300 font-black text-sm">
                <Phone size={16} /> No number
              </div>
            )}
            {maps ? (
              <a
                href={maps}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-slate-100 text-slate-700 font-black text-sm active:scale-95 transition-all hover:bg-slate-50"
              >
                <Navigation size={16} className="text-sky-500" /> Open Maps
              </a>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-100 text-slate-300 font-black text-sm">
                <Navigation size={16} /> No map
              </div>
            )}
          </div>
        )}

        {/* Primary action */}
        {hasAction && (
          <button
            type="button"
            onClick={() => onAction(job)}
            className={`w-full py-4 rounded-2xl text-white font-black text-base shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${leg.btn}`}
          >
            <CheckCircle2 size={20} /> {ACTION_LABEL[job.action]}
          </button>
        )}
        {job.stage === 'waiting' && (
          <div className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-wide">
            <Hourglass size={15} /> Laundry is still being washed — wait for "Ready"
          </div>
        )}
      </div>
    </article>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
const RiderPage = () => {
  const [tab, setTab] = useState('active'); // 'active' | 'done'
  const [jobs, setJobs] = useState({ active: [], done: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [pendingJob, setPendingJob] = useState(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [toast, setToast] = useState({ type: '', text: '' });

  const riderName = apiService.getFullName?.() || localStorage.getItem('user_email') || 'Rider';
  const shopName = localStorage.getItem('shop_name') || '';

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast({ type: '', text: '' }), 4000);
  };

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      const [active, done] = await Promise.all([
        apiService.getRiderJobs('active'),
        apiService.getRiderJobs('done'),
      ]);
      setJobs({ active, done });
      setLoadError('');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setLoadError(typeof detail === 'string' ? detail : 'Could not load your jobs. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const handleConfirm = async (cashCollected) => {
    if (!pendingJob || acting) return;
    setActing(true);
    setActionError('');
    try {
      if (pendingJob.action === 'picked_up') {
        await apiService.riderMarkPickedUp(pendingJob.booking_id);
        showToast('success', 'Pickup confirmed.');
      } else if (pendingJob.action === 'start_delivery') {
        await apiService.riderStartDelivery(pendingJob.booking_id);
        showToast('success', 'Delivery started. Drive safe!');
      } else if (pendingJob.action === 'delivered') {
        await apiService.riderMarkDelivered(pendingJob.booking_id, cashCollected);
        showToast('success', 'Delivered. Nice work!');
      }
      setPendingJob(null);
      await load(true);
    } catch (err) {
      setActionError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setActing(false);
    }
  };

  const list = tab === 'active' ? jobs.active : jobs.done;
  const counts = useMemo(
    () => ({
      todo: jobs.active.filter((j) => j.action).length,
      onTheWay: jobs.active.filter((j) => j.stage === 'on_the_way').length,
    }),
    [jobs.active]
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* TOP BAR */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 rounded-xl shadow-lg shrink-0">
            <Bike size={18} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
              Delivery Rider{shopName ? ` · ${shopName}` : ''}
            </p>
            <p className="font-black text-slate-900 text-base tracking-tight truncate">{riderName}</p>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-100 active:scale-95 transition-all"
            aria-label="Refresh"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => apiService.logout()}
            className="p-2.5 rounded-xl text-rose-400 hover:bg-rose-50 active:scale-95 transition-all"
            aria-label="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-5 pb-24 space-y-5">
        {/* SUMMARY */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-5 py-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Needs action</p>
            <p className="text-4xl font-black text-slate-900 tracking-tighter mt-1">{counts.todo}</p>
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-5 py-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">On the way</p>
            <p className="text-4xl font-black text-sky-500 tracking-tighter mt-1">{counts.onTheWay}</p>
          </div>
        </div>

        {/* TABS */}
        <div className="grid grid-cols-2 bg-slate-100 rounded-2xl p-1">
          {[
            { key: 'active', label: `To Do (${jobs.active.length})` },
            { key: 'done', label: `Done (${jobs.done.length})` },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* LIST */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <Loader2 size={32} className="animate-spin" />
            <p className="text-xs font-black uppercase tracking-widest mt-3">Loading your jobs...</p>
          </div>
        ) : loadError ? (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-3xl p-6 text-center space-y-3">
            <AlertCircle size={28} className="mx-auto" />
            <p className="text-sm font-bold">{loadError}</p>
            <button
              type="button"
              onClick={() => load()}
              className="px-5 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-black uppercase tracking-widest active:scale-95"
            >
              Try again
            </button>
          </div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 py-16 px-6 text-center">
            <Inbox size={40} className="mx-auto text-slate-200" />
            <p className="font-black text-slate-700 mt-3">
              {tab === 'active' ? 'No jobs right now' : 'Nothing completed yet'}
            </p>
            <p className="text-xs font-bold text-slate-400 mt-1">
              {tab === 'active'
                ? 'New pickups and deliveries assigned to you will show up here.'
                : 'Finished pickups and deliveries will be listed here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {list.map((job) => (
              <JobCard
                key={`${job.booking_id}-${job.leg}`}
                job={job}
                onAction={(j) => {
                  setActionError('');
                  setPendingJob(j);
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* TOAST */}
      {toast.text && (
        <div className="fixed bottom-6 inset-x-4 z-[90] flex justify-center pointer-events-none">
          <div
            className={`flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-xl font-black text-sm ${
              toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {toast.text}
          </div>
        </div>
      )}

      <ConfirmSheet
        key={pendingJob ? `${pendingJob.booking_id}-${pendingJob.action}` : 'none'}
        job={pendingJob}
        busy={acting}
        error={actionError}
        onCancel={() => setPendingJob(null)}
        onConfirm={handleConfirm}
      />
    </div>
  );
};

export default RiderPage;