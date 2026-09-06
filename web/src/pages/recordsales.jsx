import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Receipt, CalendarDays, CalendarRange, CalendarClock } from 'lucide-react';
import apiService from '../services/APIservices';
import StatCard from '../components/ui/statcard';

/**
 * RECORD SALES PAGE
 * Shows Today / This Week / This Month total income, plus a table of
 * every booking (Date, Customer, Service, Payment).
 */
const RecordSales = () => {
  const [summary, setSummary] = useState({ today_income: 0, week_income: 0, month_income: 0 });
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
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

      {/* BOOKINGS TABLE */}
      <div className="bg-white p-10 rounded-[56px] border border-slate-100 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-6">All Bookings</h2>

        {bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-300 font-black uppercase text-xs tracking-widest">
            No bookings recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Customer ID</th>
                  <th className="py-3 pr-4">Service</th>
                  <th className="py-3 pr-4 text-right">Payment</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-all">
                    <td className="py-4 pr-4 text-sm font-bold text-slate-600">{formatDate(b.booking_timestamp)}</td>
                    <td className="py-4 pr-4 text-sm font-bold text-slate-600">
                      {b.customer_id ?? `— (${b.customer_name})`}
                    </td>
                    <td className="py-4 pr-4 text-sm font-bold text-slate-600">{b.service_type}</td>
                    <td className="py-4 pr-4 text-sm font-black text-slate-900 text-right">
                      ₱{Number(b.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordSales;