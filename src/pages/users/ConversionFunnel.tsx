import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Eye, ShoppingCart, CreditCard, CheckCircle, TrendingUp, ArrowRight, ArrowDown, ArrowLeft } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

interface FunnelData {
  funnel?: Array<{ step?: string; users?: number; dropOff?: number }>;
  conversionRates?: { viewToCart?: number; cartToCheckout?: number; checkoutToComplete?: number; overall?: number };
  dailyTrend?: Array<{ date?: string; views?: number; cartAdds?: number; checkouts?: number; bookings?: number }>;
}

const funnelIcons = [Eye, ShoppingCart, CreditCard, CheckCircle];
const funnelColors = ["#3b82f6", "#d97706", "#d45a0a", "#40966e"];
const funnelLabels = ["Views", "Cart Adds", "Checkouts", "Bookings"];

export default function ConversionFunnelPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("30d");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "funnel", period],
    queryFn: () => api.get(`/admin/analytics/funnel?period=${period}`).then((r) => r.data),
  });

  const funnel = data?.data?.funnel || data?.funnel || [];
  const conversionRates = data?.data?.conversionRates || data?.conversionRates;
  const firstUsers = funnel[0]?.users || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="rounded-sm bg-white p-1.5 shadow-sm hover:ring-2 hover:ring-green-300 transition-all">
            <ArrowLeft className="h-4 w-4 text-text-primary" />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">Conversion Funnel</h1>
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

      {/* Funnel Visualization */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold text-text-primary">Funnel Steps</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : isError ? (
            <SectionError message="Failed to load funnel data" onRetry={() => refetch()} />
          ) : !funnel.length ? (
            <SectionEmpty message="No funnel data" />
          ) : (
            <div className="space-y-3">
              {funnel.map((step: any, idx: number) => {
                const Icon = funnelIcons[idx] || CheckCircle;
                const pct = ((step.users || 0) / firstUsers) * 100;
                return (
                  <div key={step.step}>
                    <div className="flex items-center gap-4 rounded-sm border border-border bg-white p-4 shadow-sm">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full`} style={{ backgroundColor: `${funnelColors[idx]}15` }}>
                        <Icon className="h-4 w-4" style={{ color: funnelColors[idx] }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">{step.step || funnelLabels[idx]}</p>
                        <p className="text-lg font-bold text-text-primary">{formatNumber(step.users)}</p>
                      </div>
                      <div className="w-24 text-right shrink-0">
                        <p className="text-xs text-text-tertiary">{pct.toFixed(1)}% of top</p>
                        {idx > 0 && step.dropOff != null && (
                          <p className="text-xs text-status-rejected flex items-center justify-end gap-0.5">
                            <ArrowDown className="h-3 w-3" /> {step.dropOff.toFixed(1)}%
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-1 h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: funnelColors[idx] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion Rate Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="View to Cart" value={isLoading ? "..." : conversionRates?.viewToCart != null ? `${conversionRates.viewToCart.toFixed(1)}%` : "—"} icon={<ArrowRight className="h-4 w-4" />} accent="blue" />

        <KpiCard label="Cart to Checkout" value={isLoading ? "..." : conversionRates?.cartToCheckout != null ? `${conversionRates.cartToCheckout.toFixed(1)}%` : "—"} icon={<ArrowRight className="h-4 w-4" />} accent="amber" />

        <KpiCard label="Checkout to Complete" value={isLoading ? "..." : conversionRates?.checkoutToComplete != null ? `${conversionRates.checkoutToComplete.toFixed(1)}%` : "—"} icon={<ArrowRight className="h-4 w-4" />} accent="green" />

        <KpiCard label="Overall" value={isLoading ? "..." : conversionRates?.overall != null ? `${conversionRates.overall.toFixed(1)}%` : "—"} icon={<CheckCircle className="h-4 w-4" />} accent="green" />
      </div>

      {/* Daily Trend */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary"><TrendingUp className="h-4 w-4 text-green-600" /> Daily Event Trend</CardTitle></CardHeader>
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
                <defs>
                  {funnelColors.map((color, i) => (
                    <linearGradient key={i} id={`lineGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={1} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.15} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#dee3e8" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8a9ba8" }} axisLine={{ stroke: "#dee3e8" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8a9ba8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 4, border: "1px solid #dee3e8", fontSize: 12 }}
                  formatter={(value: any) => [formatNumber(Number(value))]}
                />
                <Legend formatter={(value) => <span className="text-xs font-medium text-text-secondary">{value}</span>} />
                <Line type="monotone" dataKey="views" stroke={funnelColors[0]} name="Views" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cartAdds" stroke={funnelColors[1]} name="Cart Adds" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="checkouts" stroke={funnelColors[2]} name="Checkouts" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="bookings" stroke={funnelColors[3]} name="Bookings" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
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
    <div className={`rounded-sm border ${a.border} ${a.bg} p-3.5 shadow-2 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-text-secondary truncate">{label}</p>
          <p className="mt-1 text-lg font-bold text-text-primary leading-tight">{value}</p>
        </div>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${a.iconBg} ${a.iconColor}`}>{icon}</div>
      </div>
    </div>
  );
}
