import { useState } from "react";
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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionError } from "@/components/shared/SectionError";
import { SectionEmpty } from "@/components/shared/SectionEmpty";
import api from "@/lib/axios";

const metrics = [
  { key: "revenue", label: "Revenue", color: "#3b82f6" },
  { key: "commission", label: "Commission", color: "#40966e" },
  { key: "supplierPayout", label: "Supplier Payout", color: "#d45a0a" },
];

export default function RevenueTrendPage() {
  const [visible, setVisible] = useState<Record<string, boolean>>({
    revenue: true,
    commission: true,
    supplierPayout: true,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "revenue-trend"],
    queryFn: () => api.get("/admin/analytics/revenue-trend").then((r) => r.data),
  });

  const months = data?.data?.months || [];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-text-primary">Revenue Trend</h1>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue Breakdown</CardTitle>
          <div className="flex gap-4">
            {metrics.map((m) => (
              <label key={m.key} className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={visible[m.key]}
                  onChange={() => setVisible((prev) => ({ ...prev, [m.key]: !prev[m.key] }))}
                  className="rounded border-border text-primary focus:ring-ring"
                />
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: m.color }} />
                  {m.label}
                </span>
              </label>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : isError ? (
            <SectionError message="Failed to load revenue trend" onRetry={() => refetch()} />
          ) : !months.length ? (
            <SectionEmpty message="No revenue data for the last 24 months" />
          ) : (
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={months}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dee3e8" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                {metrics
                  .filter((m) => visible[m.key])
                  .map((m) => (
                    <Bar key={m.key} dataKey={m.key} fill={m.color} name={m.label} radius={[4, 4, 0, 0]} />
                  ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
