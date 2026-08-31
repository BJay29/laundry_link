import React, { useState, useEffect } from 'react';
import { apiService } from '../services/APIservices';
import {
  History,
  RefreshCw,
  ShieldAlert,
  User,
  Wrench,
  Package,
  Settings2,
  CalendarClock,
  Search,
  Crown,
  UserCog,
  UserCircle2,
} from 'lucide-react';

/**
 * ACTIVITY LOGS PAGE
 *
 * Simple recent-activity feed for the shop — shows who did what and when.
 * Restricted to Owner and Manager roles (Staff cannot view this page),
 * matching the backend's require_role("owner", "manager") on
 * GET /activity-logs/.
 *
 * The role check here is a UX convenience only — even if a Staff account
 * somehow reached this page, the backend would still return 403 on the
 * actual API call. This just avoids showing a broken/empty page and
 * gives a clear explanation instead.
 */
const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const role = apiService.getRole();
  const isAllowed = role === 'owner' || role === 'manager';

  useEffect(() => {
    if (isAllowed) {
      loadLogs();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getActivityLogs(100);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading activity logs:', err);
      setError('Failed to load activity logs. Please try again.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Returns an icon + color pair based on the actor's role, so entries
   * are visually scannable at a glance (who did this: Owner vs Manager
   * vs Staff).
   */
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

  /**
   * Picks an icon representing the KIND of action based on keywords in
   * the description string. Purely cosmetic — the backend just stores
   * free-text descriptions, so this is a best-effort visual hint, not a
   * structured category field.
   */
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

  /**
   * Formats an ISO timestamp into a readable "date at time" string,
   * localized to the browser's own timezone.
   */
  const formatTimestamp = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (log.actor_name || '').toLowerCase().includes(term) ||
      (log.description || '').toLowerCase().includes(term)
    );
  });

  // --- ACCESS RESTRICTED STATE (Staff role) ---
  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 max-w-md text-center">
          <div className="p-3 bg-rose-50 rounded-2xl inline-block mb-4">
            <ShieldAlert size={28} className="text-rose-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-500 text-sm">
            The Activity Log is only visible to Shop Owners and Managers.
            Contact your shop owner if you believe you should have access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 mb-1">
                Shop History
              </p>
              <h1 className="text-3xl font-bold text-gray-900">Activity Log</h1>
              <p className="text-gray-400 text-sm mt-1">
                Recent actions taken by staff and managers in your shop
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
      <div className="max-w-5xl mx-auto px-6 py-8">

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

        {/* Search */}
        {!loading && logs.length > 0 && (
          <div className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-3 text-gray-300" />
              <input
                type="text"
                placeholder="Search by staff name or action…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none text-sm bg-gray-50"
              />
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-500 mx-auto mb-3"></div>
            <p className="text-gray-400 text-sm">Loading activity…</p>
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
              Actions taken in your shop — bookings, machine changes, inventory
              updates, and settings changes — will appear here.
            </p>
          </div>
        )}

        {/* No Search Results */}
        {!loading && logs.length > 0 && filteredLogs.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <p className="text-gray-500 font-semibold">No matching entries</p>
            <p className="text-gray-400 text-sm mt-1">Try a different search term.</p>
          </div>
        )}

        {/* ── Activity Feed ── */}
        {!loading && filteredLogs.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-3.5 border-b border-gray-100 bg-gray-50/60">
              <p className="text-sm text-gray-400 font-medium">
                Showing <span className="font-bold text-gray-700">{filteredLogs.length}</span> entries
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
                          {formatTimestamp(log.timestamp)}
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
  );
};

export default ActivityLogs;