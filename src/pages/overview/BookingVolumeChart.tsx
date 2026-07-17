import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { TrendingUp, Calendar } from "lucide-react";
import styles from "../Overview.module.css";

const periodLabels: Record<string, string> = {
  today: "Today",
  last_week: "Last 7 days",
  last_month: "Last 30 days",
  last_quarter: "Last 90 days",
};

const periodTrendLabels: Record<string, string> = {
  today: "vs yesterday",
  last_week: "vs previous week",
  last_month: "vs previous month",
  last_quarter: "vs previous quarter",
};

interface BookingVolumeChartProps {
  data?: Array<{ day: string; count: number }>;
  total?: number;
  trend?: { value: number; isPositive: boolean };
  loading?: boolean;
  period?: string;
}

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function BookingVolumeChart({ data, total, trend, loading, period = "last_week" }: BookingVolumeChartProps) {
  const chartData = data || days.map((day) => ({ day, count: 0 }));

  return (
    <div className="rounded-2xl bg-white border-0 shadow-sm p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <h3 className="text-[15px] font-semibold text-gray-900">Booking Volume Trend</h3>
        </div>
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg font-medium">{periodLabels[period] || "Last 7 days"}</span>
      </div>
      
      {loading ? (
        <Skeleton className="h-6 w-32 mt-2" />
      ) : (
        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-3xl font-bold text-gray-900">{formatNumber(total)}</span>
          {trend && (
            <span className={cn("text-sm font-medium flex items-center gap-1", trend.isPositive ? "text-emerald-600" : "text-red-500")}>
              {trend.isPositive ? "+" : ""}{trend.value}% {periodTrendLabels[period] || "vs previous week"}
            </span>
          )}
        </div>
      )}
      
      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className={styles.chartBar}><ResponsiveContainer width="100%" height="100%" minHeight={160}>
          <BarChart data={chartData} barCategoryGap="25%">
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#9ca3af" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#9ca3af" }}
              tickFormatter={(value) => value.toString()}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "none",
                borderRadius: "12px",
                fontSize: "12px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              }}
              cursor={{ fill: "rgba(0,0,0,0.02)" }}
              formatter={(value) => formatNumber(Number(value))}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.day === "Tue" ? "#1f2937" : "#e5e7eb"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer></div>
      )}
    </div>
  );
}
