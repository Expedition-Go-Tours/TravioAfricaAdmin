import { cn, timeAgo } from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import type { Conversation } from "@/services/chatService";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conv: Conversation) => void;
  loading: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading,
}: ConversationListProps) {
  if (loading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-sm p-2">
            <div className="h-10 w-10 animate-pulse rounded-full bg-green-100/60" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 animate-pulse rounded bg-green-100/60" />
              <div className="h-2.5 w-32 animate-pulse rounded bg-green-100/60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <MessageSquare className="mb-3 h-8 w-8 text-text-tertiary" />
        <p className="text-sm text-text-secondary">No conversations yet</p>
        <p className="mt-1 text-xs text-text-tertiary">
          Click "New" above to start messaging a supplier
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/50">
      {conversations.map((conv) => {
        const otherUser = conv.participants?.find(
          (p) => p.user.name === conv.title
        )?.user || conv.participants?.find(
          (p) => p.user.roles && !p.user.roles.includes('admin')
        )?.user || conv.participants?.[0]?.user;
        const name = conv.title || otherUser?.name || otherUser?.email || "Unknown";
        const roleLabel = conv.type === "SUPPLIER_ADMIN" ? "Supplier" : "Customer";
        const lastMsg = conv.messages?.[0];
        const preview = lastMsg
          ? lastMsg.content.length > 50
            ? lastMsg.content.slice(0, 50) + "..."
            : lastMsg.content
          : "No messages yet";

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={cn(
              "flex w-full items-start gap-3 px-4 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-400 hover:shadow-sm",
              selectedId === conv.id && "bg-green-50"
            )}
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-green-400 to-green-600 text-sm font-bold text-white">
              <span>{name.charAt(0).toUpperCase()}</span>
              {otherUser?.photoURL && (
                <img
                  src={otherUser.photoURL}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate text-sm font-medium text-text-primary">
                    {name}
                  </span>
                  <span className={cn(
                    "shrink-0 rounded-full px-1.5 py-[1px] text-[10px] font-medium leading-normal",
                    roleLabel === "Supplier"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-purple-50 text-purple-600"
                  )}>
                    {roleLabel}
                  </span>
                </div>
                {lastMsg && (
                  <span className="shrink-0 text-[11px] text-text-tertiary">
                    {timeAgo(lastMsg.createdAt)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="truncate text-xs text-text-secondary">
                  {preview}
                </span>
                {conv.unreadCount > 0 && (
                  <span className="flex h-4 min-w-[16px] shrink-0 items-center justify-center rounded-full bg-green-600 px-1 text-[10px] font-bold text-white">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
