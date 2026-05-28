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
import { Eye, ShoppingCart, CreditCard, CheckCircle, TrendingUp } from "lucide-react";
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

export default function ConversionFunnelPage() {
  const [period, setPeriod] = useState("30d");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "funnel", period],
    queryFn: () => api.get<FunnelData>(`/admin/analytics/funnel?period=${period}`).then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">Conversion Funnel</h1>
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
        <CardHeader><CardTitle>Funnel Steps</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : isError ? (
            <SectionError message="Failed to load funnel data" onRetry={() => refetch()} />
          ) : !data?.funnel?.length ? (
            <SectionEmpty message="No funnel data" />
          ) : (
            <div className="space-y-3">
              {data.funnel.map((step, idx) => {
                const Icon = funnelIcons[idx] || CheckCircle;
                return (
                  <div
                    key={step.step}
                    className="flex items-center gap-4 rounded-sm border border-border p-4"
                    style={{ borderLeftColor: funnelColors[idx], borderLeftWidth: 4 }}
                  >
                    <Icon className="h-5 w-5" style={{ color: funnelColors[idx] }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">{step.step}</p>
                      <p className="text-2xl font-bold text-text-primary">{formatNumber(step.users)}</p>
                    </div>
                    {idx > 0 && (
                      <div className="text-right">
                        <p className="text-sm text-status-rejected">{step.dropOff?.toFixed(1)}% drop-off</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion Rate Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard label="View to Cart" value={isLoading ? "..." : data?.conversionRates?.viewToCart != null ? `${data.conversionRates.viewToCart.toFixed(1)}%` : "—"} icon={<TrendingUp className="h-5 w-5 text-status-approved" />} color="bg-status-approved/10" />
        <KPICard label="Cart to Checkout" value={isLoading ? "..." : data?.conversionRates?.cartToCheckout != null ? `${data.conversionRates.cartToCheckout.toFixed(1)}%` : "—"} icon={<TrendingUp className="h-5 w-5 text-status-flagged" />} color="bg-status-flagged/10" />
        <KPICard label="Checkout to Complete" value={isLoading ? "..." : data?.conversionRates?.checkoutToComplete != null ? `${data.conversionRates.checkoutToComplete.toFixed(1)}%` : "—"} icon={<TrendingUp className="h-5 w-5 text-status-active" />} color="bg-status-active/10" />
        <KPICard label="Overall" value={isLoading ? "..." : data?.conversionRates?.overall != null ? `${data.conversionRates.overall.toFixed(1)}%` : "—"} icon={<TrendingUp className="h-5 w-5 text-status-processing" />} color="bg-status-processing/10" />
      </div>

      {/* Daily Trend */}
      <Card>
        <CardHeader><CardTitle>Daily Event Trend</CardTitle></CardHeader>
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
                <Line type="monotone" dataKey="views" stroke="#3b82f6" name="Views" strokeWidth={2} />
                <Line type="monotone" dataKey="cartAdds" stroke="#d97706" name="Cart Adds" strokeWidth={2} />
                <Line type="monotone" dataKey="checkouts" stroke="#d45a0a" name="Checkouts" strokeWidth={2} />
                <Line type="monotone" dataKey="bookings" stroke="#40966e" name="Bookings" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
