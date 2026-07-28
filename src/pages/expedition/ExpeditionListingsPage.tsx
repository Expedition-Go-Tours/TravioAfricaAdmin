import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Globe, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate } from "@/lib/utils";

interface ExpeditionListing {
  id: string;
  tourId: string;
  isActive: boolean;
  bookingFlow: "DIRECT" | "EXTERNAL";
  externalUrl: string | null;
  displayOrder: number;
  isFeatured: boolean;
  syncStatus: string | null;
  lastSyncAt: string | null;
  syncError: string | null;
  publishedAt: string | null;
  publishedBy: { id: string; name: string; email: string } | null;
  unpublishedAt: string | null;
  unpublishedBy: { id: string; name: string; email: string } | null;
  tour: {
    id: string;
    title: string;
    slug: string;
    coverPhoto: string | null;
    category: string | null;
    status: string;
    createdAt: string;
    supplier: { id: string; name: string; photoURL: string | null };
  };
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
}

export default function ExpeditionListingsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [flowFilter, setFlowFilter] = useState("all");
  const [unpublishTarget, setUnpublishTarget] = useState<ExpeditionListing | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "expedition-listings", page, search, statusFilter, flowFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (flowFilter !== "all") params.set("bookingFlow", flowFilter);
      const res = await api.get(`/admin/expedition/listings?${params}`);
      return res.data?.data as { listings: ExpeditionListing[]; pagination: Pagination };
    },
  });

  const publishMutation = useMutation({
    mutationFn: (tourId: string) =>
      api.patch(`/admin/tours/${tourId}/expedition-publish`, { isActive: true }),
    onSuccess: () => {
      toast.success("Tour published to Expedition Go");
      queryClient.invalidateQueries({ queryKey: ["admin", "expedition-listings"] });
    },
    onError: () => toast.error("Failed to publish tour"),
  });

  const unpublishMutation = useMutation({
    mutationFn: ({ tourId, reason }: { tourId: string; reason?: string }) =>
      api.patch(`/admin/tours/${tourId}/expedition-publish`, { isActive: false, reason }),
    onSuccess: () => {
      toast.success("Tour removed from Expedition Go");
      queryClient.invalidateQueries({ queryKey: ["admin", "expedition-listings"] });
      setUnpublishTarget(null);
    },
    onError: () => toast.error("Failed to unpublish tour"),
  });

  const bulkMutation = useMutation({
    mutationFn: (operations: { tourId: string; isActive: boolean }[]) =>
      api.patch("/admin/expedition/bulk-publish", { operations }),
    onSuccess: () => {
      toast.success("Bulk update completed");
      queryClient.invalidateQueries({ queryKey: ["admin", "expedition-listings"] });
      setSelectedIds(new Set());
    },
    onError: () => toast.error("Bulk update failed"),
  });

  const listings = data?.listings || [];
  const pagination = data?.pagination;

  const columns = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          className="rounded border-slate-300"
          checked={listings.length > 0 && selectedIds.size === listings.length}
          onChange={() => {
            if (selectedIds.size === listings.length) {
              setSelectedIds(new Set());
            } else {
              setSelectedIds(new Set(listings.map((l) => l.tourId)));
            }
          }}
        />
      ),
      render: (r: ExpeditionListing) => (
        <input
          type="checkbox"
          className="rounded border-slate-300"
          checked={selectedIds.has(r.tourId)}
          onChange={(e) => {
            e.stopPropagation();
            const next = new Set(selectedIds);
            if (next.has(r.tourId)) next.delete(r.tourId);
            else next.add(r.tourId);
            setSelectedIds(next);
          }}
        />
      ),
    },
    {
      key: "tour",
      header: "Tour",
      render: (r: ExpeditionListing) => (
        <div className="flex items-center gap-3 min-w-0">
          {r.tour.coverPhoto ? (
            <img src={r.tour.coverPhoto} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
              <Globe className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{r.tour.title}</p>
            <p className="text-xs text-slate-400 truncate">{r.tour.supplier.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r: ExpeditionListing) =>
        r.isActive ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            <CheckCircle className="h-3 w-3" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            <XCircle className="h-3 w-3" />
            Inactive
          </span>
        ),
    },
    {
      key: "bookingFlow",
      header: "Flow",
      render: (r: ExpeditionListing) => (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          r.bookingFlow === "DIRECT"
            ? "text-blue-700 bg-blue-50"
            : "text-amber-700 bg-amber-50"
        }`}>
          {r.bookingFlow === "DIRECT" ? "Direct" : "External"}
        </span>
      ),
    },
    {
      key: "isFeatured",
      header: "Featured",
      render: (r: ExpeditionListing) =>
        r.isFeatured ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : null,
    },
    {
      key: "syncStatus",
      header: "Sync",
      render: (r: ExpeditionListing) => {
        if (!r.syncStatus) return <span className="text-xs text-slate-300">—</span>;
        const config = {
          synced: { dot: "bg-emerald-500", label: "Synced", time: r.lastSyncAt },
          pending: { dot: "bg-amber-400", label: "Pending", time: null },
          failed: { dot: "bg-red-500", label: "Failed", time: null },
        } as const;
        const c = config[r.syncStatus as keyof typeof config] || config.pending;
        return (
          <div className="group relative inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span className={`inline-block h-2 w-2 rounded-full ${c.dot}`} />
            {c.label}
            {c.time && <span className="text-slate-400">{formatDate(c.time)}</span>}
            {r.syncStatus === "failed" && r.syncError && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                <div className="bg-slate-800 text-white text-[11px] px-2 py-1 rounded whitespace-nowrap max-w-[200px] truncate">
                  {r.syncError}
                </div>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "publishedAt",
      header: "Published",
      sortable: true,
      render: (r: ExpeditionListing) =>
        r.publishedAt ? (
          <div className="text-xs text-slate-600">
            <p>{formatDate(r.publishedAt)}</p>
            {r.publishedBy && <p className="text-slate-400">by {r.publishedBy.name}</p>}
          </div>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        ),
    },
    {
      key: "actions",
      header: (
        <div className="flex items-center gap-1">
          {selectedIds.size > 0 && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() =>
                  bulkMutation.mutate(
                    Array.from(selectedIds).map((id) => ({ tourId: id, isActive: true }))
                  )
                }
              >
                Publish ({selectedIds.size})
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                onClick={() =>
                  bulkMutation.mutate(
                    Array.from(selectedIds).map((id) => ({ tourId: id, isActive: false }))
                  )
                }
              >
                Unpublish ({selectedIds.size})
              </Button>
            </div>
          )}
        </div>
      ),
      render: (r: ExpeditionListing) => (
        <div className="flex items-center gap-2">
          {r.externalUrl && (
            <a
              href={r.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-600 transition-colors"
              title="View on TravioAfrica"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {r.isActive ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setUnpublishTarget(r)}
              disabled={unpublishMutation.isPending}
            >
              Unpublish
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => publishMutation.mutate(r.tourId)}
              disabled={publishMutation.isPending}
            >
              Publish
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Expedition Go Listings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage which tours are published on Expedition Go Tours
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="rounded-xl border border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search tours or suppliers..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={flowFilter}
              onValueChange={(v) => { setFlowFilter(v); setPage(1); }}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="All flows" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Flows</SelectItem>
                <SelectItem value="DIRECT">Direct</SelectItem>
                <SelectItem value="EXTERNAL">External</SelectItem>
              </SelectContent>
            </Select>
            {selectedIds.size > 0 && (
              <span className="text-xs text-slate-400">
                {selectedIds.size} selected
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-xl border border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-3 pl-5 pr-5 pt-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Globe className="h-4 w-4 text-slate-400" />
            All Listings
            {pagination && (
              <span className="text-xs font-normal text-slate-400">
                ({pagination.totalCount} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={listings}
            loading={isLoading}
            error={isError ? "Failed to load listings" : null}
            emptyMessage="No listings found"
            pagination={pagination ? {
              page,
              totalPages: pagination.totalPages,
              totalCount: pagination.totalCount,
              onPageChange: setPage,
            } : undefined}
            onRetry={() => refetch()}
            keyExtractor={(r) => r.id}
          />
        </CardContent>
      </Card>

      {/* Unpublish confirm dialog */}
      <ConfirmDialog
        open={!!unpublishTarget}
        onOpenChange={(open) => { if (!open) setUnpublishTarget(null); }}
        title="Unpublish from Expedition Go"
        description={`Remove "${unpublishTarget?.tour.title}" from the Expedition Go Tours marketplace?`}
        confirmLabel="Unpublish"
        onConfirm={() => {
          if (unpublishTarget) {
            unpublishMutation.mutate({ tourId: unpublishTarget.tourId });
          }
        }}
        loading={unpublishMutation.isPending}
      />
    </div>
  );
}
