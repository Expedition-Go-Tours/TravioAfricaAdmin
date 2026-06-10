import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/DataTable";
import type { Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { usePermission } from "@/hooks/usePermission";
import { useSocketInvalidate } from "@/hooks/useSocketEvent";
import api from "@/lib/axios";
import { formatDate } from "@/lib/utils";

interface Supplier {
  id: string;
  user?: { name?: string; email?: string; photoURL?: string };
  businessInfo?: { legalBusinessName?: string; businessName?: string; displayName?: string };
  status?: string;
  createdAt?: string;
}

export default function ActiveSuppliersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionTarget, setActionTarget] = useState<{ id: string; userId: string; name: string; action: "suspend" | "reactivate" } | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const limit = 20;

  useSocketInvalidate("admin:supplier-status-change", ["admin", "suppliers"]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "suppliers", { page, limit, status: "ACTIVE" }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), status: "ACTIVE" });
      return api.get(`/suppliers/admin/applications?${params.toString()}`).then((r) => r.data);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (body: { suspend: boolean; reason?: string }) =>
      api.patch(`/suppliers/admin/${actionTarget?.userId}/suspend`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "suppliers"] });
      toast.success(actionTarget?.action === "suspend" ? "Supplier suspended" : "Supplier reactivated");
      setActionTarget(null);
      setSuspendReason("");
    },
    onError: () => toast.error("Failed to update supplier status"),
  });

  const columns: Column<Supplier>[] = [
    {
      key: "name",
      header: "Name",
      render: (r) => {
        const name = r.user?.name || "—";
        const initial = name.charAt(0).toUpperCase();
        return (
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-xs font-bold text-white">
              <span>{initial}</span>
              {r.user?.photoURL && (
                <img
                  src={r.user.photoURL}
                  alt={name}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
            </div>
            <span className="truncate">{name}</span>
          </div>
        );
      },
    },
    { key: "email", header: "Email", render: (r) => r.user?.email || "—" },
    { key: "businessName", header: "Business Name", render: (r) => r.businessInfo?.legalBusinessName || r.businessInfo?.businessName || r.businessInfo?.displayName || r.user?.name || "—" },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status || "UNKNOWN"} /> },
    { key: "createdAt", header: "Created", render: (r) => formatDate(r.createdAt) },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/admin/suppliers/${r.id}`); }}>
            View
          </Button>
          {can('suppliers.suspend') && (
            <Button
              size="sm"
              variant={r.status === "ACTIVE" ? "destructive" : "default"}
              onClick={(e) => {
                e.stopPropagation();
                setActionTarget({
                  id: r.id,
                  userId: r.id,
                  name: r.user?.name || "Unknown",
                  action: r.status === "ACTIVE" ? "suspend" : "reactivate",
                });
                setSuspendReason("");
              }}
            >
              {r.status === "ACTIVE" ? "Suspend" : "Reactivate"}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const rawApplications = data?.applications || data?.data?.applications || [];
  const pagination = data?.pagination || data?.data?.pagination;

  const query = searchQuery.toLowerCase().trim();
  const applications: Supplier[] = query
    ? rawApplications
        .filter((app: Supplier) =>
          [app.user?.name, app.user?.email, app.businessInfo?.legalBusinessName, app.businessInfo?.businessName, app.businessInfo?.displayName]
            .some((f) => f?.toLowerCase().includes(query))
        )
        .sort((a: Supplier, b: Supplier) => {
          const aName = (a.user?.name || a.businessInfo?.legalBusinessName || "").toLowerCase();
          const bName = (b.user?.name || b.businessInfo?.legalBusinessName || "").toLowerCase();
          const aStarts = aName.startsWith(query) ? 0 : 1;
          const bStarts = bName.startsWith(query) ? 0 : 1;
          return aStarts - bStarts;
        })
    : rawApplications;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="rounded-sm bg-white p-1.5 shadow-sm hover:ring-2 hover:ring-green-300 transition-all">
          <ArrowLeft className="h-4 w-4 text-text-primary" />
        </button>
        <h1 className="text-lg font-semibold text-text-primary">Active Suppliers</h1>
      </div>

      <Card>
        <CardHeader className="border-b border-border pb-3 border-l-2 border-l-green-500/60">
          <div className="flex flex-wrap items-center gap-3 pb-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <Input
                placeholder="Search suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-text-secondary">Manage active suppliers — suspend or reactivate accounts.</p>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={applications}
            loading={isLoading}
            error={isError ? "Failed to load suppliers" : null}
            emptyMessage="No active suppliers found"
            onRowClick={(row) => navigate(`/admin/suppliers/${row.id}`)}
            pagination={pagination ? { page: pagination.page || page, totalPages: pagination.totalPages || 1, totalCount: pagination.totalCount || 0, onPageChange: setPage } : undefined}
            onRetry={() => refetch()}
            keyExtractor={(r) => r.id}
          />
        </CardContent>
      </Card>

      {/* Suspend/Reactivate Modal */}
      {actionTarget && (
        <ConfirmModal
          open={!!actionTarget}
          title={actionTarget.action === "suspend" ? "Suspend Supplier" : "Reactivate Supplier"}
          description={
            actionTarget.action === "suspend"
              ? `Are you sure you want to suspend ${actionTarget.name}?`
              : `Reactivate ${actionTarget.name}?`
          }
          confirmLabel={actionTarget.action === "suspend" ? "Suspend" : "Reactivate"}
          confirmVariant={actionTarget.action === "suspend" ? "destructive" : "default"}
          loading={toggleMutation.isPending}
          onConfirm={() => {
            if (actionTarget.action === "suspend") {
              toggleMutation.mutate({ suspend: true, reason: suspendReason });
            } else {
              toggleMutation.mutate({ suspend: false });
            }
          }}
          onCancel={() => { setActionTarget(null); setSuspendReason(""); }}
        >
          {actionTarget.action === "suspend" && (
            <div className="space-y-2 py-2">
              <Label htmlFor="suspendReason">Reason (required, min 10 characters)</Label>
              <Textarea
                id="suspendReason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Enter reason..."
                rows={3}
              />
              {suspendReason.length > 0 && suspendReason.length < 10 && (
                <p className="text-xs text-status-rejected">Minimum 10 characters</p>
              )}
            </div>
          )}
        </ConfirmModal>
      )}
    </div>
  );
}
