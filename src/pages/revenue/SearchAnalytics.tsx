import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
} from "recharts";
import {
  Search,
  Users,
  FileX,
  Percent,
  Eye,
  ShoppingCart,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
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

interface SearchData {
  overview?: { totalSearches?: number; uniqueSearchers?: number; zeroResultSearches?: number; zeroResultRate?: number };
  conversion?: { searchToViewRate?: number; searchToBookRate?: number };
  topQueries?: Array<{ query?: string; searches?: number; uniqueUsers?: number; avgResults?: number }>;
  zeroResultQueries?: Array<{ query?: string; searches?: number }>;
  dailyTrend?: Array<{ date?: string; withResults?: number; withoutResults?: number }>;
}

const TrendBadge = ({ value, good }: { value: number; good?: boolean }) => (
  <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${good ? "text-status-active" : "text-status-rejected"}`}>
    {value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
    {Math.abs(value).toFixed(1)}%
  </span>
);

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; color: string; name: string; value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface-base p-3 shadow-lg">
      <p className="mb-2 text-xs font-medium text-text-tertiary">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-text-secondary">{entry.name}:</span>
          <span className="font-semibold text-text-primary">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

const ChartLegend = ({ payload }: { payload?: { dataKey: string; color: string; value: string }[] }) => {
  if (!payload) return null;
  return (
    <div className="flex items-center justify-center gap-6 pt-2">
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-text-secondary">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function SearchAnalyticsPage() {
  const [period, setPeriod] = useState("30d");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "search", period],
    queryFn: () => api.get<SearchData>(`/admin/analytics/search?period=${period}`).then((r) => r.data),
  });

  const overview = data?.overview;
  const conversion = data?.conversion;

  const topQueryColumns: Column<{ query?: string; searches?: number; uniqueUsers?: number; avgResults?: number }>[] = [
    { key: "query", header: "Query", render: (r) => r.query || "—" },
    { key: "searches", header: "Searches", sortable: true, render: (r) => formatNumber(r.searches) },
    { key: "uniqueUsers", header: "Unique Users", render: (r) => formatNumber(r.uniqueUsers) },
    { key: "avgResults", header: "Avg Results", render: (r) => r.avgResults?.toFixed(1) || "—" },
  ];

  const zeroResultColumns: Column<{ query?: string; searches?: number }>[] = [
    { key: "query", header: "Query", render: (r) => <span className="text-status-flagged font-medium">{r.query}</span> },
    { key: "searches", header: "Searches", render: (r) => formatNumber(r.searches) },
  ];

  const totalSearches = overview?.totalSearches ?? 0;
  const zeroRate = overview?.zeroResultRate ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Search Analytics</h1>
          <p className="mt-0.5 text-sm text-text-tertiary">Track how users search and discover tours</p>
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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard label="Total Searches" value={isLoading ? "..." : formatNumber(totalSearches)} icon={<Search className="h-5 w-5 text-status-approved" />} color="bg-status-approved/10" className="bg-gradient-to-b from-emerald-50 to-white" />
        <KPICard label="Unique Searchers" value={isLoading ? "..." : formatNumber(overview?.uniqueSearchers)} icon={<Users className="h-5 w-5 text-status-active" />} color="bg-status-active/10" className="bg-gradient-to-b from-blue-50 to-white" />
        <KPICard label="Zero-Result Searches" value={isLoading ? "..." : formatNumber(overview?.zeroResultSearches)} icon={<FileX className="h-5 w-5 text-status-flagged" />} color="bg-status-flagged/10" className="bg-gradient-to-b from-rose-50 to-white" />
        <KPICard label="Zero-Result Rate" value={isLoading ? "..." : zeroRate != null ? `${zeroRate.toFixed(1)}%` : "—"} icon={<Percent className="h-5 w-5 text-status-processing" />} color="bg-status-processing/10" className="bg-gradient-to-b from-violet-50 to-white" />
      </div>

      {/* Conversion Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-approved/10">
              <Eye className="h-5 w-5 text-status-approved" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Search-to-View Rate</p>
              <p className="text-2xl font-bold text-text-primary">{isLoading ? "..." : conversion?.searchToViewRate != null ? `${conversion.searchToViewRate.toFixed(1)}%` : "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-active/10">
              <ShoppingCart className="h-5 w-5 text-status-active" />
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Search-to-Book Rate</p>
              <p className="text-2xl font-bold text-text-primary">{isLoading ? "..." : conversion?.searchToBookRate != null ? `${conversion.searchToBookRate.toFixed(1)}%` : "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Trend Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Daily Search Trend</CardTitle>
            <p className="mt-0.5 text-xs text-text-tertiary">Searches with and without results over time</p>
          </div>
          {!!conversion?.searchToViewRate && (
            <div className="hidden items-center gap-4 text-right sm:flex">
              <div>
                <p className="text-xs text-text-tertiary">Search-to-View</p>
                <p className="font-semibold text-text-primary">{conversion.searchToViewRate.toFixed(1)}%</p>
              </div>
              <div className="h-8 w-px bg-border-muted" />
              <div>
                <p className="text-xs text-text-tertiary">Search-to-Book</p>
                <p className="font-semibold text-text-primary">{conversion?.searchToBookRate?.toFixed(1)}%</p>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : isError ? (
            <SectionError message="Failed to load daily trend" onRetry={() => refetch()} />
          ) : !data?.dailyTrend?.length ? (
            <SectionEmpty message="No daily trend data" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={data.dailyTrend}>
                <defs>
                  <linearGradient id="withResultsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16a34a" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="withoutResultsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dc2626" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#e5e7eb", strokeDasharray: "3 3" }} />
                <Legend content={<ChartLegend />} />
                <ReferenceLine y={0} stroke="#e5e7eb" />
                <Area type="monotone" dataKey="withResults" fill="url(#withResultsGrad)" stroke="none" />
                <Area type="monotone" dataKey="withoutResults" fill="url(#withoutResultsGrad)" stroke="none" />
                <Line type="monotone" dataKey="withResults" stroke="#16a34a" name="With Results" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} animationDuration={800} />
                <Line type="monotone" dataKey="withoutResults" stroke="#dc2626" name="Without Results" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} animationDuration={800} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tables Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-text-tertiary" />
              Top Queries
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={topQueryColumns}
              data={data?.topQueries || []}
              loading={isLoading}
              error={isError ? "Failed to load queries" : null}
              emptyMessage="No search query data"
              onRetry={() => refetch()}
              keyExtractor={(r) => r.query || Math.random().toString()}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileX className="h-4 w-4 text-status-flagged" />
              Zero-Result Queries
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={zeroResultColumns}
              data={data?.zeroResultQueries || []}
              loading={isLoading}
              error={isError ? "Failed to load zero-result queries" : null}
              emptyMessage="No zero-result queries found"
              onRetry={() => refetch()}
              keyExtractor={(r) => r.query || Math.random().toString()}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
