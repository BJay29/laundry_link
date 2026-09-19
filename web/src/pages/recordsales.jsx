import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Receipt, CalendarDays, CalendarRange, CalendarClock,
  CheckCircle2, CircleDollarSign, ChevronLeft, ChevronRight, FileDown,
  PieChart, Wallet, X
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiService from '../services/APIservices';
import StatCard from '../components/ui/statcard';

/**
 * RECORD SALES PAGE
 *
 * UPDATED (Income = paid only): dating pinagsama-sama ang total_price
 * ng LAHAT ng bookings sa napiling date range (kahit unpaid pa) papunta
 * sa rangeTotalIncome. Ito ay maling representasyon ng "income" — ang
 * totoong kinita ay ang AKTWAL na natanggap na bayad lang. Ngayon,
 * rangeTotalIncome (at ang bagong paidCount/unpaidCount breakdown) ay
 * kinukuha na lang mula sa mga bookings na ang payment_status ay
 * "paid" — hindi na basta't kasama sa date range.
 *
 * UPDATED (Live KPI refresh — bug fix): tumatawag ulit ng
 * apiService.getSalesSummary() kaagad pagkatapos ng successful na
 * markBookingPaid(), para awtomatikong dumagdag ang "Today's Income"
 * (at Week/Month, kung applicable) sa parehong sandali.
 *
 * NEW (Service Breakdown + Payment Method Breakdown): dalawang summary
 * section, parehong naka-base sa paidBookingsInRange (parehong "paid
 * only" na filter ng buong page). Pareho itong makikita sa page AT
 * kasama sa PDF export.
 *
 * NEW (Service Type Filter): bagong filter row, katabi ng existing
 * "all/paid/unpaid" — pinipili kung anong service_type lang ang
 * ipapakita sa table (hal. "Full Service" lang). Ang mga options ay
 * dynamic, base sa mga service_type na aktwal na lumabas sa
 * dateFilteredBookings ng kasalukuyang date range — hindi hardcoded,
 * kaya kahit anong custom service name ang gawa ng shop ay lalabas
 * dito. Pag-click sa isang row ng "Income by Service" card ay
 * direktang nagse-set din ng filter na ito (shortcut). Kasama rin ang
 * napiling service sa PDF export (parehong "Income by Service" table
 * pero naka-highlight ang napiling row, at ang buong bookings table sa
 * ibaba ay naka-filter na rin).
 */
const RecordSales = () => {
  const [summary, setSummary] = useState({ today_income: 0, week_income: 0, month_income: 0 });
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [paymentFilter, setPaymentFilter] = useState('all');
  // NEW (Service Type Filter) — 'all' o isang exact service_type string.
  const [serviceFilter, setServiceFilter] = useState('all');
  const [markingInFlight, setMarkingInFlight] = useState(null); // holds booking id currently being marked

  const [reportPeriod, setReportPeriod] = useState('daily');
  const [anchorDate, setAnchorDate] = useState(new Date());

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

  /**
   * Hiwalay na maliit na helper para lang i-refresh ang KPI summary
   * cards (Today/Week/Month Income), hindi na kailangang ulitin ang
   * buong loadData().
   */
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

  // --- FILTERING: payment status + service type + date range combined ---

  const dateFilteredBookings = bookings.filter((b) => {
    const ts = b.booking_timestamp || b.created_at;
    if (!ts) return false;
    const bookingDate = new Date(ts);
    return bookingDate >= rangeStart && bookingDate < rangeEnd;
  });

  // NEW (Service Type Filter) — dynamic list ng lahat ng distinct
  // service_type na lumabas sa kasalukuyang date range, sorted
  // alphabetically. Kapag nag-navigate papunta sa ibang date range at
  // may service na wala roon, hindi na ito lalabas sa dropdown —
  // sinasadya, para hindi makapili ng option na walang laman.
  const availableServiceTypes = Array.from(
    new Set(dateFilteredBookings.map((b) => b.service_type).filter(Boolean))
  ).sort();

  const filteredBookings = dateFilteredBookings.filter((b) => {
    if (paymentFilter !== 'all' && (b.payment_status || 'unpaid') !== paymentFilter) return false;
    if (serviceFilter !== 'all' && b.service_type !== serviceFilter) return false;
    return true;
  });

  // Hiwalay na listahan ng PAID lang na bookings sa loob ng date range
  // — ito ang basehan ng totoong "income".
  const paidBookingsInRange = dateFilteredBookings.filter(
    (b) => (b.payment_status || 'unpaid') === 'paid'
  );

  const rangeTotalIncome = paidBookingsInRange.reduce(
    (sum, b) => sum + Number(b.total_price || 0), 0
  );

  const unpaidCountInRange = dateFilteredBookings.length - paidBookingsInRange.length;

  // Service Breakdown — group paidBookingsInRange by service_type,
  // sorted by highest income first.
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

  // Payment Method Breakdown — group paidBookingsInRange by
  // payment_method (cash/cod/gcash/paymaya), sorted by highest income
  // first.
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
    const labels = { cash: 'Cash', cod: 'Cash on Delivery', gcash: 'GCash', paymaya: 'PayMaya' };
    return labels[method] || method;
  };

  /**
   * NEW (Service Type Filter) — pag-click sa isang row ng "Income by
   * Service" card, direktang ise-set ang serviceFilter papunta doon
   * (shortcut) sa halip na pumunta pa ang staff sa dropdown.
   */
  const handleServiceCardClick = (serviceName) => {
    setServiceFilter((prev) => (prev === serviceName ? 'all' : serviceName));
  };

  // --- MARK AS PAID: simplified, direct action, no method picker ---

  const handleMarkAsPaid = async (bookingId) => {
    setMarkingInFlight(bookingId);
    try {
      const updatedBooking = await apiService.markBookingPaid(bookingId, 'cash');
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, ...updatedBooking } : b))
      );
      await refreshSummary();
    } catch (err) {
      alert(err?.response?.data?.detail || err?.message || 'Failed to mark booking as paid.');
    } finally {
      setMarkingInFlight(null);
    }
  };

  // --- PDF EXPORT: totoong .pdf file, hindi na browser print dialog ---

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    const shopName = localStorage.getItem('shop_name') || 'Laundry Shop';
    const periodLabel = reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1);

    // Header text
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

    // Service Breakdown table — naka-highlight ang napiling service,
    // kung may active na serviceFilter.
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
            data.cell.styles.fillColor = [224, 242, 254]; // sky-100
          }
        },
      });
      cursorY = doc.lastAutoTable.finalY + 10;
    }

    // Payment Method Breakdown table
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

    // Bookings table — kasama LAHAT ng bookings na tumutugma sa
    // kasalukuyang filters (service + payment status), hindi lang
    // yung nasa paid subset, para makita ng owner ang buong picture.
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
        const isPaid = (b.payment_status || 'unpaid') === 'paid';
        return [
          formatDate(b.booking_timestamp),
          b.customer_id ?? `— (${b.customer_name})`,
          b.service_type,
          `P${Number(b.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          isPaid ? `Paid${b.payment_method ? ` (${b.payment_method})` : ''}` : 'Unpaid',
        ];
      }),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 23, 42] }, // slate-900
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          if (String(data.cell.raw).includes('Unpaid')) {
            data.cell.styles.textColor = [180, 83, 9]; // amber-700
          } else {
            data.cell.styles.textColor = [5, 150, 105]; // emerald-600
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <RefreshCw className="animate-spin text-sky-500" size={40} />
      </div>
    );
  }

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

          {/* NEW (Service Type Filter) — dropdown, dynamic base sa
              service_type na aktwal na lumabas sa kasalukuyang date
              range. Ipinapakita lang kapag may 2+ distinct services,
              para hindi nakakagulo kung isa lang naman ang meron. */}
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

            {/* Date Navigation */}
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

            {/* PDF Download Button */}
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95"
            >
              <FileDown size={14} />
              Download PDF
            </button>
          </div>

          {/* Range Total — malinaw na nakalagay na "paid only" */}
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

            {/* Service Breakdown — bawat row ay klikable, gumagana
                bilang shortcut papunta sa serviceFilter sa itaas. */}
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

            {/* Payment Method Breakdown */}
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
                  const isMarking = markingInFlight === b.id;

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
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          {isPaid ? <CheckCircle2 size={12} /> : <CircleDollarSign size={12} />}
                          {isPaid ? `Paid${b.payment_method ? ` (${b.payment_method})` : ''}` : 'Unpaid'}
                        </span>
                      </td>

                      <td className="py-4 pl-4 text-right">
                        {isPaid ? (
                          <span className="text-[10px] text-slate-300 font-bold uppercase">—</span>
                        ) : (
                          <button
                            disabled={isMarking}
                            onClick={() => handleMarkAsPaid(b.id)}
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
    </div>
  );
};

export default RecordSales;