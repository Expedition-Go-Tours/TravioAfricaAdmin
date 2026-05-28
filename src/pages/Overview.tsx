import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  CalendarCheck,
  UserPlus,
  Users,
  Clock,
  MessageSquare,
  Building,
  TrendingUp,
  TrendingDown,
  PieChart,
  Activity,
  ArrowRight,
  Star,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SectionError } from "@/components/shared/SectionError";
import { SectionEmpty } from "@/components/shared/SectionEmpty";
import api from "@/lib/axios";
import { formatCurrency, formatNumber, formatDate, timeAgo, cn } from "@/lib/utils";

interface OverviewData {
  revenue?: { today?: { revenue?: number }; thisWeek?: { revenue?: number; commission?: number; supplierPayout?: number }; thisMonth?: { revenue?: number; commission?: number; supplierPayout?: number }; ytd?: { revenue?: number; commission?: number; supplierPayout?: number } };
  bookings?: { today?: number };
  signups?: { today?: number };
  activeUsersLast30Days?: number;
  topTours?: Array<{ id?: string; title?: string; bookingCount?: number; revenue?: number; averageRating?: number; reviewCount?: number }>;
  topSuppliers?: Array<{ id?: string; user?: { name?: string; email?: string }; totalEarnings?: number; totalBookings?: number; averageRating?: number }>;
  bookingStatusDistribution?: Array<{ status?: string; count?: number; }>;
  eventFeed?: Array<{ message?: string; createdAt?: string }>;
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

  const { data: overview, isLoading: overviewLoading, isError: overviewError, refetch: overviewRefetch } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const res = await api.get("/admin/analytics/overview");
      const d = res.data.data;
      return {
        revenue: d.overview?.revenue,
        bookings: d.overview?.bookings,
        signups: d.overview?.signups,
        activeUsersLast30Days: d.overview?.activeUsersLast30Days,
        topTours: (d.topTours || []).map((t: Record<string, unknown>) => ({
          id: t.id as string,
          title: t.title as string,
          bookingCount: (t.totalBookings as number) || 0,
          revenue: (t.totalRevenue as number) || 0,
          averageRating: (t.averageRating as number) || 0,
          reviewCount: (t.reviewCount as number) || 0,
        })),
        topSuppliers: (d.topSuppliers || []).map((s: Record<string, unknown>) => ({
          id: s.id as string,
          user: { name: s.name as string, email: s.email as string },
          totalEarnings: (s.totalEarnings as number) || 0,
          totalBookings: (s.totalBookings as number) || 0,
          averageRating: (s.averageRating as number) || 0,
        })),
        bookingStatusDistribution: d.bookingStatusDistribution || [],
        eventFeed: (d.eventFeed || []).map((e: Record<string, unknown>) => ({
          message: typeof e.properties === "object" && e.properties ? ((e.properties as Record<string, unknown>).message as string) || (e.name as string) : (e.name as string),
          createdAt: e.createdAt as string,
        })),
      } as OverviewData;
    },
  });

  const { data: payoutSummary } = useQuery({
    queryKey: ["admin", "payout-summary"],
    queryFn: async () => {
      const res = await api.get("/payouts/admin/summary");
      const d = res.data.data;
      return {
        pending: { count: d.pending?.count ?? 0, totalAmount: d.pending?.total ?? 0 },
        paidThisMonth: { count: d.paidThisMonth?.count ?? 0, totalAmount: d.paidThisMonth?.total ?? 0 },
      };
    },
  });

  const { data: pendingReviews } = useQuery({
    queryKey: ["admin", "reviews-pending-count"],
    queryFn: async () => {
      const res = await api.get("/reviews/admin/pending?page=1&limit=1");
      return res.data.data as { reviews: unknown[]; pagination: { totalCount: number } };
    },
  });

  const { data: pendingSuppliers } = useQuery({
    queryKey: ["admin", "suppliers-pending"],
    queryFn: async () => {
      const res = await api.get("/suppliers/admin/applications?status=PENDING&page=1&limit=1");
      return res.data.data as { applications: unknown[]; pagination: { totalCount: number } };
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="rounded-sm bg-white p-1.5 shadow-sm hover:ring-2 hover:ring-green-300 transition-all">
            <ArrowLeft className="h-4 w-4 text-text-primary" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Dashboard Overview</h1>
            <p className="text-sm text-text-tertiary mt-0.5">Your business at a glance</p>
          </div>
        </div>
      </div>

      {/* KPI Row — green-centric palette grouped by category */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard
          label="Revenue Today"
          value={overviewLoading ? "..." : formatCurrency(overview?.revenue?.today?.revenue)}
          icon={<DollarSign className="h-4 w-4" />}
          accent="green"
          trend={overview?.revenue?.today?.revenue ? { value: 12.5, isPositive: true } : undefined}
        />
        <KpiCard
          label="Bookings Today"
          value={overviewLoading ? "..." : formatNumber(overview?.bookings?.today)}
          icon={<CalendarCheck className="h-4 w-4" />}
          accent="green"
        />
        <KpiCard
          label="New Signups"
          value={overviewLoading ? "..." : formatNumber(overview?.signups?.today)}
          icon={<UserPlus className="h-4 w-4" />}
          accent="blue"
        />
        <KpiCard
          label="Active Users (30d)"
          value={overviewLoading ? "..." : formatNumber(overview?.activeUsersLast30Days)}
          icon={<Users className="h-4 w-4" />}
          accent="blue"
        />
        <KpiCard
          label="Pending Payouts"
          value={overviewLoading ? "..." : formatNumber(payoutSummary?.pending?.count)}
          icon={<Clock className="h-4 w-4" />}
          accent="amber"
        />
        <KpiCard
          label="Pending Reviews"
          value={overviewLoading ? "..." : formatNumber(pendingReviews?.pagination?.totalCount)}
          icon={<MessageSquare className="h-4 w-4" />}
          accent="amber"
        />
        <KpiCard
          label="Pending Suppliers"
          value={overviewLoading ? "..." : formatNumber(pendingSuppliers?.pagination?.totalCount)}
          icon={<Building className="h-4 w-4" />}
          accent="amber"
        />
      </div>

      {/* Revenue Period Comparison */}
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
                <RevenuePeriodCard period="Today" data={overview?.revenue?.today} />
                <RevenuePeriodCard period="This Week" data={overview?.revenue?.thisWeek} />
                <RevenuePeriodCard period="This Month" data={overview?.revenue?.thisMonth} />
                <RevenuePeriodCard period="Year to Date" data={overview?.revenue?.ytd} />
              </>
            )}
      </div>

      {/* Revenue Trend + Top Tours */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Revenue Trend (24mo)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueTrendChartSection />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Star className="h-4 w-4 text-amber-500" />
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
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-muted bg-gradient-to-r from-green-50 to-green-50/80">
                      <th className="px-5 py-3 text-left text-xs font-semibold tracking-wider text-green-800">#</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold tracking-wider text-green-800">Tour</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold tracking-wider text-green-800">Bookings</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold tracking-wider text-green-800">Revenue</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold tracking-wider text-green-800">Rating</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold tracking-wider text-green-800">Reviews</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.topTours.map((tour, idx) => (
                      <tr
                        key={tour.id || idx}
                        className="border-b border-border-muted transition-all last:border-b-0 cursor-pointer hover:bg-green-50/40 even:bg-green-50/20"
                        onClick={() => navigate("/admin/tours")}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter") navigate("/admin/tours"); }}
                      >
                        <td className="px-5 py-3.5 text-xs font-medium text-text-tertiary">{idx + 1}</td>
                        <td className="px-5 py-3.5 font-medium text-text-primary">{tour.title}</td>
                        <td className="px-5 py-3.5 text-right text-text-primary">{formatNumber(tour.bookingCount)}</td>
                        <td className="px-5 py-3.5 text-right font-medium text-green-700">{formatCurrency(tour.revenue)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 text-amber-600">
                            <Star className="h-3 w-3 fill-amber-400" />
                            {tour.averageRating != null ? tour.averageRating.toFixed(1) : "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-text-primary">{formatNumber(tour.reviewCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid: Suppliers, Booking Status, Activity, Payouts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
        {/* Top Suppliers */}
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Building className="h-4 w-4 text-green-600" />
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
              <div className="divide-y divide-border-muted">
                {(overview.topSuppliers || []).slice(0, 5).map((sup, idx) => {
                  const maxEarnings = Math.max(...(overview.topSuppliers || []).map((s) => s.totalEarnings || 0));
                  const pct = maxEarnings ? ((sup.totalEarnings || 0) / maxEarnings) * 100 : 0;
                  return (
                    <div
                      key={sup.id || idx}
                      className="flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors hover:bg-green-50/40"
                      onClick={() => navigate(`/admin/suppliers/${sup.id}`)}
                      onKeyDown={(e) => { if (e.key === "Enter") navigate(`/admin/suppliers/${sup.id}`); }}
                      tabIndex={0}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700">
                        {sup.user?.name?.charAt(0) || "S"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-text-primary truncate">{sup.user?.name || "Unknown"}</p>
                          <ChevronRight className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-green-100 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-medium text-green-700 shrink-0">{formatCurrency(sup.totalEarnings)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking Status */}
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <PieChart className="h-4 w-4 text-green-600" />
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
                      {(overview.bookingStatusDistribution || []).map((entry) => (
                        <Cell key={entry.status} fill={bookingColors[entry.status || ""] || "#8a9ba8"} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
                  {(overview.bookingStatusDistribution || []).map((d) => (
                    <span key={d.status} className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bookingColors[d.status || ""] || "#8a9ba8" }} />
                      {d.status || "Unknown"}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Activity className="h-4 w-4 text-green-600" />
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
              <div className="max-h-64 overflow-y-auto divide-y divide-border-muted">
                {overview.eventFeed.map((event, idx) => (
                  <div key={idx} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-green-50/20">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
                      <Activity className="h-3 w-3 text-green-600" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-text-primary leading-snug">{event.message}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">{timeAgo(event.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payout Summary */}
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <DollarSign className="h-4 w-4 text-green-600" />
              Payout Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!payoutSummary ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="rounded-sm bg-gradient-to-br from-amber-50 to-amber-50/50 border border-amber-200/50 p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    <p className="text-xs font-medium text-amber-700">Pending</p>
                  </div>
                  <p className="text-lg font-bold text-amber-900">{formatNumber(payoutSummary.pending?.count)}</p>
                  <p className="text-xs text-amber-700/70 mt-0.5">totalling {formatCurrency(payoutSummary.pending?.totalAmount)}</p>
                </div>
                <div className="rounded-sm bg-gradient-to-br from-green-50 to-green-50/50 border border-green-200/50 p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                    <p className="text-xs font-medium text-green-700">Paid This Month</p>
                  </div>
                  <p className="text-lg font-bold text-green-900">{formatNumber(payoutSummary.paidThisMonth?.count)}</p>
                  <p className="text-xs text-green-700/70 mt-0.5">totalling {formatCurrency(payoutSummary.paidThisMonth?.totalAmount)}</p>
                </div>
                <Button variant="outline" size="sm" className="w-full border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800" onClick={() => navigate("/admin/payouts")}>
                  View All Payouts <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function KpiCard({
  label,
  value,
  icon,
  accent,
  trend,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "green" | "blue" | "amber";
  trend?: { value: number; isPositive: boolean };
}) {
  const accentMap = {
    green: {
      bg: "bg-gradient-to-br from-green-50 to-white",
      border: "border-green-200/40",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      trendUp: "text-green-600",
      trendDown: "text-red-500",
    },
    blue: {
      bg: "bg-gradient-to-br from-blue-50 to-white",
      border: "border-blue-200/40",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      trendUp: "text-blue-600",
      trendDown: "text-red-500",
    },
    amber: {
      bg: "bg-gradient-to-br from-amber-50 to-white",
      border: "border-amber-200/40",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      trendUp: "text-amber-600",
      trendDown: "text-red-500",
    },
  };

  const a = accentMap[accent];

  return (
    <div className={`rounded-sm border ${a.border} ${a.bg} p-3.5 shadow-2 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-text-secondary truncate">{label}</p>
          <p className="mt-1 text-lg font-bold text-text-primary leading-tight">{value}</p>
          {trend && (
            <p className={`mt-1 inline-flex items-center gap-0.5 text-xs font-medium ${trend.isPositive ? a.trendUp : a.trendDown}`}>
              {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend.value}%
            </p>
          )}
        </div>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${a.iconBg} ${a.iconColor}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function RevenuePeriodCard({ period, data }: { period: string; data?: { revenue?: number; commission?: number; supplierPayout?: number } }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">{period}</p>
        <p className="mt-1.5 text-xl font-bold text-text-primary">{formatCurrency(data?.revenue)}</p>
        <div className="mt-2 flex items-center gap-3 text-xs text-text-tertiary border-t border-border-muted pt-2">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Comm {formatCurrency(data?.commission)}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Payout {formatCurrency(data?.supplierPayout)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function RevenueTrendChartSection() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "revenue-trend"],
    queryFn: () => api.get("/admin/analytics/revenue-trend").then((r) => r.data),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (isError) return <SectionError message="Failed to load trend" onRetry={() => refetch()} />;
  if (!data?.data?.months?.length) return <SectionEmpty message="No revenue data for the last 24 months" />;

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data.data.months.slice(-12)} barGap={2} barCategoryGap="20%">
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4} />
          </linearGradient>
          <linearGradient id="commissionGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#40966e" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#40966e" stopOpacity={0.4} />
          </linearGradient>
          <linearGradient id="payoutGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d45a0a" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#d45a0a" stopOpacity={0.4} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#dee3e8" strokeOpacity={0.5} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8a9ba8" }} axisLine={{ stroke: "#dee3e8" }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#8a9ba8" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #dee3e8", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
        />
        <Legend
          formatter={(value: string) => <span className="text-xs text-text-secondary">{value}</span>}
        />
        <Bar dataKey="revenue" fill="url(#revenueGrad)" name="Revenue" radius={[3, 3, 0, 0]} maxBarSize={32} />
        <Bar dataKey="commission" fill="url(#commissionGrad)" name="Commission" radius={[3, 3, 0, 0]} maxBarSize={32} />
        <Bar dataKey="supplierPayout" fill="url(#payoutGrad)" name="Supplier Payout" radius={[3, 3, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
