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
  ChevronRight,
  ArrowLeft,
  ListChecks,
  History,
  Wallet,
  Check,
  CalendarClock,
  Package,
} from 'lucide-react';
import apiService from '../services/APIservices';
import { formatCurrency } from '../utils/formatters';
import { formatPhMobile } from '../utils/phone';
import useMediaQuery from '../hooks/useMediaQuery';
import laundryLinkLogo from '../assets/Untitled design.png';

/**
 * RIDER PAGE (Rider accounts) — web layout
 *
 * Parehong istilo ng staff dashboard (madilim na sidebar, puting header,
 * mga card), pero para lang sa RIDER.
 *
 *  - Desktop (lg+): sidebar sa kaliwa, summary cards sa itaas, at
 *    "master-detail" na layout — listahan ng jobs sa kaliwa, buong detalye
 *    (progress, mapa, bayad, aksyon) sa kanan.
 *  - Phone/tablet: top bar + bottom navigation; ang detalye ay bumubukas
 *    bilang full-screen na panel.
 *
 * Dalawang uri ng job: PICKUP (kunin ang maruming damit) at DELIVERY
 * (ihatid ang malinis). Sa delivery na may sisingilin, kailangang i-check
 * ng rider na natanggap na ang cash bago ma-mark na delivered.
 * Nagre-refresh mag-isa kada 30 segundo.
 */

const POLL_MS = 30000;

/* ------------------------------ helpers ------------------------------ */

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

const isToday = (value) => {
  if (!value) return false;
  const opts = { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' };
  return (
    new Date(value).toLocaleDateString('en-PH', opts) ===
    new Date().toLocaleDateString('en-PH', opts)
  );
};

const WINDOW_LABEL = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', anytime: 'Anytime' };

const jobKey = (j) => `${j.booking_id}-${j.leg}`;

const mapsLink = (job) => {
  if (job.latitude != null && job.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}`;
  }
  if (job.address_line) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address_line)}`;
  }
  return null;
};

const mapEmbed = (job) => {
  if (job.latitude != null && job.longitude != null) {
    return `https://maps.google.com/maps?q=${job.latitude},${job.longitude}&z=16&output=embed`;
  }
  if (job.address_line) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(job.address_line)}&z=16&output=embed`;
  }
  return null;
};

// Naka-literal ang bawat class para makita ng Tailwind JIT.
const LEG = {
  pickup: {
    label: 'Pickup',
    Icon: PackageCheck,
    badge: 'bg-violet-50 text-violet-600',
    iconBox: 'bg-violet-50 text-violet-600',
    btn: 'bg-violet-500 hover:bg-violet-600 shadow-violet-200',
    ring: 'ring-violet-200 border-violet-200',
  },
  delivery: {
    label: 'Delivery',
    Icon: Truck,
    badge: 'bg-sky-50 text-sky-600',
    iconBox: 'bg-sky-50 text-sky-600',
    btn: 'bg-sky-500 hover:bg-sky-600 shadow-sky-200',
    ring: 'ring-sky-200 border-sky-200',
  },
};

const STAGE = {
  pickup_pending: { text: 'To pick up', cls: 'bg-amber-50 text-amber-600', dot: 'bg-amber-400' },
  picked_up: { text: 'Picked up', cls: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-400' },
  waiting: { text: 'Being washed', cls: 'bg-slate-100 text-slate-500', dot: 'bg-slate-300' },
  ready: { text: 'Ready to deliver', cls: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-400' },
  on_the_way: { text: 'On the way', cls: 'bg-sky-50 text-sky-600', dot: 'bg-sky-400' },
  done: { text: 'Delivered', cls: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-400' },
};

const ACTION_LABEL = {
  picked_up: 'Confirm Pickup',
  start_delivery: 'Start Delivery',
  delivered: 'Mark as Delivered',
};

// Progress steps + kung ilang hakbang na ang tapos (index ng kasalukuyang hakbang).
const stepsFor = (job) => {
  if (job.leg === 'pickup') {
    const steps = ['Assigned', 'Picked up'];
    return { steps, current: job.stage === 'pickup_pending' ? 0 : 2 };
  }
  const steps = ['Picked up', 'Washing', 'Ready', 'On the way', 'Delivered'];
  const map = { waiting: 1, ready: 2, on_the_way: 3, done: 5 };
  return { steps, current: map[job.stage] ?? 1 };
};

/* ------------------------------ small UI ------------------------------ */

const StatCard = ({ icon: Icon, label, value, tone }) => {
  const tones = {
    amber: 'bg-amber-50 text-amber-500',
    emerald: 'bg-emerald-50 text-emerald-500',
    sky: 'bg-sky-50 text-sky-500',
    violet: 'bg-violet-50 text-violet-500',
  };
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 min-w-0">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{label}</p>
        <p className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tighter leading-tight truncate">
          {value}
        </p>
      </div>
    </div>
  );
};

const Stepper = ({ job }) => {
  const { steps, current } = stepsFor(job);
  return (
    <ol className="flex items-start">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex-1 flex flex-col items-center relative min-w-0">
            {i > 0 && (
              <span
                className={`absolute top-4 right-1/2 w-full h-0.5 -z-0 ${
                  i <= current ? 'bg-emerald-400' : 'bg-slate-100'
                }`}
              />
            )}
            <span
              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black border-2 ${
                done
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : active
                    ? 'bg-white border-sky-500 text-sky-500 ring-4 ring-sky-50'
                    : 'bg-white border-slate-200 text-slate-300'
              }`}
            >
              {done ? <Check size={15} strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={`mt-2 text-[10px] font-black uppercase tracking-tight text-center leading-tight px-0.5 ${
                done || active ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

const InfoTile = ({ label, children }) => (
  <div className="bg-slate-50 rounded-2xl px-4 py-3 min-w-0">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    <div className="text-sm font-black text-slate-800 mt-0.5 truncate">{children}</div>
  </div>
);

/* ------------------------------ job row ------------------------------ */

const JobRow = ({ job, selected, onSelect }) => {
  const leg = LEG[job.leg] || LEG.delivery;
  const LegIcon = leg.Icon;
  const stage = STAGE[job.stage] || STAGE.waiting;

  return (
    <button
      type="button"
      onClick={() => onSelect(job)}
      className={`w-full text-left bg-white rounded-2xl border p-4 flex items-center gap-3.5 transition-all active:scale-[0.99] ${
        selected
          ? `ring-4 ${leg.ring} shadow-md`
          : 'border-slate-100 hover:border-slate-200 hover:shadow-sm'
      }`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${leg.iconBox}`}>
        <LegIcon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-black text-slate-900 text-sm truncate">{job.customer_name}</p>
          <span className="text-[10px] font-black text-slate-300 shrink-0">#{job.booking_id}</span>
        </div>
        <p className="text-xs font-bold text-slate-400 truncate mt-0.5">
          {job.address_line || job.service_type}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tight ${stage.cls}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
            {stage.text}
          </span>
          {job.leg === 'delivery' && job.collect_amount > 0 && job.stage !== 'done' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[10px] font-black">
              <Banknote size={11} /> {formatCurrency(job.collect_amount)}
            </span>
          )}
        </div>
      </div>
      <ChevronRight size={18} className="text-slate-300 shrink-0" />
    </button>
  );
};

/* ------------------------------ job detail ------------------------------ */

const JobDetail = ({ job, onAction, onBack }) => {
  if (!job) {
    return (
      <div className="h-full min-h-[320px] bg-white rounded-[32px] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-8 py-16">
        <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300">
          <Package size={30} />
        </div>
        <p className="font-black text-slate-700 mt-4">Select a job</p>
        <p className="text-xs font-bold text-slate-400 mt-1 max-w-[240px]">
          Pick a pickup or delivery from the list to see the details, map and actions.
        </p>
      </div>
    );
  }

  const leg = LEG[job.leg] || LEG.delivery;
  const LegIcon = leg.Icon;
  const stage = STAGE[job.stage] || STAGE.waiting;
  const embed = mapEmbed(job);
  const directions = mapsLink(job);
  const pickupWhen =
    fmtDateTime(job.pickup_datetime) || (job.pickup_window ? WINDOW_LABEL[job.pickup_window] : null);
  const finished = job.stage === 'done' || job.stage === 'picked_up';

  return (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
      {/* header */}
      <div className="p-6 border-b border-slate-50 flex items-start gap-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 -ml-2 rounded-xl text-slate-400 hover:bg-slate-100 active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${leg.iconBox}`}>
          <LegIcon size={26} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${leg.badge}`}
            >
              {leg.label}
            </span>
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${stage.cls}`}>
              {stage.text}
            </span>
            <span className="text-[10px] font-black text-slate-300">Booking #{job.booking_id}</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight truncate">{job.customer_name}</h2>
          <p className="text-xs font-bold text-slate-400 truncate">{job.service_type}</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* progress */}
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Progress</p>
          <Stepper job={job} />
        </div>

        {/* quick facts */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <InfoTile label="Loads">{job.loads || '—'}</InfoTile>
          <InfoTile label="Weight">{job.weight ? `${job.weight} kg` : '—'}</InfoTile>
          <InfoTile label={job.leg === 'pickup' ? 'Pickup time' : 'Payment'}>
            {job.leg === 'pickup'
              ? pickupWhen || '—'
              : job.payment_status === 'paid'
                ? 'Paid'
                : (job.payment_method || 'cash').toUpperCase()}
          </InfoTile>
        </div>

        {/* collect banner */}
        {job.leg === 'delivery' && !finished && (
          job.collect_amount > 0 ? (
            <div className="flex items-center gap-4 bg-amber-50 border border-amber-100 text-amber-700 rounded-3xl px-5 py-4">
              <div className="w-12 h-12 rounded-2xl bg-white/70 flex items-center justify-center shrink-0">
                <Banknote size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest">Collect on delivery</p>
                <p className="text-3xl font-black tracking-tighter leading-tight">
                  {formatCurrency(job.collect_amount)}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl px-5 py-3.5">
              <CheckCircle2 size={18} className="shrink-0" />
              <p className="text-xs font-black uppercase tracking-tight">Fully paid — nothing to collect</p>
            </div>
          )
        )}

        {/* address + map */}
        {(job.address_line || embed) && (
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {job.leg === 'pickup' ? 'Pickup address' : 'Delivery address'}
            </p>
            {job.address_line && (
              <div className="flex items-start gap-3 bg-slate-50 rounded-2xl px-4 py-3.5">
                <MapPin size={18} className="text-rose-400 shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-slate-700 leading-snug">{job.address_line}</p>
              </div>
            )}
            {embed && (
              <div className="rounded-3xl overflow-hidden border border-slate-100 bg-slate-50 h-52 sm:h-64">
                <iframe
                  title="Customer location"
                  src={embed}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full border-0"
                />
              </div>
            )}
          </div>
        )}

        {/* instructions */}
        {job.special_instructions && (
          <div className="flex items-start gap-3 bg-amber-50/70 border border-amber-100 rounded-2xl px-4 py-3.5">
            <StickyNote size={17} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Customer note</p>
              <p className="text-sm font-bold text-amber-800 leading-snug mt-0.5">{job.special_instructions}</p>
            </div>
          </div>
        )}

        {finished && (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Clock size={14} className="text-slate-300" />
            Completed {fmtDateTime(job.leg === 'pickup' ? job.picked_up_at : job.completed_at) || ''}
          </div>
        )}

        {/* contact + directions */}
        {!finished && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {job.customer_phone ? (
              <a
                href={`tel:${job.customer_phone}`}
                className="flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border-2 border-slate-100 text-slate-700 font-black text-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                <Phone size={17} className="text-emerald-500" />
                Call {formatPhMobile(job.customer_phone)}
              </a>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-slate-100 text-slate-300 font-black text-sm">
                <Phone size={17} /> No contact number
              </div>
            )}
            {directions ? (
              <a
                href={directions}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border-2 border-slate-100 text-slate-700 font-black text-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                <Navigation size={17} className="text-sky-500" /> Get directions
              </a>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-slate-100 text-slate-300 font-black text-sm">
                <Navigation size={17} /> No location
              </div>
            )}
          </div>
        )}

        {/* primary action */}
        {job.action && (
          <button
            type="button"
            onClick={() => onAction(job)}
            className={`w-full py-4 rounded-2xl text-white font-black text-base shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 ${leg.btn}`}
          >
            <CheckCircle2 size={20} /> {ACTION_LABEL[job.action]}
          </button>
        )}
        {job.stage === 'waiting' && (
          <div className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-wide text-center">
            <Hourglass size={16} className="shrink-0" /> The shop is still washing — you'll be able to start once it's Ready
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------ confirm dialog ------------------------------ */

const ConfirmDialog = ({ job, onCancel, onConfirm, busy, error }) => {
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
      <div className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl p-7 pb-9 sm:pb-7">
        <div className="flex items-start justify-between mb-2">
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
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-4 bg-amber-50 border border-amber-100 text-amber-700 rounded-2xl px-5 py-4">
              <Banknote size={26} className="shrink-0" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest">Collect from customer</p>
                <p className="text-3xl font-black tracking-tighter leading-tight">
                  {formatCurrency(job.collect_amount)}
                </p>
              </div>
            </div>
            <label className="flex items-start gap-3 cursor-pointer select-none bg-slate-50 rounded-2xl px-4 py-3.5 border border-slate-100">
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

        <div className="flex gap-3 mt-7">
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
            className={`flex-[2] py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all ${
              canConfirm
                ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200 text-white'
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

/* ------------------------------ page ------------------------------ */

const NAV = [
  { key: 'active', label: 'My Jobs', Icon: ListChecks },
  { key: 'done', label: 'History', Icon: History },
];

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pickup', label: 'Pickups' },
  { key: 'delivery', label: 'Deliveries' },
];

const RiderPage = () => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const [tab, setTab] = useState('active');
  const [filter, setFilter] = useState('all');
  const [jobs, setJobs] = useState({ active: [], done: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [pendingJob, setPendingJob] = useState(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [toast, setToast] = useState({ type: '', text: '' });
  const [now, setNow] = useState(new Date());

  const riderName = apiService.getFullName?.() || localStorage.getItem('user_email') || 'Rider';
  const shopName = localStorage.getItem('shop_name') || 'LaundryLink';
  const initials = riderName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast({ type: '', text: '' }), 4000);
  };

  // live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      const [active, done] = await Promise.all([
        apiService.getRiderJobs('active'),
        apiService.getRiderJobs('done'),
      ]);
      setJobs({ active, done });
      setLoadError('');
      setLastUpdated(new Date());
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

  const list = useMemo(() => {
    const base = tab === 'active' ? jobs.active : jobs.done;
    return filter === 'all' ? base : base.filter((j) => j.leg === filter);
  }, [jobs, tab, filter]);

  // Sa desktop, laging may napiling job (una sa listahan) para hindi blangko ang kanan.
  useEffect(() => {
    if (!isDesktop) return;
    if (!list.some((j) => jobKey(j) === selectedKey)) {
      setSelectedKey(list.length ? jobKey(list[0]) : null);
    }
  }, [list, isDesktop, selectedKey]);

  const selectedJob = useMemo(
    () => [...jobs.active, ...jobs.done].find((j) => jobKey(j) === selectedKey) || null,
    [jobs, selectedKey]
  );

  const stats = useMemo(() => {
    const a = jobs.active;
    return {
      toPickup: a.filter((j) => j.stage === 'pickup_pending').length,
      ready: a.filter((j) => j.stage === 'ready').length,
      onTheWay: a.filter((j) => j.stage === 'on_the_way').length,
      doneToday: jobs.done.filter((j) => isToday(j.completed_at || j.picked_up_at)).length,
      toCollect: a
        .filter((j) => j.leg === 'delivery')
        .reduce((sum, j) => sum + (j.collect_amount || 0), 0),
    };
  }, [jobs]);

  const handleSelect = (job) => {
    setSelectedKey(jobKey(job));
    if (!isDesktop) setMobileDetailOpen(true);
  };

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
      setMobileDetailOpen(false);
      await load(true);
    } catch (err) {
      setActionError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setActing(false);
    }
  };

  const clock = now.toLocaleTimeString('en-PH', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateLabel = now.toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const activeCount = jobs.active.filter((j) => j.action).length;

  /* ---------- list column ---------- */
  const listColumn = (
    <div className="space-y-4 min-w-0">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
              filter === f.key
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

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
        <div className="space-y-3">
          {list.map((job) => (
            <JobRow
              key={jobKey(job)}
              job={job}
              selected={isDesktop && jobKey(job) === selectedKey}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );

  const openAction = (j) => {
    setActionError('');
    setPendingJob(j);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex">
      {/* ============ SIDEBAR (desktop) ============ */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-72 bg-slate-900 text-white flex-col z-50">
        <div className="px-6 py-6 flex items-center gap-3 border-b border-white/5">
          <img src={laundryLinkLogo} alt="LaundryLink" className="w-10 h-10 rounded-xl object-cover" />
          <div>
            <p className="font-black italic text-lg tracking-tight leading-none">
              <span className="text-sky-400">LAUNDRY</span>
              <span className="text-emerald-400">LINK</span>
            </p>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Rider portal</p>
          </div>
        </div>

        <nav className="px-4 py-6 space-y-2 flex-1">
          <p className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Deliveries</p>
          {NAV.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black transition-all ${
                tab === key
                  ? 'bg-sky-500/15 text-sky-300'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={19} />
              <span className="flex-1 text-left">{label}</span>
              {key === 'active' && activeCount > 0 && (
                <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-sky-500 text-white text-[11px] flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-3">
          <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 text-slate-900 font-black flex items-center justify-center shrink-0">
              {initials || <Bike size={18} />}
            </div>
            <div className="min-w-0">
              <p className="font-black text-sm truncate">{riderName}</p>
              <p className="text-[11px] font-bold text-slate-400 truncate">{shopName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => apiService.logout()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* ============ MAIN ============ */}
      <div className="flex-1 min-w-0 lg:ml-72 flex flex-col pb-20 lg:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
          <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex items-center gap-3">
            <img
              src={laundryLinkLogo}
              alt="LaundryLink"
              className="lg:hidden w-9 h-9 rounded-xl object-cover shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                {tab === 'active' ? 'My jobs' : 'History'}
              </p>
              <h1 className="text-lg lg:text-xl font-black text-slate-900 tracking-tight truncate">
                {tab === 'active' ? 'My Deliveries' : 'Completed Jobs'}
              </h1>
            </div>

            <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-full bg-slate-50 border border-slate-100 text-[11px] font-black text-slate-500">
              <span className="flex items-center gap-1.5">
                <CalendarClock size={13} className="text-sky-500" /> {dateLabel}
              </span>
              <span className="w-px h-3.5 bg-slate-200" />
              <span className="flex items-center gap-1.5 font-mono">
                <Clock size={13} className="text-emerald-500" /> {clock}
              </span>
            </div>

            <button
              type="button"
              onClick={() => load(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-100 active:scale-95 transition-all"
              aria-label="Refresh"
              title={lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila' })}` : 'Refresh'}
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={() => apiService.logout()}
              className="lg:hidden p-2.5 rounded-xl text-rose-400 hover:bg-rose-50 active:scale-95 transition-all"
              aria-label="Log out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
          {/* Stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
            <StatCard icon={PackageCheck} label="To pick up" value={stats.toPickup} tone="violet" />
            <StatCard icon={Truck} label="On the way" value={stats.onTheWay} tone="sky" />
            <StatCard icon={Wallet} label="To collect" value={formatCurrency(stats.toCollect)} tone="amber" />
            <StatCard icon={CheckCircle2} label="Done today" value={stats.doneToday} tone="emerald" />
          </div>

          {/* Master–detail */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            <section className="lg:col-span-2 min-w-0">{listColumn}</section>
            {isDesktop && (
              <section className="lg:col-span-3 min-w-0 lg:sticky lg:top-24">
                <JobDetail job={selectedJob} onAction={openAction} />
              </section>
            )}
          </div>
        </main>
      </div>

      {/* ============ MOBILE: bottom nav ============ */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-100 grid grid-cols-2">
        {NAV.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`relative py-3 flex flex-col items-center gap-1 text-[10px] font-black uppercase tracking-widest ${
              tab === key ? 'text-sky-500' : 'text-slate-300'
            }`}
          >
            <Icon size={21} />
            {label}
            {key === 'active' && activeCount > 0 && (
              <span className="absolute top-2 right-[calc(50%-24px)] min-w-[16px] h-4 px-1 rounded-full bg-sky-500 text-white text-[9px] flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* ============ MOBILE: detail panel ============ */}
      {!isDesktop && mobileDetailOpen && selectedJob && (
        <div className="fixed inset-0 z-[70] bg-slate-50 overflow-y-auto">
          <div className="p-4">
            <JobDetail
              job={selectedJob}
              onAction={openAction}
              onBack={() => setMobileDetailOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.text && (
        <div className="fixed bottom-24 lg:bottom-8 inset-x-4 z-[95] flex justify-center pointer-events-none">
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

      <ConfirmDialog
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