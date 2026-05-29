import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  ArrowLeft,
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
  const navigate = useNavigate();
  const [period, setPeriod] = useState("30d");

  const { data: raw, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "search", period],
    queryFn: async () => {
      const res = await api.get(`/admin/analytics/search?period=${period}`);
      const d = res.data.data;
      return {
        overview: d.overview as { totalSearches: number; uniqueSearchers: number; zeroResultSearches: number; zeroResultRate: number },
        conversion: d.searchOutcome as { searchToViewRate: number; searchToBookRate: number },
        topQueries: (d.topQueries || []).map((q: Record<string, unknown>) => ({
          query: q.query as string,
          searches: q.searches as number,
          uniqueUsers: q.uniqueUsers as number,
          avgResults: q.avgResults as number,
        })),
        zeroResultQueries: (d.zeroResultQueries || []).map((q: Record<string, unknown>) => ({
          query: q.query as string,
          searches: q.searches as number,
        })),
        dailyTrend: (d.dailyTrend || []).map((t: Record<string, unknown>) => ({
          date: t.day as string,
          withResults: t.searchesWithResults as number,
          withoutResults: ((t.searches as number) - (t.searchesWithResults as number)),
        })),
      };
    },
  });

  const overview = raw?.overview;
  const conversion = raw?.conversion;
  const totalSearches = overview?.totalSearches ?? 0;
  const zeroRate = overview?.zeroResultRate ?? 0;

  const topQueryColumns: Column<{ query?: string; searches?: number; uniqueUsers?: number; avgResults?: number }>[] = [
    { key: "query", header: "Query", render: (r) => r.query || "—" },
    { key: "searches", header: "Searches", sortable: true, render: (r) => formatNumber(r.searches) },
    { key: "uniqueUsers", header: "Unique Users", render: (r) => formatNumber(r.uniqueUsers) },
    { key: "avgResults", header: "Avg Results", render: (r) => r.avgResults != null ? r.avgResults.toFixed(1) : "—" },
  ];

  const zeroResultColumns: Column<{ query?: string; searches?: number }>[] = [
    { key: "query", header: "Query", render: (r) => <span className="text-status-flagged font-medium">{r.query}</span> },
    { key: "searches", header: "Searches", render: (r) => formatNumber(r.searches) },
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
            <h1 className="text-xl font-semibold text-text-primary">Search Analytics</h1>
            <p className="mt-0.5 text-sm text-text-tertiary">Track how users search and discover tours</p>
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

      {/* KPI Cards — Overview page style */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Total Searches"
          value={isLoading ? "..." : formatNumber(totalSearches)}
          icon={<Search className="h-4 w-4" />}
          accent="green"
        />
        <KpiCard
          label="Unique Searchers"
          value={isLoading ? "..." : formatNumber(overview?.uniqueSearchers)}
          icon={<Users className="h-4 w-4" />}
          accent="blue"
        />
        <KpiCard
          label="Zero-Result Searches"
          value={isLoading ? "..." : formatNumber(overview?.zeroResultSearches)}
          icon={<FileX className="h-4 w-4" />}
          accent="amber"
        />
        <KpiCard
          label="Zero-Result Rate"
          value={isLoading ? "..." : zeroRate != null ? `${zeroRate.toFixed(1)}%` : "—"}
          icon={<Percent className="h-4 w-4" />}
          accent="amber"
        />
      </div>

      {/* Conversion Cards — same style */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
        <KpiCard
          label="Search-to-View Rate"
          value={isLoading ? "..." : conversion?.searchToViewRate != null ? `${conversion.searchToViewRate.toFixed(1)}%` : "—"}
          icon={<Eye className="h-4 w-4" />}
          accent="green"
        />
        <KpiCard
          label="Search-to-Book Rate"
          value={isLoading ? "..." : conversion?.searchToBookRate != null ? `${conversion.searchToBookRate.toFixed(1)}%` : "—"}
          icon={<ShoppingCart className="h-4 w-4" />}
          accent="blue"
        />
      </div>

      {/* Daily Trend Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Daily Search Trend
          </CardTitle>
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
          ) : !raw?.dailyTrend?.length ? (
            <SectionEmpty message="No daily trend data" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={raw.dailyTrend}>
                <defs>
                  <linearGradient id="withResultsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#40966e" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#40966e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="withoutResultsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d92626" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#d92626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#dee3e8" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8a9ba8" }} tickLine={false} axisLine={{ stroke: "#dee3e8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#8a9ba8" }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#dee3e8", strokeDasharray: "3 3" }} />
                <Legend content={<ChartLegend />} />
                <ReferenceLine y={0} stroke="#dee3e8" />
                <Area key="area-withResults" type="monotone" dataKey="withResults" fill="url(#withResultsGrad)" stroke="none" />
                <Area key="area-withoutResults" type="monotone" dataKey="withoutResults" fill="url(#withoutResultsGrad)" stroke="none" />
                <Line key="line-withResults" type="monotone" dataKey="withResults" stroke="#40966e" name="With Results" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} animationDuration={800} />
                <Line key="line-withoutResults" type="monotone" dataKey="withoutResults" stroke="#d92626" name="Without Results" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} animationDuration={800} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tables Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Top Queries
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={topQueryColumns}
              data={raw?.topQueries || []}
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
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <FileX className="h-4 w-4 text-amber-500" />
              Zero-Result Queries
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={zeroResultColumns}
              data={raw?.zeroResultQueries || []}
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

/* ── Matching KPI Card from Overview page ── */

function KpiCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "green" | "blue" | "amber";
}) {
  const accentMap = {
    green: {
      bg: "bg-gradient-to-br from-green-50 to-white",
      border: "border-green-200/40",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    blue: {
      bg: "bg-gradient-to-br from-blue-50 to-white",
      border: "border-blue-200/40",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    amber: {
      bg: "bg-gradient-to-br from-amber-50 to-white",
      border: "border-amber-200/40",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
  };

  const a = accentMap[accent];

  return (
    <div className={`rounded-sm border ${a.border} ${a.bg} p-3.5 shadow-2 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-text-secondary truncate">{label}</p>
          <p className="mt-1 text-lg font-bold text-text-primary leading-tight">{value}</p>
        </div>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${a.iconBg} ${a.iconColor}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
