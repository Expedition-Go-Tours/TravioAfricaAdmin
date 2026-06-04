import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation, useParams } from "react-router-dom";
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
  updateMessage,
  deleteMessage,
  deleteConversation,
  type Conversation,
  type Message,
} from "@/services/chatService";
import type { MessageStatus } from "./components/MessageBubble";

export default function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { type } = useParams<{ type: "suppliers" | "customers" }>();
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
  const selectByNotificationRef = useRef<string | null>(null);
  const conversationType = type === "suppliers" ? "SUPPLIER_ADMIN" : "USER_SUPPORT" as const;

  const invalidateConvs = useCallback(() => {
    if (invalidateTimerRef.current) clearTimeout(invalidateTimerRef.current);
    invalidateTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
    }, 500);
  }, [queryClient]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) setCurrentUserId(user.uid);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const convId = (location.state as { conversationId?: string })?.conversationId;
    if (convId) {
      selectByNotificationRef.current = convId;
      navigate(location.pathname, { replace: true });
    }
  }, []);

  const { onNewMessage, onMarkRead, onDelivered, emitDelivered } = useChatSocket(selectedConv?.id || null);

  const {
    data: allConversations = [],
    isLoading: convsLoading,
    isError: convsError,
    refetch: refetchConvs,
  } = useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: getConversations,
  });

  const conversations = allConversations.filter((c: Conversation) => {
    const otherUser = c.participants?.find(
      (p) => p.user.roles && !p.user.roles.includes('admin')
    )?.user;
    if (!otherUser?.roles) return false;
    if (type === "suppliers") return otherUser.roles.includes('supplier');
    return otherUser.roles.includes('customer') && !otherUser.roles.includes('supplier');
  });

  useEffect(() => {
    const convId = selectByNotificationRef.current;
    if (convId && conversations.length > 0) {
      const conv = conversations.find((c: Conversation) => c.id === convId);
      if (conv) {
        selectByNotificationRef.current = null;
        setSelectedConv(conv);
      }
    }
  }, [conversations]);

  const sortMessages = (msgs: Message[]) =>
    [...msgs].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

  const loadMessages = useCallback(async (convId: string) => {
    const result = await getMessages(convId);
    setMessages(sortMessages(result.messages || []));
    setHasMore(!!result.nextCursor);
    const statuses: Record<string, MessageStatus> = {};
    const otherParticipant = selectedConv?.participants?.find(
      (p) => p.user.roles && !p.user.roles.includes('admin')
    );
    const lastReadAt = otherParticipant?.lastReadAt ? new Date(otherParticipant.lastReadAt).getTime() : 0;
    for (const msg of result.messages || []) {
      statuses[msg.id] = new Date(msg.createdAt).getTime() <= lastReadAt ? "read" : "sent";
    }
    setMessageStatuses(statuses);
  }, [selectedConv]);

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
        const otherParticipant = selectedConv?.participants?.find(
          (p) => p.user.roles && !p.user.roles.includes('admin')
        );
        const lastReadAt = otherParticipant?.lastReadAt ? new Date(otherParticipant.lastReadAt).getTime() : 0;
        const statuses: Record<string, MessageStatus> = {};
        for (const msg of result.messages || []) {
          statuses[msg.id] = new Date(msg.createdAt).getTime() <= lastReadAt ? "read" : "sent";
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
        const conv = await getOrCreateConversation(recipientId, conversationType);
        invalidateConvs();
        setSelectedConv(conv);
        setNewDialogOpen(false);
      } catch {
        toast.error("Failed to start conversation");
      }
    },
    [invalidateConvs, conversationType]
  );

  const handleEditMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!selectedConv) return;
      const updated = await updateMessage(selectedConv.id, messageId, content);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: updated.content, editedAt: updated.editedAt } : m))
      );
    },
    [selectedConv]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!selectedConv) return;
      await deleteMessage(selectedConv.id, messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setMessageStatuses((prev) => {
        const next = { ...prev };
        delete next[messageId];
        return next;
      });
      invalidateConvs();
    },
    [selectedConv, invalidateConvs]
  );

  const handleDeleteConversation = useCallback(async () => {
    if (!selectedConv) return;
    await deleteConversation(selectedConv.id);
    setSelectedConv(null);
    setMessages([]);
    setMessageStatuses({});
    invalidateConvs();
    toast.success("Conversation deleted");
  }, [selectedConv, invalidateConvs]);

  const handleViewProfile = useCallback(
    (userId: string) => {
      if (type === "suppliers") {
        navigate(`/admin/suppliers/${userId}`);
      } else {
        toast.info("Customer profile coming soon");
      }
    },
    [navigate, type]
  );

  return (
    <div className="-m-6 flex h-[calc(100vh-72px)] overflow-hidden">
      <div className="flex w-[380px] shrink-0 flex-col border-r border-border/50 bg-white">
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
          <h1 className="text-base font-bold text-text-primary">
            {type === "suppliers" ? "Supplier Messages" : "Customer Support"}
          </h1>
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
              chatType={type}
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
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onDeleteConversation={handleDeleteConversation}
              chatType={type}
            />
      </div>

      <NewConversationDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        onSelect={(recipientId) => handleNewConversation(recipientId)}
        chatType={type}
      />
    </div>
  );
}
