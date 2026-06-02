import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from "recharts";
import { Clock, CheckCircle, TrendingUp, Wallet, DollarSign, Calendar } from "lucide-react";
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

  const monthlyBreakdown = (data?.data?.monthlyBreakdown || data?.monthlyBreakdown || []) as {
    month: string;
    totalAmount?: number;
    commission?: number;
  }[];

  const totalPaid = monthlyBreakdown.reduce((sum, m) => sum + (m.totalAmount ?? 0), 0);
  const totalCommission = monthlyBreakdown.reduce((sum, m) => sum + (m.commission ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* KPI Stats — blended panel */}
      <div className="rounded-sm border border-border-muted shadow-2 overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-border-muted sm:grid-cols-4">
          <KpiCard
            label="Pending Payouts"
            value={isLoading ? "..." : `${formatNumber(data?.data?.pending?.count ?? data?.pending?.count ?? 0)} totaling ${formatCurrency(data?.data?.pending?.total ?? data?.pending?.total ?? 0)}`}
            icon={<Clock className="h-5 w-5" />}
            accent="amber"
          />
          <KpiCard
            label="Paid This Month"
            value={isLoading ? "..." : `${formatNumber(data?.data?.paidThisMonth?.count ?? data?.paidThisMonth?.count ?? 0)} totaling ${formatCurrency(data?.data?.paidThisMonth?.total ?? data?.paidThisMonth?.total ?? 0)}`}
            icon={<CheckCircle className="h-5 w-5" />}
            accent="green"
          />
          <KpiCard
            label="Total Commission"
            value={isLoading ? "..." : formatCurrency(totalCommission)}
            icon={<Wallet className="h-5 w-5" />}
            accent="blue"
          />
          <KpiCard
            label="Total Paid"
            value={isLoading ? "..." : formatCurrency(totalPaid)}
            icon={<DollarSign className="h-5 w-5" />}
            accent="green"
          />
        </div>
      </div>

      {/* Monthly Payout Trend Chart */}
      <Card>
        <CardHeader className="border-b border-border pb-3 border-l-2 border-l-green-500/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <CardTitle className="text-sm font-semibold text-text-primary">
                  Monthly Payout Trend
                </CardTitle>
                {!isLoading && !isError && monthlyBreakdown.length > 0 && (
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {monthlyBreakdown.length} months · {formatCurrency(totalPaid)} total paid
                  </p>
                )}
              </div>
            </div>
            {!isLoading && !isError && monthlyBreakdown.length > 0 && (
              <div className="flex items-center gap-3 text-xs text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-blue-500" />
                  Total Amount
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-green-500" />
                  Commission
                </span>
              </div>
            )}
          </div>
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
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#8a9ba8" }}
                  axisLine={{ stroke: "#dee3e8" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#8a9ba8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 4, border: "1px solid #dee3e8", fontSize: 12 }}
                  formatter={(value: any) => [formatCurrency(Number(value))]}
                  labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs font-medium text-text-secondary">{value}</span>
                  )}
                />
                <Bar
                  dataKey="totalAmount"
                  fill="url(#amountGrad)"
                  name="Total Amount"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="commission"
                  fill="url(#commissionGrad)"
                  name="Commission"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Monthly Breakdown Table */}
      {!isLoading && !isError && monthlyBreakdown.length > 0 && (
        <Card>
          <CardHeader className="border-b border-border pb-3 border-l-2 border-l-green-500/60">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Calendar className="h-4 w-4 text-green-600" />
              Monthly Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-muted bg-gradient-to-r from-green-50 to-green-50/80">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold tracking-wider text-green-800">Month</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold tracking-wider text-green-800">Total Amount</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold tracking-wider text-green-800">Commission</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold tracking-wider text-green-800">Commission %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-muted">
                  {monthlyBreakdown.map((m: any) => {
                    const pct = m.totalAmount > 0 ? ((m.commission ?? 0) / m.totalAmount) * 100 : 0;
                    return (
                      <tr key={m.month} className="transition-colors hover:bg-green-50/40 even:bg-green-50/20">
                        <td className="px-5 py-3 text-sm font-medium text-text-primary">{m.month}</td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-text-primary tabular-nums">
                          {formatCurrency(m.totalAmount ?? 0)}
                        </td>
                        <td className="px-5 py-3 text-right text-sm text-text-secondary tabular-nums">
                          {formatCurrency(m.commission ?? 0)}
                        </td>
                        <td className="px-5 py-3 text-right text-sm text-text-tertiary tabular-nums">
                          {pct.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-gradient-to-r from-green-50/60 to-green-50/30">
                    <td className="px-5 py-3 text-sm font-bold text-text-primary">Total</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-text-primary tabular-nums">
                      {formatCurrency(totalPaid)}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-text-primary tabular-nums">
                      {formatCurrency(totalCommission)}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-text-primary tabular-nums">
                      {totalPaid > 0 ? ((totalCommission / totalPaid) * 100).toFixed(1) : "0.0"}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
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
    green: { bg: "bg-gradient-to-br from-green-50 to-white", sideBorder: "border-l-green-400", iconBg: "bg-green-100", iconColor: "text-green-600" },
    blue: { bg: "bg-gradient-to-br from-blue-50 to-white", sideBorder: "border-l-blue-400", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
    amber: { bg: "bg-gradient-to-br from-amber-50 to-white", sideBorder: "border-l-amber-400", iconBg: "bg-amber-100", iconColor: "text-amber-600" },
  };

  const a = accentMap[accent];

  return (
    <div className={`${a.bg} ${a.sideBorder} border-l-2 flex flex-col items-center justify-center px-3 py-5 text-center`}>
      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${a.iconBg} ${a.iconColor} mb-2.5`}>
        {icon}
      </div>
      <p className="text-xs text-text-secondary truncate max-w-full">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-text-primary leading-snug">{value}</p>
    </div>
  );
}
