import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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

  return (
    <div className="space-y-5 max-w-7xl mx-auto h-full flex flex-col">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-slate-700" />
            </motion.button>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Bookings</h1>
              <p className="text-sm text-slate-500">View and manage all tour bookings</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")} />
            {isRefetching ? "Refreshing..." : "Refresh"}
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        className="grid grid-cols-5 gap-4"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        {[
          { label: "Total", key: "total", bg: "bg-indigo-50", text: "text-indigo-500", Icon: ShoppingCart },
          { label: "Pending", key: "PENDING", bg: "bg-amber-50", text: "text-amber-600", Icon: Clock },
          { label: "Confirmed", key: "CONFIRMED", bg: "bg-blue-50", text: "text-blue-600", Icon: CheckCircle2 },
          { label: "Completed", key: "COMPLETED", bg: "bg-emerald-50", text: "text-emerald-600", Icon: CheckCircle2 },
          { label: "Cancelled", key: "CANCELLED", bg: "bg-red-50", text: "text-red-500", Icon: Ban },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -2 }}
            className="rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", stat.bg)}>
                <stat.Icon className={cn("h-5 w-5", stat.text)} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                <p className="text-xl font-bold text-slate-900">
                  {isLoading ? (
                    <Skeleton className="inline-block w-10 h-6 align-middle" />
                  ) : (
                    counts[stat.key] ?? 0
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="flex items-center gap-4 flex-wrap"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08 }}
      >
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by booking #, customer, tour..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
          {STATUS_PILLS.map((pill) => (
            <motion.button
              key={pill}
              layout
              onClick={() => { setStatusFilter(pill); setPage(1); }}
              className={cn(
                "relative px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                statusFilter === pill ? "text-indigo-700" : "text-slate-500 hover:text-slate-700",
              )}
            >
              {statusFilter === pill && (
                <motion.span
                  layoutId="activePill"
                  className="absolute inset-0 bg-white rounded-md border border-slate-200 shadow-sm"
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
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4"
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
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 mb-3">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <p className="text-sm font-medium text-slate-900 mb-1">Failed to load bookings</p>
            <p className="text-xs text-slate-500 mb-4">Something went wrong. Please try again.</p>
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
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 mb-3">
              <Inbox className="h-6 w-6 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-900 mb-1">
              {query ? "No matching bookings" : "No bookings yet"}
            </p>
            <p className="text-xs text-slate-500">
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
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="min-w-0">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Booking #</th>
                      <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Customer</th>
                      <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Tour</th>
                      <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Date</th>
                      <th className="text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Total</th>
                      <th className="text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                      <th className="text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((booking, idx) => (
                      <motion.tr
                        key={booking.id}
                        variants={FADE_SLIDE}
                        onClick={() => setSelectedBooking(booking)}
                        className={cn(
                          "border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50/60",
                          selectedBooking?.id === booking.id && "bg-indigo-50/40",
                        )}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Hash className="h-3 w-3 text-slate-300" />
                            <span className="text-xs font-medium text-slate-900">{booking.bookingNumber}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                              {booking.customer.photoURL ? (
                                <img src={booking.customer.photoURL} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                              ) : null}
                              <span className={booking.customer.photoURL ? "opacity-0" : ""}>
                                {(booking.customer.name || "?").charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-900 truncate">{booking.customer.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{booking.customer.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2 min-w-0 max-w-[220px]">
                            <div className="w-7 h-7 rounded-md shrink-0 overflow-hidden bg-slate-100 border border-slate-200">
                              {booking.tour.coverPhoto ? (
                                <img src={booking.tour.coverPhoto} alt="" className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <MapPin className="h-3 w-3 text-slate-300" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-900 truncate">{booking.tour.title}</p>
                              <p className="text-[10px] text-slate-400 truncate">{booking.tour.supplier.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-slate-300" />
                            <span className="text-xs text-slate-600">
                              {new Date(booking.selectedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-xs font-semibold text-slate-900">
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
                            booking.paymentStatus === "PAID"
                              ? "bg-emerald-50 text-emerald-700"
                              : booking.paymentStatus === "FAILED"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700",
                          )}>
                            {booking.paymentStatus === "PAID" ? (
                              <><CheckCircle2 className="h-2.5 w-2.5" /> Paid</>
                            ) : booking.paymentStatus === "FAILED" ? (
                              "Failed"
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
              <div className="flex items-center justify-between px-5 py-3 border border-slate-200 rounded-xl bg-white mt-3">
                <p className="text-xs text-slate-500">
                  Page {pagination.currentPage} of {pagination.totalPages} · {pagination.totalCount} total
                </p>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={pagination.currentPage <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none gap-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={pagination.currentPage >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none gap-1"
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
            onClose={() => setSelectedBooking(null)}
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
