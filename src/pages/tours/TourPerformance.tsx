import { useState } from "react";
import { motion } from "framer-motion";
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
import { staggerContainer, fadeIn } from "@/lib/animations";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";

interface Tour {
  id: string;
  title?: string;
  status?: string;
  coverPhoto?: string;
  supplier?: { name?: string };
  totalBookings?: number;
  totalRevenue?: number;
  averageRating?: number;
  reviewCount?: number;
  viewCount?: number;
  createdAt?: string;
  _count?: { bookings?: number };
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

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "tours", { page, limit, status, sortBy, sortOrder }],
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

  const rawTours = data?.data?.tours || data?.tours || [];

  const query = searchQuery.toLowerCase().trim();
  const tours: Tour[] = query
    ? rawTours
        .filter((t: Tour) =>
          [t.title, t.supplier?.name]
            .some((f) => f?.toLowerCase().includes(query))
        )
        .sort((a: Tour, b: Tour) => {
          const aName = (a.title || "").toLowerCase();
          const bName = (b.title || "").toLowerCase();
          const aStarts = aName.startsWith(query) ? 0 : 1;
          const bStarts = bName.startsWith(query) ? 0 : 1;
          return aStarts - bStarts;
        })
    : rawTours;
  const pagination = data?.pagination || data?.data?.pagination;
  const totalCount = pagination?.totalCount || 0;

  const aggregate = tours.reduce(
    (acc: { revenue: number; bookings: number; views: number }, t: Tour) => ({
      revenue: acc.revenue + Number(t.totalRevenue || 0),
      bookings: acc.bookings + Number(t._count?.bookings ?? t.totalBookings ?? 0),
      views: acc.views + Number(t.viewCount || 0),
    }),
    { revenue: 0, bookings: 0, views: 0 },
  );

  const columns: Column<Tour>[] = [
    {
      key: "title",
      header: "Tour",
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-green-400 to-green-600 text-xs font-bold text-white">
            <span>{r.title?.charAt(0)?.toUpperCase() || "?"}</span>
            {r.coverPhoto && (
              <img
                src={r.coverPhoto}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{r.title || "—"}</p>
            <p className="text-xs text-text-tertiary">{r.supplier?.name || "No supplier"}</p>
          </div>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status || "UNKNOWN"} /> },
    { key: "totalBookings", header: "Bookings", sortable: true, render: (r) => <span className="font-semibold text-text-primary">{formatNumber(r._count?.bookings ?? r.totalBookings)}</span> },
    { key: "totalRevenue", header: "Revenue", sortable: true, render: (r) => <span className="font-semibold text-green-700">{formatCurrency(r.totalRevenue)}</span> },
    { key: "averageRating", header: "Rating", sortable: true, render: (r) => (
      <span className="inline-flex items-center gap-1 text-amber-600">
        {Number(r.averageRating ?? 0).toFixed(1)} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
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
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={fadeIn}><KpiCard
          label="Total Tours"
          value={isLoading ? "..." : formatNumber(totalCount)}
          icon={<Map className="h-4 w-4" />}
          accent="green"
        /></motion.div>
        <motion.div variants={fadeIn}><KpiCard
          label="Total Revenue"
          value={isLoading ? "..." : formatCurrency(aggregate.revenue)}
          icon={<DollarSign className="h-4 w-4" />}
          accent="blue"
        /></motion.div>
        <motion.div variants={fadeIn}><KpiCard
          label="Total Bookings"
          value={isLoading ? "..." : formatNumber(aggregate.bookings)}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="amber"
        /></motion.div>
        <motion.div variants={fadeIn}><KpiCard
          label="Total Views"
          value={isLoading ? "..." : formatNumber(aggregate.views)}
          icon={<Eye className="h-4 w-4" />}
          accent="green"
        /></motion.div>
      </motion.div>

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
  const m = {
    green: { l: "border-l-green-500", bg: "bg-gradient-to-br from-green-50 to-white", ib: "bg-green-100", ic: "text-green-600" },
    blue: { l: "border-l-blue-500", bg: "bg-gradient-to-br from-blue-50 to-white", ib: "bg-blue-100", ic: "text-blue-600" },
    amber: { l: "border-l-amber-500", bg: "bg-gradient-to-br from-amber-50 to-white", ib: "bg-amber-100", ic: "text-amber-600" },
  }[accent];
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`rounded-sm border border-border-muted border-l-[3px] ${m.l} ${m.bg} p-4 shadow-2 transition-all hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-text-secondary truncate">{label}</p>
          <p className="mt-1 text-xl font-bold text-text-primary leading-tight">{value}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${m.ib} ${m.ic} mt-0.5`}>{icon}</div>
      </div>
    </motion.div>
  );
}
