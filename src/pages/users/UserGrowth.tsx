import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingUp, Users, UserPlus, ArrowLeft } from "lucide-react";
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
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; fill: string; name: string; value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm border border-border bg-white p-3 shadow-lg">
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
  const navigate = useNavigate();
  const [period, setPeriod] = useState("1y");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "user-growth", period],
    queryFn: () => api.get(`/admin/analytics/user-growth?period=${period}`).then((r) => r.data),
  });

  const growth = data?.data?.growth || [];
  const totals = growth.reduce((acc: { customers: number; suppliers: number }, curr: { customers?: number; suppliers?: number }) => ({
    customers: acc.customers + (curr.customers || 0),
    suppliers: acc.suppliers + (curr.suppliers || 0),
  }), { customers: 0, suppliers: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="rounded-sm bg-white p-1.5 shadow-sm hover:ring-2 hover:ring-green-300 transition-all">
            <ArrowLeft className="h-4 w-4 text-text-primary" />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">User Growth</h1>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total Customers"
          value={isLoading ? "..." : formatNumber(totals.customers)}
          icon={<Users className="h-4 w-4" />}
          accent="blue"
        />
        <KpiCard
          label="Total Suppliers"
          value={isLoading ? "..." : formatNumber(totals.suppliers)}
          icon={<UserPlus className="h-4 w-4" />}
          accent="amber"
        />
        <KpiCard
          label="Total Registered"
          value={isLoading ? "..." : formatNumber(totals.customers + totals.suppliers)}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="green"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-text-primary">Monthly User Growth</CardTitle>
            <span className="text-xs text-text-tertiary">New user registrations per month</span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : isError ? (
            <SectionError message="Failed to load user growth data" onRetry={() => refetch()} />
          ) : !growth.length ? (
            <SectionEmpty message="No user growth data" />
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={growth} barGap={2} barCategoryGap="16%">
                <defs>
                  <linearGradient id="customersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.25} />
                  </linearGradient>
                  <linearGradient id="suppliersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d97706" stopOpacity={1} />
                    <stop offset="100%" stopColor="#d97706" stopOpacity={0.25} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#dee3e8" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8a9ba8" }} axisLine={{ stroke: "#dee3e8" }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#8a9ba8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f0f2f4" }} />
                <Legend content={<CustomLegend />} />
                <ReferenceLine y={0} stroke="#dee3e8" />
                <Bar dataKey="customers" fill="url(#customersGrad)" name="Customers" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="suppliers" fill="url(#suppliersGrad)" name="Suppliers" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
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
