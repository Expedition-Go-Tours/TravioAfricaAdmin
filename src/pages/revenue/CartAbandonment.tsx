import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { ShoppingCart, TrendingDown, Percent, ArrowLeft } from "lucide-react";
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

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; color: string; name: string; value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm border border-border bg-white p-3 shadow-lg">
      <p className="mb-1 text-xs font-medium text-text-primary">{label}</p>
      <div className="space-y-0.5">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-text-secondary">{entry.name}:</span>
            <span className="font-semibold text-text-primary">
              {entry.dataKey === "abandonmentRate" ? `${entry.value.toFixed(1)}%` : formatNumber(entry.value)}
            </span>
          </div>
        ))}
      </div>
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

  const byTourColumns: Column<{ tourTitle?: string; cartsAdded?: number; converted?: number; abandonmentRate?: number }>[] = [
    { key: "tourTitle", header: "Tour Name", render: (r) => r.tourTitle || "—" },
    { key: "cartsAdded", header: "Carts Added", sortable: true, render: (r) => <span className="font-semibold text-text-primary">{formatNumber(r.cartsAdded)}</span> },
    { key: "converted", header: "Converted", sortable: true, render: (r) => <span className="font-semibold text-green-700">{formatNumber(r.converted)}</span> },
    { key: "abandonmentRate", header: "Abandonment Rate", sortable: true, render: (r) => r.abandonmentRate != null ? <span className="font-semibold text-amber-600">{r.abandonmentRate.toFixed(1)}%</span> : "—" },
  ];

  const overview = data?.data?.overview || data?.overview;
  const dailyTrend = data?.data?.dailyTrend || data?.dailyTrend || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="rounded-sm bg-white p-1.5 shadow-sm hover:ring-2 hover:ring-green-300 transition-all">
            <ArrowLeft className="h-4 w-4 text-text-primary" />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">Cart Abandonment</h1>
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-sm border border-amber-200/40 bg-gradient-to-br from-amber-50 to-white p-4 shadow-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-secondary font-medium">Carts Created</p>
            <ShoppingCart className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-700">{isLoading ? "..." : formatNumber(overview?.cartsCreated)}</p>
        </div>
        <div className="rounded-sm border border-green-200/40 bg-gradient-to-br from-green-50 to-white p-4 shadow-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-secondary font-medium">Carts Converted</p>
            <ShoppingCart className="h-4 w-4 text-green-600" />
          </div>
          <p className="mt-1 text-2xl font-bold text-green-700">{isLoading ? "..." : formatNumber(overview?.cartsConverted)}</p>
        </div>
        <div className="rounded-sm border border-blue-200/40 bg-gradient-to-br from-blue-50 to-white p-4 shadow-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-secondary font-medium">Abandonment Rate</p>
            <Percent className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-1 text-2xl font-bold text-blue-700">
            {isLoading ? "..." : overview?.abandonmentRate != null ? `${overview.abandonmentRate.toFixed(1)}%` : "—"}
          </p>
        </div>
      </div>

      {/* By Tour Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-text-primary">Abandonment by Tour</CardTitle>
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
          <CardTitle className="text-sm font-semibold text-text-primary">Daily Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : isError ? (
            <SectionError message="Failed to load daily trend" onRetry={() => refetch()} />
          ) : !dailyTrend.length ? (
            <SectionEmpty message="No daily trend data" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="cartsAdded" stroke="#d97706" name="Carts" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="converted" stroke="#40966e" name="Conversions" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="abandonmentRate" stroke="#3b82f6" name="Abandonment Rate %" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
              <div className="flex justify-center gap-6 mt-2">
                {legendPayload.map((entry) => (
                  <div key={entry.value} className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    {entry.value}
                  </div>
                ))}
              </div>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
