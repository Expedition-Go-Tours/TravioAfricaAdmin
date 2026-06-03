import { useEffect, useCallback } from "react";
import { getAdminSocket } from "@/lib/adminSocket";
import type { Message } from "@/services/chatService";

interface TypingEvent {
  conversationId: string;
  userId: string;
  userName?: string;
}

interface ChatMessageEvent {
  conversationId: string;
  message: Message;
}

interface MarkReadEvent {
  conversationId: string;
  readBy: string;
  readAt: string;
}

export function useChatSocket(conversationId: string | null) {
  const socket = getAdminSocket();

  useEffect(() => {
    if (!conversationId) return;
    socket.emit("chat:join", conversationId);
    return () => {
      socket.emit("chat:leave", conversationId);
    };
  }, [conversationId, socket]);

  const onNewMessage = useCallback(
    (cb: (message: Message, convId: string) => void) => {
      const handler = (data: ChatMessageEvent) => {
        cb(data.message, data.conversationId);
      };
      socket.on("chat:message", handler);
      return () => {
        socket.off("chat:message", handler);
      };
    },
    [socket]
  );

  const onTyping = useCallback(
    (cb: (data: TypingEvent) => void) => {
      socket.on("chat:typing", cb);
      return () => {
        socket.off("chat:typing", cb);
      };
    },
    [socket]
  );

  const onMarkRead = useCallback(
    (cb: (data: MarkReadEvent) => void) => {
      socket.on("chat:mark-read", cb);
      return () => {
        socket.off("chat:mark-read", cb);
      };
    },
    [socket]
  );

  const emitTyping = useCallback(
    (convId: string) => {
      socket.emit("chat:typing", { conversationId: convId });
    },
    [socket]
  );

  const emitMarkRead = useCallback(
    (convId: string) => {
      socket.emit("chat:mark-read", { conversationId: convId });
    },
    [socket]
  );

  return { onNewMessage, onTyping, onMarkRead, emitTyping, emitMarkRead };
}
