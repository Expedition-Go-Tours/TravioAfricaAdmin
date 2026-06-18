import { io, Socket } from "socket.io-client";
import { auth } from "./firebase";

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace("/api", "") || "";
const ADMIN_NOTIFICATION_EVENT = "admin-notification";

let socket: Socket | null = null;

export function getAdminSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: (cb) => {
        cb({
          userId: auth.currentUser?.uid || "admin",
          role: "admin",
          token: localStorage.getItem("firebaseToken"),
        });
      },
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
