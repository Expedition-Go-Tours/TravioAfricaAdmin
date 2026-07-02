import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePermission } from "@/hooks/usePermission";
import {
  ArrowLeft,
  DollarSign,
  CalendarCheck,
  UserPlus,
  Users,
  Clock,
  MessageSquare,
  Building,
  AlertTriangle,
  Activity,
  ArrowRight,
  X,
  MessageCircle,
  Map,
  Star as StarIcon,
  Banknote,
  LayoutDashboard,
  Settings,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import {
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SectionError } from "@/components/shared/SectionError";
import { SectionEmpty } from "@/components/shared/SectionEmpty";
import api from "@/lib/axios";
import { getAdminSocket } from "@/lib/adminSocket";
import { formatCurrency, formatNumber, formatDate, timeAgo } from "@/lib/utils";
import { staggerContainer, staggerFast, fadeInUp, scaleIn } from "@/lib/animations";

interface OverviewData {
  forbidden?: boolean;
  revenue?: { today?: { revenue?: number }; yesterday?: { revenue?: number }; thisWeek?: { revenue?: number; commission?: number; supplierPayout?: number }; thisMonth?: { revenue?: number; commission?: number; supplierPayout?: number }; ytd?: { revenue?: number; commission?: number; supplierPayout?: number } };
  bookings?: { today?: number; yesterday?: number };
  signups?: { today?: number; yesterday?: number };
  activeUsersLast30Days?: number;
  activeUsersPrevious30?: number;
  topTours?: Array<{ id?: string; title?: string; coverPhoto?: string; bookingCount?: number; revenue?: number; averageRating?: number; reviewCount?: number }>;
  topSuppliers?: Array<{ id?: string; user?: { name?: string; email?: string; photoURL?: string }; totalEarnings?: number; totalBookings?: number; averageRating?: number }>;
  bookingStatusDistribution?: Array<{ status?: string; count?: number }>;
  eventFeed?: Array<{ message?: string; userName?: string; createdAt?: string }>;
}

const bookingColors: Record<string, string> = {
  CONFIRMED: "#40966e",
  PENDING: "#d97706",
  CANCELLED: "#d92626",
  REFUNDED: "#d45a0a",
  COMPLETED: "#3b82f6",
  NO_SHOW: "#8a9ba8",
};

export default function OverviewPage() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const [showActiveUsers, setShowActiveUsers] = useState(false);
  const [showTodayBookings, setShowTodayBookings] = useState(false);
  const [showNewSignups, setShowNewSignups] = useState(false);

  const { data: overview, isLoading: overviewLoading, isError: overviewError, refetch: overviewRefetch } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      try {
        const res = await api.get("/admin/analytics/overview");
        const d = res.data?.data as Record<string, unknown> | undefined;
        const overview = (d?.overview as Record<string, unknown>) || {};
        return {
          revenue: (overview?.revenue as Record<string, unknown>) || {},
          bookings: (overview?.bookings as Record<string, unknown>) || {},
          signups: (overview?.signups as Record<string, unknown>) || {},
          activeUsersLast30Days: (overview?.activeUsersLast30Days as number) || 0,
          activeUsersPrevious30: (overview?.activeUsersPrevious30 as number) || 0,
          topTours: ((d?.topTours as Array<Record<string, unknown>>) || []).map((t) => ({
            id: t.id as string,
            title: t.title as string,
            coverPhoto: t.coverPhoto as string,
            bookingCount: (t.totalBookings as number) || 0,
            revenue: (t.totalRevenue as number) || 0,
            averageRating: (t.averageRating as number) || 0,
            reviewCount: (t.reviewCount as number) || 0,
          })),
          topSuppliers: ((d?.topSuppliers as Array<Record<string, unknown>>) || []).map((s) => ({
            id: s.id as string,
            user: { name: s.name as string, email: s.email as string, photoURL: s.photoURL as string },
            totalEarnings: (s.totalEarnings as number) || 0,
            totalBookings: (s.totalBookings as number) || 0,
            averageRating: (s.averageRating as number) || 0,
          })),
          bookingStatusDistribution: (d?.bookingStatusDistribution as Array<Record<string, unknown>>) || [],
          eventFeed: ((d?.eventFeed as Array<Record<string, unknown>>) || []).map((e) => ({
            message: typeof e.properties === "object" && e.properties ? ((e.properties as Record<string, unknown>).message as string) || (e.name as string) : (e.name as string),
            userName: (e.userName as string) || null,
            createdAt: e.createdAt as string,
          })),
        } as OverviewData;
      } catch (err: unknown) {
        if (err && typeof err === "object" && "response" in err) {
          const axiosErr = err as { response?: { status?: number } };
          if (axiosErr.response?.status === 403) {
            return { forbidden: true } as OverviewData;
          }
        }
        throw err;
      }
    },
  });

  const { data: payoutSummary } = useQuery({
    queryKey: ["admin", "payout-summary"],
    enabled: can('payouts.view'),
    queryFn: async () => {
      const res = await api.get("/payouts/admin/summary");
      const d = res.data?.data as { pending?: { count: number; total: number }; paidThisMonth?: { count: number; total: string } } | undefined;
      return {
        pending: { count: d?.pending?.count ?? 0, totalAmount: d?.pending?.total ?? 0 },
        paidThisMonth: { count: d?.paidThisMonth?.count ?? 0, totalAmount: d?.paidThisMonth?.total ?? "0" },
      };
    },
  });

  const { data: pendingReviews } = useQuery({
    queryKey: ["admin", "reviews-pending-count"],
    enabled: can('reviews.view'),
    queryFn: async () => {
      const res = await api.get("/reviews/admin/pending?page=1&limit=1");
      const d = res.data?.data as { reviews: unknown[]; pagination: { totalCount: number }; counts?: { pending?: number } } | undefined;
      return d ?? { reviews: [], pagination: { totalCount: 0 } };
    },
  });

  const { data: pendingSuppliers } = useQuery({
    queryKey: ["admin", "suppliers-pending"],
    enabled: can('suppliers.view'),
    queryFn: async () => {
      const res = await api.get("/suppliers/admin/applications?status=PENDING&page=1&limit=1");
      return (res.data?.data as { applications: unknown[]; pagination: { totalCount: number } } | undefined) ?? { applications: [], pagination: { totalCount: 0 } };
    },
  });

  const { data: activeUsersData, isLoading: activeUsersLoading } = useQuery({
    queryKey: ["admin", "active-users"],
    queryFn: async () => {
      const res = await api.get("/admin/users/active");
      return (res.data?.data?.users || []) as Array<{ id: string; name: string; email: string; photoURL?: string; roles?: string[]; lastLoginAt?: string }>;
    },
    enabled: showActiveUsers,
  });

  const { data: todayBookings, isLoading: todayBookingsLoading } = useQuery({
    queryKey: ["admin", "bookings", "today"],
    queryFn: async () => {
      const res = await api.get("/admin/bookings/today");
      return (res.data?.data?.bookings || []) as Array<{
        id: string;
        bookingNumber: string;
        status: string;
        total: number;
        currency: string;
        createdAt: string;
        customer: { id: string; name: string; email: string };
        tour: { id: string; title: string; supplier: { id: string; name: string } };
      }>;
    },
    enabled: showTodayBookings,
  });

  const { data: newSignupsData, isLoading: newSignupsLoading } = useQuery({
    queryKey: ["admin", "users", "new-signups"],
    queryFn: async () => {
      const res = await api.get("/admin/users/new-signups");
      return (res.data?.data?.users || []) as Array<{ id: string; name: string; email: string; photoURL?: string; roles?: string[]; createdAt?: string }>;
    },
    enabled: showNewSignups,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getAdminSocket();
    const refetchOverview = () => queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
    const refetchSignups = () => queryClient.invalidateQueries({ queryKey: ["admin", "users", "new-signups"] });
    const refetchTodayBookings = () => queryClient.invalidateQueries({ queryKey: ["admin", "bookings", "today"] });
    const refetchRevenueTrend = () => queryClient.invalidateQueries({ queryKey: ["admin", "revenue-trend"] });
    const refetchPayoutSummary = () => queryClient.invalidateQueries({ queryKey: ["admin", "payout-summary"] });
    const refetchPendingReviews = () => queryClient.invalidateQueries({ queryKey: ["admin", "reviews-pending-count"] });
    const refetchPendingSuppliers = () => queryClient.invalidateQueries({ queryKey: ["admin", "suppliers-pending"] });
    const onBooking = () => { refetchOverview(); refetchTodayBookings(); refetchRevenueTrend(); };
    const onSignup = () => { refetchSignups(); refetchOverview(); };
    const onTourChange = () => refetchOverview();
    const onSupplierApp = () => { refetchOverview(); refetchPendingSuppliers(); };
    const onSupplierStatus = () => refetchOverview();
    const onPayout = () => { refetchPayoutSummary(); refetchRevenueTrend(); };
    socket.on("admin:signup", onSignup);
    socket.on("admin:new-booking", onBooking);
    socket.on("admin:new-review", refetchOverview);
    socket.on("admin:new-tour", onTourChange);
    socket.on("admin:tour-update", onTourChange);
    socket.on("admin:supplier-application", onSupplierApp);
    socket.on("admin:supplier-status-change", onSupplierStatus);
    socket.on("admin:payout-update", onPayout);
    return () => {
      socket.off("admin:signup", onSignup);
      socket.off("admin:new-booking", onBooking);
      socket.off("admin:new-review", refetchOverview);
      socket.off("admin:new-tour", onTourChange);
      socket.off("admin:tour-update", onTourChange);
      socket.off("admin:supplier-application", onSupplierApp);
      socket.off("admin:supplier-status-change", onSupplierStatus);
      socket.off("admin:payout-update", onPayout);
    };
  }, [queryClient]);

  const calcTrend = (current: number | undefined | null, previous: number | undefined | null, context?: string): { value: number; isPositive: boolean; text?: string } | undefined => {
    const cur = Number(current) || 0;
    if (cur === 0) return undefined;
    const prev = Number(previous) || 0;
    if (prev === 0) return { value: 0, isPositive: true, text: context ? `${context} today` : undefined };
    const change = ((cur - prev) / prev) * 100;
    const rounded = Math.min(Math.abs(Math.round(change)), 100);
    const direction = change >= 0 ? "more than" : "less than";
    const period = context === "Active Users" ? "last 30 days" : "yesterday";
    return { value: rounded, isPositive: change >= 0, text: `${rounded}% ${direction} ${period}` };
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-4 md:space-y-5"
    >
      <motion.div variants={fadeInUp} className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-base text-text-secondary hover:bg-surface-muted transition-all duration-200 shadow-soft"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="pl-1">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text-primary">Overview</h1>
        </div>
      </motion.div>

      {overview?.forbidden ? (
        <WelcomeDashboard />
      ) : (
      <>
      {/* ── KPI Row ── */}
      <motion.div
        variants={fadeInUp}
        className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4"
      >
        {can('dashboard.revenue') && (
          <KpiCard
            label="Revenue Today"
            value={overviewLoading ? "..." : formatCurrency(overview?.revenue?.today?.revenue)}
            icon={<DollarSign className="h-4 w-4" />}
            trend={calcTrend(
              overview?.revenue?.today?.revenue ? Number(overview.revenue.today.revenue) : undefined,
              overview?.revenue?.yesterday?.revenue ? Number(overview.revenue.yesterday.revenue) : undefined,
              "Revenue"
            )}
            accent="green"
          />
        )}
        {can('dashboard.bookings') && (
          <KpiCard
            label="Bookings Today"
            value={overviewLoading ? "..." : formatNumber(overview?.bookings?.today)}
            icon={<CalendarCheck className="h-4 w-4" />}
            onClick={() => setShowTodayBookings(true)}
            trend={calcTrend(overview?.bookings?.today, overview?.bookings?.yesterday, "Bookings")}
            accent="green"
          />
        )}
        {can('users.view') && (
          <KpiCard
            label="New Signups"
            value={overviewLoading ? "..." : formatNumber(overview?.signups?.today)}
            icon={<UserPlus className="h-4 w-4" />}
            onClick={() => setShowNewSignups(true)}
            trend={calcTrend(overview?.signups?.today, overview?.signups?.yesterday, "Signups")}
            accent="blue"
          />
        )}
        {can('users.view') && (
          <KpiCard
            label="Active Users (30d)"
            value={overviewLoading ? "..." : formatNumber(overview?.activeUsersLast30Days)}
            icon={<Users className="h-4 w-4" />}
            onClick={() => setShowActiveUsers(true)}
            trend={calcTrend(overview?.activeUsersLast30Days, overview?.activeUsersPrevious30, "Active Users")}
            accent="blue"
          />
        )}
        {(() => {
          const pendingPayouts = can('payouts.view') ? (payoutSummary?.pending?.count ?? 0) : 0;
          const pendingReviewsCount = can('reviews.view') ? (pendingReviews?.counts?.pending ?? 0) : 0;
          const pendingSuppliersCount = can('suppliers.view') ? (pendingSuppliers?.pagination?.totalCount ?? 0) : 0;
          const totalPending = pendingPayouts + pendingReviewsCount + pendingSuppliersCount;
          if (totalPending === 0 && !overviewLoading) return null;
          return (
            <div className="rounded-xl bg-surface-base border border-border p-3.5 md:p-4 transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] md:text-xs font-medium text-text-secondary uppercase tracking-[0.08em] truncate">Action Required</p>
                  <p className="mt-1 text-lg md:text-xl font-bold text-text-primary tabular-nums">{overviewLoading ? "..." : formatNumber(totalPending)}</p>
                </div>
                <div className="flex h-8 w-8 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-[10px] bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              {!overviewLoading && totalPending > 0 && (
                <div className="mt-2.5 flex flex-col gap-1 text-[11px] md:text-xs text-text-tertiary">
                  {pendingPayouts > 0 && <span>{formatNumber(payoutSummary?.pending?.count)} pending payout{payoutSummary?.pending?.count !== 1 ? 's' : ''}</span>}
                  {pendingReviewsCount > 0 && <span>{formatNumber(pendingReviews?.counts?.pending)} pending review{pendingReviews?.counts?.pending !== 1 ? 's' : ''}</span>}
                  {pendingSuppliersCount > 0 && <span>{formatNumber(pendingSuppliers?.pagination?.totalCount)} pending supplier{pendingSuppliers?.pagination?.totalCount !== 1 ? 's' : ''}</span>}
                </div>
              )}
            </div>
          );
        })()}
      </motion.div>

      {/* ── Revenue Periods ── */}
      {can('dashboard.revenue') && (
        <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {overviewLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="mb-2 h-4 w-16" />
                    <Skeleton className="h-7 w-24" />
                    <Skeleton className="mt-1.5 h-3 w-20" />
                  </CardContent>
                </Card>
              ))
            : (
                <>
                  <RevenuePeriodCard period="Today" revenue={overview?.revenue?.today?.revenue} />
                  <RevenuePeriodCard period="This Week" revenue={overview?.revenue?.thisWeek?.revenue} commission={overview?.revenue?.thisWeek?.commission} payout={overview?.revenue?.thisWeek?.supplierPayout} />
                  <RevenuePeriodCard period="This Month" revenue={overview?.revenue?.thisMonth?.revenue} commission={overview?.revenue?.thisMonth?.commission} payout={overview?.revenue?.thisMonth?.supplierPayout} />
                  <RevenuePeriodCard period="Year to Date" revenue={overview?.revenue?.ytd?.revenue} commission={overview?.revenue?.ytd?.commission} payout={overview?.revenue?.ytd?.supplierPayout} />
                </>
              )}
        </motion.div>
      )}

      {/* ── Top Suppliers + Top Tours ── */}
      {(can('suppliers.view') || can('tours.view')) && (
        <motion.div variants={fadeInUp} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {can('suppliers.view') && (
            <Card className="lg:col-span-1">
              <CardHeader className="border-b border-border/60 pb-3.5">
                <CardTitle className="flex items-center gap-2.5 text-[13px] font-semibold tracking-tight text-text-primary">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Top Suppliers
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {overviewLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                  </div>
                ) : overviewError ? (
                  <SectionError message="Failed to load suppliers" onRetry={() => overviewRefetch()} />
                ) : !overview?.topSuppliers?.length ? (
                  <SectionEmpty message="No supplier data" />
                ) : (
                  <div className="divide-y divide-border">
                    {(overview.topSuppliers || []).slice(0, 5).map((sup, idx) => (
                      <div
                        key={sup.id || idx}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-muted/30 transition-colors"
                        onClick={() => navigate(`/admin/suppliers/${sup.id}`)}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter") navigate(`/admin/suppliers/${sup.id}`); }}
                      >
                        {sup.user?.photoURL ? (
                          <img src={sup.user.photoURL} alt="" className="h-8 w-8 shrink-0 rounded-[10px] object-cover" />
                        ) : (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-accent text-xs font-medium text-accent-foreground">
                            {sup.user?.name?.charAt(0)?.toUpperCase() || "S"}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary truncate">{sup.user?.name || "Unknown"}</p>
                          <p className="text-xs text-text-tertiary">{formatNumber(sup.totalBookings)} bookings</p>
                        </div>
                        <span className="text-sm font-medium text-text-primary shrink-0">{formatCurrency(sup.totalEarnings)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {can('tours.view') && (
            <Card className="lg:col-span-2">
              <CardHeader className="border-b border-border/60 pb-3.5">
                <CardTitle className="flex items-center gap-2.5 text-[13px] font-semibold tracking-tight text-text-primary">
                  <Map className="h-4 w-4 text-primary" />
                  Top Tours
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {overviewLoading ? (
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                  </div>
                ) : overviewError ? (
                  <SectionError message="Failed to load tours" onRetry={() => overviewRefetch()} />
                ) : !overview?.topTours?.length ? (
                  <SectionEmpty message="No top tours data" />
                ) : (
                  <div className="min-w-[600px]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-surface-muted/40">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary" colSpan={2}>Tour</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary">Bookings</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary">Revenue</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary">Rating</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary">Reviews</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.topTours.map((tour, idx) => (
                          <tr
                            key={tour.id || idx}
                            className="border-b border-border last:border-b-0 cursor-pointer hover:bg-surface-muted/20 transition-colors"
                            onClick={() => navigate("/admin/tours")}
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === "Enter") navigate("/admin/tours"); }}
                          >
                            <td colSpan={2} className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <span className="w-5 text-center text-xs font-medium text-text-tertiary shrink-0">{idx + 1}</span>
                                <span className="font-medium text-text-primary truncate">{tour.title}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center text-text-primary">{formatNumber(tour.bookingCount)}</td>
                            <td className="px-4 py-3 text-center text-text-primary">{formatCurrency(tour.revenue)}</td>
                            <td className="px-4 py-3 text-center">
                              {tour.averageRating != null ? Number(tour.averageRating).toFixed(1) : "—"}
                            </td>
                            <td className="px-4 py-3 text-center text-text-primary">{formatNumber(tour.reviewCount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* ── Bottom Grid ── */}
      {(can('dashboard.bookings') || can('dashboard.*') || can('payouts.view')) && (
        <motion.div variants={fadeInUp} className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {can('dashboard.bookings') && (
            <Card className="xl:col-span-1">
              <CardHeader className="border-b border-border/60 pb-3.5">
                <CardTitle className="flex items-center gap-2.5 text-[13px] font-semibold tracking-tight text-text-primary">
                  <Activity className="h-4 w-4 text-primary" />
                  Booking Status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {overviewLoading ? (
                  <Skeleton className="h-48 w-full rounded-xl" />
                ) : overviewError ? (
                  <SectionError message="Failed to load booking status" onRetry={() => overviewRefetch()} />
                ) : !overview?.bookingStatusDistribution?.length ? (
                  <SectionEmpty message="No booking data" />
                ) : (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={200}>
                      <RePieChart>
                        <Pie
                          data={(overview.bookingStatusDistribution || []).map((d) => ({ name: d.status || "Unknown", value: d.count || 0 }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          dataKey="value"
                          paddingAngle={3}
                          stroke="none"
                        >
                          {(overview.bookingStatusDistribution || []).map((entry, i) => (
                            <Cell key={entry.status || `unknown-${i}`} fill={bookingColors[entry.status || ""] || "#8a9ba8"} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                    <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1.5">
                      {(overview.bookingStatusDistribution || []).map((d, i) => (
                        <span key={d.status || `legend-${i}`} className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bookingColors[d.status || ""] || "#8a9ba8" }} />
                          {d.status || "Unknown"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {can('dashboard.*') && (
            <Card className="xl:col-span-1">
              <CardHeader className="border-b border-border/60 pb-3.5">
                <CardTitle className="flex items-center gap-2.5 text-[13px] font-semibold tracking-tight text-text-primary">
                  <Activity className="h-4 w-4 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {overviewLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full rounded-lg" />)}
                  </div>
                ) : overviewError ? (
                  <SectionError message="Failed to load activity" onRetry={() => overviewRefetch()} />
                ) : !overview?.eventFeed?.length ? (
                  <SectionEmpty message="No recent activity" />
                ) : (
                  <div className="max-h-72 overflow-y-auto scrollbar-thin divide-y divide-border">
                    {overview.eventFeed.map((event, idx) => (
                      <div key={idx} className="px-4 py-3">
                        <p className="text-sm text-text-primary">{event.message}</p>
                        <p className="text-xs text-text-tertiary mt-1">
                          {event.userName && <>{event.userName} · </>}
                          {timeAgo(event.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {can('payouts.view') && (
            <Card className="xl:col-span-1">
              <CardHeader className="border-b border-border/60 pb-3.5">
                <CardTitle className="flex items-center gap-2.5 text-[13px] font-semibold tracking-tight text-text-primary">
                  <Banknote className="h-4 w-4 text-primary" />
                  Payout Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {!payoutSummary ? (
                  <Skeleton className="h-28 w-full rounded-xl" />
                ) : (
                  <>
                    <div className="flex items-center justify-between py-2.5 border-b border-border/60">
                      <span className="text-sm text-text-secondary">Pending</span>
                      <span className="text-sm font-semibold text-text-primary">{formatNumber(payoutSummary.pending?.count)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 border-b border-border/60">
                      <span className="text-sm text-text-secondary">Paid This Month</span>
                      <span className="text-sm font-semibold text-text-primary">{formatNumber(payoutSummary.paidThisMonth?.count)}</span>
                    </div>
                    <div className="text-xs text-text-tertiary space-y-1.5 pt-1">
                      <div className="flex justify-between"><span>Pending total</span><span className="font-medium text-text-primary">{formatCurrency(payoutSummary.pending?.totalAmount)}</span></div>
                      <div className="flex justify-between"><span>Paid total</span><span className="font-medium text-text-primary">{formatCurrency(payoutSummary.paidThisMonth?.totalAmount)}</span></div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full h-10 rounded-xl group" onClick={() => navigate("/admin/payouts")}>
                      View All Payouts
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* ── Dialogs ── */}
      {showActiveUsers && (
        <ModalShell title="Active Users (30d)" onClose={() => setShowActiveUsers(false)}>
          {activeUsersLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          ) : !activeUsersData?.length ? (
            <div className="py-12 text-center text-sm text-text-tertiary">No active users in the last 30 days</div>
          ) : (
            <div className="divide-y divide-border">
              {activeUsersData.map((user) => (
                <div key={user.id} className="flex items-start gap-3 px-4 py-3">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="h-8 w-8 shrink-0 rounded-[10px] object-cover mt-0.5" />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-surface-muted text-xs font-medium text-text-secondary mt-0.5">
                      {user.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{user.name || "Unknown"}</p>
                    <p className="text-xs text-text-tertiary truncate">{user.email || "—"}</p>
                  </div>
                  {user.lastLoginAt && (
                    <span className="shrink-0 text-xs text-text-tertiary whitespace-nowrap pt-1">{formatDate(user.lastLoginAt)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </ModalShell>
      )}

      {showTodayBookings && (
        <ModalShell title="Today's Bookings" onClose={() => setShowTodayBookings(false)} wide>
          {todayBookingsLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : !todayBookings?.length ? (
            <div className="py-12 text-center text-sm text-text-tertiary">No bookings today</div>
          ) : (
            <div className="divide-y divide-border">
              {todayBookings.map((booking) => (
                <div key={booking.id} className="px-4 py-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <p className="text-sm text-text-primary truncate">{booking.customer?.name || "Unknown"}</p>
                      <p className="text-xs text-text-tertiary truncate">{booking.bookingNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-text-primary truncate">{booking.tour?.title || "—"}</p>
                      <p className="text-xs text-text-tertiary truncate">{booking.tour?.supplier?.name || "—"}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-sm text-text-primary">{formatCurrency(booking.total)} {booking.currency}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">{booking.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ModalShell>
      )}

      {showNewSignups && (
        <ModalShell title="New Signups (Today)" onClose={() => setShowNewSignups(false)}>
          {newSignupsLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          ) : !newSignupsData?.length ? (
            <div className="py-12 text-center text-sm text-text-tertiary">No new signups today</div>
          ) : (
            <div className="divide-y divide-border">
              {newSignupsData.map((user) => (
                <div key={user.id} className="flex items-start gap-3 px-4 py-3">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="h-8 w-8 shrink-0 rounded-[10px] object-cover mt-0.5" />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-surface-muted text-xs font-medium text-text-secondary mt-0.5">
                      {user.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{user.name || "Unknown"}</p>
                    <p className="text-xs text-text-tertiary truncate">{user.email || "—"}</p>
                  </div>
                  {user.createdAt && (
                    <span className="shrink-0 text-xs text-text-tertiary whitespace-nowrap pt-1">{formatDate(user.createdAt)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </ModalShell>
      )}
      </>
      )}
    </motion.div>
  );
}

/* ── Modal Shell ── */
function ModalShell({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        className={cn(
          "relative w-full sm:rounded-2xl bg-surface-base border border-border shadow-soft-lg overflow-hidden",
          "max-h-[85dvh] flex flex-col",
          wide ? "max-w-2xl" : "max-w-lg",
          "rounded-t-2xl sm:rounded-2xl"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-text-tertiary hover:bg-surface-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto scrollbar-thin flex-1">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

/* ── Welcome Dashboard ── */
function WelcomeDashboard() {
  const navigate = useNavigate();
  const { can, adminRole } = usePermission();

  const sections = [
    { permission: 'chat.customers', label: 'Customer Support', icon: <MessageCircle className="h-6 w-6" />, route: '/admin/chat/customers', desc: 'Respond to customer inquiries' },
    { permission: 'chat.suppliers', label: 'Supplier Messages', icon: <MessageSquare className="h-6 w-6" />, route: '/admin/chat/suppliers', desc: 'Communicate with suppliers' },
    { permission: 'reviews.view', label: 'Review Moderation', icon: <StarIcon className="h-6 w-6" />, route: '/admin/reviews', desc: 'Approve or flag reviews' },
    { permission: 'suppliers.view', label: 'Suppliers', icon: <Building className="h-6 w-6" />, route: '/admin/suppliers', desc: 'Manage supplier applications' },
    { permission: 'payouts.view', label: 'Payouts', icon: <Banknote className="h-6 w-6" />, route: '/admin/payouts', desc: 'View and approve payouts' },
    { permission: 'tours.view', label: 'Tours', icon: <Map className="h-6 w-6" />, route: '/admin/tours', desc: 'Browse tour performance' },
    { permission: 'users.view', label: 'Users', icon: <Users className="h-6 w-6" />, route: '/admin/user-growth', desc: 'User growth and analytics' },
    { permission: 'settings.access', label: 'Settings', icon: <Settings className="h-6 w-6" />, route: '/admin/settings', desc: 'Configure platform settings' },
  ];

  const available = sections.filter((s) => can(s.permission));

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={fadeInUp} className="border-l-2 border-l-primary pl-3">
        <h1 className="text-lg md:text-xl font-semibold text-text-primary">
          Welcome{adminRole?.name ? `, ${adminRole.name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}` : ''}
        </h1>
        <p className="text-sm text-text-secondary mt-1">Select a section below to get started</p>
      </motion.div>
      {available.length > 0 ? (
        <motion.div variants={fadeInUp} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {available.map((section) => (
            <button
              key={section.route}
              onClick={() => navigate(section.route)}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface-base p-5 text-left transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-primary/30 hover:shadow-tinted hover:-translate-y-0.5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground group-hover:scale-105 transition-transform duration-300">
                {section.icon}
              </div>
              <div>
                <p className="font-medium text-text-primary">{section.label}</p>
                <p className="text-sm text-text-tertiary mt-0.5">{section.desc}</p>
              </div>
            </button>
          ))}
        </motion.div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <LayoutDashboard className="mx-auto h-12 w-12 text-text-tertiary/40" />
            <p className="mt-3 text-sm text-text-tertiary">No sections available for your role. Contact a super admin.</p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

/* ── KPI Card ── */
const accentIconBg: Record<string, string> = {
  green: "bg-accent text-accent-foreground",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
};

function KpiCard({
  label,
  value,
  icon,
  trend,
  onClick,
  accent = "green",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean; text?: string };
  onClick?: () => void;
  accent?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl bg-surface-base border border-border p-3.5 md:p-4 transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
        onClick ? "cursor-pointer hover:shadow-soft hover:-translate-y-0.5" : "",
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick(); } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] md:text-xs font-medium text-text-secondary uppercase tracking-[0.08em] truncate">{label}</p>
          <p className="mt-1 text-lg md:text-xl font-bold text-text-primary tabular-nums">{value}</p>
          {trend && trend.value > 0 && (
            <p className={cn("mt-1 text-[11px] md:text-xs font-medium", trend.isPositive ? "text-status-active" : "text-destructive")}>
              {trend.isPositive ? "↑" : "↓"} {trend.value}%
            </p>
          )}
        </div>
        <div className={cn(
          "flex h-8 w-8 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-[10px]",
          accentIconBg[accent] || accentIconBg.green
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ── Revenue Period Card ── */
function RevenuePeriodCard({ period, revenue, commission, payout }: { period: string; revenue?: number; commission?: number; payout?: number }) {
  return (
    <div className="rounded-xl border border-border/80 bg-surface-base shadow-soft transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-soft hover:-translate-y-0.5">
      <div className="p-4 md:p-5">
        <p className="text-[11px] md:text-xs font-semibold text-text-secondary uppercase tracking-[0.08em] mb-1">{period}</p>
        <p className="text-xl md:text-2xl font-bold text-text-primary tabular-nums">{formatCurrency(revenue)}</p>
        {(commission !== undefined || payout !== undefined) && (
          <div className="mt-2 flex flex-col gap-0.5 text-[11px] md:text-xs text-text-tertiary">
            {commission !== undefined && <span>Comm: {formatCurrency(commission)}</span>}
            {payout !== undefined && <span>Payout: {formatCurrency(payout)}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
