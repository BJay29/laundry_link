import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/APIservices';
import Sidebar from '../components/layout/sidebar';
import {
  History,
  RefreshCw,
  ShieldAlert,
  Wrench,
  Package,
  Settings2,
  CalendarClock,
  Search,
  Crown,
  UserCog,
  UserCircle2,
  Clock,
  CalendarDays,
  CalendarRange,
} from 'lucide-react';

/**
 * ACTIVITY LOGS PAGE
 *
 * Recent-activity feed for the shop — shows who did what and when.
 *
 * UPDATED: Tinanggal na ang frontend-side "Access Restricted" gate para
 * sa Staff role. Ang backend (GET /activity-logs) na mismo ang humahawak
 * ng content scoping ngayon: Staff accounts ay makikita lang ang SARILI
 * nilang mga actions, habang Owner/Manager ay makikita ang lahat ng
 * activity sa shop. Dahil dito, hindi na kailangang itago ang buong
 * page mula sa Staff — ang subtitle na lang ang nagbabago depende sa
 * role, para malinaw sa kanila na "sarili lang" ang saklaw nila.
 *
 * - Time-range filter cards: Today / Last 7 Days / Last 30 Days.
 * - Role filter pills: All / Owner / Manager / Staff, alongside the
 *   existing search box (may epekto lang ito kung Owner/Manager ang
 *   naka-login, dahil sila lang makakakita ng iba't ibang actor roles
 *   sa unang lugar).
 * - Correct date AND time display — this depends on the backend fix to
 *   ActivityLog.timestamp (now DateTime(timezone=True) in models.py).
 * - Explicit "showing latest N entries" limit indicator.
 */

const FETCH_LIMIT = 100;

const ROLE_FILTERS = [
  { key: 'All', label: 'All' },
  { key: 'owner', label: 'Owner' },
  { key: 'manager', label: 'Manager' },
  { key: 'staff', label: 'Staff' },
];

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [rangeFilter, setRangeFilter] = useState(null); // null | 'today' | '7d' | '30d'

  // Current user's role — ginagamit na lang ngayon para sa SUBTITLE
  // text (linawin sa Staff na "sarili mo lang" ang laman), hindi na
  // bilang access gate. Ang aktwal na content scoping ay nasa backend.
  const role = apiService.getRole();
  const isOwnerOrManager = role === 'owner' || role === 'manager';

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getActivityLogs(FETCH_LIMIT);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading activity logs:', err);
      setError('Failed to load activity logs. Please try again.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (actorRole) => {
    switch (actorRole) {
      case 'owner':
        return { icon: <Crown size={14} />, color: 'text-amber-600', bg: 'bg-amber-50' };
      case 'manager':
        return { icon: <UserCog size={14} />, color: 'text-indigo-600', bg: 'bg-indigo-50' };
      default:
        return { icon: <UserCircle2 size={14} />, color: 'text-slate-500', bg: 'bg-slate-100' };
    }
  };

  const getActionIcon = (description) => {
    const desc = (description || '').toLowerCase();
    if (desc.includes('booking')) return <CalendarClock size={16} className="text-sky-500" />;
    if (desc.includes('machine')) return <Wrench size={16} className="text-orange-500" />;
    if (desc.includes('inventory')) return <Package size={16} className="text-emerald-500" />;
    if (desc.includes('service') || desc.includes('setting') || desc.includes('profile')) {
      return <Settings2 size={16} className="text-purple-500" />;
    }
    return <History size={16} className="text-slate-400" />;
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // --- Time-range boundaries (computed once per render) ---
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const isInRange = (log, range) => {
    if (!log.timestamp) return false;
    const logDate = new Date(log.timestamp);
    if (range === 'today') return logDate >= startOfToday;
    if (range === '7d') return logDate >= sevenDaysAgo;
    if (range === '30d') return logDate >= thirtyDaysAgo;
    return true;
  };

  // --- Derived counts for the range filter cards ---
  const todayCount = useMemo(() => logs.filter((l) => isInRange(l, 'today')).length, [logs]);
  const last7Count = useMemo(() => logs.filter((l) => isInRange(l, '7d')).length, [logs]);
  const last30Count = useMemo(() => logs.filter((l) => isInRange(l, '30d')).length, [logs]);

  const toggleRangeFilter = (range) => {
    setRangeFilter((prev) => (prev === range ? null : range));
  };

  // --- Combined filtering: role + range + search ---
  const filteredLogs = logs.filter((log) => {
    if (roleFilter !== 'All' && log.actor_role !== roleFilter) return false;
    if (rangeFilter && !isInRange(log, rangeFilter)) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matches =
        (log.actor_name || '').toLowerCase().includes(term) ||
        (log.description || '').toLowerCase().includes(term);
      if (!matches) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 ml-72">

        {/* ── Page Header ── */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 mb-1">
                  Shop History
                </p>
                <h1 className="text-3xl font-bold text-gray-900">Activity Log</h1>
                {/* UPDATED: subtitle depends on role now — Staff sees a
                    note clarifying the feed is scoped to their own
                    actions only, matching what the backend actually
                    returns for them. */}
                <p className="text-gray-400 text-sm mt-1">
                  {isOwnerOrManager
                    ? 'Recent actions taken by staff and managers in your shop'
                    : 'Your recent actions in this shop'}
                </p>
              </div>
              <button
                onClick={loadLogs}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-xl transition-colors inline-flex items-center gap-2 text-sm"
              >
                <RefreshCw size={15} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="max-w-6xl mx-auto px-8 py-8">

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
              <ShieldAlert size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-800 font-semibold text-sm">Error</p>
                <p className="text-red-600 text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* ── Time-Range Filter Cards (Today / Last 7 Days / Last 30 Days) ── */}
          {!loading && logs.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <button
                onClick={() => toggleRangeFilter('today')}
                className={`text-left p-5 rounded-2xl border shadow-sm flex justify-between items-start transition-all ${
                  rangeFilter === 'today'
                    ? 'bg-sky-500 border-sky-500 shadow-md'
                    : 'bg-white border-gray-100 hover:border-sky-200'
                }`}
              >
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${rangeFilter === 'today' ? 'text-sky-100' : 'text-gray-400'}`}>
                    Today
                  </p>
                  <p className={`text-3xl font-bold ${rangeFilter === 'today' ? 'text-white' : 'text-gray-900'}`}>
                    {todayCount}
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl ${rangeFilter === 'today' ? 'bg-white/20' : 'bg-sky-50'}`}>
                  <Clock size={20} className={rangeFilter === 'today' ? 'text-white' : 'text-sky-500'} />
                </div>
              </button>

              <button
                onClick={() => toggleRangeFilter('7d')}
                className={`text-left p-5 rounded-2xl border shadow-sm flex justify-between items-start transition-all ${
                  rangeFilter === '7d'
                    ? 'bg-indigo-500 border-indigo-500 shadow-md'
                    : 'bg-white border-gray-100 hover:border-indigo-200'
                }`}
              >
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${rangeFilter === '7d' ? 'text-indigo-100' : 'text-gray-400'}`}>
                    Last 7 Days
                  </p>
                  <p className={`text-3xl font-bold ${rangeFilter === '7d' ? 'text-white' : 'text-gray-900'}`}>
                    {last7Count}
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl ${rangeFilter === '7d' ? 'bg-white/20' : 'bg-indigo-50'}`}>
                  <CalendarDays size={20} className={rangeFilter === '7d' ? 'text-white' : 'text-indigo-500'} />
                </div>
              </button>

              <button
                onClick={() => toggleRangeFilter('30d')}
                className={`text-left p-5 rounded-2xl border shadow-sm flex justify-between items-start transition-all ${
                  rangeFilter === '30d'
                    ? 'bg-emerald-500 border-emerald-500 shadow-md'
                    : 'bg-white border-gray-100 hover:border-emerald-200'
                }`}
              >
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${rangeFilter === '30d' ? 'text-emerald-100' : 'text-gray-400'}`}>
                    Last 30 Days
                  </p>
                  <p className={`text-3xl font-bold ${rangeFilter === '30d' ? 'text-white' : 'text-gray-900'}`}>
                    {last30Count}
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl ${rangeFilter === '30d' ? 'bg-white/20' : 'bg-emerald-50'}`}>
                  <CalendarRange size={20} className={rangeFilter === '30d' ? 'text-white' : 'text-emerald-500'} />
                </div>
              </button>
            </div>
          )}

          {/* Search + Role Filter Pills */}
          {!loading && logs.length > 0 && (
            <div className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-3 text-gray-300" />
                  <input
                    type="text"
                    placeholder="Search by staff name or action..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none text-sm bg-gray-50"
                  />
                </div>

                {/* Role filter pills — useful lang talaga kapag Owner/
                    Manager ang naka-login, dahil sila lang makakakita
                    ng entries na may iba't ibang actor_role. Staff ay
                    laging "staff" lang ang makikita nila kahit anong
                    piliin dito, pero hindi na natin ito hinarang para
                    hindi na kailangan pang gumawa ng hiwalay na layout
                    variant. */}
                <div className="flex items-center gap-2">
                  {ROLE_FILTERS.map((rf) => (
                    <button
                      key={rf.key}
                      onClick={() => setRoleFilter(rf.key)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all border ${
                        roleFilter === rf.key
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600'
                      }`}
                    >
                      {rf.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-500 mx-auto mb-3"></div>
              <p className="text-gray-400 text-sm">Loading activity...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && logs.length === 0 && !error && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="p-3 bg-gray-50 rounded-2xl inline-block mb-3">
                <History size={24} className="text-gray-300" />
              </div>
              <p className="text-gray-500 font-semibold">No activity yet</p>
              <p className="text-gray-400 text-sm mt-1">
                {isOwnerOrManager
                  ? 'Actions taken in your shop — bookings, machine changes, inventory updates, and settings changes — will appear here.'
                  : 'Your actions — bookings, machine changes, and other tasks you perform — will appear here.'}
              </p>
            </div>
          )}

          {/* No Filter/Search Results */}
          {!loading && logs.length > 0 && filteredLogs.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <p className="text-gray-500 font-semibold">No matching entries</p>
              <p className="text-gray-400 text-sm mt-1">Try a different search term or filter.</p>
            </div>
          )}

          {/* ── Activity Feed ── */}
          {!loading && filteredLogs.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
                <p className="text-sm text-gray-400 font-medium">
                  Showing <span className="font-bold text-gray-700">{filteredLogs.length}</span> entries
                </p>
                <p className="text-xs text-gray-300 font-semibold">
                  Latest {FETCH_LIMIT} entries fetched
                </p>
              </div>

              <div className="divide-y divide-gray-50">
                {filteredLogs.map((log) => {
                  const roleBadge = getRoleBadge(log.actor_role);
                  return (
                    <div
                      key={log.id}
                      className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50/70 transition-colors"
                    >
                      <div className="p-2 bg-gray-50 rounded-xl shrink-0 mt-0.5">
                        {getActionIcon(log.description)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 font-medium leading-snug">
                          {log.description}
                        </p>
                        <div className="flex items-center flex-wrap gap-2 mt-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${roleBadge.bg} ${roleBadge.color} rounded-md text-xs font-semibold`}>
                            {roleBadge.icon}
                            {log.actor_name}
                          </span>
                          <span className="text-xs text-gray-300">•</span>
                          <span className="text-xs text-gray-400">
                            {formatDate(log.timestamp)}
                          </span>
                          <span className="text-xs text-gray-300">at</span>
                          <span className="text-xs text-gray-400 font-semibold">
                            {formatTime(log.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityLogs;
