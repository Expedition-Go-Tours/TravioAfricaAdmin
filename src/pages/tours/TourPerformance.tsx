import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, Map, DollarSign, Star, Eye, TrendingUp, X, ArrowLeft } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import type { Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/axios";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";

interface Tour {
  id: string;
  title?: string;
  status?: string;
  supplier?: { name?: string };
  bookingCount?: number;
  totalRevenue?: number;
  averageRating?: number;
  reviewCount?: number;
  viewCount?: number;
  createdAt?: string;
}

const statusOptions = ["all", "Draft", "Active", "Paused", "Archived"];

export default function TourPerformancePage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("totalRevenue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const limit = 20;

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy,
    sortOrder,
  });
  if (status && status !== "all") queryParams.set("status", status);
  if (searchQuery) queryParams.set("search", searchQuery);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "tours", { page, limit, status, searchQuery, sortBy, sortOrder }],
    queryFn: () => api.get(`/admin/analytics/tour-performance?${queryParams.toString()}`).then((r) => r.data),
  });

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
  };

  const tours = data?.data?.tours || data?.tours || [];
  const pagination = data?.pagination || data?.data?.pagination;
  const totalCount = pagination?.totalCount || 0;

  const aggregate = tours.reduce(
    (acc: { revenue: number; bookings: number; views: number }, t: Tour) => ({
      revenue: acc.revenue + (t.totalRevenue || 0),
      bookings: acc.bookings + (t.bookingCount || 0),
      views: acc.views + (t.viewCount || 0),
    }),
    { revenue: 0, bookings: 0, views: 0 },
  );

  const columns: Column<Tour>[] = [
    {
      key: "title",
      header: "Tour",
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
            {r.title?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{r.title || "—"}</p>
            <p className="text-xs text-text-tertiary">{r.supplier?.name || "No supplier"}</p>
          </div>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status || "UNKNOWN"} /> },
    { key: "bookingCount", header: "Bookings", sortable: true, render: (r) => <span className="font-semibold text-text-primary">{formatNumber(r.bookingCount)}</span> },
    { key: "totalRevenue", header: "Revenue", sortable: true, render: (r) => <span className="font-semibold text-green-700">{formatCurrency(r.totalRevenue)}</span> },
    { key: "averageRating", header: "Rating", sortable: true, render: (r) => (
      <span className="inline-flex items-center gap-1 text-amber-600">
        {r.averageRating ? `${r.averageRating.toFixed(1)}` : "—"} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
      </span>
    )},
    { key: "reviewCount", header: "Reviews", sortable: true, render: (r) => formatNumber(r.reviewCount) },
    { key: "viewCount", header: "Views", sortable: true, render: (r) => formatNumber(r.viewCount) },
    { key: "createdAt", header: "Created", render: (r) => <span className="text-xs text-text-tertiary">{formatDate(r.createdAt)}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="rounded-sm bg-white p-1.5 shadow-sm hover:ring-2 hover:ring-green-300 transition-all">
            <ArrowLeft className="h-4 w-4 text-text-primary" />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">Tour Performance</h1>
        </div>
        {totalCount > 0 && (
          <span className="text-xs text-text-tertiary">{totalCount} tour{totalCount > 1 ? "s" : ""}</span>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Tours"
          value={isLoading ? "..." : formatNumber(totalCount)}
          icon={<Map className="h-4 w-4" />}
          accent="green"
        />
        <KpiCard
          label="Total Revenue"
          value={isLoading ? "..." : formatCurrency(aggregate.revenue)}
          icon={<DollarSign className="h-4 w-4" />}
          accent="blue"
        />
        <KpiCard
          label="Total Bookings"
          value={isLoading ? "..." : formatNumber(aggregate.bookings)}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="amber"
        />
        <KpiCard
          label="Total Views"
          value={isLoading ? "..." : formatNumber(aggregate.views)}
          icon={<Eye className="h-4 w-4" />}
          accent="green"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <Input
                placeholder="Search tours..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-9"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Select value={status || "all"} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>{s === "all" ? "All Statuses" : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(status !== "all" || searchQuery) && (
              <Button variant="ghost" size="sm" onClick={() => { setStatus("all"); setSearchQuery(""); setPage(1); }} className="gap-1.5">
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={tours}
            loading={isLoading}
            error={isError ? "Failed to load tours" : null}
            emptyMessage="No tours found matching your filters"
            onRowClick={(row) => navigate(`/admin/tours/${row.id}`)}
            pagination={pagination ? { page: pagination.page || page, totalPages: pagination.totalPages || 1, totalCount: pagination.totalCount || 0, onPageChange: setPage } : undefined}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            onRetry={() => refetch()}
            keyExtractor={(r) => r.id}
          />
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
