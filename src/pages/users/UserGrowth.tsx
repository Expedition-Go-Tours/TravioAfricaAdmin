import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionError } from "@/components/shared/SectionError";
import { SectionEmpty } from "@/components/shared/SectionEmpty";
import api from "@/lib/axios";

const CUSTOMERS_GRADIENT = "url(#customersGrad)";
const SUPPLIERS_GRADIENT = "url(#suppliersGrad)";

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; fill: string; name: string; value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface-base p-3 shadow-lg">
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
};

const CustomLegend = ({ payload }: { payload?: { dataKey: string; color: string; value: string }[] }) => {
  if (!payload) return null;
  return (
    <div className="flex items-center justify-center gap-6 pt-2">
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <span className="h-3 w-3 rounded" style={{ backgroundColor: entry.color }} />
          <span className="text-text-secondary">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function UserGrowthPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "user-growth"],
    queryFn: () => api.get("/admin/analytics/user-growth").then((r) => r.data),
  });

  const growth = data?.data?.growth || [];
  const totalGrowth = growth.length > 0 ? growth[growth.length - 1].total : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-text-primary">User Growth</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Monthly User Growth</CardTitle>
            <p className="mt-1 text-xs text-text-tertiary">New user registrations per month</p>
          </div>
          {!!totalGrowth && (
            <div className="text-right">
              <p className="text-xs text-text-tertiary">Latest Month</p>
              <p className="text-xl font-bold text-text-primary">{totalGrowth.toLocaleString()}</p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : isError ? (
            <SectionError message="Failed to load user growth data" onRetry={() => refetch()} />
          ) : !growth.length ? (
            <SectionEmpty message="No user growth data" />
          ) : (
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={growth} barGap={2} barCategoryGap="16%">
                <defs>
                  <linearGradient id="customersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={1} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.3} />
                  </linearGradient>
                  <linearGradient id="suppliersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ea580c" stopOpacity={1} />
                    <stop offset="100%" stopColor="#ea580c" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f4f6" }} />
                <Legend content={<CustomLegend />} />
                <ReferenceLine y={0} stroke="#e5e7eb" />
                <Bar
                  dataKey="customers"
                  fill={CUSTOMERS_GRADIENT}
                  name="Customers"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="suppliers"
                  fill={SUPPLIERS_GRADIENT}
                  name="Suppliers"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
