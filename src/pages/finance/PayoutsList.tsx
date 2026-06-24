import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, CheckCircle, XCircle, Send, Ban, Wallet, DollarSign, Search, X, MapPin, Hash, Calendar, Eye, Building2, Smartphone, Percent, Receipt } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import type { Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { usePermission } from "@/hooks/usePermission";
import { useSocketInvalidate } from "@/hooks/useSocketEvent";
import { PayoutDetailPanel } from "./components/PayoutDetailPanel";
import api from "@/lib/axios";
import { formatCurrency, formatNumber, truncateId } from "@/lib/utils";


interface PayoutMethod {
  id: string;
  type?: string;
  details?: string;
  isDefault?: boolean;
}

import type { Payout } from "@/types/payout";

interface PayoutSummary {
  totalAmount?: number;
  totalCommission?: number;
}

const statusTabs = ["All", "Pending", "Approved", "Processing", "Paid", "Failed", "Cancelled"];

export default function PayoutsList() {
  const queryClient = useQueryClient();
  const { can } = usePermission();

  useSocketInvalidate("admin:payout-update", ["admin", "payouts"]);

  const [page, setPage] = useState(1);
  const [searchParams] = useSearchParams();
  const tabNames: Record<string, string> = {
    PENDING: "Pending", APPROVED: "Approved", PROCESSING: "Processing",
    PAID: "Paid", FAILED: "Failed", CANCELLED: "Cancelled",
  };
  const initialStatusTab = tabNames[searchParams.get("payoutStatus") || ""] || "All";
  const [statusTab, setStatusTab] = useState(initialStatusTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionPayout, setActionPayout] = useState<Payout | null>(null);
  const [actionType, setActionType] = useState<"approve" | "release" | "fail" | null>(null);
  const [failReason, setFailReason] = useState("");
  const [releaseMethod, setReleaseMethod] = useState("");
  const [releaseReference, setReleaseReference] = useState("");
  const deepLinkHandled = useRef(false);
  const [detailPayout, setDetailPayout] = useState<Payout | null>(null);
  const [detailPayoutPhoto, setDetailPayoutPhoto] = useState<string | undefined>(undefined);
  const [highlightedPayoutId, setHighlightedPayoutId] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
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

  const { data: supplierPhotoMap = {} } = useQuery<Record<string, string>>({
    queryKey: ["admin", "suppliers", "photos"],
    queryFn: async () => {
      const res = await api.get("/suppliers/admin/applications?limit=1000");
      const list = res.data?.applications || res.data?.data?.applications || [];
      const map: Record<string, string> = {};
      (list as Array<{ id: string; user?: { photoURL?: string } }>).forEach((s) => {
        if (s.id && s.user?.photoURL) map[s.id] = s.user.photoURL;
      });
      return map;
    },
    staleTime: 10 * 60 * 1000,
  });

  const approveMutation = useMutation({
    mutationFn: () => api.patch(`/payouts/admin/${actionPayout?.id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payouts"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "payout-summary"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
      toast.success("Payout approved");
      closeModal();
    },
    onError: () => toast.error("Failed to approve payout"),
  });

  const releaseMutation = useMutation({
    mutationFn: () => api.patch(`/payouts/admin/${actionPayout?.id}/release`, {
      payoutMethodId: releaseMethod,
      reference: releaseReference,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payouts"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "payout-summary"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
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
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
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
    {
      key: "supplier",
      header: "Supplier",
      render: (r) => {
        const name = r.supplier?.name || "—";
        const initials = name !== "—" ? name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "—";
        const photoUrl = r.supplier?.photoURL || r.supplier?.user?.photoURL;
        return (
          <div className="flex items-center gap-3">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
              <span className={photoUrl ? "opacity-0" : ""}>{initials}</span>
              {photoUrl && (
                <img
                  src={photoUrl}
                  alt={name}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">{name}</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {r.supplier?.email && <div className="text-[11px] text-slate-400 truncate">{r.supplier.email}</div>}
                {r.supplier?.phone && <div className="text-[11px] text-slate-300">· {r.supplier.phone}</div>}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "tour",
      header: "Tour",
      render: (r) => (
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="h-3.5 w-3.5 text-slate-300 shrink-0" />
          <span className="text-sm text-slate-700 truncate">{r.booking?.tour?.title || r.tour?.title || "—"}</span>
        </div>
      ),
    },
    {
      key: "bookingId",
      header: "Booking #",
      render: (r) => (
        <div className="flex items-center gap-2">
          <Hash className="h-3 w-3 text-slate-300 shrink-0" />
          <span className="font-mono text-xs text-slate-500">{r.booking?.bookingNumber || (r.bookingId ? truncateId(r.bookingId) : "—")}</span>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right",
      render: (r) => <span className="text-sm font-semibold text-slate-900 tabular-nums">{formatCurrency(r.amount)}</span>,
    },
    {
      key: "commission",
      header: "Commission",
      className: "text-right",
      render: (r) => <span className="text-sm text-slate-500 tabular-nums">{formatCurrency(r.commissionAmount ?? r.commission)}</span>,
    },
    {
      key: "commissionPct",
      header: "Comm. %",
      className: "text-right",
      render: (r) => {
        const amt = Number(r.amount);
        const comm = Number(r.commissionAmount ?? r.commission);
        const pct = amt > 0 ? (comm / amt) * 100 : null;
        return pct !== null ? (
          <span className="text-sm text-slate-500 tabular-nums">{pct.toFixed(1)}%</span>
        ) : (
          <span className="text-sm text-slate-300">—</span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.status || "UNKNOWN"} />,
    },
    {
      key: "createdAt",
      header: "Date",
      render: (r) => {
        const d = r.createdAt ? new Date(r.createdAt) : null;
        return (
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            <span className="text-xs text-slate-500">{d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
          </div>
        );
      },
    },
    {
      key: "payoutMethod",
      header: "Method",
      render: (r) => {
        const m = r.payoutMethod;
        if (!m?.type) return <span className="text-sm text-slate-300">—</span>;
        const isBank = m.type.toLowerCase().includes("bank");
        const isPaypal = m.type.toLowerCase().includes("paypal");
        const Icon = isBank ? Building2 : isPaypal ? Wallet : Smartphone;
        const iconColor = isBank ? "text-blue-400" : isPaypal ? "text-indigo-400" : "text-amber-400";
        return (
          <div className="flex items-center gap-1.5">
            <Icon className={`h-3 w-3 ${iconColor} shrink-0`} />
            <span className="text-xs text-slate-600 truncate">{m.type.replace(/_/g, " ")}</span>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex gap-1.5 justify-end">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700" onClick={(e) => { e.stopPropagation(); setDetailPayout(r); setDetailPayoutPhoto(r.supplier?.photoURL || r.supplier?.user?.photoURL || (r.supplier?.id ? supplierPhotoMap[r.supplier.id] : undefined)); }} title="View details">
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const payoutsRaw = useMemo(() => data?.payouts || data?.data?.payouts || [], [data]);
  const pagination = data?.pagination || data?.data?.pagination;
  const summary: PayoutSummary | undefined = data?.data?.summary || data?.summary;

  // Deep link from booking panel — reads payoutId + payoutStatus from URL search params
  useEffect(() => {
    const payoutId = searchParams.get("payoutId");
    if (!payoutId || deepLinkHandled.current) return;
    deepLinkHandled.current = true;

    setHighlightedPayoutId(payoutId);
  }, [searchParams]);

  // Find the highlighted payout and auto-scroll once data loads
  useEffect(() => {
    if (!highlightedPayoutId || payoutsRaw.length === 0) return;
    const found = payoutsRaw.find((p: Payout) => p.id === highlightedPayoutId);
    if (found) {
      setTimeout(() => {
        tableRef.current?.querySelector(`[data-row-id="${highlightedPayoutId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);

      if (found.status === "PENDING" && can('payouts.approve')) {
        setTimeout(() => { setActionPayout(found); setActionType("approve"); }, 200);
      }

      setTimeout(() => setHighlightedPayoutId(null), 3000);
    }
  }, [payoutsRaw, highlightedPayoutId, can]);

  const avgCommission = useMemo(() => {
    if (summary?.totalAmount && Number(summary.totalAmount) > 0) {
      return ((Number(summary.totalCommission ?? 0) / Number(summary.totalAmount)) * 100).toFixed(1) + "%";
    }
    return "—";
  }, [summary]);

  // Filter payouts by search query
  const query = searchQuery.toLowerCase().trim();
  const payouts = query
    ? payoutsRaw.filter((p: Payout) => {
        const supplierName = p.supplier?.name?.toLowerCase() || "";
        const supplierEmail = p.supplier?.email?.toLowerCase() || "";
        const bookingNumber = p.booking?.bookingNumber?.toLowerCase() || "";
        const tourTitle = p.booking?.tour?.title?.toLowerCase() || p.tour?.title?.toLowerCase() || "";
        return (
          supplierName.includes(query) ||
          supplierEmail.includes(query) ||
          bookingNumber.includes(query) ||
          tourTitle.includes(query)
        );
      })
    : payoutsRaw;

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      {summary && (
        <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-border-muted sm:grid-cols-4">
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
            <KpiCard
              label="Total Payouts"
              value={formatNumber(pagination?.totalCount ?? payouts.length)}
              icon={<Receipt className="h-5 w-5" />}
              accent="amber"
            />
            <KpiCard
              label="Avg Commission"
              value={avgCommission}
              icon={<Percent className="h-5 w-5" />}
              accent="green"
            />
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="border-b border-slate-100 pb-4 pl-5 pr-5 pt-5">
          {/* Tabs Row */}
          <div className="flex gap-2 border-b border-slate-100">
            {statusTabs.map((tab) => (
              <button
                key={tab}
                className={`px-4 pb-2.5 text-sm font-medium transition-colors focus:outline-none ${
                  statusTab === tab
                    ? "border-b-2 border-slate-900 text-slate-900"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                onClick={() => { setStatusTab(tab); setPage(1); }}
              >
                {tab}
              </button>
            ))}
          </div>
          {/* Controls Row */}
          <div className="flex items-center justify-between gap-4 mt-4">
            <div className="relative min-w-[200px] max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search payouts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {can('payouts.export') && (
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 border-slate-200 text-slate-600 hover:text-slate-900">
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-4">
          <div ref={tableRef}>
            <DataTable
              columns={columns}
              data={payouts}
              loading={isLoading}
              error={isError ? "Failed to load payouts" : null}
              emptyMessage="No payouts found"
              pagination={pagination ? { page: pagination.page || page, totalPages: pagination.totalPages || 1, totalCount: pagination.totalCount || 0, onPageChange: setPage } : undefined}
              onRetry={() => refetch()}
              keyExtractor={(r) => r.id}
              highlightedKey={highlightedPayoutId || undefined}
              onRowClick={(r) => { setDetailPayout(r); setDetailPayoutPhoto(r.supplier?.photoURL || r.supplier?.user?.photoURL || (r.supplier?.id ? supplierPhotoMap[r.supplier.id] : undefined)); }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Approve Modal */}
      <Dialog open={actionType === "approve" && !!actionPayout} onOpenChange={(v) => { if (!v && !approveMutation.isPending) closeModal(); }}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden border-0 [&>button.absolute]:right-4 [&>button.absolute]:top-4 [&>button.absolute]:flex [&>button.absolute]:h-8 [&>button.absolute]:w-8 [&>button.absolute]:items-center [&>button.absolute]:justify-center [&>button.absolute]:rounded-full [&>button.absolute]:bg-white/30 [&>button.absolute]:text-white [&>button.absolute]:opacity-100 [&>button.absolute]:hover:bg-white/50 [&>button.absolute]:backdrop-blur-sm [&>button.absolute]:shadow-sm">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-700 to-green-600 px-6 pt-6 pb-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 shadow-inner">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold text-white">Approve Payout</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-green-100">
                  Approve this payout to move it to the release stage
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-5">
            {/* Amount & Tour card */}
            <div className="rounded-sm border border-green-100 bg-gradient-to-r from-green-50 to-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-tertiary uppercase tracking-wide">Payout Amount</p>
                  <p className="text-2xl font-bold text-green-700 mt-0.5">{formatCurrency(actionPayout?.amount)}</p>
                </div>
                {(actionPayout?.booking?.tour?.title || actionPayout?.tour?.title) && (
                  <div className="text-right">
                    <p className="text-xs text-text-tertiary uppercase tracking-wide">Tour</p>
                    <p className="text-sm font-medium text-text-primary mt-0.5">{actionPayout.booking?.tour?.title || actionPayout.tour?.title}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Supplier Details */}
            <div>
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">Supplier Details</p>
              <div className="rounded-sm border border-border-muted divide-y divide-border-muted">
                {[
                  { label: "Legal Name", value: actionPayout?.supplier?.supplierProfile?.businessInfo?.legalBusinessName },
                  { label: "Display Name", value: actionPayout?.supplier?.supplierProfile?.businessInfo?.displayName || actionPayout?.supplier?.name },
                  { label: "Country", value: actionPayout?.supplier?.supplierProfile?.businessInfo?.country },
                  { label: "City", value: actionPayout?.supplier?.supplierProfile?.businessInfo?.city || (typeof actionPayout?.supplier?.supplierProfile?.businessInfo?.address === 'string' ? actionPayout?.supplier?.supplierProfile?.businessInfo?.address : actionPayout?.supplier?.supplierProfile?.businessInfo?.address?.city) },
                  { label: "Phone", value: actionPayout?.supplier?.supplierProfile?.businessInfo?.phone || actionPayout?.supplier?.supplierProfile?.businessInfo?.phoneNumber || actionPayout?.supplier?.phone },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-2 gap-x-4 px-4 py-2.5">
                    <span className="text-sm text-text-tertiary">{row.label}</span>
                    <span className="text-sm font-medium text-text-primary text-right">{row.value || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-border-muted px-6 py-4">
            <Button variant="outline" onClick={closeModal} disabled={approveMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Release Modal */}
      <Dialog open={actionType === "release" && !!actionPayout} onOpenChange={(v) => { if (!v && !releaseMutation.isPending) closeModal(); }}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden border-0 [&>button.absolute]:right-4 [&>button.absolute]:top-4 [&>button.absolute]:flex [&>button.absolute]:h-8 [&>button.absolute]:w-8 [&>button.absolute]:items-center [&>button.absolute]:justify-center [&>button.absolute]:rounded-full [&>button.absolute]:bg-white/30 [&>button.absolute]:text-white [&>button.absolute]:opacity-100 [&>button.absolute]:hover:bg-white/50 [&>button.absolute]:backdrop-blur-sm [&>button.absolute]:shadow-sm">
          <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 pt-6 pb-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 shadow-inner">
                <Send className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold text-white">Release Payout</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-blue-100">
                  Release funds to the supplier. Select a payout method below.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            <div className="rounded-sm border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-tertiary uppercase tracking-wide">Payout Amount</p>
                  <p className="text-2xl font-bold text-blue-700 mt-0.5">{formatCurrency(actionPayout?.amount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-tertiary uppercase tracking-wide">Supplier</p>
                  <p className="text-sm font-medium text-text-primary mt-0.5">{actionPayout?.supplier?.name || "—"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Payout Method</Label>
                {(() => {
                  const methods = (methodsData?.data?.methods || methodsData?.methods || []) as PayoutMethod[];
                  return methods.length ? (
                    <Select value={releaseMethod} onValueChange={setReleaseMethod}>
                      <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                      <SelectContent>
                        {methods.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.type} {m.details ? `- ${m.details}` : ""} {m.isDefault ? "(Default)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-status-rejected">Supplier has no verified payout method</p>
                  );
                })()}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Reference (optional)</Label>
                <Input id="reference" value={releaseReference} onChange={(e) => setReleaseReference(e.target.value)} placeholder="Transaction reference..." />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border-muted px-6 py-4">
            <Button variant="outline" onClick={closeModal} disabled={releaseMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => releaseMutation.mutate()} disabled={!releaseMethod || releaseMutation.isPending}>
              {releaseMutation.isPending ? "Releasing..." : "Release"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fail Modal */}
      <Dialog open={actionType === "fail" && !!actionPayout} onOpenChange={(v) => { if (!v && !failMutation.isPending) closeModal(); }}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden border-0 [&>button.absolute]:right-4 [&>button.absolute]:top-4 [&>button.absolute]:flex [&>button.absolute]:h-8 [&>button.absolute]:w-8 [&>button.absolute]:items-center [&>button.absolute]:justify-center [&>button.absolute]:rounded-full [&>button.absolute]:bg-white/30 [&>button.absolute]:text-white [&>button.absolute]:opacity-100 [&>button.absolute]:hover:bg-white/50 [&>button.absolute]:backdrop-blur-sm [&>button.absolute]:shadow-sm">
          <div className="bg-gradient-to-r from-red-700 to-red-600 px-6 pt-6 pb-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 shadow-inner">
                <XCircle className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold text-white">Mark Payout as Failed</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-red-100">
                  This will mark the payout as failed. A reason is required.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            <div className="rounded-sm border border-red-100 bg-gradient-to-r from-red-50 to-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-tertiary uppercase tracking-wide">Payout Amount</p>
                  <p className="text-2xl font-bold text-red-700 mt-0.5">{formatCurrency(actionPayout?.amount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-tertiary uppercase tracking-wide">Supplier</p>
                  <p className="text-sm font-medium text-text-primary mt-0.5">{actionPayout?.supplier?.name || "—"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
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
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border-muted px-6 py-4">
            <Button variant="outline" onClick={closeModal} disabled={failMutation.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => failMutation.mutate()} disabled={failReason.length < 10 || failMutation.isPending}>
              {failMutation.isPending ? "Failing..." : "Mark as Failed"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Panel */}
      {detailPayout && (
        <PayoutDetailPanel
          payout={detailPayout}
          supplierPhotoUrl={detailPayoutPhoto}
          onClose={() => { setDetailPayout(null); setDetailPayoutPhoto(undefined); }}
          onApprove={(p) => { setActionPayout(p); setActionType("approve"); }}
          onRelease={(p) => { setActionPayout(p); setActionType("release"); }}
          onFail={(p) => { setActionPayout(p); setActionType("fail"); }}
        />
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
