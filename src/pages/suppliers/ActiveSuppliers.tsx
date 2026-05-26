import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import type { Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import api from "@/lib/axios";
import { formatDate } from "@/lib/utils";

interface Supplier {
  id: string;
  user?: { name?: string; email?: string };
  businessInfo?: { legalBusinessName?: string; businessName?: string; displayName?: string };
  status?: string;
  createdAt?: string;
}

export default function ActiveSuppliersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [actionTarget, setActionTarget] = useState<{ id: string; userId: string; name: string; action: "suspend" | "reactivate" } | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const limit = 20;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "suppliers", { page, limit, status: "ACTIVE" }],
    queryFn: () => api.get(`/suppliers/admin/applications?page=${page}&limit=${limit}&status=ACTIVE`).then((r) => r.data),
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
    { key: "name", header: "Name", render: (r) => r.user?.name || "—" },
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
        </div>
      ),
    },
  ];

  const applications = data?.applications || data?.data?.applications || [];
  const pagination = data?.pagination || data?.data?.pagination;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-text-primary">Active Suppliers</h1>

      <Card>
        <CardHeader>
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
