/**
 * socket.js — singleton socket.io-client instance
 * Import this anywhere (including Zustand stores) to use WebSocket.
 */
import { io } from 'socket.io-client';

// Always connect to same origin — Vite proxies /socket.io → :5000 in dev
// In production, VITE_API_URL should point to the backend
const WS_URL = import.meta.env.VITE_API_URL || window?.location?.origin || 'http://localhost:5000';

export const socket = io(WS_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: false,          // we connect manually after auth
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  withCredentials: true,
});

/** Call once user is logged in */
export function connectSocket(token) {
  if (socket.connected) return;
  if (token) socket.auth = { token };
  socket.connect();
}

/** Call on logout */
export function disconnectSocket() {
  socket.disconnect();
}
