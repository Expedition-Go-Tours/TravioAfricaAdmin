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
  PieChart,
  Activity,
  ArrowRight,
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
import { KPICard } from "@/components/shared/KPICard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SectionError } from "@/components/shared/SectionError";
import { SectionEmpty } from "@/components/shared/SectionEmpty";
import api from "@/lib/axios";
import { formatCurrency, formatNumber, formatDate, timeAgo } from "@/lib/utils";

interface OverviewData {
  revenue?: { today?: { revenue?: number }; thisWeek?: { revenue?: number; commission?: number; supplierPayout?: number }; thisMonth?: { revenue?: number; commission?: number; supplierPayout?: number }; ytd?: { revenue?: number; commission?: number; supplierPayout?: number } };
  bookings?: { today?: number };
  signups?: { today?: number };
  activeUsersLast30Days?: number;
  topTours?: Array<{ id?: string; title?: string; bookingCount?: number; revenue?: number; averageRating?: number; reviewCount?: number }>;
  topSuppliers?: Array<{ id?: string; user?: { name?: string; email?: string }; totalEarnings?: number; totalBookings?: number; averageRating?: number }>;
  bookingStatusDistribution?: Array<{ status?: string; count?: number; _id?: string }>;
  eventFeed?: Array<{ message?: string; createdAt?: string }>;
}

const bookingColors: Record<string, string> = {
  CONFIRMED: "#16a34a",
  PENDING: "#eab308",
  CANCELLED: "#dc2626",
  REFUNDED: "#ea580c",
  COMPLETED: "#2563eb",
  NO_SHOW: "#6b7280",
};

export default function OverviewPage() {
  const navigate = useNavigate();

  const { data: overview, isLoading: overviewLoading, isError: overviewError, refetch: overviewRefetch } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => api.get<OverviewData>("/admin/analytics/overview").then((res) => res.data),
  });

  const { data: payoutSummary } = useQuery({
    queryKey: ["admin", "payout-summary"],
    queryFn: () => api.get("/payouts/admin/summary").then((res) => res.data),
  });

  const { data: pendingReviews } = useQuery({
    queryKey: ["admin", "reviews-pending-count"],
    queryFn: () => api.get("/reviews/admin/pending?page=1&limit=1").then((res) => res.data),
  });

  const { data: pendingSuppliers } = useQuery({
    queryKey: ["admin", "suppliers-pending"],
    queryFn: () => api.get("/suppliers/admin/applications?status=PENDING&page=1&limit=1").then((res) => res.data),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-text-primary">Dashboard Overview</h1>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <KPICard
          label="Revenue Today"
          value={overviewLoading ? "..." : formatCurrency(overview?.revenue?.today?.revenue)}
          numericValue={overviewLoading ? undefined : overview?.revenue?.today?.revenue}
          format={formatCurrency}
          icon={<DollarSign className="h-5 w-5 text-emerald-500" />}
          color="bg-emerald-500/10"
          className="bg-gradient-to-b from-emerald-50 to-white"
        />
        <KPICard
          label="Bookings Today"
          value={overviewLoading ? "..." : formatNumber(overview?.bookings?.today)}
          numericValue={overviewLoading ? undefined : overview?.bookings?.today}
          format={formatNumber}
          icon={<CalendarCheck className="h-5 w-5 text-sky-600" />}
          color="bg-sky-600/10"
          className="bg-gradient-to-b from-sky-50 to-white"
        />
        <KPICard
          label="New Signups Today"
          value={overviewLoading ? "..." : formatNumber(overview?.signups?.today)}
          numericValue={overviewLoading ? undefined : overview?.signups?.today}
          format={formatNumber}
          icon={<UserPlus className="h-5 w-5 text-rose-600" />}
          color="bg-rose-600/10"
          className="bg-gradient-to-b from-rose-50 to-white"
        />
        <KPICard
          label="Active Users (30d)"
          value={overviewLoading ? "..." : formatNumber(overview?.activeUsersLast30Days)}
          numericValue={overviewLoading ? undefined : overview?.activeUsersLast30Days}
          format={formatNumber}
          icon={<Users className="h-5 w-5 text-amber-600" />}
          color="bg-amber-600/10"
          className="bg-gradient-to-b from-amber-50 to-white"
        />
        <KPICard
          label="Pending Payouts"
          value={overviewLoading ? "..." : formatNumber(payoutSummary?.pending?.count)}
          numericValue={overviewLoading ? undefined : payoutSummary?.pending?.count}
          format={formatNumber}
          icon={<Clock className="h-5 w-5 text-violet-600" />}
          color="bg-violet-600/10"
          className="bg-gradient-to-b from-violet-50 to-white"
        />
        <KPICard
          label="Pending Reviews"
          value={overviewLoading ? "..." : formatNumber(pendingReviews?.pagination?.totalCount)}
          numericValue={overviewLoading ? undefined : pendingReviews?.pagination?.totalCount}
          format={formatNumber}
          icon={<MessageSquare className="h-5 w-5 text-cyan-600" />}
          color="bg-cyan-600/10"
          className="bg-gradient-to-b from-cyan-50 to-white"
        />
        <KPICard
          label="Pending Suppliers"
          value={overviewLoading ? "..." : formatNumber(pendingSuppliers?.pagination?.totalCount)}
          numericValue={overviewLoading ? undefined : pendingSuppliers?.pagination?.totalCount}
          format={formatNumber}
          icon={<Building className="h-5 w-5 text-indigo-600" />}
          color="bg-indigo-600/10"
          className="bg-gradient-to-b from-indigo-50 to-white"
        />
      </div>

      {/* Revenue Comparison */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {overviewLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="mb-2 h-4 w-20" />
                <Skeleton className="h-6 w-28" />
                <Skeleton className="mt-1 h-3 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <RevenuePeriodCard period="Today" data={overview?.revenue?.today} />
            <RevenuePeriodCard period="This Week" data={overview?.revenue?.thisWeek} />
            <RevenuePeriodCard period="This Month" data={overview?.revenue?.thisMonth} />
            <RevenuePeriodCard period="YTD" data={overview?.revenue?.ytd} />
          </>
        )}
      </div>

      {/* Revenue Trend + Top Tours */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Revenue Trend (24mo)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueTrendChartSection />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Tours</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="mb-2 h-8 w-full" />)
            ) : overviewError ? (
              <SectionError message="Failed to load tours" onRetry={() => overviewRefetch()} />
            ) : !overview?.topTours?.length ? (
              <SectionEmpty message="No top tours data" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-muted text-left text-xs text-text-secondary">
                      <th className="px-2 py-2">Title</th>
                      <th className="px-2 py-2">Bookings</th>
                      <th className="px-2 py-2">Revenue</th>
                      <th className="px-2 py-2">Rating</th>
                      <th className="px-2 py-2">Reviews</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.topTours.map((tour, idx) => (
                      <tr
                        key={tour.id || idx}
                        className="cursor-pointer border-b border-border-muted transition-colors hover:bg-surface-muted/50"
                        onClick={() => navigate("/admin/tours")}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter") navigate("/admin/tours"); }}
                      >
                        <td className="px-2 py-2 font-medium text-text-primary">{tour.title}</td>
                        <td className="px-2 py-2">{formatNumber(tour.bookingCount)}</td>
                        <td className="px-2 py-2">{formatCurrency(tour.revenue)}</td>
                        <td className="px-2 py-2">{tour.averageRating?.toFixed(1) || "—"}</td>
                        <td className="px-2 py-2">{formatNumber(tour.reviewCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Suppliers + Booking Status + Activity + Payouts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Top Suppliers</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="mb-2 h-8 w-full" />)
            ) : overviewError ? (
              <SectionError message="Failed to load suppliers" onRetry={() => overviewRefetch()} />
            ) : !overview?.topSuppliers?.length ? (
              <SectionEmpty message="No supplier data" />
            ) : (
              <div className="space-y-2">
                {overview.topSuppliers.slice(0, 5).map((sup, idx) => (
                  <div
                    key={sup.id || idx}
                    onClick={() => navigate(`/admin/suppliers/${sup.id}`)}
                    onKeyDown={(e) => { if (e.key === "Enter") navigate(`/admin/suppliers/${sup.id}`); }}
                  >
                    <p className="text-sm font-medium text-text-primary">{sup.user?.name || "Unknown"}</p>
                    <p className="text-xs text-text-secondary">{formatCurrency(sup.totalEarnings)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
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
              <ResponsiveContainer width="100%" height={200}>
                <RePieChart>
                  <Pie
                    data={(overview.bookingStatusDistribution || []).map((d) => ({ name: d.status || d._id || "Unknown", value: d.count || 0 }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name || ""} ${(percent != null ? percent * 100 : 0).toFixed(0)}%`}
                  >
                    {(overview.bookingStatusDistribution || []).map((entry) => (
                      <Cell key={entry.status} fill={bookingColors[entry.status || ""] || "#6b7280"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="mb-2 h-6 w-full" />)
            ) : overviewError ? (
              <SectionError message="Failed to load activity" onRetry={() => overviewRefetch()} />
            ) : !overview?.eventFeed?.length ? (
              <SectionEmpty message="No recent activity" />
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {overview.eventFeed.map((event, idx) => (
                  <div key={idx} className="border-b border-border-muted pb-2 text-sm text-text-secondary last:border-b-0">
                    <p>{event.message}</p>
                    <p className="text-xs text-text-tertiary">{timeAgo(event.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payout Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!payoutSummary ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="space-y-3">
                <div className="rounded-sm bg-status-pending/10 p-3">
                  <p className="text-sm text-text-secondary">Pending Payouts</p>
                  <p className="text-md font-semibold text-text-primary">
                    {formatNumber(payoutSummary.pending?.count)} totalling {formatCurrency(payoutSummary.pending?.totalAmount)}
                  </p>
                </div>
                <div className="rounded-sm bg-status-active/10 p-3">
                  <p className="text-sm text-text-secondary">Paid This Month</p>
                  <p className="text-md font-semibold text-text-primary">
                    {formatNumber(payoutSummary.paidThisMonth?.count)} totalling {formatCurrency(payoutSummary.paidThisMonth?.totalAmount)}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate("/admin/payouts")}>
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

function RevenuePeriodCard({ period, data }: { period: string; data?: { revenue?: number; commission?: number; supplierPayout?: number } }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-text-secondary">{period}</p>
        <p className="text-md font-semibold text-text-primary">{formatCurrency(data?.revenue)}</p>
        <div className="mt-1 flex gap-3 text-xs text-text-tertiary">
          <span>Comm: {formatCurrency(data?.commission)}</span>
          <span>Payout: {formatCurrency(data?.supplierPayout)}</span>
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
      <BarChart data={data.data.months.slice(-12)}>
        <CartesianGrid strokeDasharray="3 3" stroke="#dfe3e8" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="revenue" fill="#2563eb" name="Revenue" radius={[2, 2, 0, 0]} />
        <Bar dataKey="commission" fill="#16a34a" name="Commission" radius={[2, 2, 0, 0]} />
        <Bar dataKey="supplierPayout" fill="#ea580c" name="Supplier Payout" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
