import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { SectionError } from "@/components/shared/SectionError";
import { ConversationList } from "./components/ConversationList";
import { ChatWindow } from "./components/ChatWindow";
import { NewConversationDialog } from "./components/NewConversationDialog";
import { useChatSocket } from "@/hooks/useChatSocket";
import {
  getConversations,
  getMessages,
  sendMessage,
  markConversationAsRead,
  getOrCreateConversation,
  type Conversation,
  type Message,
} from "@/services/chatService";
import type { MessageStatus } from "./components/MessageBubble";

export default function ChatPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageStatuses, setMessageStatuses] = useState<Record<string, MessageStatus>>({});
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const invalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const invalidateConvs = useCallback(() => {
    if (invalidateTimerRef.current) clearTimeout(invalidateTimerRef.current);
    invalidateTimerRef.current = setTimeout(() => {
      invalidateConvs();
    }, 500);
  }, [queryClient]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) setCurrentUserId(user.uid);
    });
    return unsub;
  }, []);

  const { onNewMessage, onMarkRead, onDelivered, emitDelivered } = useChatSocket(selectedConv?.id || null);

  const {
    data: conversations = [],
    isLoading: convsLoading,
    isError: convsError,
    refetch: refetchConvs,
  } = useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: getConversations,
  });

  const sortMessages = (msgs: Message[]) =>
    [...msgs].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

  const loadMessages = useCallback(async (convId: string) => {
    const result = await getMessages(convId);
    setMessages(sortMessages(result.messages || []));
    setHasMore(!!result.nextCursor);
    const statuses: Record<string, MessageStatus> = {};
    for (const msg of result.messages || []) {
      statuses[msg.id] = "sent";
    }
    setMessageStatuses(statuses);
  }, []);

  useEffect(() => {
    if (selectedConv) {
      selectedIdRef.current = selectedConv.id;
      loadMessages(selectedConv.id);
      markConversationAsRead(selectedConv.id).then(() => {
      invalidateConvs();
    }).catch(() => {});
    }
  }, [selectedConv?.id, loadMessages, invalidateConvs]);

  useEffect(() => {
    const unsubMsg = onNewMessage((message, convId) => {
      if (convId === selectedIdRef.current) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          emitDelivered(convId, [message.id]);
          return sortMessages([...prev, message]);
        });
        setMessageStatuses((prev) => ({ ...prev, [message.id]: "sent" }));
        markConversationAsRead(convId).catch(() => {});
      }
      invalidateConvs();
    });
    return unsubMsg;
  }, [onNewMessage, invalidateConvs, emitDelivered]);

  useEffect(() => {
    const unsubRead = onMarkRead(({ conversationId }) => {
      if (conversationId === selectedIdRef.current) {
        setMessageStatuses((prev) => {
          const next = { ...prev };
          for (const id of Object.keys(next)) {
            if (next[id] === "sent" || next[id] === "delivered") {
              next[id] = "read";
            }
          }
          return next;
        });
      }
    });
    return unsubRead;
  }, [onMarkRead]);

  useEffect(() => {
    const unsubDelivered = onDelivered(({ conversationId, messageIds }) => {
      if (conversationId === selectedIdRef.current) {
        setMessageStatuses((prev) => {
          const next = { ...prev };
          for (const id of messageIds) {
            if (next[id] === "sent") {
              next[id] = "delivered";
            }
          }
          return next;
        });
      }
    });
    return unsubDelivered;
  }, [onDelivered]);

  const handleSelect = useCallback((conv: Conversation) => {
    setSelectedConv(conv);
    setMessageStatuses({});
  }, []);

  const handleSend = useCallback(
    async (content: string, attachment?: { url: string; type: string }) => {
      if (!selectedConv) return;
      setSending(true);
      const tempId = `temp-${Date.now()}`;
      setMessageStatuses((prev) => ({ ...prev, [tempId]: "sending" }));
      try {
        const msg = await sendMessage(selectedConv.id, content, attachment);
        setMessages((prev) => sortMessages([...prev, msg]));
        setMessageStatuses((prev) => {
          const next = { ...prev };
          delete next[tempId];
          next[msg.id] = "sent";
          return next;
        });
        invalidateConvs();
      } catch {
        toast.error("Failed to send message");
        setMessageStatuses((prev) => {
          const next = { ...prev };
          delete next[tempId];
          return next;
        });
      } finally {
        setSending(false);
      }
    },
    [selectedConv, invalidateConvs]
  );

  const handleLoadMore = useCallback(async () => {
    if (!selectedConv || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const oldestDate = messages[0]?.createdAt;
      if (oldestDate) {
        const result = await getMessages(selectedConv.id, oldestDate);
        setMessages((prev) => sortMessages([...(result.messages || []), ...prev]));
        setHasMore(!!result.nextCursor);
        const statuses: Record<string, MessageStatus> = {};
        for (const msg of result.messages || []) {
          statuses[msg.id] = "sent";
        }
        setMessageStatuses((prev) => ({ ...prev, ...statuses }));
      }
    } catch {
      toast.error("Failed to load older messages");
    } finally {
      setLoadingMore(false);
    }
  }, [selectedConv, messages, loadingMore]);

  const handleNewConversation = useCallback(
    async (recipientId: string) => {
      try {
        const conv = await getOrCreateConversation(recipientId);
        invalidateConvs();
        setSelectedConv(conv);
        setNewDialogOpen(false);
      } catch {
        toast.error("Failed to start conversation");
      }
    },
    [invalidateConvs]
  );

  const handleViewProfile = useCallback(
    (userId: string) => {
      navigate(`/admin/suppliers/${userId}`);
    },
    [navigate]
  );

  return (
    <div className="-m-6 flex h-[calc(100vh-72px)] overflow-hidden">
      <div className="flex w-[380px] shrink-0 flex-col border-r border-border/50 bg-white">
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
          <h1 className="text-base font-bold text-text-primary">Messages</h1>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setNewDialogOpen(true)}
            className="gap-1.5 rounded-full text-green-600 hover:text-green-700 hover:bg-green-50 px-3"
          >
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-none">
          {convsError ? (
            <SectionError message="Failed to load conversations" onRetry={refetchConvs} />
          ) : (
            <ConversationList
              conversations={conversations}
              selectedId={selectedConv?.id || null}
              onSelect={handleSelect}
              loading={convsLoading}
            />
          )}
        </div>
      </div>

      <div className="relative flex-1">
            <ChatWindow
              conversation={selectedConv}
              messages={messages}
              messageStatuses={messageStatuses}
              onSendMessage={handleSend}
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
              loadingMore={loadingMore}
              sending={sending}
              currentUserId={currentUserId}
              onViewProfile={handleViewProfile}
            />
      </div>

      <NewConversationDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        onSelect={(recipientId) => handleNewConversation(recipientId)}
      />
    </div>
  );
}
