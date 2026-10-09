import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw, Receipt, CalendarDays, CalendarRange, CalendarClock,
  CheckCircle2, CircleDollarSign, ChevronLeft, ChevronRight, FileDown,
  PieChart, Wallet, X, ShieldCheck, Loader2, Hourglass,
  Eye, ImageOff, Hash, BadgeCheck, AlertTriangle, History
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiService from '../services/APIservices';
import { useAuth } from '../context/authcontext';
import StatCard from '../components/ui/statcard';
import LoadingScreen from '../components/ui/loadingscreen';

/**
 * Dapat tumugma sa DUAL_CHECK_THRESHOLD ng backend
 * (booking_controller.py). Kapag binago ang isa, baguhin din ang isa.
 */
const DUAL_CHECK_THRESHOLD = 5000;
const ALLOWED_ROLES = ['staff', 'manager', 'owner'];

const escapeXml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** Paulit-ulit na diagonal watermark (SVG tile bilang background). */
const Watermark = ({ email }) => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="180">` +
    `<g transform="rotate(-25 180 90)" font-family="Arial, sans-serif" font-weight="700" ` +
    `text-anchor="middle" fill="rgba(30,41,59,0.38)" stroke="rgba(255,255,255,0.55)" ` +
    `stroke-width="0.6" paint-order="stroke">` +
    `<text x="180" y="84" font-size="12">FOR SYSTEM VERIFICATION ONLY -</text>` +
    `<text x="180" y="102" font-size="12">${escapeXml(email)}</text>` +
    `</g></svg>`;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none"
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`,
        backgroundRepeat: 'repeat',
      }}
    />
  );
};

const ACTION_STYLES = {
  VIEW: 'bg-slate-100 text-slate-500',
  APPROVE: 'bg-emerald-50 text-emerald-600',
  REJECT: 'bg-rose-50 text-rose-600',
};

/**
 * RECORD SALES PAGE
 *
 * UPDATED (Income = paid only): rangeTotalIncome (at paidCount/
 * unpaidCount breakdown) ay kinukuha lang mula sa mga bookings na ang
 * payment_status ay "paid".
 *
 * UPDATED (Live KPI refresh): tumatawag ulit ng getSalesSummary()
 * pagkatapos ng successful na markBookingPaid().
 *
 * NEW (Service Breakdown + Payment Method Breakdown) at (Service Type
 * Filter): tulad ng dati.
 *
 * UPDATED (Secure Payment Verification System):
 *  1. Dual-check (>= ₱5,000) sa Mark as Paid.
 *  2. null ang payment_method sa markBookingPaid (hindi na pinipilit
 *     ang 'cash').
 *  3. Ang "pending_verification" ay sa Service Terminal dapat i-verify.
 *  4. NEW — View Receipt: read-only na pagtingin ng resibo ng online
 *     payment, may watermark, anti-copy, at nagla-log ng "VIEW" sa
 *     audit trail (via getPaymentAuditTrail).
 */
const RecordSales = () => {
  const { user } = useAuth();

  const [summary, setSummary] = useState({ today_income: 0, week_income: 0, month_income: 0 });
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [paymentFilter, setPaymentFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [markingInFlight, setMarkingInFlight] = useState(null);

  // Dual-check modal
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [ledgerConfirmed, setLedgerConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  // NEW — View Receipt modal
  const [receiptTarget, setReceiptTarget] = useState(null);
  const [receiptImageFailed, setReceiptImageFailed] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const activeReceiptIdRef = useRef(null);

  const [reportPeriod, setReportPeriod] = useState('daily');
  const [anchorDate, setAnchorDate] = useState(new Date());

  const staffEmail = user?.email || localStorage.getItem('user_email') || 'unknown-staff';
  const role = (localStorage.getItem('role') || '').toLowerCase();
  const canViewReceipts = ALLOWED_ROLES.includes(role);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const [summaryRes, bookingsRes] = await Promise.allSettled([
        apiService.getSalesSummary(),
        apiService.getAllBookings(),
      ]);

      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value);
      if (bookingsRes.status === 'fulfilled') setBookings(bookingsRes.value || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshSummary = async () => {
    try {
      const data = await apiService.getSalesSummary();
      setSummary(data);
    } catch (err) {
      console.error('Sales summary refresh failed:', err.message);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Parehong rule ng backend: final_price muna, kung wala, total_price.
  const getAmountDue = (b) => Number(b.final_price ?? b.total_price ?? 0);

  // --- DATE RANGE HELPERS ---

  const getPeriodRange = (period, anchor) => {
    const start = new Date(anchor);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);

    if (period === 'daily') {
      end.setDate(start.getDate() + 1);
    } else if (period === 'weekly') {
      const dayOfWeek = start.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start.setDate(start.getDate() - diffToMonday);
      end.setTime(start.getTime());
      end.setDate(start.getDate() + 7);
    } else if (period === 'monthly') {
      start.setDate(1);
      end.setTime(start.getTime());
      end.setMonth(start.getMonth() + 1);
    } else if (period === 'yearly') {
      start.setMonth(0, 1);
      end.setTime(start.getTime());
      end.setFullYear(start.getFullYear() + 1);
    }
    return { start, end };
  };

  const { start: rangeStart, end: rangeEnd } = getPeriodRange(reportPeriod, anchorDate);

  const formatRangeLabel = () => {
    if (reportPeriod === 'daily') {
      return rangeStart.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    if (reportPeriod === 'weekly') {
      const endDisplay = new Date(rangeEnd);
      endDisplay.setDate(endDisplay.getDate() - 1);
      const startStr = rangeStart.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
      const endStr = endDisplay.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${startStr} – ${endStr}`;
    }
    if (reportPeriod === 'monthly') {
      return rangeStart.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
    }
    return String(rangeStart.getFullYear());
  };

  const navigatePeriod = (direction) => {
    const next = new Date(anchorDate);
    if (reportPeriod === 'daily') next.setDate(next.getDate() + direction);
    else if (reportPeriod === 'weekly') next.setDate(next.getDate() + direction * 7);
    else if (reportPeriod === 'monthly') next.setMonth(next.getMonth() + direction);
    else if (reportPeriod === 'yearly') next.setFullYear(next.getFullYear() + direction);
    setAnchorDate(next);
  };

  const goToToday = () => setAnchorDate(new Date());

  // --- FILTERING ---

  const dateFilteredBookings = bookings.filter((b) => {
    const ts = b.booking_timestamp || b.created_at;
    if (!ts) return false;
    const bookingDate = new Date(ts);
    return bookingDate >= rangeStart && bookingDate < rangeEnd;
  });

  const availableServiceTypes = Array.from(
    new Set(dateFilteredBookings.map((b) => b.service_type).filter(Boolean))
  ).sort();

  const filteredBookings = dateFilteredBookings.filter((b) => {
    const status = b.payment_status || 'unpaid';
    if (paymentFilter === 'paid' && status !== 'paid') return false;
    if (paymentFilter === 'unpaid' && status === 'paid') return false;
    if (serviceFilter !== 'all' && b.service_type !== serviceFilter) return false;
    return true;
  });

  const paidBookingsInRange = dateFilteredBookings.filter(
    (b) => (b.payment_status || 'unpaid') === 'paid'
  );

  const rangeTotalIncome = paidBookingsInRange.reduce(
    (sum, b) => sum + Number(b.total_price || 0), 0
  );

  const unpaidCountInRange = dateFilteredBookings.length - paidBookingsInRange.length;

  const serviceBreakdown = (() => {
    const map = {};
    paidBookingsInRange.forEach((b) => {
      const key = b.service_type || 'Uncategorized';
      if (!map[key]) map[key] = { service: key, count: 0, total: 0 };
      map[key].count += 1;
      map[key].total += Number(b.total_price || 0);
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  })();

  const paymentMethodBreakdown = (() => {
    const map = {};
    paidBookingsInRange.forEach((b) => {
      const key = b.payment_method || 'cash';
      if (!map[key]) map[key] = { method: key, count: 0, total: 0 };
      map[key].count += 1;
      map[key].total += Number(b.total_price || 0);
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  })();

  const formatMethodLabel = (method) => {
    const labels = {
      cash: 'Cash',
      cod: 'Cash on Delivery',
      gcash: 'GCash',
      paymaya: 'PayMaya',
      online_qr: 'Online (QR Ph)',
    };
    return labels[method] || method;
  };

  const handleServiceCardClick = (serviceName) => {
    setServiceFilter((prev) => (prev === serviceName ? 'all' : serviceName));
  };

  // --- MARK AS PAID ---

  const performMarkAsPaid = async (bookingId, manualConfirmed) => {
    setMarkingInFlight(bookingId);
    try {
      const updatedBooking = await apiService.markBookingPaid(bookingId, null, manualConfirmed);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, ...updatedBooking } : b))
      );
      await refreshSummary();
      return { ok: true };
    } catch (err) {
      const detail = err?.response?.data?.detail;
      return {
        ok: false,
        message: typeof detail === 'string' ? detail : (err?.message || 'Failed to mark booking as paid.'),
      };
    } finally {
      setMarkingInFlight(null);
    }
  };

  const handleMarkAsPaidClick = async (booking) => {
    if (getAmountDue(booking) >= DUAL_CHECK_THRESHOLD) {
      setConfirmTarget(booking);
      setLedgerConfirmed(false);
      setConfirmError('');
      return;
    }

    const result = await performMarkAsPaid(booking.id, false);
    if (!result.ok) alert(result.message);
  };

  const closeConfirmModal = () => {
    if (markingInFlight) return;
    setConfirmTarget(null);
    setLedgerConfirmed(false);
    setConfirmError('');
  };

  const handleConfirmDualCheck = async () => {
    if (!confirmTarget || !ledgerConfirmed) return;
    const result = await performMarkAsPaid(confirmTarget.id, true);
    if (result.ok) {
      setConfirmTarget(null);
      setLedgerConfirmed(false);
      setConfirmError('');
    } else {
      setConfirmError(result.message);
    }
  };

  // --- VIEW RECEIPT (NEW) ---

  /**
   * Binubuksan ang read-only receipt modal. Ang tawag sa
   * getPaymentAuditTrail ang nagla-log ng "VIEW" sa backend, kaya
   * bawat pagbukas ay may bakas.
   */
  const openReceipt = (booking) => {
    const bookingId = booking.id;
    activeReceiptIdRef.current = bookingId;

    setReceiptTarget(booking);
    setReceiptImageFailed(false);
    setAuditLogs([]);
    setAuditError('');
    setAuditLoading(true);

    apiService
      .getPaymentAuditTrail(bookingId)
      .then((logs) => {
        if (activeReceiptIdRef.current !== bookingId) return;
        setAuditLogs(Array.isArray(logs) ? logs : []);
      })
      .catch((err) => {
        if (activeReceiptIdRef.current !== bookingId) return;
        console.error('Audit Trail Error:', err);
        setAuditError('Could not load the audit history.');
      })
      .finally(() => {
        if (activeReceiptIdRef.current !== bookingId) return;
        setAuditLoading(false);
      });
  };

  const closeReceipt = () => {
    activeReceiptIdRef.current = null;
    setReceiptTarget(null);
    setAuditLogs([]);
    setAuditError('');
    setAuditLoading(false);
  };

  const blockEvent = (e) => e.preventDefault();

  // --- PDF EXPORT ---

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    const shopName = localStorage.getItem('shop_name') || 'Laundry Shop';
    const periodLabel = reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1);

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(`${shopName} — Sales Report`, 14, 18);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    let subtitle = `${periodLabel} Report · ${formatRangeLabel()}`;
    if (serviceFilter !== 'all') subtitle += ` · Service: ${serviceFilter}`;
    if (paymentFilter !== 'all') subtitle += ` · Status: ${paymentFilter}`;
    doc.text(subtitle, 14, 25);

    doc.setFont(undefined, 'bold');
    doc.text(
      `Total Income (Paid only): P${rangeTotalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      14, 32
    );
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text(
      `${paidBookingsInRange.length} paid booking(s) · ${unpaidCountInRange} unpaid booking(s) not included in total`,
      14, 38
    );
    doc.text(`Generated on ${new Date().toLocaleString('en-PH')}`, 14, 44);

    let cursorY = 50;

    if (serviceBreakdown.length > 0) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Income by Service', 14, cursorY);
      autoTable(doc, {
        startY: cursorY + 4,
        head: [['Service', 'Paid Bookings', 'Income']],
        body: serviceBreakdown.map((s) => [
          s.service,
          String(s.count),
          `P${s.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [15, 23, 42] },
        margin: { left: 14, right: 14 },
        didParseCell: (data) => {
          if (
            data.section === 'body' &&
            serviceFilter !== 'all' &&
            serviceBreakdown[data.row.index]?.service === serviceFilter
          ) {
            data.cell.styles.fillColor = [224, 242, 254];
          }
        },
      });
      cursorY = doc.lastAutoTable.finalY + 10;
    }

    if (paymentMethodBreakdown.length > 0) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Income by Payment Method', 14, cursorY);
      autoTable(doc, {
        startY: cursorY + 4,
        head: [['Method', 'Paid Bookings', 'Income']],
        body: paymentMethodBreakdown.map((m) => [
          formatMethodLabel(m.method),
          String(m.count),
          `P${m.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [15, 23, 42] },
        margin: { left: 14, right: 14 },
      });
      cursorY = doc.lastAutoTable.finalY + 10;
    }

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(
      serviceFilter !== 'all' || paymentFilter !== 'all' ? 'Filtered Bookings This Period' : 'All Bookings This Period',
      14, cursorY
    );
    autoTable(doc, {
      startY: cursorY + 4,
      head: [['Date', 'Customer ID', 'Service', 'Amount', 'Status']],
      body: filteredBookings.map((b) => {
        const status = b.payment_status || 'unpaid';
        let statusLabel = 'Unpaid';
        if (status === 'paid') statusLabel = `Paid${b.payment_method ? ` (${b.payment_method})` : ''}`;
        else if (status === 'pending_verification') statusLabel = 'Unpaid (Under review)';
        return [
          formatDate(b.booking_timestamp),
          b.customer_id ?? `— (${b.customer_name})`,
          b.service_type,
          `P${Number(b.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          statusLabel,
        ];
      }),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 23, 42] },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          if (String(data.cell.raw).includes('Unpaid')) {
            data.cell.styles.textColor = [180, 83, 9];
          } else {
            data.cell.styles.textColor = [5, 150, 105];
          }
        }
      },
    });

    const filenameParts = [
      'sales-report',
      reportPeriod,
      rangeStart.toISOString().slice(0, 10),
    ];
    if (serviceFilter !== 'all') {
      filenameParts.push(serviceFilter.toLowerCase().replace(/\s+/g, '-'));
    }
    doc.save(`${filenameParts.join('-')}.pdf`);
  };

  if (loading) return <LoadingScreen message="Loading Sales..." />;

  const isConfirming = confirmTarget && markingInFlight === confirmTarget.id;

  // Receipt modal derived values
  const rt = receiptTarget;
  const rtAmountDue = rt ? getAmountDue(rt) : 0;
  const rtExtracted =
    rt && rt.extracted_amount !== null && rt.extracted_amount !== undefined
      ? Number(rt.extracted_amount)
      : null;
  const rtIsSandbox = rt ? (rt.reference_number || '').toUpperCase().startsWith('TEST-') : false;
  const rtMismatch = rtExtracted !== null && Math.abs(rtExtracted - rtAmountDue) > 0.009;

  return (
    <div className="p-8 bg-slate-50 min-h-screen space-y-10 font-sans">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <Receipt size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Sales Overview</span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase">Record Sales</h1>
        </div>
        <button
          onClick={() => loadData(true)}
          className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-100 transition-all shadow-sm active:scale-95"
        >
          <RefreshCw size={20} className={refreshing ? 'animate-spin text-sky-500' : 'text-slate-400'} />
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Today's Income" value={summary.today_income} type="revenue" icon={<CalendarClock size={20} />} />
        <StatCard title="This Week's Income" value={summary.week_income} type="income" icon={<CalendarRange size={20} />} />
        <StatCard title="This Month's Income" value={summary.month_income} type="avg_per_service" icon={<CalendarDays size={20} />} />
      </div>

      {/* BOOKINGS TABLE + REPORT CONTROLS */}
      <div className="bg-white p-10 rounded-[56px] border border-slate-100 shadow-sm">

        <div className="space-y-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">All Bookings</h2>

            <div className="flex flex-wrap gap-2">
              {['all', 'paid', 'unpaid'].map((f) => (
                <button
                  key={f}
                  onClick={() => setPaymentFilter(f)}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    paymentFilter === f
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {availableServiceTypes.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service:</span>
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-[11px] font-black text-slate-700 outline-none cursor-pointer focus:border-sky-200"
              >
                <option value="all">All Services</option>
                {availableServiceTypes.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {serviceFilter !== 'all' && (
                <button
                  onClick={() => setServiceFilter('all')}
                  className="flex items-center gap-1 px-3 py-2 bg-sky-50 text-sky-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-100 transition-all"
                >
                  <X size={12} /> Clear
                </button>
              )}
            </div>
          )}

          {/* Report Period Tabs */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 rounded-3xl p-4">
            <div className="flex gap-2">
              {['daily', 'weekly', 'monthly', 'yearly'].map((p) => (
                <button
                  key={p}
                  onClick={() => setReportPeriod(p)}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    reportPeriod === p
                      ? 'bg-sky-500 text-white'
                      : 'bg-white text-slate-400 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigatePeriod(-1)}
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-sky-500 hover:border-sky-200 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-700 min-w-[180px] text-center hover:bg-slate-50 transition-all"
              >
                {formatRangeLabel()}
              </button>
              <button
                onClick={() => navigatePeriod(1)}
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-sky-500 hover:border-sky-200 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95"
            >
              <FileDown size={14} />
              Download PDF
            </button>
          </div>

          {/* Range Total — paid only */}
          <div className="flex flex-wrap items-center gap-2 px-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Paid income this {reportPeriod === 'daily' ? 'day' : reportPeriod === 'weekly' ? 'week' : reportPeriod === 'monthly' ? 'month' : 'year'}
              {serviceFilter !== 'all' ? ` (${serviceFilter})` : ''}:
            </span>
            <span className="text-sm font-black text-emerald-600">
              ₱{rangeTotalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] font-bold text-slate-300">
              ({paidBookingsInRange.length} paid
              {unpaidCountInRange > 0 ? ` · ${unpaidCountInRange} unpaid not included` : ''})
            </span>
          </div>
        </div>

        {/* SERVICE BREAKDOWN + PAYMENT METHOD BREAKDOWN */}
        {paidBookingsInRange.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

            <div className="bg-slate-50/60 rounded-[32px] border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                    <PieChart size={16} />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">Income by Service</h3>
                </div>
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Click to filter</span>
              </div>
              <div className="space-y-2">
                {serviceBreakdown.map((s) => {
                  const isActive = serviceFilter === s.service;
                  return (
                    <button
                      key={s.service}
                      type="button"
                      onClick={() => handleServiceCardClick(s.service)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl border transition-all text-left ${
                        isActive
                          ? 'bg-sky-50 border-sky-200'
                          : 'bg-white border-slate-100 hover:border-sky-100'
                      }`}
                    >
                      <div>
                        <p className={`text-xs font-black ${isActive ? 'text-sky-700' : 'text-slate-700'}`}>{s.service}</p>
                        <p className="text-[10px] font-bold text-slate-400">{s.count} paid booking{s.count !== 1 ? 's' : ''}</p>
                      </div>
                      <span className="text-sm font-black text-emerald-600">
                        ₱{s.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-50/60 rounded-[32px] border border-slate-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-violet-50 text-violet-600 rounded-xl">
                  <Wallet size={16} />
                </div>
                <h3 className="text-sm font-black text-slate-800 tracking-tight">Income by Payment Method</h3>
              </div>
              <div className="space-y-2">
                {paymentMethodBreakdown.map((m) => (
                  <div key={m.method} className="flex items-center justify-between px-3 py-2.5 bg-white rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-xs font-black text-slate-700">{formatMethodLabel(m.method)}</p>
                      <p className="text-[10px] font-bold text-slate-400">{m.count} paid booking{m.count !== 1 ? 's' : ''}</p>
                    </div>
                    <span className="text-sm font-black text-emerald-600">
                      ₱{m.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-300 font-black uppercase text-xs tracking-widest">
            No bookings recorded for this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Customer ID</th>
                  <th className="py-3 pr-4">Service</th>
                  <th className="py-3 pr-4 text-right">Amount</th>
                  <th className="py-3 pr-4 text-center">Payment Status</th>
                  <th className="py-3 pl-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => {
                  const paymentStatus = b.payment_status || 'unpaid';
                  const isPaid = paymentStatus === 'paid';
                  const isPendingVerification = paymentStatus === 'pending_verification';
                  const isMarking = markingInFlight === b.id;
                  const hasReceipt = Boolean(b.proof_of_payment_url);

                  return (
                    <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-all">
                      <td className="py-4 pr-4 text-sm font-bold text-slate-600">{formatDate(b.booking_timestamp)}</td>
                      <td className="py-4 pr-4 text-sm font-bold text-slate-600">
                        {b.customer_id ?? `— (${b.customer_name})`}
                      </td>
                      <td className="py-4 pr-4 text-sm font-bold text-slate-600">{b.service_type}</td>
                      <td className="py-4 pr-4 text-sm font-black text-slate-900 text-right">
                        ₱{Number(b.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-4 pr-4 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              isPaid
                                ? 'bg-emerald-50 text-emerald-600'
                                : isPendingVerification
                                  ? 'bg-sky-50 text-sky-600'
                                  : 'bg-amber-50 text-amber-600'
                            }`}
                          >
                            {isPaid ? <CheckCircle2 size={12} /> : isPendingVerification ? <Hourglass size={12} /> : <CircleDollarSign size={12} />}
                            {isPaid
                              ? `Paid${b.payment_method ? ` (${b.payment_method})` : ''}`
                              : isPendingVerification
                                ? 'Under review'
                                : 'Unpaid'}
                          </span>

                          {/* NEW — View Receipt (online payments na may proof) */}
                          {hasReceipt && canViewReceipts && (
                            <button
                              type="button"
                              onClick={() => openReceipt(b)}
                              className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-tight text-sky-500 hover:text-sky-700 transition-colors"
                            >
                              <Eye size={12} /> View Receipt
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-4 pl-4 text-right">
                        {isPaid ? (
                          <span className="text-[10px] text-slate-300 font-bold uppercase">—</span>
                        ) : isPendingVerification ? (
                          <span
                            className="text-[10px] text-sky-500 font-black uppercase tracking-tight"
                            title="Open Service Terminal > Mobile Requests > Payment to review the receipt."
                          >
                            Verify in Terminal
                          </span>
                        ) : (
                          <button
                            disabled={isMarking}
                            onClick={() => handleMarkAsPaidClick(b)}
                            className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 disabled:opacity-50 transition-all"
                          >
                            {isMarking ? 'Marking...' : 'Mark as Paid'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DUAL-CHECK CONFIRMATION MODAL (>= ₱5,000) */}
      {confirmTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-white/20">
            <div className="px-8 pt-8 pb-5 border-b border-slate-50 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                  <ShieldCheck size={20} className="text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">High-Value Payment</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                    Dual-check required
                  </p>
                </div>
              </div>
              <button
                onClick={closeConfirmModal}
                disabled={isConfirming}
                className="p-2 hover:bg-rose-50 hover:text-rose-500 rounded-xl text-slate-300 transition-all disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-8 py-6 space-y-5">
              <div className="bg-slate-50/60 rounded-2xl border-2 border-slate-100 p-5 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-bold">Customer</span>
                  <span className="text-slate-800 font-black">{confirmTarget.customer_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-bold">Service</span>
                  <span className="text-slate-800 font-black">{confirmTarget.service_type}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-slate-400 font-bold text-sm">Amount</span>
                  <span className="text-emerald-600 font-black text-lg">
                    ₱{getAmountDue(confirmTarget).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <label
                className={`flex items-start gap-3 rounded-2xl border-2 px-4 py-3 cursor-pointer transition-all ${
                  ledgerConfirmed ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={ledgerConfirmed}
                  onChange={(e) => setLedgerConfirmed(e.target.checked)}
                  disabled={isConfirming}
                  className="mt-0.5 w-4 h-4 accent-emerald-500 shrink-0"
                />
                <span className="text-[11px] font-bold text-slate-600 leading-snug">
                  I confirm I've verified this payment (cash received, or checked against our official
                  bank / e-wallet app history).
                </span>
              </label>

              {confirmError && (
                <p className="text-[11px] font-bold text-rose-600">{confirmError}</p>
              )}
            </div>

            <div className="px-8 pb-8 flex gap-3">
              <button
                type="button"
                onClick={closeConfirmModal}
                disabled={isConfirming}
                className="flex-1 py-3.5 rounded-2xl font-black text-sm text-slate-500 bg-slate-50 hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDualCheck}
                disabled={!ledgerConfirmed || isConfirming}
                className="flex-[1.5] flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isConfirming ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {isConfirming ? 'Marking...' : 'Confirm & Mark as Paid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW RECEIPT MODAL (read-only, watermarked, logged) */}
      {rt && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-white/20">

            <div className="px-8 pt-8 pb-5 border-b border-slate-50 shrink-0 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Payment Receipt</h2>
                <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em] mt-1">
                  {rt.customer_name} · {formatMethodLabel(rt.payment_method)}
                </p>
              </div>
              <button
                onClick={closeReceipt}
                className="p-3 hover:bg-rose-50 hover:text-rose-500 rounded-2xl text-slate-300 transition-all active:scale-90"
              >
                <X size={22} />
              </button>
            </div>

            <div className="px-8 py-6 space-y-5 overflow-y-auto flex-1">

              {/* Summary */}
              <div className="bg-slate-50/60 rounded-[28px] border-2 border-slate-100 p-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-bold">Service</span>
                  <span className="text-slate-800 font-black">{rt.service_type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-bold">Amount Due</span>
                  <span className="text-emerald-600 font-black">
                    ₱{rtAmountDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 font-bold">Status</span>
                  <span className="text-slate-800 font-black uppercase text-xs">
                    {(rt.payment_status || 'unpaid').replace('_', ' ')}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <Hash size={12} /> Reference No.
                    </span>
                    <span className="text-xs font-black text-slate-700 tracking-wide break-all text-right">
                      {rt.reference_number || '—'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {rt.is_verified_by_ocr && !rtIsSandbox && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                        <BadgeCheck size={12} /> OCR verified
                      </span>
                    )}
                    {rtIsSandbox && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 text-[9px] font-black uppercase tracking-widest border border-violet-100">
                        Sandbox · OCR skipped
                      </span>
                    )}
                    {!rt.is_verified_by_ocr && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest border border-amber-100">
                        Not OCR verified
                      </span>
                    )}
                    {rtExtracted !== null && !rtIsSandbox && (
                      <span className="text-[10px] font-bold text-slate-400">
                        Receipt shows ₱{rtExtracted.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {rtMismatch && !rtIsSandbox && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                      <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] font-bold text-amber-700">
                        The amount read from the receipt (₱{rtExtracted.toFixed(2)}) doesn't match the
                        amount due (₱{rtAmountDue.toFixed(2)}).
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Receipt image (watermarked, copy-protected) */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase ml-1 tracking-widest">Proof of Payment</label>
                {rt.proof_of_payment_url && !receiptImageFailed ? (
                  <div
                    className="relative w-full rounded-[28px] overflow-hidden border-2 border-slate-100 bg-slate-50 select-none print:hidden"
                    onContextMenu={blockEvent}
                    style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' }}
                  >
                    <img
                      src={rt.proof_of_payment_url}
                      alt="Proof of payment"
                      draggable={false}
                      onDragStart={blockEvent}
                      onContextMenu={blockEvent}
                      onError={() => setReceiptImageFailed(true)}
                      className="w-full max-h-96 object-contain pointer-events-none select-none"
                    />
                    <Watermark email={staffEmail} />
                  </div>
                ) : (
                  <div className="w-full h-48 rounded-[28px] border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-2 text-slate-300">
                    <ImageOff size={28} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {receiptImageFailed ? 'Image failed to load' : 'No proof uploaded'}
                    </span>
                  </div>
                )}
                <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 ml-1">
                  <ShieldCheck size={12} /> For verification only. Your views are logged.
                </p>
              </div>

              {/* Audit history */}
              <div className="border-2 border-slate-100 rounded-[24px] p-5 space-y-2">
                <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                  <History size={14} className="text-sky-500" />
                  Audit History
                  {!auditLoading && !auditError && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px]">
                      {auditLogs.length}
                    </span>
                  )}
                </div>
                <div className="max-h-44 overflow-y-auto space-y-2">
                  {auditLoading && (
                    <div className="flex items-center gap-2 text-sky-500 text-xs font-bold py-2">
                      <Loader2 size={14} className="animate-spin" /> Loading history...
                    </div>
                  )}
                  {!auditLoading && auditError && (
                    <p className="text-[11px] font-bold text-rose-500 py-2">{auditError}</p>
                  )}
                  {!auditLoading && !auditError && auditLogs.length === 0 && (
                    <p className="text-[11px] font-bold text-slate-300 py-2">No activity recorded yet.</p>
                  )}
                  {!auditLoading && !auditError && auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 py-2 border-t border-slate-50 first:border-t-0">
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0 ${ACTION_STYLES[log.action_performed] || 'bg-slate-100 text-slate-500'}`}>
                        {log.action_performed}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-slate-700 truncate">{log.staff_email}</p>
                        <p className="text-[10px] font-bold text-slate-400">{formatDate(log.timestamp)}</p>
                        {log.rejection_reason && (
                          <p className="text-[10px] font-bold text-rose-500 mt-0.5 break-words">
                            Reason: {log.rejection_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-8 py-6 border-t border-slate-50 shrink-0">
              <button
                type="button"
                onClick={closeReceipt}
                className="w-full py-4 rounded-[24px] font-black text-sm text-white bg-slate-900 hover:bg-slate-800 transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordSales;