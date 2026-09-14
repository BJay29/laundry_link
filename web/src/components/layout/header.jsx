import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, Settings, LogOut, Clock, Calendar, Search } from 'lucide-react';
import laundryLinkLogo from '../../assets/Untitled design.png';

const Header = () => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  // Update live clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format date and time
  const formattedDate = currentTime.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Mock notifications para sa mga nangyayari sa web app
  const notifications = [
    { id: 1, text: "New booking received for Machine 1", time: "5m ago", unread: true },
    { id: 2, text: "Washing cycle completed on Machine 3", time: "1h ago", unread: true },
    { id: 3, text: "Inventory alert: Ariel detergent is low", time: "3h ago", unread: false },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Pwede mong lagyan dito ang routing o filtering logic para sa global search
      console.log("Searching for:", searchQuery);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between sticky top-0 z-50 shadow-sm gap-4">
      
      {/* 1. LEFT SIDE: Logo lang ang naiwan para sakop ang pinaka-kaliwa */}
      <div className="flex items-center gap-4 shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <img src={laundryLinkLogo} alt="LaundryLink Logo" className="h-9 w-9 object-contain" />
          <span className="text-xl font-black italic tracking-tight hidden sm:inline">
            <span className="text-sky-500">LAUNDRY</span>
            <span className="text-green-600">LINK</span>
          </span>
        </Link>
      </div>

      {/* 2. CENTER: Global Search Bar & Live Date/Time */}
      <div className="flex items-center gap-3 flex-1 max-w-xl justify-center">
        
        {/* Search Bar Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xs md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers, machines, records..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-2xl pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition shadow-inner"
          />
        </form>

        {/* Live Date & Time Display */}
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

      {/* 3. RIGHT SIDE: Notifications & Profile Toggle */}
      <div className="flex items-center gap-4 relative shrink-0">
        
        {/* Notification Dropdown Toggle */}
        <div className="relative">
          <button 
            onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }}
            className="p-2 text-slate-600 hover:text-sky-500 hover:bg-slate-100 rounded-full transition relative"
            aria-label="Toggle notifications"
          >
            <Bell size={20} />
            {/* Red dot badge para sa unread updates */}
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
          </button>

          {/* Notification Panel Box */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 z-50">
              <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">System Notifications</h3>
                <span className="text-[10px] bg-sky-50 text-sky-600 font-semibold px-2 py-0.5 rounded-full">Recent</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {notifications.map((n) => (
                  <div key={n.id} className={`p-3 hover:bg-slate-50 transition cursor-pointer text-xs ${n.unread ? 'bg-sky-50/40' : ''}`}>
                    <p className="font-medium text-slate-700">{n.text}</p>
                    <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Clock size={10} /> {n.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-[1px] bg-slate-200"></div>

        {/* Profile Dropdown Toggle */}
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

          {/* Profile Menu Dropdown (Account Settings & Logout) */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
              <div className="py-1">
                <button 
                  onClick={() => { navigate('/settings'); setShowProfileMenu(false); }}
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