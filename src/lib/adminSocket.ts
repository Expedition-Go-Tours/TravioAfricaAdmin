import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace("/api", "") || "";
const ADMIN_ROOM = "admin-room";
const ADMIN_NOTIFICATION_EVENT = "admin-notification";

let socket: Socket | null = null;

export function getAdminSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem("firebaseToken");
    socket = io(SOCKET_URL, {
      auth: { userId: "admin", role: "admin", token },
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
  s.emit("join", ADMIN_ROOM);
  s.on(ADMIN_NOTIFICATION_EVENT, callback);
  return () => {
    s.off(ADMIN_NOTIFICATION_EVENT, callback);
  };
}
