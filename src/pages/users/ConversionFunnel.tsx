import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Eye, ShoppingCart, CreditCard, CheckCircle, TrendingUp, ArrowRight, ArrowDown, ArrowLeft, Users } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionError } from "@/components/shared/SectionError";
import { SectionEmpty } from "@/components/shared/SectionEmpty";
import api from "@/lib/axios";
import { staggerContainer, fadeIn } from "@/lib/animations";
import { formatNumber } from "@/lib/utils";

const periods = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
];

const STEPS = [
  { key: "viewed", label: "Tour Viewed", icon: Eye, color: "#3b82f6" },
  { key: "cart_added", label: "Added to Cart", icon: ShoppingCart, color: "#d97706" },
  { key: "checkout_started", label: "Checkout Started", icon: CreditCard, color: "#d45a0a" },
  { key: "booking_completed", label: "Booking Completed", icon: CheckCircle, color: "#40966e" },
];

const STEP_DATAKEY_MAP: Record<string, string> = {
  "tour.viewed": "views",
  "cart.added": "cartAdds",
  "booking.initiated": "checkouts",
  "booking.completed": "bookings",
};

const LEGEND = [
  { key: "views", label: "Views", color: "#3b82f6" },
  { key: "cartAdds", label: "Cart Adds", color: "#d97706" },
  { key: "checkouts", label: "Checkouts", color: "#d45a0a" },
  { key: "bookings", label: "Bookings", color: "#40966e" },
];

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; color: string; name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm border border-border bg-white p-3 shadow-lg">
      <p className="mb-1.5 text-xs font-medium text-text-tertiary">{label}</p>
      {payload.map((e) => (
        <div key={e.dataKey} className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color }} />
          <span className="text-text-secondary">{e.name}:</span>
          <span className="font-semibold text-text-primary">{e.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function ConversionFunnelPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("30d");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "funnel", period],
    queryFn: () => api.get(`/admin/analytics/funnel?period=${period}`).then((r) => r.data),
  });

  const funnel = data?.data?.funnel || data?.funnel || [];
  const conversionRates = data?.data?.conversionRates || data?.conversionRates;
  const rawDaily = data?.data?.dailyTrend || data?.dailyTrend || [];
  const firstUsers = funnel[0]?.users || 1;

  const dailyTrend = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();
    for (const row of rawDaily) {
      const day = row.day as string;
      if (!map.has(day)) map.set(day, { date: day, views: 0, cartAdds: 0, checkouts: 0, bookings: 0 });
      const entry = map.get(day)!;
      const dk = STEP_DATAKEY_MAP[row.name as string];
      if (dk) entry[dk] = ((entry[dk] as number) || 0) + ((row.users as number) || 0);
    }
    return Array.from(map.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [rawDaily]);

  const isLoadingValue = isLoading || false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="rounded-sm bg-white p-1.5 shadow-sm hover:ring-2 hover:ring-green-300 transition-all shrink-0">
            <ArrowLeft className="h-4 w-4 text-text-primary" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Conversion Funnel</h1>
            <p className="mt-0.5 text-sm text-text-tertiary">Track how users progress from browsing to booking</p>
          </div>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {periods.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conversion Rate KPI Cards */}
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <motion.div variants={fadeIn}><KpiCard
          label="View to Cart"
          value={isLoadingValue ? "..." : conversionRates?.viewToCart != null ? `${conversionRates.viewToCart.toFixed(1)}%` : "—"}
          icon={<ArrowRight className="h-4 w-4" />}
          accent="blue"
        /></motion.div>
        <motion.div variants={fadeIn}><KpiCard
          label="Cart to Checkout"
          value={isLoadingValue ? "..." : conversionRates?.cartToCheckout != null ? `${conversionRates.cartToCheckout.toFixed(1)}%` : "—"}
          icon={<ArrowRight className="h-4 w-4" />}
          accent="amber"
        /></motion.div>
        <motion.div variants={fadeIn}><KpiCard
          label="Checkout to Complete"
          value={isLoadingValue ? "..." : conversionRates?.checkoutToComplete != null ? `${conversionRates.checkoutToComplete.toFixed(1)}%` : "—"}
          icon={<ArrowRight className="h-4 w-4" />}
          accent="green"
        /></motion.div>
        <motion.div variants={fadeIn}><KpiCard
          label="Overall (View to Book)"
          value={isLoadingValue ? "..." : conversionRates?.overall != null ? `${conversionRates.overall.toFixed(1)}%` : "—"}
          icon={<CheckCircle className="h-4 w-4" />}
          accent="green"
        /></motion.div>
      </motion.div>

      {/* Funnel Visualization */}
      <Card className="border-l-2 border-l-green-500/60">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Users className="h-4 w-4 text-blue-600" />
            User Journey Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingValue ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : isError ? (
            <SectionError message="Failed to load funnel data" onRetry={() => refetch()} />
          ) : !funnel.length ? (
            <SectionEmpty message="No funnel data for this period" />
          ) : (
            <div className="space-y-6">
              {funnel.map((step: any, idx: number) => {
                const info = STEPS[idx];
                const Icon = info?.icon || CheckCircle;
                const pct = ((step.users || 0) / firstUsers) * 100;
                return (
                  <div key={step.step}>
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${info?.color}18` }}>
                        <Icon className="h-5 w-5" style={{ color: info?.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-text-primary">{info?.label || step.step}</p>
                          <p className="text-lg font-bold text-text-primary">{formatNumber(step.users)}</p>
                        </div>
                        <div className="mt-1.5 h-2 w-full rounded-full bg-surface-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: info?.color }} />
                        </div>
                      </div>
                      <div className="w-28 text-right shrink-0">
                        <p className="text-xs text-text-tertiary">{pct.toFixed(1)}% of top</p>
                        {idx > 0 && step.dropOff != null && (
                          <p className="mt-0.5 text-xs text-red-500 flex items-center justify-end gap-1">
                            <ArrowDown className="h-3 w-3" />
                            {step.dropOff} drop-off
                          </p>
                        )}
                      </div>
                    </div>
                    {idx < funnel.length - 1 && (
                      <div className="flex justify-center py-1">
                        <ArrowDown className="h-4 w-4 text-text-tertiary" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Trend Chart */}
      <Card className="border-l-2 border-l-green-500/60">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Daily Event Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingValue ? (
            <Skeleton className="h-72 w-full" />
          ) : isError ? (
            <SectionError message="Failed to load daily trend" onRetry={() => refetch()} />
          ) : !dailyTrend.length ? (
            <SectionEmpty message="No daily trend data for this period" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dee3e8" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8a9ba8" }} axisLine={{ stroke: "#dee3e8" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8a9ba8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#dee3e8", strokeDasharray: "3 3" }} />
                  {LEGEND.map((item) => (
                    <Line key={item.key} type="monotone" dataKey={item.key} stroke={item.color} name={item.label} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 pt-3">
                {LEGEND.map((item) => (
                  <div key={item.key} className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
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

function KpiCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent: "green" | "blue" | "amber" }) {
  const m = {
    green: { bg: "bg-gradient-to-br from-green-50 to-white", border: "border-green-200/40", ib: "bg-green-100", ic: "text-green-600" },
    blue: { bg: "bg-gradient-to-br from-blue-50 to-white", border: "border-blue-200/40", ib: "bg-blue-100", ic: "text-blue-600" },
    amber: { bg: "bg-gradient-to-br from-amber-50 to-white", border: "border-amber-200/40", ib: "bg-amber-100", ic: "text-amber-600" },
  }[accent];
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`rounded-sm border ${m.border} ${m.bg} p-3.5 shadow-2 transition-all hover:shadow-md`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-text-secondary truncate">{label}</p>
          <p className="mt-1 text-xl font-bold text-text-primary leading-tight">{value}</p>
        </div>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.ib} ${m.ic}`}>{icon}</div>
      </div>
    </motion.div>
  );
}
