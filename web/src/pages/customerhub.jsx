import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Users,
  Crown,
  Star,
  Clock,
  TrendingUp,
  PhilippinePeso,
  Search,
  ChevronUp,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import apiService from '../services/APIservices';

// ─────────────────────────────────────────────────────────────────────────────
// SEGMENT CONFIG
// Maps segment name → icon, colors, and badge styles
// ─────────────────────────────────────────────────────────────────────────────
const SEGMENT_CONFIG = {
  VIP: {
    icon:       <Crown size={14} />,
    badge:      'bg-amber-100 text-amber-700 border-amber-200',
    row:        'bg-amber-50/40',
    dot:        'bg-amber-400',
    chart:      '#F59E0B',
    stat:       'bg-amber-50 border-amber-100 text-amber-700',
    statIcon:   'text-amber-500',
  },
  Regular: {
    icon:       <Star size={14} />,
    badge:      'bg-sky-100 text-sky-700 border-sky-200',
    row:        '',
    dot:        'bg-sky-400',
    chart:      '#38BDF8',
    stat:       'bg-sky-50 border-sky-100 text-sky-700',
    statIcon:   'text-sky-500',
  },
  Occasional: {
    icon:       <Clock size={14} />,
    badge:      'bg-slate-100 text-slate-600 border-slate-200',
    row:        '',
    dot:        'bg-slate-300',
    chart:      '#CBD5E1',
    stat:       'bg-slate-50 border-slate-100 text-slate-600',
    statIcon:   'text-slate-400',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM PIE CHART TOOLTIP
// ─────────────────────────────────────────────────────────────────────────────
const PieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, value } = payload[0];
    const cfg = SEGMENT_CONFIG[name] || {};
    return (
      <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-bold">
        <p className="text-slate-400 uppercase tracking-widest text-[9px] mb-1">{name}</p>
        <p className="text-white text-sm font-black">{value} customers</p>
      </div>
    );
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD SUB-COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const SegmentStatCard = ({ label, count, total, config }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className={`flex-1 border rounded-[28px] px-6 py-5 ${config.stat}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-2 font-black text-[10px] uppercase tracking-widest ${config.statIcon}`}>
          {config.icon}
          {label}
        </div>
        <span className="text-2xl font-black">{count}</span>
      </div>
      <div className="w-full bg-white/60 h-1.5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: config.chart }}
        />
      </div>
      <p className="text-[10px] font-bold mt-1.5 opacity-60">{pct}% of total</p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CUSTOMER HUB PAGE
// ─────────────────────────────────────────────────────────────────────────────
const CustomerHub = () => {
  const [customers, setCustomers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState('');
  const [filterSeg, setFilterSeg]   = useState('All');
  const [sortKey, setSortKey]       = useState('total_spent');
  const [sortDir, setSortDir]       = useState('desc');

  // ── Data Fetch ──────────────────────────────────────────────────────────
  const loadSegments = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const data = await apiService.getCustomerSegments();
      setCustomers(data || []);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      setError(msg || 'Failed to load customer segments.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSegments();
  }, [loadSegments]);

  // ── Derived Data ────────────────────────────────────────────────────────
  const segmentCounts = customers.reduce((acc, c) => {
    acc[c.segment] = (acc[c.segment] || 0) + 1;
    return acc;
  }, {});

  const pieData = ['VIP', 'Regular', 'Occasional']
    .filter(s => segmentCounts[s])
    .map(s => ({ name: s, value: segmentCounts[s] }));

  // Filter + search + sort
  const filtered = customers
    .filter(c => filterSeg === 'All' || c.segment === filterSeg)
    .filter(c =>
      !search ||
      c.customer_name?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ChevronUp size={12} className="text-slate-200" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-sky-500" />
      : <ChevronDown size={12} className="text-sky-500" />;
  };

  // ── Loading Screen ───────────────────────────────────────────────────────
  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <RefreshCw className="animate-spin text-sky-500" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
          Analyzing Customers...
        </p>
      </div>
    </div>
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-10">
        <div>
          <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-2 opacity-60">
            AI-Powered Behavioral Analysis
          </p>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase">
            Customer Hub
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">
            K-Means segmentation based on visit frequency and total spending.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-500 font-bold text-sm">
            <Users size={16} className="text-sky-500" />
            <span>{customers.length} Customers</span>
          </div>
          <button
            onClick={() => loadSegments(true)}
            className={`p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-all active:scale-95 ${refreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={18} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* ── ERROR BANNER ── */}
      {error && (
        <div className="mb-8 bg-rose-50 border border-rose-100 p-5 rounded-[28px] flex items-center gap-4 text-rose-600 font-bold text-sm">
          <AlertCircle size={20} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── SEGMENT STAT CARDS + PIE CHART ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* Stat cards stacked */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Top row: three segment cards */}
          <div className="flex flex-col sm:flex-row gap-4">
            {['VIP', 'Regular', 'Occasional'].map(seg => (
              <SegmentStatCard
                key={seg}
                label={seg}
                count={segmentCounts[seg] || 0}
                total={customers.length}
                config={SEGMENT_CONFIG[seg]}
              />
            ))}
          </div>

          {/* Summary metrics row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-100 rounded-[24px] px-6 py-5 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Top Spender
              </p>
              <p className="text-lg font-black text-slate-900 truncate">
                {customers.length > 0
                  ? [...customers].sort((a, b) => b.total_spent - a.total_spent)[0]?.customer_name
                  : '—'}
              </p>
            </div>
            <div className="bg-white border border-slate-100 rounded-[24px] px-6 py-5 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Avg. Spend
              </p>
              <p className="text-lg font-black text-emerald-600">
                ₱{customers.length > 0
                  ? Math.round(customers.reduce((s, c) => s + c.total_spent, 0) / customers.length).toLocaleString()
                  : 0}
              </p>
            </div>
            <div className="bg-white border border-slate-100 rounded-[24px] px-6 py-5 shadow-sm col-span-2 sm:col-span-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Avg. Visits
              </p>
              <p className="text-lg font-black text-sky-600">
                {customers.length > 0
                  ? (customers.reduce((s, c) => s + c.visit_frequency, 0) / customers.length).toFixed(1)
                  : 0} visits
              </p>
            </div>
          </div>
        </div>

        {/* Pie chart */}
        <div className="bg-white border border-slate-100 rounded-[32px] shadow-sm p-6 flex flex-col">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
            Segment Distribution
          </p>
          {pieData.length > 0 ? (
            <div className="flex-1" style={{ minHeight: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius="45%"
                    outerRadius="70%"
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={SEGMENT_CONFIG[entry.name]?.chart || '#CBD5E1'}
                        stroke="white"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{
                      fontSize: '10px',
                      fontWeight: '900',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-300 font-black text-[10px] uppercase tracking-widest">
              No Data
            </div>
          )}
        </div>
      </div>

      {/* ── FILTER + SEARCH BAR ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">

        {/* Search input */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            type="text"
            placeholder="Search customer name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-5 py-3.5 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-sky-300 transition-all shadow-sm"
          />
        </div>

        {/* Segment filter pills */}
        <div className="flex items-center gap-2">
          {['All', 'VIP', 'Regular', 'Occasional'].map(seg => (
            <button
              key={seg}
              onClick={() => setFilterSeg(seg)}
              className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border
                ${filterSeg === seg
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'
                }`}
            >
              {seg}
            </button>
          ))}
        </div>
      </div>

      {/* ── CUSTOMER TABLE ── */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/50">
                {[
                  { label: 'Customer',       key: null },
                  { label: 'Segment',        key: null },
                  { label: 'Visits',         key: 'visit_frequency' },
                  { label: 'Total Spent',    key: 'total_spent' },
                  { label: 'Avg / Visit',    key: 'avg_per_visit' },
                ].map(({ label, key }) => (
                  <th
                    key={label}
                    onClick={() => key && handleSort(key)}
                    className={`text-left px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 select-none
                      ${key ? 'cursor-pointer hover:text-slate-600' : ''}`}
                  >
                    <div className="flex items-center gap-1.5">
                      {label}
                      {key && <SortIcon col={key} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-28">
                    <div className="flex flex-col items-center gap-3 opacity-50">
                      <Users size={40} className="text-slate-200" />
                      <p className="text-slate-500 font-black text-sm uppercase tracking-tight">
                        No customers found
                      </p>
                      <p className="text-slate-300 text-xs font-bold">
                        {customers.length === 0
                          ? 'Add bookings to generate customer segments.'
                          : 'Try adjusting your search or filter.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((customer, idx) => {
                  const cfg = SEGMENT_CONFIG[customer.segment] || SEGMENT_CONFIG.Occasional;
                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50/60 transition-colors ${cfg.row}`}
                    >
                      {/* Customer Name */}
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0
                            ${customer.segment === 'VIP'
                              ? 'bg-amber-400'
                              : customer.segment === 'Regular'
                              ? 'bg-sky-500'
                              : 'bg-slate-300'}`}
                          >
                            {customer.customer_name?.charAt(0).toUpperCase() || 'C'}
                          </div>
                          <span className="text-slate-900 font-black text-sm truncate max-w-[180px]">
                            {customer.customer_name || 'Walk-in Client'}
                          </span>
                        </div>
                      </td>

                      {/* Segment Badge */}
                      <td className="px-8 py-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight border ${cfg.badge}`}>
                          {cfg.icon}
                          {customer.segment}
                        </span>
                      </td>

                      {/* Visit Frequency */}
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp size={13} className="text-slate-300" />
                          <span className="text-slate-700 font-black text-sm">
                            {customer.visit_frequency}
                            <span className="text-slate-300 font-bold text-[10px] ml-1">visits</span>
                          </span>
                        </div>
                      </td>

                      {/* Total Spent */}
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-1">
                          <PhilippinePeso size={13} className="text-emerald-500" />
                          <span className="text-emerald-600 font-black text-sm">
                            {parseFloat(customer.total_spent || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Average Per Visit */}
                      <td className="px-8 py-6">
                        <span className="text-slate-500 font-bold text-sm">
                          ₱{parseFloat(customer.avg_per_visit || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer showing result count */}
        {filtered.length > 0 && (
          <div className="px-8 py-4 border-t border-slate-50 bg-slate-50/30">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              Showing {filtered.length} of {customers.length} customers
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerHub;
