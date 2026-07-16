import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface BookingVolumeChartProps {
  data?: Array<{ day: string; count: number }>;
  total?: number;
  trend?: { value: number; isPositive: boolean };
  loading?: boolean;
}

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function BookingVolumeChart({ data, total, trend, loading }: BookingVolumeChartProps) {
  const chartData = data || days.map((day) => ({ day, count: 0 }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Booking Volume Trend
          </CardTitle>
          <span className="text-xs text-text-tertiary bg-surface-muted px-2 py-1 rounded-md">Last week</span>
        </div>
        {loading ? (
          <Skeleton className="h-6 w-32 mt-2" />
        ) : (
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-text-primary">{formatNumber(total)}</span>
            {trend && (
              <span className={cn("text-xs font-medium", trend.isPositive ? "text-status-active" : "text-status-rejected")}>
                {trend.isPositive ? "+" : ""}{trend.value}% vs last week
              </span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barCategoryGap="20%">
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#64748b" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickFormatter={(value) => value.toString()}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [formatNumber(value), "Bookings"]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.day === "Tue" ? "#1e293b" : "#cbd5e1"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
