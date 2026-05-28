import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from "recharts";
import { Clock, CheckCircle, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionError } from "@/components/shared/SectionError";
import { SectionEmpty } from "@/components/shared/SectionEmpty";
import api from "@/lib/axios";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function PayoutsOverview() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "payout-summary"],
    queryFn: () => api.get("/payouts/admin/summary").then((r) => r.data),
  });

  const monthlyBreakdown = data?.data?.monthlyBreakdown || data?.monthlyBreakdown || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Pending Payouts"
          value={isLoading ? "..." : `${formatNumber(data?.data?.pending?.count ?? data?.pending?.count ?? 0)} totaling ${formatCurrency(data?.data?.pending?.total ?? data?.pending?.total ?? 0)}`}
          icon={<Clock className="h-4 w-4" />}
          accent="amber"
        />
        <KpiCard
          label="Paid This Month"
          value={isLoading ? "..." : `${formatNumber(data?.data?.paidThisMonth?.count ?? data?.paidThisMonth?.count ?? 0)} totaling ${formatCurrency(data?.data?.paidThisMonth?.total ?? data?.paidThisMonth?.total ?? 0)}`}
          icon={<CheckCircle className="h-4 w-4" />}
          accent="green"
        />
        <KpiCard
          label="Total Commission Collected"
          value={isLoading ? "..." : formatCurrency(monthlyBreakdown.reduce((sum: number, m: any) => sum + (m.commission ?? (m as any).totalCommission ?? 0), 0))}
          icon={<Wallet className="h-4 w-4" />}
          accent="blue"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Monthly Payout Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : isError ? (
            <SectionError message="Failed to load payout trend" onRetry={() => refetch()} />
          ) : !monthlyBreakdown.length ? (
            <SectionEmpty message="No monthly data" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyBreakdown} barGap={4} barCategoryGap="20%">
                <defs>
                  <linearGradient id="amountGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.25} />
                  </linearGradient>
                  <linearGradient id="commissionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#40966e" stopOpacity={1} />
                    <stop offset="100%" stopColor="#40966e" stopOpacity={0.25} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#dee3e8" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8a9ba8" }} axisLine={{ stroke: "#dee3e8" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8a9ba8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 4, border: "1px solid #dee3e8", fontSize: 12 }}
                  formatter={(value: any) => [formatCurrency(Number(value))]}
                />
                <Legend
                  formatter={(value) => <span className="text-xs font-medium text-text-secondary">{value}</span>}
                />
                <Bar dataKey="totalAmount" fill="url(#amountGrad)" name="Total Amount" radius={[4, 4, 0, 0]} />
                <Bar dataKey="commission" fill="url(#commissionGrad)" name="Commission" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── KpiCard matching Overview page style ── */

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
          <p className="mt-1 text-base font-bold text-text-primary leading-tight">{value}</p>
        </div>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${a.iconBg} ${a.iconColor}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
