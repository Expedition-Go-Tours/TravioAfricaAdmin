import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Users, UserPlus, ArrowLeft, Activity, X, Mail, Shield } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionError } from "@/components/shared/SectionError";
import { SectionEmpty } from "@/components/shared/SectionEmpty";
import api from "@/lib/axios";
import { staggerContainer, fadeIn } from "@/lib/animations";
import { formatNumber, formatDate } from "@/lib/utils";
import OptimizedImage from "@/components/shared/OptimizedImage";

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

  const growth = useMemo(() => data?.data?.growth || [], [data]);

  const { totals, latestMonth, avgMonthly, momChange, customerMom, supplierMom } = useMemo(() => {
    if (!growth.length) return { totals: { customers: 0, suppliers: 0, total: 0 }, latestMonth: null, avgMonthly: 0, momChange: null, customerMom: null, supplierMom: null };

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
    const cap = (v: number | null) => v != null ? Math.sign(v) * Math.min(Math.abs(v), 100) : null;
    const mom = cap(prev && prev.total > 0 ? ((lm.total - prev.total) / prev.total) * 100 : null);
    const custMom = cap(prev && prev.customers > 0 ? ((lm.customers - prev.customers) / prev.customers) * 100 : null);
    const suppMom = cap(prev && prev.suppliers > 0 ? ((lm.suppliers - prev.suppliers) / prev.suppliers) * 100 : null);

    return { totals, latestMonth: lm, avgMonthly: Math.round(totals.total / growth.length), momChange: mom, customerMom: custMom, supplierMom: suppMom };
  }, [growth]);



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
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <motion.div variants={fadeIn}><KpiCard
          label="Total New Users"
          value={isLoading ? "..." : formatNumber(totals.total)}
          icon={<Users className="h-4 w-4" />}
          accent="green"
          trend={momChange}
          subtitle={latestMonth ? `${formatNumber(latestMonth.total)} this month` : undefined}
          onClick={() => setDialog({ type: "all" })}
        /></motion.div>
        <motion.div variants={fadeIn}><KpiCard
          label="New Customers"
          value={isLoading ? "..." : formatNumber(totals.customers)}
          icon={<UserPlus className="h-4 w-4" />}
          accent="blue"
          trend={customerMom}
          subtitle={latestMonth ? `${formatNumber(latestMonth.customers)} this month` : undefined}
          onClick={() => setDialog({ type: "customer" })}
        /></motion.div>
        <motion.div variants={fadeIn}><KpiCard
          label="New Suppliers"
          value={isLoading ? "..." : formatNumber(totals.suppliers)}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="amber"
          trend={supplierMom}
          subtitle={latestMonth ? `${formatNumber(latestMonth.suppliers)} this month` : undefined}
          onClick={() => setDialog({ type: "supplier" })}
        /></motion.div>
        <motion.div variants={fadeIn}><KpiCard
          label="Avg / Month"
          value={isLoading ? "..." : formatNumber(avgMonthly)}
          icon={<Activity className="h-4 w-4" />}
          accent="green"
          subtitle={growth.length ? `over ${growth.length} months` : undefined}
        /></motion.div>
      </motion.div>

      {/* Chart */}
      <Card className="border-l-2 border-l-green-500/60">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
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

      {/* User List Dialog */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDialog(null)}>
          <div className="w-full max-w-lg rounded-sm border border-border bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border-muted bg-gradient-to-r from-blue-50 to-white px-5 py-3.5 border-l-2 border-l-blue-500">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-blue-800">
                    {dialog.type === "all" ? "New Users" : dialog.type === "customer" ? "New Customers" : "New Suppliers"}
                  </h2>
                  <p className="text-xs text-text-tertiary">{dialogUsers?.length || 0} users</p>
                </div>
              </div>
              <button onClick={() => setDialog(null)} className="rounded-sm p-1 text-text-tertiary hover:bg-surface-muted hover:text-text-primary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {dialogLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !dialogUsers?.length ? (
                <div className="py-10 text-center text-sm text-text-tertiary">No users found for this period</div>
              ) : (
                <div className="divide-y divide-border-muted">
                  {dialogUsers.map((u) => (
                    <div key={u.id} className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-blue-50/30">
                      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-xs font-bold text-white mt-0.5">
                        <span>{(u.name || u.email || "?").charAt(0).toUpperCase()}</span>
                        {u.photoURL && (
                          <OptimizedImage
                            src={u.photoURL}
                            alt={u.name || ""}
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 h-full w-full object-cover"
                            width={36}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{u.name || "Unknown"}</p>
                        <p className="text-xs text-text-tertiary truncate mt-0.5 flex items-center gap-1">
                          <Mail className="h-3 w-3 shrink-0" />
                          {u.email || "—"}
                        </p>
                        {u.roles && u.roles.length > 0 && (
                          <p className="text-xs text-text-tertiary truncate mt-0.5 flex items-center gap-1">
                            <Shield className="h-3 w-3 shrink-0" />
                            {u.roles.join(", ")}
                          </p>
                        )}
                      </div>
                      {u.createdAt && (
                        <span className="shrink-0 text-xs text-text-tertiary whitespace-nowrap pt-0.5">{formatDate(u.createdAt)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  accent,
  trend,
  subtitle,
  onClick,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "green" | "blue" | "amber";
  trend?: number | null;
  subtitle?: string;
  onClick?: () => void;
}) {
  const m = {
    green: { l: "border-l-green-500", bg: "bg-gradient-to-br from-green-50 to-white", ib: "bg-green-100", ic: "text-green-600" },
    blue: { l: "border-l-blue-500", bg: "bg-gradient-to-br from-blue-50 to-white", ib: "bg-blue-100", ic: "text-blue-600" },
    amber: { l: "border-l-amber-500", bg: "bg-gradient-to-br from-amber-50 to-white", ib: "bg-amber-100", ic: "text-amber-600" },
  }[accent];
  const isPos = trend != null && trend >= 0;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`rounded-sm border border-border-muted border-l-[3px] ${m.l} ${m.bg} p-4 shadow-2 transition-all hover:shadow-md ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick(); } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-text-secondary truncate">{label}</p>
          <p className="mt-1 text-xl font-bold text-text-primary leading-tight">{value}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {trend != null && (
              <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPos ? "text-green-600" : "text-red-500"}`}>
                {isPos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {isPos ? "+" : ""}{trend.toFixed(1)}%
              </span>
            )}
            {subtitle && (
              <span className="text-[10px] text-text-tertiary">{subtitle}</span>
            )}
          </div>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${m.ib} ${m.ic} mt-0.5`}>{icon}</div>
      </div>
    </motion.div>
  );
}
