import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Users, CalendarCheck, DollarSign, Repeat } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KPICard } from "@/components/shared/KPICard";
import { DataTable } from "@/components/shared/DataTable";
import type { Column } from "@/components/shared/DataTable";
import { SectionError } from "@/components/shared/SectionError";
import { SectionEmpty } from "@/components/shared/SectionEmpty";
import api from "@/lib/axios";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";

const DIST_COLORS = ["#3b82f6", "#40966e", "#d97706", "#d45a0a", "#8b5cf6"];

interface CLVData {
  overview?: { totalCustomers?: number; totalBookings?: number; avgBookingValue?: number; totalRevenue?: number; avgCLV?: number };
  repeatRate?: { percent?: number; avgBookingsPerCustomer?: number };
  distribution?: Array<{ range?: string; count?: number }>;
  topCustomers?: Array<{ id?: string; name?: string; email?: string; totalBookings?: number; totalSpent?: number; avgBookingValue?: number; lastBookingDate?: string }>;
  cohorts?: Array<{ month?: string; users?: number; bookings?: number; revenue?: number; bookingsPerUser?: number; revenuePerUser?: number }>;
}

export default function CustomerLifetimeValuePage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "clv"],
    queryFn: () => api.get<CLVData>("/admin/analytics/clv").then((r) => r.data),
  });

  const topColumns: Column<{ id?: string; name?: string; email?: string; totalBookings?: number; totalSpent?: number; avgBookingValue?: number; lastBookingDate?: string }>[] = [
    { key: "name", header: "Name", render: (r) => r.name || "—" },
    { key: "email", header: "Email", render: (r) => r.email || "—" },
    { key: "totalBookings", header: "Bookings", render: (r) => formatNumber(r.totalBookings) },
    { key: "totalSpent", header: "Total Spent", render: (r) => formatCurrency(r.totalSpent) },
    { key: "avgBookingValue", header: "Avg Value", render: (r) => formatCurrency(r.avgBookingValue) },
    { key: "lastBookingDate", header: "Last Booking", render: (r) => formatDate(r.lastBookingDate) },
  ];

  const cohortColumns: Column<{ month?: string; users?: number; bookings?: number; revenue?: number; bookingsPerUser?: number; revenuePerUser?: number }>[] = [
    { key: "month", header: "Month", render: (r) => r.month || "—" },
    { key: "users", header: "Users", render: (r) => formatNumber(r.users) },
    { key: "bookings", header: "Bookings", render: (r) => formatNumber(r.bookings) },
    { key: "revenue", header: "Revenue", render: (r) => formatCurrency(r.revenue) },
    { key: "bookingsPerUser", header: "Bookings/User", render: (r) => r.bookingsPerUser?.toFixed(2) || "—" },
    { key: "revenuePerUser", header: "Revenue/User", render: (r) => formatCurrency(r.revenuePerUser) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-text-primary">Customer Lifetime Value</h1>

      <div className="grid grid-cols-5 gap-4">
        <KPICard label="Total Customers" value={isLoading ? "..." : formatNumber(data?.overview?.totalCustomers)} icon={<Users className="h-5 w-5 text-status-approved" />} color="bg-status-approved/10" />
        <KPICard label="Total Bookings" value={isLoading ? "..." : formatNumber(data?.overview?.totalBookings)} icon={<CalendarCheck className="h-5 w-5 text-status-active" />} color="bg-status-active/10" />
        <KPICard label="Avg Booking Value" value={isLoading ? "..." : formatCurrency(data?.overview?.avgBookingValue)} icon={<DollarSign className="h-5 w-5 text-status-flagged" />} color="bg-status-flagged/10" />
        <KPICard label="Total Revenue" value={isLoading ? "..." : formatCurrency(data?.overview?.totalRevenue)} icon={<DollarSign className="h-5 w-5 text-status-active" />} color="bg-status-active/10" />
        <KPICard label="Avg CLV" value={isLoading ? "..." : formatCurrency(data?.overview?.avgCLV)} icon={<DollarSign className="h-5 w-5 text-status-processing" />} color="bg-status-processing/10" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Repeat className="h-4 w-4" /> Repeat Rate</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : isError ? (
              <SectionError message="Failed to load repeat rate" onRetry={() => refetch()} />
            ) : (
              <div className="text-center">
                <p className="text-3xl font-bold text-text-primary">{data?.repeatRate?.percent?.toFixed(1) || "0"}%</p>
                <p className="text-sm text-text-secondary">of customers book more than once</p>
                <p className="mt-2 text-sm text-text-secondary">
                  Avg {data?.repeatRate?.avgBookingsPerCustomer?.toFixed(2) || "0"} bookings per customer
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Booking Distribution</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : isError ? (
              <SectionError message="Failed to load distribution" onRetry={() => refetch()} />
            ) : !data?.distribution?.length ? (
              <SectionEmpty message="No distribution data" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.distribution}
                    dataKey="count"
                    nameKey="range"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }: { name?: string; value?: number }) => `${name || ""}: ${value}`}
                  >
                    {data.distribution.map((_, idx) => (
                      <Cell key={idx} fill={DIST_COLORS[idx % DIST_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Top 20 Customers</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={topColumns}
            data={data?.topCustomers || []}
            loading={isLoading}
            error={isError ? "Failed to load customers" : null}
            emptyMessage="No customer data"
            onRetry={() => refetch()}
            keyExtractor={(r) => r.id || r.email || Math.random().toString()}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Monthly Cohorts</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={cohortColumns}
            data={data?.cohorts || []}
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
