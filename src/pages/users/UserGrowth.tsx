import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingUp, Users, UserPlus, ArrowLeft, Calendar, Activity, X, Mail, Shield, Clock } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionError } from "@/components/shared/SectionError";
import { SectionEmpty } from "@/components/shared/SectionEmpty";
import api from "@/lib/axios";
import { formatNumber, formatDate } from "@/lib/utils";

const periods = [
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; fill: string; name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm border border-border bg-white p-3 shadow-lg">
      <p className="mb-2 text-xs font-medium text-text-tertiary">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
          <span className="text-text-secondary">{entry.name}:</span>
          <span className="font-semibold text-text-primary">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function formatMonth(v: unknown) {
  if (typeof v !== "string") return String(v ?? "");
  const d = new Date(v + "-02");
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default function UserGrowthPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("1y");
  const [dialog, setDialog] = useState<{ type: "all" | "customer" | "supplier" } | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "user-growth", period],
    queryFn: () => api.get(`/admin/analytics/user-growth?period=${period}`).then((r) => r.data),
  });

  const { data: dialogUsers, isLoading: dialogLoading } = useQuery({
    queryKey: ["admin", "users", "new", period, dialog?.type],
    queryFn: async () => {
      const role = dialog?.type === "all" ? undefined : dialog?.type;
      const res = await api.get(`/admin/users/new?period=${period}${role ? `&role=${role}` : ""}`);
      return (res.data?.data?.users || []) as Array<{ id: string; name: string; email: string; photoURL?: string; roles?: string[]; createdAt?: string }>;
    },
    enabled: !!dialog,
  });

  const growth = data?.data?.growth || [];

  const { totals, latestMonth, avgMonthly, momChange } = useMemo(() => {
    if (!growth.length) return { totals: { customers: 0, suppliers: 0, total: 0 }, latestMonth: null, avgMonthly: 0, momChange: null };

    const totals = growth.reduce(
      (acc: { customers: number; suppliers: number; total: number }, curr: { customers?: number; suppliers?: number; total?: number }) => ({
        customers: acc.customers + (curr.customers || 0),
        suppliers: acc.suppliers + (curr.suppliers || 0),
        total: acc.total + (curr.total || 0),
      }),
      { customers: 0, suppliers: 0, total: 0 },
    );

    const lm = growth[growth.length - 1];
    const prev = growth.length > 1 ? growth[growth.length - 2] : null;
    const mom = prev && prev.total > 0 ? ((lm.total - prev.total) / prev.total) * 100 : null;

    return { totals, latestMonth: lm, avgMonthly: Math.round(totals.total / growth.length), momChange: mom };
  }, [growth]);

  const latestLabel = latestMonth?.month
    ? new Date(latestMonth.month + "-02").toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="rounded-sm bg-white p-1.5 shadow-sm hover:ring-2 hover:ring-green-300 transition-all shrink-0">
            <ArrowLeft className="h-4 w-4 text-text-primary" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">User Growth</h1>
            <p className="mt-0.5 text-sm text-text-tertiary">Monthly new user registrations and growth trends</p>
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
          label="Total New Users"
          value={isLoading ? "..." : formatNumber(totals.total)}
          icon={<Users className="h-4 w-4" />}
          accent="green"
          onClick={() => setDialog({ type: "all" })}
        />
        <KpiCard
          label="New Customers"
          value={isLoading ? "..." : formatNumber(totals.customers)}
          icon={<UserPlus className="h-4 w-4" />}
          accent="blue"
          onClick={() => setDialog({ type: "customer" })}
        />
        <KpiCard
          label="New Suppliers"
          value={isLoading ? "..." : formatNumber(totals.suppliers)}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="amber"
          onClick={() => setDialog({ type: "supplier" })}
        />
        <KpiCard
          label="Avg / Month"
          value={isLoading ? "..." : formatNumber(avgMonthly)}
          icon={<Activity className="h-4 w-4" />}
          accent="green"
        />
      </div>

      {/* Latest Month + MoM */}
      {latestMonth && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1 rounded-sm border border-blue-200/40 bg-gradient-to-br from-blue-50 to-white p-3.5 shadow-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-text-secondary">Latest Month</span>
            </div>
            <p className="mt-1.5 text-sm font-bold text-text-primary">{latestLabel}</p>
            <div className="mt-2 flex items-center gap-3 text-xs text-text-secondary">
              <span>{formatNumber(latestMonth.customers)} customers</span>
              <span className="h-3 w-px bg-border-muted" />
              <span>{formatNumber(latestMonth.suppliers)} suppliers</span>
              <span className="h-3 w-px bg-border-muted" />
              <span>{formatNumber(latestMonth.total)} total</span>
            </div>
          </div>
          <div className="col-span-2 md:col-span-1 rounded-sm border border-green-200/40 bg-gradient-to-br from-green-50 to-white p-3.5 shadow-2">
            <div className="flex items-center gap-2">
              <TrendingUp className={`h-4 w-4 ${momChange != null && momChange >= 0 ? "text-green-600" : "text-red-500"}`} />
              <span className="text-xs font-medium text-text-secondary">Month-over-Month</span>
            </div>
            <p className={`mt-1.5 text-lg font-bold ${momChange != null && momChange >= 0 ? "text-green-700" : "text-red-600"}`}>
              {momChange != null ? `${momChange >= 0 ? "+" : ""}${momChange.toFixed(1)}%` : "—"}
            </p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              {momChange != null ? `${momChange >= 0 ? "Increase" : "Decrease"} from previous month` : "First month in period"}
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Monthly Registrations
          </CardTitle>
          {totals.total > 0 && (
            <span className="text-xs text-text-tertiary">Total: {formatNumber(totals.total)} users</span>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : isError ? (
            <SectionError message="Failed to load user growth data" onRetry={() => refetch()} />
          ) : !growth.length ? (
            <SectionEmpty message="No user growth data for this period" />
          ) : (
            <><ResponsiveContainer width="100%" height={400}>
              <BarChart data={growth} barGap={2} barCategoryGap="16%">
                <defs>
                  <linearGradient id="uc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.25} />
                  </linearGradient>
                  <linearGradient id="us" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d97706" stopOpacity={1} />
                    <stop offset="100%" stopColor="#d97706" stopOpacity={0.25} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#dee3e8" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonth}
                  tick={{ fontSize: 12, fill: "#8a9ba8" }}
                  axisLine={{ stroke: "#dee3e8" }}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 12, fill: "#8a9ba8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f0f2f4" }} labelFormatter={formatMonth} />
                <ReferenceLine y={0} stroke="#dee3e8" />
                <Bar dataKey="customers" fill="url(#uc)" name="Customers" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="suppliers" fill="url(#us)" name="Suppliers" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#3b82f6" }} />
                Customers
              </div>
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#d97706" }} />
                Suppliers
              </div>
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, icon, accent, onClick }: { label: string; value: string; icon: React.ReactNode; accent: "green" | "blue" | "amber"; onClick?: () => void }) {
  const m = {
    green: { bg: "bg-gradient-to-br from-green-50 to-white", border: "border-green-200/40", ib: "bg-green-100", ic: "text-green-600" },
    blue: { bg: "bg-gradient-to-br from-blue-50 to-white", border: "border-blue-200/40", ib: "bg-blue-100", ic: "text-blue-600" },
    amber: { bg: "bg-gradient-to-br from-amber-50 to-white", border: "border-amber-200/40", ib: "bg-amber-100", ic: "text-amber-600" },
  }[accent];
  return (
    <div
      className={`rounded-sm border ${m.border} ${m.bg} p-3.5 shadow-2 transition-all hover:shadow-md ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick(); } : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-text-secondary truncate">{label}</p>
          <p className="mt-1 text-lg font-bold text-text-primary leading-tight">{value}</p>
        </div>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.ib} ${m.ic}`}>{icon}</div>
      </div>
    </div>
  );
}
