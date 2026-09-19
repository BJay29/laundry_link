import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bell, Settings, LogOut, Clock, Calendar, Search,
  LayoutDashboard, Monitor, Cpu, BarChart3, Package,
  Users, History, Receipt, AlertTriangle, ClipboardList, X
} from 'lucide-react';
import apiService from '../../services/APIservices';
import laundryLinkLogo from '../../assets/Untitled design.png';

/**
 * HEADER COMPONENT
 * 
 * UPDATED: Nagdagdag ng dynamic page title indicator sa tabi ng logo
 * para lumitaw ang pangalan ng kasalukuyang page batay sa active route.
 */

const NAV_ITEMS = [
  { name: 'Dashboard', icon: <LayoutDashboard size={17} />, path: '/dashboard' },
  { name: 'Terminal', icon: <Monitor size={17} />, path: '/terminal' },
  { name: 'Machines', icon: <Cpu size={17} />, path: '/machines' },
  { name: 'Inventory', icon: <Package size={17} />, path: '/inventory' },
  { name: 'Customers', icon: <Users size={17} />, path: '/customer-hub' },
  { name: 'Sales', icon: <Receipt size={17} />, path: '/record-sales' },
  { name: 'Forecast', icon: <BarChart3 size={17} />, path: '/forecast' },
  { name: 'Settings', icon: <Settings size={17} />, path: '/optimization-settings' },
  { name: 'Activity', icon: <History size={17} />, path: '/activity-logs' },
];

// Mapping para sa dynamic page titles
const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/terminal': 'Service Terminal',
  '/machines': 'Machine Hub',
  '/inventory': 'Inventory',
  '/customer-hub': 'Customer Hub',
  '/record-sales': 'Record Sales',
  '/forecast': 'Financial Forecast',
  '/optimization-settings': 'Optimization Settings',
  '/settings': 'Settings',
  '/activity-logs': 'Activity Logs',
};

const SEEN_BOOKINGS_KEY = 'notif_seen_booking_ids';
const SEEN_INVENTORY_KEY = 'notif_seen_inventory_ids';

const getSeenIds = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
};

const markSeen = (key, id) => {
  const seen = getSeenIds(key);
  if (!seen.includes(id)) {
    localStorage.setItem(key, JSON.stringify([...seen, id]));
  }
};

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState({ bookings: [], machines: [], inventory: [] });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchBoxRef = useRef(null);

  // Kunin ang title ng kasalukuyang page, default sa 'LaundryLink' kung walang katugma
  const currentPageTitle = PAGE_TITLES[location.pathname] || 'Dashboard';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  // --- REAL NOTIFICATIONS ---

  const loadNotifications = useCallback(async () => {
    try {
      const [approvalRes, inventoryRes] = await Promise.allSettled([
        apiService.getAwaitingApprovalBookings(),
        apiService.getInventoryDashboardStats(),
      ]);

      const seenBookings = getSeenIds(SEEN_BOOKINGS_KEY);
      const seenInventory = getSeenIds(SEEN_INVENTORY_KEY);

      const bookingNotifs = approvalRes.status === 'fulfilled'
        ? (approvalRes.value || []).map((b) => ({
            id: `booking-${b.id}`,
            rawId: b.id,
            type: 'booking',
            text: `New booking request from ${b.customer_name} — ${b.service_type}`,
            time: b.booking_timestamp,
            unread: !seenBookings.includes(b.id),
            path: '/terminal',
          }))
        : [];

      const lowStockAlerts = inventoryRes.status === 'fulfilled'
        ? (inventoryRes.value?.low_stock_alerts || [])
        : [];

      const inventoryNotifs = lowStockAlerts.map((item) => ({
        id: `inventory-${item.id}`,
        rawId: item.id,
        type: 'inventory',
        text: `${item.item_name} is running ${item.status === 'CRITICAL' ? 'critically ' : ''}low (${item.current_stock} ${item.unit} left)`,
        time: null,
        unread: !seenInventory.includes(item.id),
        path: '/inventory',
      }));

      const combined = [...bookingNotifs, ...inventoryNotifs].sort((a, b) => {
        if (a.unread !== b.unread) return a.unread ? -1 : 1;
        if (!a.time) return 1;
        if (!b.time) return -1;
        return new Date(b.time) - new Date(a.time);
      });

      setNotifications(combined);
    } catch (err) {
      console.error('Notification load failed:', err);
    } finally {
      setLoadingNotifs(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleNotificationClick = (notif) => {
    if (notif.type === 'booking') markSeen(SEEN_BOOKINGS_KEY, notif.rawId);
    if (notif.type === 'inventory') markSeen(SEEN_INVENTORY_KEY, notif.rawId);

    setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, unread: false } : n)));
    setShowNotifications(false);
    navigate(notif.path);
  };

  const formatNotifTime = (iso) => {
    if (!iso) return '';
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  };

  // --- FUNCTIONAL SEARCH ---

  useEffect(() => {
    const buildIndex = async () => {
      try {
        const [bookingsRes, machinesRes, inventoryRes] = await Promise.allSettled([
          apiService.getAllBookings(),
          apiService.getMachines(),
          apiService.getInventory(),
        ]);

        setSearchIndex({
          bookings: bookingsRes.status === 'fulfilled' ? (bookingsRes.value || []) : [],
          machines: machinesRes.status === 'fulfilled' ? (machinesRes.value || []) : [],
          inventory: inventoryRes.status === 'fulfilled' ? (inventoryRes.value || []) : [],
        });
      } catch (err) {
        console.error('Search index build failed:', err);
      }
    };
    buildIndex();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSearchResults = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { pages: [], bookings: [], machines: [], inventory: [] };

    const pages = NAV_ITEMS.filter((item) => item.name.toLowerCase().includes(q)).slice(0, 3);

    const bookings = searchIndex.bookings
      .filter((b) =>
        b.customer_name?.toLowerCase().includes(q) ||
        String(b.id).includes(q) ||
        b.service_type?.toLowerCase().includes(q)
      )
      .slice(0, 4);

    const machines = searchIndex.machines
      .filter((m) =>
        `${m.machine_type} ${m.machine_number}`.toLowerCase().includes(q)
      )
      .slice(0, 4);

    const inventory = searchIndex.inventory
      .filter((i) => i.item_name?.toLowerCase().includes(q))
      .slice(0, 4);

    return { pages, bookings, machines, inventory };
  };

  const results = getSearchResults();
  const hasResults = results.pages.length || results.bookings.length || results.machines.length || results.inventory.length;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (results.pages.length > 0) {
      navigate(results.pages[0].path);
      setSearchQuery('');
      setShowSearchResults(false);
    }
  };

  const goToResult = (path) => {
    navigate(path);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between sticky top-0 z-50 shadow-sm gap-4">

      {/* 1. LEFT: Logo + Dynamic Page Name Indicator */}
      <div className="flex items-center gap-4 shrink-0">
        <img src={laundryLinkLogo} alt="LaundryLink" className="h-9 w-auto" />
        <div className="h-5 w-[1px] bg-slate-200 hidden sm:block"></div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-slate-800 tracking-tight uppercase">
            {currentPageTitle}
          </span>
        </div>
      </div>

      {/* 2. CENTER: Search + Live Clock */}
      <div className="flex items-center gap-3 flex-1 max-w-xl justify-end">

        <div ref={searchBoxRef} className="relative w-full max-w-xs md:max-w-md">
          <form onSubmit={handleSearchSubmit}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
              onFocus={() => setShowSearchResults(true)}
              placeholder="Search customers, machines, records..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-2xl pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setShowSearchResults(false); }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-300 hover:text-slate-500"
              >
                <X size={14} />
              </button>
            )}
          </form>

          {/* Search Results Dropdown */}
          {showSearchResults && searchQuery.trim() && (
            <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 max-h-96 overflow-y-auto">
              {!hasResults ? (
                <p className="px-4 py-3 text-xs text-slate-400 font-medium">No matches for "{searchQuery}"</p>
              ) : (
                <>
                  {results.pages.length > 0 && (
                    <div className="px-2 pb-1">
                      <p className="px-2 py-1 text-[9px] font-black text-slate-300 uppercase tracking-widest">Pages</p>
                      {results.pages.map((p) => (
                        <button key={p.path} onClick={() => goToResult(p.path)} className="w-full flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-slate-50 text-left text-xs font-bold text-slate-700">
                          {p.icon} {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {results.bookings.length > 0 && (
                    <div className="px-2 pb-1 border-t border-slate-50 pt-1">
                      <p className="px-2 py-1 text-[9px] font-black text-slate-300 uppercase tracking-widest">Bookings</p>
                      {results.bookings.map((b) => (
                        <button key={b.id} onClick={() => goToResult('/record-sales')} className="w-full flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-slate-50 text-left">
                          <Receipt size={14} className="text-slate-300 shrink-0" />
                          <span className="text-xs font-bold text-slate-700 truncate">{b.customer_name} — {b.service_type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {results.machines.length > 0 && (
                    <div className="px-2 pb-1 border-t border-slate-50 pt-1">
                      <p className="px-2 py-1 text-[9px] font-black text-slate-300 uppercase tracking-widest">Machines</p>
                      {results.machines.map((m) => (
                        <button key={m.id} onClick={() => goToResult('/machines')} className="w-full flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-slate-50 text-left">
                          <Cpu size={14} className="text-slate-300 shrink-0" />
                          <span className="text-xs font-bold text-slate-700">{m.machine_type} #{m.machine_number} — {m.status}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {results.inventory.length > 0 && (
                    <div className="px-2 pb-1 border-t border-slate-50 pt-1">
                      <p className="px-2 py-1 text-[9px] font-black text-slate-300 uppercase tracking-widest">Inventory</p>
                      {results.inventory.map((i) => (
                        <button key={i.id} onClick={() => goToResult('/inventory')} className="w-full flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-slate-50 text-left">
                          <Package size={14} className="text-slate-300 shrink-0" />
                          <span className="text-xs font-bold text-slate-700">{i.item_name} — {i.current_stock} {i.unit}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="hidden xl:flex items-center gap-3 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-2xl shadow-sm shrink-0">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
            <Calendar size={14} className="text-sky-500" />
            <span>{formattedDate}</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-200"></div>
          <div className="flex items-center gap-1.5 text-slate-700 text-xs font-bold">
            <Clock size={14} className="text-emerald-500 animate-pulse" />
            <span className="tracking-wide font-mono">{formattedTime}</span>
          </div>
        </div>
      </div>

      {/* 3. RIGHT: Notifications & Profile */}
      <div className="flex items-center gap-4 relative shrink-0">

        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }}
            className="p-2 text-slate-600 hover:text-sky-500 hover:bg-slate-100 rounded-full transition relative"
            aria-label="Toggle notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-rose-500 rounded-full ring-2 ring-white text-[9px] font-black text-white flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 z-50">
              <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">System Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-rose-50 text-rose-600 font-semibold px-2 py-0.5 rounded-full">{unreadCount} new</span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {loadingNotifs ? (
                  <p className="p-4 text-xs text-slate-400 font-medium">Loading...</p>
                ) : notifications.length === 0 ? (
                  <p className="p-4 text-xs text-slate-400 font-medium">You're all caught up — no notifications.</p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left p-3 hover:bg-slate-50 transition cursor-pointer text-xs ${n.unread ? 'bg-sky-50/40' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        {n.type === 'inventory' ? (
                          <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                        ) : (
                          <ClipboardList size={13} className="text-sky-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-slate-700 ${n.unread ? 'font-bold' : ''}`}>{n.text}</p>
                          {n.time && (
                            <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                              <Clock size={10} /> {formatNotifTime(n.time)}
                            </span>
                          )}
                        </div>
                        {n.unread && <span className="w-1.5 h-1.5 bg-sky-500 rounded-full shrink-0 mt-1.5" />}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-[1px] bg-slate-200"></div>

        <div className="relative">
          <button
            onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
            className="flex items-center gap-3 p-1.5 rounded-full hover:bg-slate-100 transition border border-slate-200"
            aria-label="Toggle profile menu"
          >
            <div className="w-8 h-8 rounded-full bg-sky-500 text-white font-bold flex items-center justify-center text-sm shadow-sm">
              LL
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
              <div className="py-1">
                <button
                  onClick={() => { navigate('/optimization-settings'); setShowProfileMenu(false); }}
                  className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                >
                  <Settings size={15} className="text-slate-400" /> Account Settings
                </button>
                <div className="border-t border-slate-100 my-1"></div>
                <button
                  onClick={() => { navigate('/login'); setShowProfileMenu(false); }}
                  className="w-full px-4 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition"
                >
                  <LogOut size={15} className="text-rose-500" /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;