import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  ShoppingBag,
  XCircle,
  CreditCard,
  Banknote,
  Star,
  UserCheck,
  UserX,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import { getNotifications, markAsRead, markAllAsRead } from "@/services/notificationService";

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  BOOKING_CONFIRMED: { icon: <ShoppingBag className="h-3.5 w-3.5" />, color: "text-status-active" },
  BOOKING_CANCELLED: { icon: <XCircle className="h-3.5 w-3.5" />, color: "text-status-rejected" },
  PAYMENT_RECEIVED: { icon: <CreditCard className="h-3.5 w-3.5" />, color: "text-status-active" },
  PAYOUT_PROCESSED: { icon: <Banknote className="h-3.5 w-3.5" />, color: "text-status-approved" },
  PAYOUT_APPROVED: { icon: <Banknote className="h-3.5 w-3.5" />, color: "text-status-active" },
  REVIEW_RECEIVED: { icon: <Star className="h-3.5 w-3.5" />, color: "text-status-pending" },
  SUPPLIER_APPROVED: { icon: <UserCheck className="h-3.5 w-3.5" />, color: "text-status-active" },
  SUPPLIER_REJECTED: { icon: <UserX className="h-3.5 w-3.5" />, color: "text-status-rejected" },
  SYSTEM_ALERT: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-status-flagged" },
};

function getTypeConfig(type: string) {
  return typeConfig[type] || { icon: <Bell className="h-3.5 w-3.5" />, color: "text-text-secondary" };
}

export function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const res = await getNotifications(1, 1);
      return res.pagination.unreadCount;
    },
    refetchInterval: 30_000,
  });

  const { data: dropdown, isLoading } = useQuery({
    queryKey: ["notifications", "feed"],
    queryFn: () => getNotifications(1, 10, true),
    enabled: open,
  });

  const markRead = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-sm p-1.5 text-text-secondary hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-status-rejected px-1 text-[10px] font-bold leading-tight text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full z-50 mt-2 w-80 rounded-sm border border-border bg-surface-base shadow-2">
          <div className="flex items-center justify-between border-b border-border-muted px-4 py-2.5">
            <span className="text-sm font-semibold text-text-primary">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="flex items-center gap-1 text-xs text-status-approved hover:underline disabled:opacity-50"
              >
                {markAllRead.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCheck className="h-3 w-3" />
                )}
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-text-tertiary">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : !dropdown?.notifications?.length ? (
              <div className="py-8 text-center text-sm text-text-tertiary">No new notifications</div>
            ) : (
              dropdown.notifications.map((n) => {
                const cfg = getTypeConfig(n.type);
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      markRead.mutate(n.id);
                    }}
                    className="flex w-full gap-3 border-b border-border-muted px-4 py-3 text-left transition-colors hover:bg-surface-muted"
                  >
                    <span className={cn("mt-0.5 flex-shrink-0", cfg.color)}>{cfg.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">{n.title}</p>
                      <p className="truncate text-xs text-text-secondary">{n.message}</p>
                      <p className="mt-0.5 text-[10px] text-text-tertiary">{timeAgo(n.createdAt)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
