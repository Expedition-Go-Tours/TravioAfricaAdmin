import { io, Socket } from "socket.io-client";

const ADMIN_NOTIFICATION_EVENT = "admin-notification";

let socket: Socket | null = null;

export function getAdminSocket(): Socket {
  if (!socket) {
    socket = io({
      auth: { role: "admin" },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });
  }
  return socket;
}

export function disconnectAdminSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function onAdminNotification(callback: (notification: Record<string, unknown>) => void): () => void {
  const s = getAdminSocket();
  s.on(ADMIN_NOTIFICATION_EVENT, callback);
  return () => {
    s.off(ADMIN_NOTIFICATION_EVENT, callback);
  };
}
