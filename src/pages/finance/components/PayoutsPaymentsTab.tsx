import { useQuery } from "@tanstack/react-query";
import { useSocketInvalidate } from "@/hooks/useSocketEvent";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Clock, Send, CheckCircle, Percent, TrendingUp, Calendar, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/StatCard";
import { ChartTooltip } from "@/components/shared/ChartTooltip";
import { chartColors, chartAxis } from "@/components/shared/chartTheme";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionError } from "@/components/shared/SectionError";
import { SectionEmpty } from "@/components/shared/SectionEmpty";
import { useCallback, useMemo, useState } from "react";
import api from "@/lib/axios";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import type { Payout } from "@/types/payout";

const RANGE_OPTIONS = [6, 12, 24] as const;

function QueueCard({
  title,
  icon,
  accent,
  count,
  total,
  oldestDays,
  onView,
}: {
  title: string;
  icon: React.ReactNode;
  accent: "amber" | "violet";
  count: number;
  total: number;
  oldestDays: number | null;
  onView: () => void;
}) {
  const chip = accent === "amber"
    ? "bg-status-pending/10 text-status-pending"
    : "bg-status-processing/10 text-status-processing";
  return (
    <Card className={cn("border-l-4", accent === "amber" ? "border-l-status-pending" : "border-l-status-processing")}>
      <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", chip)}>{icon}</span>
                <p className="text-sm font-semibold text-text-primary">{title}</p>
              </div>
              <p className="mt-3 text-2xl font-bold text-text-primary tabular-nums">{formatNumber(count)}</p>
              <p className="text-sm text-text-tertiary">{formatCurrency(total)} outstanding</p>
              {oldestDays != null && (
                <p className="mt-1 text-xs text-text-secondary">Oldest waiting {oldestDays}d</p>
              )}
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-text-tertiary hover:text-text-primary" onClick={onView}>
              View <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
    </Card>
  );
}

export function PayoutsPaymentsTab({ onSwitchToList }: { onSwitchToList: (status?: string) => void }) {
  useSocketInvalidate("admin:payout-update", ["admin", "payout-summary"]);

  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]>(12);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "payout-summary"],
    queryFn: () => api.get("/payouts/admin/summary").then((r) => r.data),
  });

  const pending = data?.data?.pending || {};
  const processing = data?.data?.processing || {};
  const paidThisMonth = data?.data?.paidThisMonth || {};
  const avgCommission = data?.data?.avgCommission;

  const { data: pendingPayoutsData } = useQuery({
    queryKey: ["admin", "payouts", { page: 1, limit: 1, status: "PENDING" }],
    queryFn: () => api.get("/payouts/admin?page=1&limit=1&status=PENDING").then((r) => r.data),
  });
  const { data: processingPayoutsData } = useQuery({
    queryKey: ["admin", "payouts", { page: 1, limit: 1, status: "PROCESSING" }],
    queryFn: () => api.get("/payouts/admin?page=1&limit=1&status=PROCESSING").then((r) => r.data),
  });

  const oldestAge = useCallback((list: unknown[] | undefined): number | null => {
    if (!list || list.length === 0) return null;
    const first = list[0] as Payout;
    if (!first?.createdAt) return null;
    return Math.max(1, Math.floor((Date.now() - new Date(first.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
  }, []);

  const pendingAge = oldestAge(pendingPayoutsData?.data?.payouts || pendingPayoutsData?.payouts);
  const processingAge = oldestAge(processingPayoutsData?.data?.payouts || processingPayoutsData?.payouts);

  const monthly = useMemo(() => {
    const raw = (data?.data?.monthlyBreakdown || data?.monthlyBreakdown || []) as {
      month: string;
      count?: number;
      totalAmount?: number;
      commission?: number;
    }[];
    const sorted = [...raw].sort((a, b) => a.month.localeCompare(b.month));
    return range === 24 ? sorted : sorted.slice(-range);
  }, [data, range]);

  const totals = useMemo(() => {
    return monthly.reduce(
      (acc, m) => ({ amount: acc.amount + (m.totalAmount ?? 0), commission: acc.commission + (m.commission ?? 0) }),
      { amount: 0, commission: 0 },
    );
  }, [monthly]);

  const avgCommissionPct = useMemo(() => {
    if (totals.amount > 0) return ((totals.commission / totals.amount) * 100).toFixed(1);
    return null;
  }, [totals]);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending Approval"
          value={isLoading ? "..." : formatNumber(pending.count ?? 0)}
          icon={<Clock className="h-5 w-5" />}
          accent="amber"
          subtitle={isLoading ? undefined : `${formatCurrency(pending.total ?? 0)} awaiting approval`}
        />
        <StatCard
          label="In Transit"
          value={isLoading ? "..." : formatNumber(processing.count ?? 0)}
          icon={<Send className="h-5 w-5" />}
          accent="blue"
          subtitle={isLoading ? undefined : `${formatCurrency(processing.total ?? 0)} released`}
        />
        <StatCard
          label="Paid This Month"
          value={isLoading ? "..." : formatCurrency(paidThisMonth.total ?? 0)}
          icon={<CheckCircle className="h-5 w-5" />}
          accent="emerald"
          subtitle={isLoading ? undefined : `${formatNumber(paidThisMonth.count ?? 0)} payouts`}
        />
        <StatCard
          label="Avg Commission"
          value={isLoading ? "..." : avgCommission != null ? `${(avgCommission * 100).toFixed(1)}%` : "—"}
          icon={<Percent className="h-5 w-5" />}
          accent="red"
        />
      </div>

      {/* Queue band */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <QueueCard
          title="Approval Queue"
          icon={<Clock className="h-4 w-4" />}
          accent="amber"
          count={pending.count ?? 0}
          total={pending.total ?? 0}
          oldestDays={pendingAge}
          onView={() => onSwitchToList("PENDING")}
        />
        <QueueCard
          title="In Transit"
          icon={<Send className="h-4 w-4" />}
          accent="violet"
          count={processing.count ?? 0}
          total={processing.total ?? 0}
          oldestDays={processingAge}
          onView={() => onSwitchToList("PROCESSING")}
        />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-status-active" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Monthly Paid Trend</p>
                {!isLoading && !isError && monthly.length > 0 && (
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {formatCurrency(totals.amount)} paid · {formatCurrency(totals.commission)} commission
                    {avgCommissionPct ? ` (${avgCommissionPct}%)` : ""}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-base p-0.5">
              {RANGE_OPTIONS.map((r) => (
                <button
                  key={r}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none",
                    range === r ? "bg-primary text-primary-foreground" : "text-text-tertiary hover:text-text-primary"
                  )}
                  onClick={() => setRange(r)}
                >
                  {r}M
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : isError ? (
            <SectionError message="Failed to load payout trend" onRetry={() => refetch()} />
          ) : !monthly.length ? (
            <SectionEmpty message="No monthly data yet" />
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="payoutAmountGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartColors.green} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={chartColors.green} stopOpacity={0.25} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartAxis.grid} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartAxis.tick }} axisLine={{ stroke: chartAxis.axis }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: chartAxis.tick }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v)} width={70} />
                  <Tooltip
                    content={<ChartTooltip formatter={(value) => formatCurrency(Number(value))} />}
                    cursor={{ stroke: chartAxis.reference, strokeDasharray: "3 3" }}
                  />
                  <Bar dataKey="totalAmount" fill="url(#payoutAmountGrad)" name="Paid" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Line type="monotone" dataKey="commission" stroke={chartColors.amber} strokeWidth={2.5} name="Commission" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly table */}
      {!isLoading && !isError && monthly.length > 0 && (
        <Card>
          <CardHeader className="border-b border-border pb-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Calendar className="h-4 w-4 text-status-active" />
              Monthly Breakdown
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-muted bg-surface-muted/40">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold tracking-wider text-text-tertiary">Month</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold tracking-wider text-text-tertiary">Payouts</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold tracking-wider text-text-tertiary">Total Paid</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold tracking-wider text-text-tertiary">Commission</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold tracking-wider text-text-tertiary">Comm. %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-muted">
                  {monthly.map((m) => {
                    const total = m.totalAmount ?? 0;
                    const pct = total > 0 ? ((m.commission ?? 0) / total) * 100 : 0;
                    return (
                      <tr key={m.month} className="transition-colors hover:bg-surface-muted/40">
                        <td className="px-5 py-3 text-sm font-medium text-text-primary">{m.month}</td>
                        <td className="px-5 py-3 text-right text-sm text-text-secondary tabular-nums">{formatNumber(m.count ?? 0)}</td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-text-primary tabular-nums">{formatCurrency(total)}</td>
                        <td className="px-5 py-3 text-right text-sm text-text-secondary tabular-nums">{formatCurrency(m.commission ?? 0)}</td>
                        <td className="px-5 py-3 text-right text-sm text-text-tertiary tabular-nums">{pct.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-surface-muted/30">
                    <td className="px-5 py-3 text-sm font-bold text-text-primary">Total</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-text-primary tabular-nums">{formatNumber(monthly.reduce((s, m) => s + (m.count ?? 0), 0))}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-text-primary tabular-nums">{formatCurrency(totals.amount)}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-text-primary tabular-nums">{formatCurrency(totals.commission)}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-text-primary tabular-nums">{avgCommissionPct ? `${avgCommissionPct}%` : "—"}</td>
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