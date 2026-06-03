import { Check, CheckCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/services/chatService";

export type MessageStatus = "sending" | "sent" | "delivered" | "read";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  status?: MessageStatus;
  showAvatar?: boolean;
  senderAvatar?: string;
  senderName?: string;
}

function formatMessageTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

const statusIcon: Record<MessageStatus, React.ReactNode> = {
  sending: <Loader2 className="h-3 w-3 animate-spin" />,
  sent: <Check className="h-3 w-3" />,
  delivered: <CheckCheck className="h-3 w-3" />,
  read: <CheckCheck className="h-3 w-3 text-[#53bdeb]" />,
};

export function MessageBubble({
  message,
  isOwn,
  status,
  showAvatar = true,
  senderAvatar,
  senderName,
}: MessageBubbleProps) {
  return (
    <div className={cn("flex gap-2", isOwn ? "flex-row-reverse" : "flex-row")}>
      {isOwn ? (
        <div className="w-8 shrink-0" />
      ) : showAvatar ? (
        <div className="relative mt-1 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-green-400 to-green-600 text-xs font-bold text-white">
          <span>{senderName?.charAt(0)?.toUpperCase() || "?"}</span>
          {senderAvatar && (
            <img
              src={senderAvatar}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
        </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      <div className={cn("flex max-w-[75%] flex-col", isOwn ? "items-end" : "items-start")}>
        <div
          className={cn(
            "relative px-3.5 py-2 text-sm leading-relaxed shadow-sm",
            isOwn
              ? "bg-green-600 text-white rounded-[18px] rounded-br-[4px]"
              : "bg-white text-text-primary border border-border/50 rounded-[18px] rounded-bl-[4px]"
          )}
        >
          <span className="whitespace-pre-wrap break-words">{message.content}</span>
          <div
            className={cn(
              "mt-1 flex items-center gap-1",
              isOwn ? "justify-end" : "justify-start"
            )}
          >
            <span
              className={cn(
                "text-[10px] leading-none",
                isOwn ? "text-white/70" : "text-text-tertiary"
              )}
            >
              {formatMessageTime(message.createdAt)}
            </span>
            {isOwn && status && (
              <span className="flex">{statusIcon[status]}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
