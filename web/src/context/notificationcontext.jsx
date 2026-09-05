import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X } from 'lucide-react';
import apiService from '../services/APIservices';
import { connectNotificationSocket } from '../services/notificationsocket';

/**
 * NOTIFICATION CONTEXT
 *
 * App/Layout-level home ng WebSocket connection + "Awaiting Approval"
 * booking requests. Dating naka-mount lang ito sa loob ng
 * ServiceTerminal.jsx — ibig sabihin, "online" lang ang shop para
 * makatanggap ng real-time notifications habang nasa Service Terminal
 * page lang ang user. Dito na ito nakatira ngayon, isang beses lang
 * kumo-connect, at buhay habang naka-login ang user kahit anong
 * page (Dashboard, Inventory, Settings, atbp.) ang binibisita nila.
 *
 * Kahit sino mang component ang kailangang malaman ng bagong booking
 * requests o ang kasalukuyang "Awaiting Approval" list, tumawag lang
 * ng useNotifications() sa loob nito.
 */

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
};

export const NotificationProvider = ({ children }) => {
  const [awaitingApproval, setAwaitingApproval] = useState([]);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const loadAwaitingApproval = useCallback(async () => {
    try {
      const data = await apiService.getAwaitingApprovalBookings();
      setAwaitingApproval(data || []);
    } catch (err) {
      console.error('Awaiting Approval fetch error:', err.message);
    }
  }, []);

  const showToast = useCallback((message) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  // Initial load + 20s polling fallback — tumatakbo sa buong app, hindi
  // lang sa Service Terminal, kaya tumpak pa rin ang badge count kahit
  // anong page ang kasalukuyang binubuksan ng user.
  useEffect(() => {
    loadAwaitingApproval();
    const interval = setInterval(() => loadAwaitingApproval(), 20000);
    return () => clearInterval(interval);
  }, [loadAwaitingApproval]);

  // WebSocket — isang beses lang kumo-connect dito sa app/layout level
  // (hindi na per-page), kaya nananatiling "online" ang shop at
  // tumatanggap ng real-time booking requests kahit saang page naroon
  // ang user.
  useEffect(() => {
    const connection = connectNotificationSocket({
      onMessage: (data) => {
        if (data.type === 'new_booking_request') {
          showToast(`🔔 New booking request from ${data.customer_name}`);
          loadAwaitingApproval();
        }
      },
    });

    return () => connection.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const acceptBooking = useCallback(async (bookingId) => {
    await apiService.acceptBooking(bookingId);
    setAwaitingApproval(prev => prev.filter(b => b.id !== bookingId));
  }, []);

  /**
   * reason: forwarded to apiService.declineBooking(bookingId, reason) —
   * ang backend ay nangangailangan ng non-empty reason at ise-save ito
   * sa booking para makita ng customer kung bakit hindi natanggap.
   */
  const declineBooking = useCallback(async (bookingId, reason) => {
    await apiService.declineBooking(bookingId, reason);
    setAwaitingApproval(prev => prev.filter(b => b.id !== bookingId));
  }, []);

  const value = {
    awaitingApproval,
    refreshAwaitingApproval: loadAwaitingApproval,
    acceptBooking,
    declineBooking,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* Global toast — lalabas kahit saang page, hindi lang sa Service
          Terminal, dahil dito na naka-mount ang buong provider. */}
      {toast && (
        <div className="fixed top-8 right-8 z-[200] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 animate-in fade-in slide-in-from-right-4 max-w-sm">
          <Bell size={18} className="text-sky-400 shrink-0" />
          <span className="flex-1">{toast}</span>
          <button
            onClick={() => setToast(null)}
            className="text-white/40 hover:text-white transition-colors ml-1"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;