import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_SERVER_URL || 'https://livepolls-p2z9.onrender.com';

export const socket = io(URL, {
  autoConnect: false
});
