import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Users, CalendarCheck, DollarSign, Repeat, ShoppingBag, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/shared/DataTable";
import type { Column } from "@/components/shared/DataTable";
import { SectionError } from "@/components/shared/SectionError";
import { SectionEmpty } from "@/components/shared/SectionEmpty";
import api from "@/lib/axios";
import { staggerContainer, fadeIn } from "@/lib/animations";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";

const DIST_COLORS = ["#3b82f6", "#40966e", "#d97706", "#d45a0a", "#8b5cf6"];

const BOOKING_LABELS: Record<string, string> = {
  "1": "1 Booking",
  "2": "2 Bookings",
  "3": "3 Bookings",
  "4": "4 Bookings",
  "5+": "5+ Bookings",
};

interface CLVData {
  overview?: { totalCustomers?: number; totalBookings?: number; avgBookingValue?: number; totalRevenue?: number; avgCLV?: number };
  repeatRate?: { percent?: number; avgBookingsPerCustomer?: number };
  distribution?: Array<{ bookingCount?: string; customers?: number; percentage?: number }>;
  topCustomers?: Array<{ id?: string; name?: string; email?: string; totalBookings?: number; totalSpent?: number; avgBookingValue?: number; lastBookingDate?: string }>;
  cohorts?: Array<{ month?: string; users?: number; bookings?: number; revenue?: number; bookingsPerUser?: number; revenuePerUser?: number }>;
}

export default function CustomerLifetimeValuePage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "clv"],
    queryFn: () => api.get("/admin/analytics/clv").then((r) => r.data),
  });

  const topColumns: Column<{ id?: string; name?: string; email?: string; totalBookings?: number; totalSpent?: number; avgBookingValue?: number; lastBookingDate?: string }>[] = [
    { key: "name", header: "Name", render: (r) => <span className="font-medium text-text-primary">{r.name || "—"}</span> },
    { key: "email", header: "Email", render: (r) => <span className="text-text-secondary">{r.email || "—"}</span> },
    { key: "totalBookings", header: "Bookings", render: (r) => <span className="font-semibold text-text-primary">{formatNumber(r.totalBookings)}</span> },
    { key: "totalSpent", header: "Total Spent", render: (r) => <span className="font-semibold text-green-700">{formatCurrency(r.totalSpent)}</span> },
    { key: "avgBookingValue", header: "Avg Value", render: (r) => formatCurrency(r.avgBookingValue) },
    { key: "lastBookingDate", header: "Last Booking", render: (r) => <span className="text-xs text-text-tertiary">{formatDate(r.lastBookingDate)}</span> },
  ];

  const cohortColumns: Column<{ month?: string; users?: number; bookings?: number; revenue?: number; bookingsPerUser?: number; revenuePerUser?: number }>[] = [
    { key: "month", header: "Month", render: (r) => <span className="font-medium text-text-primary">{r.month || "—"}</span> },
    { key: "users", header: "Users", render: (r) => formatNumber(r.users) },
    { key: "bookings", header: "Bookings", render: (r) => formatNumber(r.bookings) },
    { key: "revenue", header: "Revenue", render: (r) => <span className="font-semibold text-green-700">{formatCurrency(r.revenue)}</span> },
    { key: "bookingsPerUser", header: "Bookings/User", render: (r) => r.bookingsPerUser?.toFixed(2) || "—" },
    { key: "revenuePerUser", header: "Revenue/User", render: (r) => formatCurrency(r.revenuePerUser) },
  ];

  const chartData = data?.data?.distribution || data?.distribution || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="rounded-sm bg-white p-1.5 shadow-sm hover:ring-2 hover:ring-green-300 transition-all">
          <ArrowLeft className="h-4 w-4 text-text-primary" />
        </button>
        <h1 className="text-lg font-semibold text-text-primary">Customer Lifetime Value</h1>
      </div>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <motion.div variants={fadeIn}><KpiCard label="Total Customers" value={isLoading ? "..." : formatNumber(data?.data?.overview?.totalCustomers ?? data?.overview?.totalCustomers)} icon={<Users className="h-4 w-4" />} accent="blue" /></motion.div>

        <motion.div variants={fadeIn}><KpiCard label="Total Bookings" value={isLoading ? "..." : formatNumber(data?.data?.overview?.totalBookings ?? data?.overview?.totalBookings)} icon={<CalendarCheck className="h-4 w-4" />} accent="green" /></motion.div>

        <motion.div variants={fadeIn}><KpiCard label="Avg Booking Value" value={isLoading ? "..." : formatCurrency(data?.data?.overview?.avgBookingValue ?? data?.overview?.avgBookingValue)} icon={<ShoppingBag className="h-4 w-4" />} accent="amber" /></motion.div>

        <motion.div variants={fadeIn}><KpiCard label="Total Revenue" value={isLoading ? "..." : formatCurrency(data?.data?.overview?.totalRevenue ?? data?.overview?.totalRevenue)} icon={<DollarSign className="h-4 w-4" />} accent="green" /></motion.div>

        <motion.div variants={fadeIn}><KpiCard label="Avg CLV" value={isLoading ? "..." : formatCurrency(data?.data?.overview?.avgCLV ?? data?.overview?.avgCLV)} icon={<Repeat className="h-4 w-4" />} accent="blue" /></motion.div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2 border-l-2 border-l-green-500/60">
          <CardHeader className="border-b border-border pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary"><Repeat className="h-4 w-4 text-green-600" /> Repeat Rate</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : isError ? (
              <SectionError message="Failed to load repeat rate" onRetry={() => refetch()} />
            ) : (
              <div className="text-center py-2">
                <p className="text-4xl font-bold text-text-primary">{(data?.data?.repeatRate?.repeatRate ?? data?.repeatRate?.repeatRate)?.toFixed(1) || "0"}%</p>
                <p className="text-sm text-text-secondary mt-1">of customers book more than once</p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-sm bg-green-50 px-4 py-2 text-sm">
                  <ShoppingBag className="h-4 w-4 text-green-600" />
                  <span className="text-text-secondary">Avg <strong className="text-green-700">{(data?.data?.repeatRate?.avgBookingsPerCustomer ?? data?.repeatRate?.avgBookingsPerCustomer)?.toFixed(2) || "0"}</strong> bookings per customer</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-l-2 border-l-green-500/60">
          <CardHeader className="border-b border-border pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-text-primary">Booking Distribution</CardTitle>
              {!isLoading && !isError && chartData.length > 0 && (
                <span className="text-xs text-text-tertiary">
                  {chartData.reduce((s: number, d: any) => s + (d.customers || 0), 0).toLocaleString()} total customers
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : isError ? (
              <SectionError message="Failed to load distribution" onRetry={() => refetch()} />
            ) : !chartData.length ? (
              <SectionEmpty message="No distribution data" />
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <ResponsiveContainer width="100%" height={200} className="max-w-[220px] shrink-0">
                  <PieChart>
                    <Pie data={chartData} dataKey="customers" nameKey="bookingCount" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                      {chartData.map((_: any, idx: number) => (
                        <Cell key={idx} fill={DIST_COLORS[idx % DIST_COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, _name: any, entry: any) => [
                        `${formatNumber(Number(value))} (${entry.payload.percentage?.toFixed(1) || "0"}%)`,
                        BOOKING_LABELS[entry.payload.bookingCount as string] || entry.payload.bookingCount,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3 w-full">
                  {chartData.map((entry: any, idx: number) => {
                    const total = chartData.reduce((s: number, d: any) => s + (d.customers || 0), 0);
                    const pct = entry.percentage ?? (total > 0 ? (entry.customers / total) * 100 : 0);
                    return (
                      <div key={entry.bookingCount}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: DIST_COLORS[idx % DIST_COLORS.length] }} />
                            <span className="font-medium text-text-primary">{BOOKING_LABELS[entry.bookingCount as string] || entry.bookingCount}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="font-semibold text-text-primary tabular-nums">{formatNumber(entry.customers)}</span>
                            <span className="text-text-tertiary tabular-nums w-10 text-right">{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: DIST_COLORS[idx % DIST_COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-l-2 border-l-green-500/60">
        <CardHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-text-primary">Top 20 Customers</CardTitle>
            <span className="text-xs text-text-tertiary">Highest spenders</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={topColumns}
            data={data?.data?.topCustomers || data?.topCustomers || []}
            loading={isLoading}
            error={isError ? "Failed to load customers" : null}
            emptyMessage="No customer data"
            onRetry={() => refetch()}
            keyExtractor={(r) => r.id || r.email || Math.random().toString()}
          />
        </CardContent>
      </Card>

      <Card className="border-l-2 border-l-green-500/60">
        <CardHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-text-primary">Monthly Cohorts</CardTitle>
            <span className="text-xs text-text-tertiary">Acquisition cohort performance</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={cohortColumns}
            data={data?.data?.cohorts || data?.cohorts || []}
            loading={isLoading}
            error={isError ? "Failed to load cohorts" : null}
            emptyMessage="No cohort data"
            onRetry={() => refetch()}
            keyExtractor={(r) => r.month || Math.random().toString()}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent: "green" | "blue" | "amber" }) {
  const accentMap = {
    green: { bg: "bg-gradient-to-br from-green-50 to-white", border: "border-green-200/40", iconBg: "bg-green-100", iconColor: "text-green-600" },
    blue: { bg: "bg-gradient-to-br from-blue-50 to-white", border: "border-blue-200/40", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
    amber: { bg: "bg-gradient-to-br from-amber-50 to-white", border: "border-amber-200/40", iconBg: "bg-amber-100", iconColor: "text-amber-600" },
  };
  const a = accentMap[accent];
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`rounded-sm border ${a.border} ${a.bg} p-3.5 shadow-2 transition-all hover:shadow-md`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-text-secondary truncate">{label}</p>
          <p className="mt-1 text-lg font-bold text-text-primary leading-tight">{value}</p>
        </div>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${a.iconBg} ${a.iconColor}`}>{icon}</div>
      </div>
    </motion.div>
  );
}
