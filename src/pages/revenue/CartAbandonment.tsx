import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { ShoppingCart, TrendingDown, Percent, ArrowLeft, X } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  byTour?: Array<{ tourTitle?: string; cartsAdded?: number; converted?: number; abandonmentRate?: number }>;
  dailyTrend?: Array<{ day?: string; cartsAdded?: number; converted?: number; abandonmentRate?: number }>;
}

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; color: string; name: string; value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface-base p-3 shadow-lg">
      <p className="mb-2 text-xs font-medium text-text-tertiary">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-text-secondary">{entry.name}:</span>
          <span className="font-semibold text-text-primary">
            {entry.dataKey === "abandonmentRate" ? `${entry.value.toFixed(1)}%` : formatNumber(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const legendPayload = [
  { value: "Carts", color: "#d97706" },
  { value: "Conversions", color: "#40966e" },
  { value: "Abandonment Rate %", color: "#3b82f6" },
];

export default function CartAbandonmentPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("30d");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "cart-abandonment", period],
    queryFn: () => api.get(`/admin/analytics/cart-abandonment?period=${period}`).then((r) => r.data),
  });

  const overview = data?.data?.overview || data?.overview;
  const dailyTrend = data?.data?.dailyTrend || data?.dailyTrend || [];
  const cartsAbandoned = overview ? (overview.cartsCreated || 0) - (overview.cartsConverted || 0) : 0;

  const byTourColumns: Column<{ tourTitle?: string; cartsAdded?: number; converted?: number; abandonmentRate?: number }>[] = [
    { key: "tourTitle", header: "Tour Name", render: (r) => r.tourTitle || "—" },
    { key: "cartsAdded", header: "Carts Added", sortable: true, render: (r) => <span className="font-semibold text-text-primary">{formatNumber(r.cartsAdded)}</span> },
    { key: "converted", header: "Converted", sortable: true, render: (r) => <span className="font-semibold text-green-700">{formatNumber(r.converted)}</span> },
    { key: "abandonmentRate", header: "Abandonment Rate", sortable: true, render: (r) => r.abandonmentRate != null ? <span className="font-semibold text-amber-600">{r.abandonmentRate.toFixed(1)}%</span> : "—" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="rounded-sm bg-white p-1.5 shadow-sm hover:ring-2 hover:ring-green-300 transition-all shrink-0">
            <ArrowLeft className="h-4 w-4 text-text-primary" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Cart Abandonment</h1>
            <p className="mt-0.5 text-sm text-text-tertiary">Monitor how many carts are abandoned before checkout</p>
          </div>
        </div>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Carts Created"
          value={isLoading ? "..." : formatNumber(overview?.cartsCreated)}
          icon={<ShoppingCart className="h-4 w-4" />}
          accent="amber"
        />
        <KpiCard
          label="Carts Abandoned"
          value={isLoading ? "..." : formatNumber(cartsAbandoned)}
          icon={<X className="h-4 w-4" />}
          accent="red"
        />
        <KpiCard
          label="Carts Converted"
          value={isLoading ? "..." : formatNumber(overview?.cartsConverted)}
          icon={<ShoppingCart className="h-4 w-4" />}
          accent="green"
        />
        <KpiCard
          label="Abandonment Rate"
          value={isLoading ? "..." : overview?.abandonmentRate != null ? `${overview.abandonmentRate.toFixed(1)}%` : "—"}
          icon={<Percent className="h-4 w-4" />}
          accent="blue"
        />
      </div>

      {/* By Tour Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <TrendingDown className="h-4 w-4 text-amber-500" />
              Abandonment by Tour
            </CardTitle>
            <span className="text-xs text-text-tertiary">Tours with highest cart abandonment</span>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={byTourColumns}
            data={data?.data?.byTour || data?.byTour || []}
            loading={isLoading}
            error={isError ? "Failed to load tour data" : null}
            emptyMessage="No tour abandonment data"
            onRetry={() => refetch()}
            keyExtractor={(r) => r.tourTitle || Math.random().toString()}
          />
        </CardContent>
      </Card>

      {/* Daily Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <TrendingDown className="h-4 w-4 text-amber-500" />
            Daily Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : isError ? (
            <SectionError message="Failed to load daily trend" onRetry={() => refetch()} />
          ) : !dailyTrend.length ? (
            <SectionEmpty message="No daily trend data" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dee3e8" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#8a9ba8" }} axisLine={{ stroke: "#dee3e8" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8a9ba8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#dee3e8", strokeDasharray: "3 3" }} />
                  <Line type="monotone" dataKey="cartsAdded" stroke="#d97706" name="Carts" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="converted" stroke="#40966e" name="Conversions" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="abandonmentRate" stroke="#3b82f6" name="Abandonment Rate %" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 pt-3">
                {legendPayload.map((entry) => (
                  <div key={entry.value} className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    {entry.value}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "green" | "blue" | "amber" | "red";
}) {
  const m = {
    green: { l: "border-l-green-500", bg: "bg-gradient-to-br from-green-50 to-white", ib: "bg-green-100", ic: "text-green-600" },
    blue: { l: "border-l-blue-500", bg: "bg-gradient-to-br from-blue-50 to-white", ib: "bg-blue-100", ic: "text-blue-600" },
    amber: { l: "border-l-amber-500", bg: "bg-gradient-to-br from-amber-50 to-white", ib: "bg-amber-100", ic: "text-amber-600" },
    red: { l: "border-l-red-500", bg: "bg-gradient-to-br from-red-50 to-white", ib: "bg-red-100", ic: "text-red-600" },
  }[accent];
  return (
    <div className={`rounded-sm border border-border-muted border-l-[3px] ${m.l} ${m.bg} p-4 shadow-2 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-text-secondary truncate">{label}</p>
          <p className="mt-1 text-xl font-bold text-text-primary leading-tight">{value}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${m.ib} ${m.ic} mt-0.5`}>{icon}</div>
      </div>
    </div>
  );
}
