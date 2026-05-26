import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import type { Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import api from "@/lib/axios";
import { formatCurrency, formatDate, truncateId } from "@/lib/utils";

interface Payout {
  id: string;
  supplier?: { name?: string; id?: string };
  tour?: { title?: string };
  bookingId?: string;
  amount?: number;
  commission?: number;
  status?: string;
  createdAt?: string;
}

const statusTabs = ["All", "Pending", "Approved", "Processing", "Paid", "Failed", "Cancelled"];

export default function PayoutsList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusTab, setStatusTab] = useState("All");
  const [actionPayout, setActionPayout] = useState<Payout | null>(null);
  const [actionType, setActionType] = useState<"approve" | "release" | "fail" | null>(null);
  const [failReason, setFailReason] = useState("");
  const [releaseMethod, setReleaseMethod] = useState("");
  const [releaseReference, setReleaseReference] = useState("");
  const limit = 20;

  const statusParam = statusTab === "All" ? "" : statusTab.toUpperCase();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "payouts", { page, limit, status: statusParam }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusParam) params.set("status", statusParam);
      return api.get(`/payouts/admin?${params.toString()}`).then((r) => r.data);
    },
  });

  const { data: methodsData } = useQuery({
    queryKey: ["admin", "payout-methods", "supplier", actionPayout?.supplier?.id],
    queryFn: () => api.get(`/payout-methods/admin/suppliers/${actionPayout?.supplier?.id}`).then((r) => r.data),
    enabled: actionType === "release" && !!actionPayout?.supplier?.id,
  });

  const approveMutation = useMutation({
    mutationFn: () => api.patch(`/payouts/admin/${actionPayout?.id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payouts"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "payout-summary"] });
      toast.success("Payout approved");
      closeModal();
    },
    onError: () => toast.error("Failed to approve payout"),
  });

  const releaseMutation = useMutation({
    mutationFn: () => api.patch(`/payouts/admin/${actionPayout?.id}/release`, {
      method: releaseMethod,
      reference: releaseReference,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payouts"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "payout-summary"] });
      toast.success("Payout released");
      closeModal();
    },
    onError: () => toast.error("Failed to release payout"),
  });

  const failMutation = useMutation({
    mutationFn: () => api.patch(`/payouts/admin/${actionPayout?.id}/fail`, { reason: failReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payouts"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "payout-summary"] });
      toast.success("Payout marked as failed");
      closeModal();
    },
    onError: () => toast.error("Failed to mark payout as failed"),
  });

  const closeModal = () => {
    setActionPayout(null);
    setActionType(null);
    setFailReason("");
    setReleaseMethod("");
    setReleaseReference("");
  };

  const handleExport = async () => {
    try {
      const response = await api.get("/payouts/admin/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "payouts-export.csv";
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch {
      toast.error("Failed to export");
    }
  };

  const columns: Column<Payout>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs">{truncateId(r.id)}</span> },
    { key: "supplier", header: "Supplier", render: (r) => r.supplier?.name || "—" },
    { key: "tour", header: "Tour", render: (r) => r.tour?.title || "—" },
    { key: "bookingId", header: "Booking #", render: (r) => r.bookingId ? truncateId(r.bookingId) : "—" },
    { key: "amount", header: "Amount", render: (r) => formatCurrency(r.amount) },
    { key: "commission", header: "Commission", render: (r) => formatCurrency(r.commission) },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status || "UNKNOWN"} /> },
    { key: "createdAt", header: "Created", render: (r) => formatDate(r.createdAt) },
    {
      key: "actions",
      header: "Actions",
      render: (r) => {
        const status = r.status;
        return (
          <div className="flex gap-1">
            {status === "PENDING" && (
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setActionPayout(r); setActionType("approve"); }}>
                Approve
              </Button>
            )}
            {status === "APPROVED" && (
              <>
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setActionPayout(r); setActionType("release"); }}>
                  Release
                </Button>
                <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); setActionPayout(r); setActionType("fail"); }}>
                  Fail
                </Button>
              </>
            )}
            {status === "PROCESSING" && (
              <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); setActionPayout(r); setActionType("fail"); }}>
                Fail
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const payouts = data?.payouts || data?.data?.payouts || [];
  const pagination = data?.pagination || data?.data?.pagination;
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      {summary && (
        <div className="flex flex-wrap gap-4 rounded-sm border border-border bg-surface-base p-4">
          <p className="text-sm text-text-secondary">
            Total: <span className="font-semibold text-text-primary">{formatCurrency(summary.totalAmount)}</span>
          </p>
          <p className="text-sm text-text-secondary">
            Commission: <span className="font-semibold text-text-primary">{formatCurrency(summary.totalCommission)}</span>
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2 border-b border-border-muted">
              {statusTabs.map((tab) => (
                <button
                  key={tab}
                  className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring ${
                    statusTab === tab
                      ? "border-b-2 border-text-primary text-text-primary"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                  onClick={() => { setStatusTab(tab); setPage(1); }}
                >
                  {tab}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={payouts}
            loading={isLoading}
            error={isError ? "Failed to load payouts" : null}
            emptyMessage="No payouts found"
            pagination={pagination ? { page: pagination.page || page, totalPages: pagination.totalPages || 1, totalCount: pagination.totalCount || 0, onPageChange: setPage } : undefined}
            onRetry={() => refetch()}
            keyExtractor={(r) => r.id}
          />
        </CardContent>
      </Card>

      {/* Approve Modal */}
      {actionType === "approve" && actionPayout && (
        <ConfirmModal
          open={true}
          title="Approve Payout"
          description={`Approve payout of ${formatCurrency(actionPayout.amount)} for ${actionPayout.tour?.title || "tour"}?`}
          confirmLabel="Approve"
          loading={approveMutation.isPending}
          onConfirm={() => approveMutation.mutate()}
          onCancel={closeModal}
        />
      )}

      {/* Release Modal */}
      {actionType === "release" && actionPayout && (
        <ConfirmModal
          open={true}
          title="Release Payout"
          description={`Release payout of ${formatCurrency(actionPayout.amount)}?`}
          confirmLabel="Release"
          loading={releaseMutation.isPending}
          onConfirm={() => releaseMutation.mutate()}
          onCancel={closeModal}
        >
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Payout Method</Label>
              {methodsData?.methods?.length ? (
                <Select value={releaseMethod} onValueChange={setReleaseMethod}>
                  <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                    {methodsData.methods.map((m: { id: string; type?: string; details?: string; isDefault?: boolean }) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.type} {m.details ? `- ${m.details}` : ""} {m.isDefault ? "(Default)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-status-rejected">Supplier has no verified payout method</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference (optional)</Label>
              <Input id="reference" value={releaseReference} onChange={(e) => setReleaseReference(e.target.value)} placeholder="Transaction reference..." />
            </div>
          </div>
        </ConfirmModal>
      )}

      {/* Fail Modal */}
      {actionType === "fail" && actionPayout && (
        <ConfirmModal
          open={true}
          title="Mark Payout as Failed"
          description="Enter the reason for failure."
          confirmLabel="Mark as Failed"
          confirmVariant="destructive"
          loading={failMutation.isPending}
          onConfirm={() => failMutation.mutate()}
          onCancel={closeModal}
        >
          <div className="space-y-2 py-2">
            <Label htmlFor="failReason">Reason (required, min 10 chars)</Label>
            <Textarea
              id="failReason"
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
              placeholder="Enter reason..."
              rows={3}
            />
            {failReason.length > 0 && failReason.length < 10 && (
              <p className="text-xs text-status-rejected">Minimum 10 characters</p>
            )}
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}
