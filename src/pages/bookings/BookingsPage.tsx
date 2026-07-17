import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Search,
  X,
  ArrowLeft,
  RefreshCw,
  ShoppingCart,
  Clock,
  CheckCircle2,
  Ban,
  Inbox,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Hash,
  MapPin,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSocketInvalidate } from "@/hooks/useSocketEvent";
import api from "@/lib/axios";
import { cn } from "@/lib/utils";
import { BookingDetailPanel } from "./components/BookingDetailPanel";
import { ConfirmPaymentDialog } from "./components/ConfirmPaymentDialog";
import type { Booking } from "@/types/booking";
import { isPaymentPaid } from "@/types/booking";

const STATUS_BADGE: Record<string, "success" | "warning" | "error" | "info"> = {
  PENDING: "warning",
  CONFIRMED: "info",
  COMPLETED: "success",
  CANCELLED: "error",
  NO_SHOW: "error",
  REFUNDED: "warning",
};

const STAGGER_LIST = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const FADE_SLIDE = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const STATUS_PILLS = ["All", "Pending", "Confirmed", "Completed", "Cancelled"];

const statCards = [
  { label: "Total", key: "total", bg: "bg-indigo-50", text: "text-indigo-500", Icon: ShoppingCart },
  { label: "Pending", key: "PENDING", bg: "bg-amber-50", text: "text-amber-600", Icon: Clock },
  { label: "Confirmed", key: "CONFIRMED", bg: "bg-blue-50", text: "text-blue-600", Icon: CheckCircle2 },
  { label: "Completed", key: "COMPLETED", bg: "bg-emerald-50", text: "text-emerald-600", Icon: CheckCircle2 },
  { label: "Cancelled", key: "CANCELLED", bg: "bg-red-50", text: "text-red-500", Icon: Ban },
];

export default function BookingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [confirmPayBooking, setConfirmPayBooking] = useState<Booking | null>(null);
  const limit = 20;

  useSocketInvalidate("admin:new-booking", ["admin", "bookings"]);

  const statusParam = statusFilter === "All" ? "" : statusFilter.toUpperCase();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["admin", "bookings", { page, limit, status: statusParam }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusParam) params.set("status", statusParam);
      return api.get(`/admin/bookings?${params.toString()}`).then((r) => r.data?.data);
    },
    refetchOnWindowFocus: false,
  });

  const rawBookings: Booking[] = useMemo(
    () => data?.bookings || data?.data?.bookings || [],
    [data],
  );
  const pagination = data?.pagination || data?.data?.pagination;
  const counts = data?.counts || data?.data?.counts || {};

  const query = searchQuery.toLowerCase().trim();
  const filtered = useMemo(() => {
    if (!query) return rawBookings;
    return rawBookings.filter((b) =>
      [b.bookingNumber, b.customer?.name, b.tour?.title, b.tour?.supplier?.name]
        .some((f) => f?.toLowerCase().includes(query))
    );
  }, [rawBookings, query]);

  const confirmPaymentMutation = useMutation({
    mutationFn: (body: { reference?: string }) =>
      api.patch(`/admin/bookings/${confirmPayBooking?.id}/confirm-payment`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
      toast.success(`Payment confirmed for #${confirmPayBooking?.bookingNumber}`);
      setConfirmPayBooking(null);
      setSelectedBooking(null);
    },
    onError: () => toast.error("Failed to confirm payment"),
  });

  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const bookingIdFromState = (location.state as { bookingId?: string })?.bookingId;
  const bookingIdFromUrl = searchParams.get("bookingId");
  const bookingId = bookingIdFromState || bookingIdFromUrl;

  const deepLinkHandled = useRef(false);

  const findInCaches = useCallback((id: string): Booking | undefined => {
    const recent = queryClient.getQueryData<Booking[]>(["admin", "bookings", "recent"]);
    if (recent) {
      const found = recent.find((b) => b.id === id);
      if (found) return found;
    }
    const allCaches = queryClient.getQueriesData<{ bookings?: Booking[] }>({ queryKey: ["admin", "bookings"] });
    for (const [, data] of allCaches) {
      if (!data?.bookings) continue;
      const found = data.bookings.find((b) => b.id === id);
      if (found) return found;
    }
    return undefined;
  }, [queryClient]);

  const cachedBooking = useMemo(() => {
    if (!bookingId || deepLinkHandled.current) return undefined;
    return findInCaches(bookingId);
  }, [bookingId, findInCaches]);

  const { data: fetchedBooking } = useQuery({
    queryKey: ["admin", "booking", bookingId],
    queryFn: () => api.get(`/admin/bookings/${bookingId}`).then((r) => r.data?.data as Booking),
    enabled: !!bookingId && !cachedBooking,
  });

  const deepLinkBooking = cachedBooking || fetchedBooking;

  useEffect(() => {
    if (!deepLinkBooking || deepLinkHandled.current) return;
    deepLinkHandled.current = true;
    setSelectedBooking(deepLinkBooking);

    if (location.state?.bookingId) {
      navigate(location.pathname, { replace: true, state: {} });
    }
    if (searchParams.get("bookingId")) {
      const next = new URLSearchParams(searchParams);
      next.delete("bookingId");
      setSearchParams(next, { replace: true });
    }
  }, [deepLinkBooking, location.pathname, navigate, searchParams, setSearchParams]);

  return (
    <div className="space-y-4 md:space-y-5 w-full h-full flex flex-col">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-base hover:bg-surface-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-text-secondary" />
            </motion.button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-text-primary truncate">Bookings</h1>
              <p className="text-sm text-text-secondary truncate">View and manage all tour bookings</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center justify-center h-9 px-3 text-xs font-medium rounded-xl border border-border bg-surface-base text-text-secondary hover:bg-surface-muted transition-colors disabled:opacity-50 gap-1.5 shrink-0"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")} />
            <span className="hidden sm:inline">{isRefetching ? "Refreshing..." : "Refresh"}</span>
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 md:gap-3"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        {statCards.map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -2 }}
            className="rounded-xl border border-border bg-surface-base p-3.5 md:p-4 transition-shadow hover:shadow-soft"
          >
            <div className="flex items-center gap-2.5 md:gap-3">
              <div className={cn("flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-lg", stat.bg)}>
                <stat.Icon className={cn("h-4 w-4 md:h-5 md:w-5", stat.text)} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] md:text-xs font-medium text-text-secondary">{stat.label}</p>
                <div className="text-lg md:text-xl font-bold text-text-primary tabular-nums">
                  {isLoading ? (
                    <Skeleton className="inline-block w-8 h-5 md:h-6 align-middle" />
                  ) : (
                    counts[stat.key] ?? 0
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08 }}
      >
        <div className="relative w-full sm:flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <Input
            placeholder="Search by booking #, customer, tour..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 w-full"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-surface-muted p-0.5 rounded-xl border border-border w-full sm:w-auto overflow-x-auto scrollbar-none">
          {STATUS_PILLS.map((pill) => (
            <motion.button
              key={pill}
              layout
              onClick={() => { setStatusFilter(pill); setPage(1); }}
              className={cn(
                "relative px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors",
                statusFilter === pill ? "text-indigo-700" : "text-text-secondary hover:text-text-primary",
              )}
            >
              {statusFilter === pill && (
                <motion.span
                  layoutId="activePill"
                  className="absolute inset-0 bg-surface-base rounded-lg border border-border shadow-sm"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{pill}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            variants={STAGGER_LIST}
            initial="hidden"
            animate="visible"
            className="space-y-2 flex-1"
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                variants={FADE_SLIDE}
                className="flex items-center gap-4 rounded-xl border border-border bg-surface-base p-4"
              >
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </motion.div>
            ))}
          </motion.div>
        ) : isError ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center flex-1"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 mb-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">Failed to load bookings</p>
            <p className="text-xs text-text-tertiary mb-4">Something went wrong. Please try again.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center flex-1"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted mb-3">
              <Inbox className="h-6 w-6 text-text-tertiary" />
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">
              {query ? "No matching bookings" : "No bookings yet"}
            </p>
            <p className="text-xs text-text-tertiary">
              {query ? "Try a different search term" : "Bookings will appear here once customers start booking tours."}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            variants={STAGGER_LIST}
            initial="hidden"
            animate="visible"
            className="flex-1 min-h-0"
          >
            <div className="rounded-xl border border-border bg-surface-base overflow-hidden">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[700px] border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted/50">
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wider px-4 py-3">Booking #</th>
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wider px-4 py-3">Customer</th>
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wider px-4 py-3">Tour</th>
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wider px-4 py-3">Tour Date</th>
                      <th className="text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wider px-4 py-3">Created</th>
                      <th className="text-right text-[11px] font-semibold text-text-secondary uppercase tracking-wider px-4 py-3">Total</th>
                      <th className="text-center text-[11px] font-semibold text-text-secondary uppercase tracking-wider px-4 py-3">Status</th>
                      <th className="text-center text-[11px] font-semibold text-text-secondary uppercase tracking-wider px-4 py-3">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((booking, idx) => (
                      <motion.tr
                        key={booking.id}
                        variants={FADE_SLIDE}
                        onClick={() => {
                          setSelectedBooking(booking);
                          setSearchParams({ bookingId: booking.id });
                        }}
                        className={cn(
                          "border-b border-border/50 cursor-pointer transition-colors hover:bg-surface-muted/30",
                          selectedBooking?.id === booking.id && "bg-primary/5",
                        )}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Hash className="h-3 w-3 text-text-tertiary" />
                            <span className="text-xs font-medium text-text-primary">{booking.bookingNumber}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                              {booking.customer.photoURL ? (
                                <img src={booking.customer.photoURL} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                              ) : null}
                              <span className={booking.customer.photoURL ? "opacity-0" : ""}>
                                {(booking.customer.name || "?").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-text-primary truncate">{booking.customer.name}</p>
                              <p className="text-[10px] text-text-tertiary truncate">{booking.customer.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2 min-w-0 max-w-[220px]">
                            <div className="w-7 h-7 rounded-lg shrink-0 overflow-hidden bg-surface-muted border border-border">
                              {booking.tour.coverPhoto ? (
                                <img src={booking.tour.coverPhoto} alt="" className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <MapPin className="h-3 w-3 text-text-tertiary" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-text-primary truncate">{booking.tour.title}</p>
                              <p className="text-[10px] text-text-tertiary truncate">{booking.tour.supplier.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-text-tertiary" />
                            <span className="text-xs text-text-secondary">
                              {new Date(booking.selectedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-text-tertiary" />
                            <span className="text-xs text-text-tertiary">
                              {new Date(booking.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-xs font-semibold text-text-primary tabular-nums">
                            {booking.currency} {Number(booking.total).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <Badge variant={STATUS_BADGE[booking.status] || "info"} className="text-[10px] px-1.5 py-0">
                            {booking.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full",
                            isPaymentPaid(booking.paymentStatus)
                              ? "bg-status-active/10 text-status-active"
                              : booking.paymentStatus === "FAILED"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-status-pending/10 text-status-pending",
                          )}>
                            {isPaymentPaid(booking.paymentStatus) ? (
                              <><CheckCircle2 className="h-2.5 w-2.5" /> Paid</>
                            ) : booking.paymentStatus === "FAILED" ? (
                              "Failed"
                            ) : booking.paymentStatus === "PROCESSING" ? (
                              "Processing"
                            ) : (
                              "Pending"
                            )}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border border-border rounded-xl bg-surface-base mt-3">
                <p className="text-xs text-text-tertiary order-2 sm:order-1">
                  Page {pagination.currentPage} of {pagination.totalPages} &middot; {pagination.totalCount} total
                </p>
                <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={pagination.currentPage <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="inline-flex flex-1 sm:flex-none items-center justify-center h-9 px-3 text-xs font-medium rounded-xl border border-border bg-surface-base text-text-secondary hover:bg-surface-muted transition-colors disabled:opacity-40 disabled:pointer-events-none gap-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={pagination.currentPage >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex flex-1 sm:flex-none items-center justify-center h-9 px-3 text-xs font-medium rounded-xl border border-border bg-surface-base text-text-secondary hover:bg-surface-muted transition-colors disabled:opacity-40 disabled:pointer-events-none gap-1"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedBooking && (
          <BookingDetailPanel
            booking={selectedBooking}
            onClose={() => {
              setSelectedBooking(null);
              const next = new URLSearchParams(searchParams);
              next.delete("bookingId");
              setSearchParams(next, { replace: true });
            }}
            onConfirmPayment={(booking) => {
              setConfirmPayBooking(booking);
            }}
            onViewCustomer={(customerId) => {
              setSelectedBooking(null);
            }}
          />
        )}
      </AnimatePresence>

      {confirmPayBooking && (
        <ConfirmPaymentDialog
          booking={confirmPayBooking}
          isPending={confirmPaymentMutation.isPending}
          onConfirm={(reference) => confirmPaymentMutation.mutate({ reference })}
          onClose={() => setConfirmPayBooking(null)}
        />
      )}
    </div>
  );
}
