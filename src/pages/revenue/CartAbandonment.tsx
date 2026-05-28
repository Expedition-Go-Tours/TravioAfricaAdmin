import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ShoppingCart, TrendingDown, Percent } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KPICard } from "@/components/shared/KPICard";
import { DataTable } from "@/components/shared/DataTable";
import type { Column } from "@/components/shared/DataTable";
import { SectionError } from "@/components/shared/SectionError";
import { SectionEmpty } from "@/components/shared/SectionEmpty";
import api from "@/lib/axios";
import { formatNumber } from "@/lib/utils";

const periods = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
];

interface CartData {
  overview?: { cartsCreated?: number; cartsConverted?: number; abandonmentRate?: number };
  byTour?: Array<{ tourName?: string; cartsAdded?: number; converted?: number; abandonmentRate?: number }>;
  dailyTrend?: Array<{ date?: string; carts?: number; conversions?: number; abandonmentRate?: number }>;
}

export default function CartAbandonmentPage() {
  const [period, setPeriod] = useState("30d");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "cart-abandonment", period],
    queryFn: () => api.get<CartData>(`/admin/analytics/cart-abandonment?period=${period}`).then((r) => r.data),
  });

  const byTourColumns: Column<{ tourName?: string; cartsAdded?: number; converted?: number; abandonmentRate?: number }>[] = [
    { key: "tourName", header: "Tour Name", render: (r) => r.tourName || "—" },
    { key: "cartsAdded", header: "Carts Added", sortable: true, render: (r) => formatNumber(r.cartsAdded) },
    { key: "converted", header: "Converted", sortable: true, render: (r) => formatNumber(r.converted) },
    { key: "abandonmentRate", header: "Abandonment Rate", sortable: true, render: (r) => r.abandonmentRate != null ? `${r.abandonmentRate.toFixed(1)}%` : "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">Cart Abandonment</h1>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periods.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-3 gap-4">
        <KPICard label="Carts Created" value={isLoading ? "..." : formatNumber(data?.overview?.cartsCreated)} icon={<ShoppingCart className="h-5 w-5 text-status-approved" />} color="bg-status-approved/10" />
        <KPICard label="Carts Converted" value={isLoading ? "..." : formatNumber(data?.overview?.cartsConverted)} icon={<ShoppingCart className="h-5 w-5 text-status-active" />} color="bg-status-active/10" />
        <KPICard label="Abandonment Rate" value={isLoading ? "..." : data?.overview?.abandonmentRate != null ? `${data.overview.abandonmentRate.toFixed(1)}%` : "—"} icon={<TrendingDown className="h-5 w-5 text-status-rejected" />} color="bg-status-rejected/10" />
      </div>

      {/* By Tour Table */}
      <Card>
        <CardHeader><CardTitle>Abandonment by Tour</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={byTourColumns}
            data={data?.byTour || []}
            loading={isLoading}
            error={isError ? "Failed to load tour data" : null}
            emptyMessage="No tour abandonment data"
            onRetry={() => refetch()}
            keyExtractor={(r) => r.tourName || Math.random().toString()}
          />
        </CardContent>
      </Card>

      {/* Daily Trend */}
      <Card>
        <CardHeader><CardTitle>Daily Trend</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : isError ? (
            <SectionError message="Failed to load daily trend" onRetry={() => refetch()} />
          ) : !data?.dailyTrend?.length ? (
            <SectionEmpty message="No daily trend data" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dee3e8" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="carts" stroke="#d97706" name="Carts" strokeWidth={2} />
                <Line type="monotone" dataKey="conversions" stroke="#40966e" name="Conversions" strokeWidth={2} />
                <Line type="monotone" dataKey="abandonmentRate" stroke="#d92626" name="Abandonment Rate %" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
