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
  Activity,
  ArrowRight,
  Star,
  X,
} from "lucide-react";
import {
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SectionError } from "@/components/shared/SectionError";
import { SectionEmpty } from "@/components/shared/SectionEmpty";
import api from "@/lib/axios";
import { getAdminSocket } from "@/lib/adminSocket";
import { formatCurrency, formatNumber, formatDate, timeAgo } from "@/lib/utils";

interface OverviewData {
  revenue?: { today?: { revenue?: number }; yesterday?: { revenue?: number }; thisWeek?: { revenue?: number; commission?: number; supplierPayout?: number }; thisMonth?: { revenue?: number; commission?: number; supplierPayout?: number }; ytd?: { revenue?: number; commission?: number; supplierPayout?: number } };
  bookings?: { today?: number; yesterday?: number };
  signups?: { today?: number; yesterday?: number };
  activeUsersLast30Days?: number;
  activeUsersPrevious30?: number;
  topTours?: Array<{ id?: string; title?: string; coverPhoto?: string; bookingCount?: number; revenue?: number; averageRating?: number; reviewCount?: number }>;
  topSuppliers?: Array<{ id?: string; user?: { name?: string; email?: string; photoURL?: string }; totalEarnings?: number; totalBookings?: number; averageRating?: number }>;
  bookingStatusDistribution?: Array<{ status?: string; count?: number; }>;
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
    },
  });

  const { data: payoutSummary } = useQuery({
    queryKey: ["admin", "payout-summary"],
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
    queryFn: async () => {
      const res = await api.get("/reviews/admin/pending?page=1&limit=1");
      const d = res.data?.data as { reviews: unknown[]; pagination: { totalCount: number }; counts?: { pending?: number } } | undefined;
      return d ?? { reviews: [], pagination: { totalCount: 0 } };
    },
  });

  const { data: pendingSuppliers } = useQuery({
    queryKey: ["admin", "suppliers-pending"],
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
    const rounded = Math.abs(Math.round(change));
    const direction = change >= 0 ? "more than" : "less than";
    const period = context === "Active Users" ? "last 30 days" : "yesterday";
    return { value: rounded, isPositive: change >= 0, text: `${rounded}% ${direction} ${period}` };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-sm bg-white p-1.5 shadow-sm hover:ring-2 hover:ring-green-300 transition-all">
          <ArrowLeft className="h-4 w-4 text-text-primary" />
        </button>
        <div className="border-l-2 border-l-green-500 pl-3">
          <h1 className="text-lg font-semibold text-text-primary">Overview</h1>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
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
        {can('dashboard.users') && (
          <KpiCard
            label="New Signups"
            value={overviewLoading ? "..." : formatNumber(overview?.signups?.today)}
            icon={<UserPlus className="h-4 w-4" />}
            onClick={() => setShowNewSignups(true)}
            trend={calcTrend(overview?.signups?.today, overview?.signups?.yesterday, "Signups")}
            accent="blue"
          />
        )}
        {can('dashboard.users') && (
          <KpiCard
            label="Active Users (30d)"
            value={overviewLoading ? "..." : formatNumber(overview?.activeUsersLast30Days)}
            icon={<Users className="h-4 w-4" />}
            onClick={() => setShowActiveUsers(true)}
            trend={calcTrend(overview?.activeUsersLast30Days, overview?.activeUsersPrevious30, "Active Users")}
            accent="blue"
          />
        )}
        {can('dashboard.payout_summary') && (
          <KpiCard
            label="Pending Payouts"
            value={overviewLoading ? "..." : formatNumber(payoutSummary?.pending?.count)}
            icon={<Clock className="h-4 w-4" />}
            trend={payoutSummary?.pending?.count ? { value: 0, isPositive: true, text: "Awaiting payout" } : undefined}
            accent="amber"
          />
        )}
        {can('dashboard.*') && (
          <KpiCard
            label="Pending Reviews"
            value={overviewLoading ? "..." : formatNumber(pendingReviews?.counts?.pending)}
            icon={<MessageSquare className="h-4 w-4" />}
            trend={pendingReviews?.counts?.pending ? { value: 0, isPositive: true, text: "Awaiting review" } : undefined}
            accent="amber"
          />
        )}
        {can('dashboard.*') && (
          <KpiCard
            label="Pending Suppliers"
            value={overviewLoading ? "..." : formatNumber(pendingSuppliers?.pagination?.totalCount)}
            icon={<Building className="h-4 w-4" />}
            trend={pendingSuppliers?.pagination?.totalCount ? { value: 0, isPositive: true, text: "Awaiting approval" } : undefined}
            accent="amber"
          />
        )}
      </div>

      {can('dashboard.revenue') && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
        </div>
      )}

      {/* Top Suppliers + Top Tours */}
      {(can('dashboard.top_suppliers') || can('dashboard.top_tours')) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {can('dashboard.top_suppliers') && (
            <Card className="lg:col-span-1">
              <CardHeader className="border-b border-border pb-3 border-l-2 border-l-green-500/60">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                  Top Suppliers
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {overviewLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
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
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-surface-muted/30 transition-colors"
                        onClick={() => navigate(`/admin/suppliers/${sup.id}`)}
                        onKeyDown={(e) => { if (e.key === "Enter") navigate(`/admin/suppliers/${sup.id}`); }}
                        tabIndex={0}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-medium text-green-700">
                          {sup.user?.name?.charAt(0)?.toUpperCase() || "S"}
                        </span>
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                          <p className="text-sm text-text-primary truncate">{sup.user?.name || "Unknown"}</p>
                          <span className="text-sm text-text-secondary shrink-0">{formatCurrency(sup.totalEarnings)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {can('dashboard.top_tours') && (
            <Card className="lg:col-span-2">
              <CardHeader className="border-b border-border pb-3 border-l-2 border-l-green-500/60">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                  Top Tours
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {overviewLoading ? (
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : overviewError ? (
                  <SectionError message="Failed to load tours" onRetry={() => overviewRefetch()} />
                ) : !overview?.topTours?.length ? (
                  <SectionEmpty message="No top tours data" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm table-fixed">
                      <thead>
                        <tr className="border-b border-border bg-surface-muted/40">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-secondary" colSpan={2}>Tour</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-text-secondary">Bookings</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-text-secondary">Revenue</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-text-secondary">Rating</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-text-secondary">Reviews</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.topTours.map((tour, idx) => (
                          <tr
                            key={tour.id || idx}
                            className="border-b border-border last:border-b-0 cursor-pointer hover:bg-surface-muted/30 transition-colors"
                            onClick={() => navigate("/admin/tours")}
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === "Enter") navigate("/admin/tours"); }}
                          >
                            <td colSpan={2} className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <span className="w-5 text-center text-xs font-medium text-text-tertiary shrink-0">{idx + 1}</span>
                                <span className="font-medium text-text-primary truncate min-w-0">{tour.title}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center text-text-primary text-sm">{formatNumber(tour.bookingCount)}</td>
                            <td className="px-4 py-3 text-center text-text-primary text-sm">{formatCurrency(tour.revenue)}</td>
                            <td className="px-4 py-3 text-center text-sm">
                              {tour.averageRating != null ? Number(tour.averageRating).toFixed(1) : "—"}
                            </td>
                            <td className="px-4 py-3 text-center text-text-primary text-sm">{formatNumber(tour.reviewCount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Bottom Grid: Booking Status, Activity, Payouts */}
      {(can('dashboard.bookings') || can('dashboard.recent_activity') || can('dashboard.payout_summary')) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {can('dashboard.bookings') && (
            <Card className="xl:col-span-1">
              <CardHeader className="border-b border-border pb-3 border-l-2 border-l-green-500/60">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                  Booking Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overviewLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : overviewError ? (
                  <SectionError message="Failed to load booking status" onRetry={() => overviewRefetch()} />
                ) : !overview?.bookingStatusDistribution?.length ? (
                  <SectionEmpty message="No booking data" />
                ) : (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={180}>
                      <RePieChart>
                        <Pie
                          data={(overview.bookingStatusDistribution || []).map((d) => ({ name: d.status || "Unknown", value: d.count || 0 }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          dataKey="value"
                          paddingAngle={2}
                        >
                          {(overview.bookingStatusDistribution || []).map((entry, i) => (
                            <Cell key={entry.status || `unknown-${i}`} fill={bookingColors[entry.status || ""] || "#8a9ba8"} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
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

          {can('dashboard.recent_activity') && (
            <Card className="xl:col-span-1">
              <CardHeader className="border-b border-border pb-3 border-l-2 border-l-green-500/60">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {overviewLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
                  </div>
                ) : overviewError ? (
                  <SectionError message="Failed to load activity" onRetry={() => overviewRefetch()} />
                ) : !overview?.eventFeed?.length ? (
                  <SectionEmpty message="No recent activity" />
                ) : (
                  <div className="max-h-64 overflow-y-auto divide-y divide-border">
                    {overview.eventFeed.map((event, idx) => (
                      <div key={idx} className="px-4 py-2.5">
                        <p className="text-sm text-text-primary">{event.message}</p>
                        <p className="text-xs text-text-tertiary mt-0.5">
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

          {can('dashboard.payout_summary') && (
            <Card className="xl:col-span-1">
              <CardHeader className="border-b border-border pb-3 border-l-2 border-l-green-500/60">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                  Payout Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {!payoutSummary ? (
                  <Skeleton className="h-28 w-full" />
                ) : (
                  <>
                    <div className="flex items-center justify-between border-l-2 border-l-amber-500/60 pl-2 pb-2 border-b border-border">
                      <span className="text-sm text-text-secondary">Pending</span>
                      <span className="text-sm font-medium">{formatNumber(payoutSummary.pending?.count)}</span>
                    </div>
                    <div className="flex items-center justify-between border-l-2 border-l-green-500/60 pl-2 pb-2 border-b border-border">
                      <span className="text-sm text-text-secondary">Paid This Month</span>
                      <span className="text-sm font-medium">{formatNumber(payoutSummary.paidThisMonth?.count)}</span>
                    </div>
                    <div className="text-xs text-text-tertiary space-y-1 pt-1">
                      <div className="flex justify-between"><span>Pending total</span><span>{formatCurrency(payoutSummary.pending?.totalAmount)}</span></div>
                      <div className="flex justify-between"><span>Paid total</span><span>{formatCurrency(payoutSummary.paidThisMonth?.totalAmount)}</span></div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/admin/payouts")}>
                      View All Payouts <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Active Users Dialog */}
      {showActiveUsers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowActiveUsers(false)}>
          <div className="w-full max-w-lg rounded-sm border border-border bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Active Users (30d)</h2>
              <button onClick={() => setShowActiveUsers(false)} className="rounded-sm p-1 text-text-tertiary hover:bg-surface-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {activeUsersLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !activeUsersData?.length ? (
                <div className="py-10 text-center text-sm text-text-tertiary">No active users in the last 30 days</div>
              ) : (
                <div className="divide-y divide-border">
                  {activeUsersData.map((user) => (
                    <div key={user.id} className="flex items-start gap-3 px-4 py-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-medium text-text-secondary mt-0.5">
                        {user.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">{user.name || "Unknown"}</p>
                        <p className="text-xs text-text-tertiary truncate">{user.email || "—"}</p>
                      </div>
                      {user.lastLoginAt && (
                        <span className="shrink-0 text-xs text-text-tertiary whitespace-nowrap pt-0.5">{formatDate(user.lastLoginAt)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Today's Bookings Dialog */}
      {showTodayBookings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowTodayBookings(false)}>
          <div className="w-full max-w-2xl rounded-sm border border-border bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Today's Bookings</h2>
              <button onClick={() => setShowTodayBookings(false)} className="rounded-sm p-1 text-text-tertiary hover:bg-surface-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {todayBookingsLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : !todayBookings?.length ? (
                <div className="py-10 text-center text-sm text-text-tertiary">No bookings today</div>
              ) : (
                <div className="divide-y divide-border">
                  {todayBookings.map((booking) => (
                    <div key={booking.id} className="flex items-center gap-4 px-4 py-2.5">
                      <div className="flex-1 min-w-0 grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-text-primary truncate">{booking.customer?.name || "Unknown"}</p>
                          <p className="text-xs text-text-tertiary truncate">{booking.bookingNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-text-primary truncate">{booking.tour?.title || "—"}</p>
                          <p className="text-xs text-text-tertiary truncate">{booking.tour?.supplier?.name || "—"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-text-primary">{formatCurrency(booking.total)} {booking.currency}</p>
                          <p className="text-xs text-text-tertiary mt-0.5">{booking.status}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Signups Dialog */}
      {showNewSignups && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowNewSignups(false)}>
          <div className="w-full max-w-lg rounded-sm border border-border bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">New Signups (30d)</h2>
              <button onClick={() => setShowNewSignups(false)} className="rounded-sm p-1 text-text-tertiary hover:bg-surface-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {newSignupsLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !newSignupsData?.length ? (
                <div className="py-10 text-center text-sm text-text-tertiary">No new signups in the last 30 days</div>
              ) : (
                <div className="divide-y divide-border">
                  {newSignupsData.map((user) => (
                    <div key={user.id} className="flex items-start gap-3 px-4 py-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-medium text-text-secondary mt-0.5">
                        {user.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">{user.name || "Unknown"}</p>
                        <p className="text-xs text-text-tertiary truncate">{user.email || "—"}</p>
                      </div>
                      {user.createdAt && (
                        <span className="shrink-0 text-xs text-text-tertiary whitespace-nowrap pt-0.5">{formatDate(user.createdAt)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

const accentBorders: Record<string, string> = {
  green: "border-l-green-500/60",
  blue: "border-l-blue-500/60",
  amber: "border-l-amber-500/60",
};

const accentIconBg: Record<string, string> = {
  green: "bg-green-100 text-green-700",
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
      className={`rounded-sm border border-border bg-card p-3 border-l-2 ${accentBorders[accent] || accentBorders.green} ${onClick ? "cursor-pointer" : ""} transition-colors hover:bg-surface-muted/20`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick(); } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-text-secondary truncate">{label}</p>
          <p className="mt-0.5 text-base font-semibold text-text-primary">{value}</p>
          {trend && trend.value > 0 && (
            <p className={`mt-0.5 text-xs ${trend.isPositive ? "text-green-600" : "text-red-500"}`}>
              {trend.isPositive ? "+" : "-"}{trend.value}%
            </p>
          )}
        </div>
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${accentIconBg[accent] || accentIconBg.green}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function RevenuePeriodCard({ period, revenue, commission, payout }: { period: string; revenue?: number; commission?: number; payout?: number }) {
  return (
    <Card>
      <CardContent className="p-4 border-t-2 border-t-green-500/40">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">{period}</p>
        <p className="text-lg font-bold text-text-primary">{formatCurrency(revenue)}</p>
        <div className="mt-2 flex items-center gap-3 text-xs text-text-tertiary">
          <span>Comm: {formatCurrency(commission)}</span>
          <span>Payout: {formatCurrency(payout)}</span>
        </div>
      </CardContent>
    </Card>
  );
}


