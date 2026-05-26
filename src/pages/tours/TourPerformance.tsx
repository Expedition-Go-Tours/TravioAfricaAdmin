import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/DataTable";
import type { Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";

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
  const [category, setCategory] = useState("");
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
  if (category) queryParams.set("category", category);
  if (searchQuery) queryParams.set("search", searchQuery);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "tours", { page, limit, status, category, searchQuery, sortBy, sortOrder }],
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

  const columns: Column<Tour>[] = [
    { key: "title", header: "Title", render: (r) => <span className="font-medium">{r.title || "—"}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status || "UNKNOWN"} /> },
    { key: "supplier", header: "Supplier", render: (r) => r.supplier?.name || "—" },
    { key: "bookingCount", header: "Bookings", sortable: true, render: (r) => formatNumber(r.bookingCount) },
    { key: "totalRevenue", header: "Revenue", sortable: true, render: (r) => formatCurrency(r.totalRevenue) },
    { key: "averageRating", header: "Avg Rating", sortable: true, render: (r) => r.averageRating ? `${r.averageRating.toFixed(1)} ★` : "—" },
    { key: "reviewCount", header: "Reviews", sortable: true, render: (r) => formatNumber(r.reviewCount) },
    { key: "viewCount", header: "Views", sortable: true, render: (r) => formatNumber(r.viewCount) },
    { key: "createdAt", header: "Created", sortable: true, render: (r) => formatDate(r.createdAt) },
  ];

  const tours = data?.data?.tours || data?.tours || [];
  const pagination = data?.pagination || data?.data?.pagination;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-text-primary">Tour Performance</h1>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <Input
              placeholder="Search tours..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="max-w-xs"
            />
            <Select value={status || "all"} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>{s === "all" ? "All Statuses" : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(status !== "all" || category || searchQuery) && (
              <Button variant="ghost" size="sm" onClick={() => { setStatus("all"); setCategory(""); setSearchQuery(""); setPage(1); }}>
                Clear Filters
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
            onRowClick={(row) => navigate(`/admin/tours?highlight=${row.id}`)}
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
