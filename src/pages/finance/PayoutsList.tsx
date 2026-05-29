import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, CheckCircle, XCircle, Send, Ban, Wallet, DollarSign } from "lucide-react";
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
  supplier?: {
    name?: string;
    id?: string;
    email?: string;
    phone?: string;
    supplierProfile?: {
      businessInfo?: {
        legalBusinessName?: string;
        displayName?: string;
        country?: string;
        address?: { city?: string; line1?: string; state?: string; postalCode?: string };
        phoneNumber?: string;
      };
      payoutInfo?: any;
    };
  };
  tour?: { title?: string };
  booking?: { bookingNumber?: string; total?: string; paidAt?: string; tour?: { title?: string } };
  bookingId?: string;
  amount?: number | string;
  commissionAmount?: number | string;
  status?: string;
  createdAt?: string;
}

interface PayoutSummary {
  totalAmount?: number;
  totalCommission?: number;
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
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs text-text-tertiary">{r.id}</span> },
    { key: "supplier", header: "Supplier", render: (r) => <span className="font-medium text-text-primary">{r.supplier?.name || "—"}</span> },
    { key: "tour", header: "Tour", render: (r) => <span className="text-text-secondary">{r.booking?.tour?.title || r.tour?.title || "—"}</span> },
    { key: "bookingId", header: "Booking #", render: (r) => <span className="font-mono text-xs text-text-tertiary">{r.booking?.bookingNumber || (r.bookingId ? truncateId(r.bookingId) : "—")}</span> },
    { key: "amount", header: "Amount", render: (r) => <span className="font-semibold text-text-primary">{formatCurrency(r.amount)}</span> },
    { key: "commission", header: "Commission", render: (r) => <span className="text-text-secondary">{formatCurrency(r.commissionAmount ?? r.commission)}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status || "UNKNOWN"} /> },
    { key: "createdAt", header: "Date", render: (r) => <span className="text-xs text-text-tertiary">{formatDate(r.createdAt)}</span> },
    {
      key: "actions",
      header: "",
      render: (r) => {
        const status = r.status;
        return (
          <div className="flex gap-1">
            {status === "PENDING" && (
              <Button size="sm" variant="outline" className="gap-1" onClick={(e) => { e.stopPropagation(); setActionPayout(r); setActionType("approve"); }}>
                <CheckCircle className="h-3.5 w-3.5" /> Approve
              </Button>
            )}
            {status === "APPROVED" && (
              <>
                <Button size="sm" variant="default" className="gap-1" onClick={(e) => { e.stopPropagation(); setActionPayout(r); setActionType("release"); }}>
                  <Send className="h-3.5 w-3.5" /> Release
                </Button>
                <Button size="sm" variant="destructive" className="gap-1" onClick={(e) => { e.stopPropagation(); setActionPayout(r); setActionType("fail"); }}>
                  <XCircle className="h-3.5 w-3.5" /> Fail
                </Button>
              </>
            )}
            {status === "PROCESSING" && (
              <Button size="sm" variant="destructive" className="gap-1" onClick={(e) => { e.stopPropagation(); setActionPayout(r); setActionType("fail"); }}>
                <Ban className="h-3.5 w-3.5" /> Fail
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const payouts = data?.payouts || data?.data?.payouts || [];
  const pagination = data?.pagination || data?.data?.pagination;
  const summary: PayoutSummary | undefined = data?.data?.summary || data?.summary;

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      {summary && (
        <div className="rounded-sm border border-border-muted shadow-2 overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-border-muted">
            <KpiCard
              label="Total Payout Amount"
              value={formatCurrency(summary.totalAmount ?? 0)}
              icon={<DollarSign className="h-5 w-5" />}
              accent="blue"
            />
            <KpiCard
              label="Total Commission"
              value={formatCurrency(summary.totalCommission ?? 0)}
              icon={<Wallet className="h-5 w-5" />}
              accent="green"
            />
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2 border-b border-border-muted">
              {statusTabs.map((tab) => (
                <button
                  key={tab}
                  className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                    statusTab === tab
                      ? "border-b-2 border-green-600 text-green-700"
                      : "text-text-secondary hover:text-green-600"
                  }`}
                  onClick={() => { setStatusTab(tab); setPage(1); }}
                >
                  {tab}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
              <Download className="h-4 w-4" /> Export CSV
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
          description={
            <div className="space-y-1">
              <p>Approve this payout to move it to the release stage.</p>
              <div className="mt-3 rounded-sm bg-green-50 p-3 text-sm">
                <div className="flex items-center gap-4 mb-3">
                  <DollarSign className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <p className="font-medium text-green-800">{formatCurrency(actionPayout.amount)}</p>
                    <p className="text-xs text-green-600">{actionPayout.booking?.tour?.title || actionPayout.tour?.title || "Tour"}</p>
                  </div>
                </div>
                <div className="border-t border-green-200/50 pt-3 space-y-1.5">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Supplier Details</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-green-700">
                    <span className="text-green-500">Legal Name</span>
                    <span className="font-medium text-right">{actionPayout.supplier?.supplierProfile?.businessInfo?.legalBusinessName || "—"}</span>
                    <span className="text-green-500">Display Name</span>
                    <span className="font-medium text-right">{actionPayout.supplier?.supplierProfile?.businessInfo?.displayName || actionPayout.supplier?.name || "—"}</span>
                    <span className="text-green-500">Country</span>
                    <span className="font-medium text-right">{actionPayout.supplier?.supplierProfile?.businessInfo?.country || "—"}</span>
                    <span className="text-green-500">City</span>
                    <span className="font-medium text-right">{actionPayout.supplier?.supplierProfile?.businessInfo?.address?.city || "—"}</span>
                    <span className="text-green-500">Phone</span>
                    <span className="font-medium text-right">{actionPayout.supplier?.supplierProfile?.businessInfo?.phoneNumber || actionPayout.supplier?.phone || "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          }
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
          description={
            <div className="space-y-1">
              <p>Release funds to the supplier. Select a payout method below.</p>
              <div className="mt-3 flex items-center gap-4 rounded-sm bg-blue-50 p-3 text-sm">
                <Wallet className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">{formatCurrency(actionPayout.amount)}</p>
                  <p className="text-xs text-blue-600">{actionPayout.supplier?.name || "Supplier"}</p>
                </div>
              </div>
            </div>
          }
          confirmLabel="Release"
          confirmDisabled={!releaseMethod}
          loading={releaseMutation.isPending}
          onConfirm={() => releaseMutation.mutate()}
          onCancel={closeModal}
        >
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Payout Method</Label>
              {((methodsData?.data?.methods || methodsData?.methods) as any[])?.length ? (
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
          description={
            <div className="space-y-1">
              <p>This will mark the payout as failed. A reason is required.</p>
              <div className="mt-3 flex items-center gap-4 rounded-sm bg-red-50 p-3 text-sm">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">{formatCurrency(actionPayout.amount)}</p>
                  <p className="text-xs text-red-600">{actionPayout.supplier?.name || "Supplier"}</p>
                </div>
              </div>
            </div>
          }
          confirmLabel="Mark as Failed"
          confirmVariant="destructive"
          confirmDisabled={failReason.length < 10}
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
              placeholder="Enter the reason for failure..."
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

/* ── KpiCard ── */

function KpiCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "green" | "blue" | "amber";
}) {
  const accentMap = {
    green: { bg: "bg-gradient-to-br from-green-50 to-white", sideBorder: "border-l-green-400", iconBg: "bg-green-100", iconColor: "text-green-600" },
    blue: { bg: "bg-gradient-to-br from-blue-50 to-white", sideBorder: "border-l-blue-400", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
    amber: { bg: "bg-gradient-to-br from-amber-50 to-white", sideBorder: "border-l-amber-400", iconBg: "bg-amber-100", iconColor: "text-amber-600" },
  };

  const a = accentMap[accent];

  return (
    <div className={`${a.bg} ${a.sideBorder} border-l-2 flex flex-col items-center justify-center px-3 py-5 text-center`}>
      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${a.iconBg} ${a.iconColor} mb-2.5`}>
        {icon}
      </div>
      <p className="text-xs text-text-secondary truncate max-w-full">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-text-primary leading-snug">{value}</p>
    </div>
  );
}
