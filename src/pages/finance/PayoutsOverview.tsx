import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Clock, CheckCircle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KPICard } from "@/components/shared/KPICard";
import { SectionError } from "@/components/shared/SectionError";
import { SectionEmpty } from "@/components/shared/SectionEmpty";
import api from "@/lib/axios";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function PayoutsOverview() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "payout-summary"],
    queryFn: () => api.get("/payouts/admin/summary").then((r) => r.data),
  });

  const monthlyBreakdown = data?.monthlyBreakdown || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <KPICard
          label="Pending Payouts"
          value={isLoading ? "..." : `${formatNumber(data?.pending?.count)} totaling ${formatCurrency(data?.pending?.totalAmount)}`}
          icon={<Clock className="h-5 w-5 text-status-pending" />}
          color="bg-status-pending/10"
        />
        <KPICard
          label="Paid This Month"
          value={isLoading ? "..." : `${formatNumber(data?.paidThisMonth?.count)} totaling ${formatCurrency(data?.paidThisMonth?.totalAmount)}`}
          icon={<CheckCircle className="h-5 w-5 text-status-active" />}
          color="bg-status-active/10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
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
              <BarChart data={monthlyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dee3e8" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="totalAmount" fill="#3b82f6" name="Total" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalCommission" fill="#40966e" name="Commission" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
