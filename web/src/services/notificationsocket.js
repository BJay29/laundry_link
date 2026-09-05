/**
 * NOTIFICATION SOCKET SERVICE
 *
 * Lightweight WebSocket connection helper para sa real-time booking
 * request notifications.
 *
 * UPDATED: dating ito'y direktang tinatawag sa loob ng
 * ServiceTerminal.jsx — kaya "online" lang ang koneksyon habang
 * naka-mount ang page na 'yon. Ngayon, tinatawag ito ng
 * NotificationContext.jsx (app/layout level, see App.jsx), kaya
 * buhay ang koneksyon habang naka-login ang user, kahit anong
 * page (Dashboard, Inventory, Settings, atbp.) ang binibisita nila.
 * Ang function mismo ay walang binago — connection helper lang ito,
 * hindi nito alam kung sino ang tumatawag dito.
 *
 * Konektado sa GET /ws/notifications?token=<JWT> (backend endpoint).
 * Kung mahihiwalay ang connection (network blip, backend restart, atbp.),
 * automatic itong susubukang mag-reconnect na may exponential backoff,
 * hanggang sa max na 5 tries — pagkatapos noon, aasa na lang sa polling
 * fallback (GET /bookings/awaiting-approval, sa loob ng
 * NotificationContext) ang buong app.
 *
 * Hindi na susubukang mag-reconnect kapag ang dahilan ng pagkaka-close
 * ay AUTH FAILURE (close code 4401 = invalid/missing token, 4403 =
 * wrong token type — see backend's websocket_routes.py). Walang saysay
 * 'yun dahil hindi naman magiging valid ang parehong token sa susunod
 * na try — maghihintay na lang ito ng bagong login.
 */

const WS_BASE_URL = 'wss://laundrylink-backend-8p1l.onrender.com';
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY_MS = 2000;

// Close codes sent by the backend (see app/routes/websocket_routes.py)
// when the token is missing/invalid or belongs to the wrong account
// type. Retrying with the exact same token can never succeed for these.
const AUTH_FAILURE_CLOSE_CODES = [4401, 4403];

export function connectNotificationSocket({ onMessage, onOpen, onClose }) {
  let socket = null;
  let reconnectAttempts = 0;
  let reconnectTimer = null;
  let manuallyClosed = false;

  const getToken = () => localStorage.getItem('token');

  const openSocket = () => {
    const token = getToken();
    if (!token) {
      console.warn('NotificationSocket: no auth token found, skipping connection.');
      return;
    }

    socket = new WebSocket(`${WS_BASE_URL}/ws/notifications?token=${token}`);

    socket.onopen = () => {
      reconnectAttempts = 0;
      if (onOpen) onOpen();
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
      } catch (err) {
        console.error('NotificationSocket: failed to parse message', err);
      }
    };

    socket.onclose = (event) => {
      if (onClose) onClose(event);
      if (manuallyClosed) return;

      // Don't bother reconnecting on an auth failure; the token that
      // just got rejected won't magically become valid on retry. The
      // polling fallback in NotificationContext.jsx still covers us,
      // and a fresh login will open a new, valid connection anyway.
      if (AUTH_FAILURE_CLOSE_CODES.includes(event.code)) {
        console.warn(
          `NotificationSocket: connection closed due to auth failure (code ${event.code}). ` +
          'Not retrying — please log in again if this persists.'
        );
        return;
      }

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = BASE_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts);
        reconnectAttempts += 1;
        reconnectTimer = setTimeout(openSocket, delay);
      } else {
        console.warn('NotificationSocket: max reconnect attempts reached. Falling back to polling only.');
      }
    };

    socket.onerror = () => {
      // onclose will fire right after this and handle reconnect logic —
      // nothing extra needed here.
    };
  };

  openSocket();

  return {
    close: () => {
      manuallyClosed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) socket.close();
    },
  };
}