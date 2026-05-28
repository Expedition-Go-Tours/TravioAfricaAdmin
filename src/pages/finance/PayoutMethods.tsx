import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle, Building2, Check, AlertCircle, ArrowLeft, Wallet, Smartphone, CreditCard, Globe, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { SectionError } from "@/components/shared/SectionError";
import { SectionEmpty } from "@/components/shared/SectionEmpty";
import api from "@/lib/axios";
import { formatDate } from "@/lib/utils";

interface PayoutMethodSupplier {
  id: string;
  name?: string;
  email?: string;
  user?: { name?: string; email?: string };
  status?: string;
  supplierProfile?: { status?: string };
  methodsCount?: number;
  defaultMethod?: string;
  payoutMethods?: PayoutMethod[];
}

interface PayoutMethod {
  id: string;
  type?: string;
  details?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  bankCode?: string;
  swift?: string;
  iban?: string;
  routingNumber?: string;
  currency?: string;
  country?: string;
  phoneNumber?: string;
  email?: string;
  isDefault?: boolean;
  verified?: boolean;
  createdAt?: string;
}

const filterOptions = [
  { value: "all", label: "All" },
  { value: "true", label: "Only with methods" },
  { value: "false", label: "Only without methods" },
];

export default function PayoutMethodsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [hasMethod, setHasMethod] = useState("all");
  const [viewSupplierId, setViewSupplierId] = useState<string | null>(null);
  const limit = 20;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "payout-methods", { page, limit, hasMethod }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (hasMethod && hasMethod !== "all") params.set("hasMethod", hasMethod);
      return api.get(`/payout-methods/admin?${params.toString()}`).then((r) => r.data);
    },
  });

  const { data: methodsData, isLoading: methodsLoading } = useQuery({
    queryKey: ["admin", "payout-methods", "supplier", viewSupplierId],
    queryFn: () => api.get(`/payout-methods/admin/suppliers/${viewSupplierId}`).then((r) => r.data),
    enabled: !!viewSupplierId,
  });

  const verifyMutation = useMutation({
    mutationFn: ({ methodId, verified }: { methodId: string; verified: boolean }) =>
      api.patch(`/payout-methods/admin/${methodId}/verify`, { verified }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payout-methods", "supplier", viewSupplierId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "payout-methods"] });
      toast.success("Payout method verification updated");
    },
    onError: () => toast.error("Failed to update verification"),
  });

  const columns: Column<PayoutMethodSupplier>[] = [
    { key: "name", header: "Supplier Name", render: (r) => r.name || r.user?.name || "—" },
    { key: "email", header: "Email", render: (r) => r.email || r.user?.email || "—" },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.supplierProfile?.status || r.status || "UNKNOWN"} /> },
    { key: "methodsCount", header: "Methods Count", render: (r) => String(r.payoutMethods?.length ?? r.methodsCount ?? 0) },
    { key: "defaultMethod", header: "Default Method", render: (r) => r.payoutMethods?.find((m: PayoutMethod) => m.isDefault)?.type?.replace(/_/g, " ") || r.defaultMethod || "—" },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setViewSupplierId(r.id); }}>
          <Eye className="mr-1 h-3 w-3" /> View Methods
        </Button>
      ),
    },
  ];

  const suppliers = data?.suppliers || data?.data?.suppliers || [];
  const pagination = data?.pagination || data?.data?.pagination;
  const selectedSupplier = suppliers.find((s: PayoutMethodSupplier) => s.id === viewSupplierId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="rounded-sm bg-white p-1.5 shadow-sm hover:ring-2 hover:ring-green-300 transition-all">
            <ArrowLeft className="h-4 w-4 text-text-primary" />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">Payout Methods</h1>
        </div>
        <Select value={hasMethod} onValueChange={(v) => { setHasMethod(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={suppliers}
            loading={isLoading}
            error={isError ? "Failed to load payout methods" : null}
            emptyMessage="No suppliers found"
            pagination={pagination ? { page: pagination.page || page, totalPages: pagination.totalPages || 1, totalCount: pagination.totalCount || 0, onPageChange: setPage } : undefined}
            onRetry={() => refetch()}
            keyExtractor={(r) => r.id}
          />
        </CardContent>
      </Card>

      {/* View Methods Dialog */}
      <Dialog open={!!viewSupplierId} onOpenChange={(v) => { if (!v) setViewSupplierId(null); }}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden border-0 [&>button.absolute]:right-4 [&>button.absolute]:top-4 [&>button.absolute]:flex [&>button.absolute]:h-8 [&>button.absolute]:w-8 [&>button.absolute]:items-center [&>button.absolute]:justify-center [&>button.absolute]:rounded-full [&>button.absolute]:bg-white/30 [&>button.absolute]:text-black [&>button.absolute]:opacity-100 [&>button.absolute]:hover:bg-white/50 [&>button.absolute]:backdrop-blur-sm [&>button.absolute]:shadow-sm [&_.lucide-x]:h-4.5 [&_.lucide-x]:w-4.5">
          {/* Supplier header — gradient banner */}
          <div className="bg-gradient-to-r from-green-700 to-green-600 px-6 pt-6 pb-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-base font-bold text-white shadow-inner">
                {(selectedSupplier?.name || selectedSupplier?.user?.name)?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold text-white">{selectedSupplier?.name || selectedSupplier?.user?.name || "Supplier"}</DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-green-100">
                  <span>{selectedSupplier?.email || selectedSupplier?.user?.email || ""}</span>
                  <span className="h-3 w-px bg-green-400/40" />
                  <StatusBadge status={selectedSupplier?.supplierProfile?.status || selectedSupplier?.status || "UNKNOWN"} className="bg-white/90 text-green-800 border-white/50" />
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            {methodsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-44 w-full rounded-sm" />)}
              </div>
            ) : !methodsData?.data?.methods?.length ? (
              <SectionEmpty message="No payout methods set up yet" />
            ) : (
              <div className="space-y-6">
                {/* Summary chip */}
                <div className="flex items-center gap-3 rounded-sm bg-green-50/60 px-4 py-2.5 border border-green-100">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100">
                    <Building2 className="h-3.5 w-3.5 text-green-700" />
                  </div>
                  <span className="text-sm text-text-primary">
                    <span className="font-semibold">{methodsData.data.methods.length}</span> method{methodsData.data.methods.length > 1 ? "s" : ""} on file
                  </span>
                  <span className="h-4 w-px bg-green-200" />
                  <span className="text-sm text-text-secondary">
                    Default:{" "}
                    <span className="font-medium text-text-primary">
                      {methodsData.data.methods.find((m: PayoutMethod) => m.isDefault)?.type?.replace(/_/g, " ") || "None set"}
                    </span>
                  </span>
                </div>

                {/* Method cards */}
                {methodsData.data.methods.map((method: PayoutMethod) => {
                  const typeKey = (method.type || "").toLowerCase();
                  const isBank = typeKey.includes("bank");
                  const isPaypal = typeKey.includes("paypal");
                  const isMobile = typeKey.includes("mobile") || typeKey.includes("momo");
                  const scheme = isBank
                    ? { badge: "bg-blue-500", bg: "from-blue-50 to-white", border: "border-blue-100", icon: Building2, iconBg: "bg-blue-100", iconColor: "text-blue-700", label: "Bank Account" }
                    : isPaypal
                    ? { badge: "bg-indigo-500", bg: "from-indigo-50 to-white", border: "border-indigo-100", icon: Wallet, iconBg: "bg-indigo-100", iconColor: "text-indigo-700", label: "PayPal Account" }
                    : isMobile
                    ? { badge: "bg-amber-500", bg: "from-amber-50 to-white", border: "border-amber-100", icon: Smartphone, iconBg: "bg-amber-100", iconColor: "text-amber-700", label: "Mobile Money" }
                    : { badge: "bg-green-500", bg: "from-green-50 to-white", border: "border-green-100", icon: CreditCard, iconBg: "bg-green-100", iconColor: "text-green-700", label: "Payment Method" };
                  const Icon = scheme.icon;
                  return (
                    <div key={method.id} className={`rounded-sm border ${scheme.border} bg-white shadow-sm overflow-hidden`}>
                      {/* Card stripe header */}
                      <div className={`flex items-center justify-between bg-gradient-to-r ${scheme.bg} px-5 py-3.5 border-b ${scheme.border}`}>
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full ${scheme.iconBg}`}>
                            <Icon className={`h-4.5 w-4.5 ${scheme.iconColor}`} />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-text-primary">{method.type?.replace(/_/g, " ") || "Unknown"}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              {method.isDefault && (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white ${scheme.badge}`}>
                                  <Check className="h-3 w-3" /> Default
                                </span>
                              )}
                              {method.verified ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                                  <CheckCircle className="h-3 w-3" /> Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                  <AlertCircle className="h-3 w-3" /> Unverified
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card body */}
                      <div className="px-5 py-4 space-y-4">
                        {/* Bank details grid */}
                        <div>
                          <p className="mb-2.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-widest flex items-center gap-1.5">
                            <Building2 className="h-3 w-3" /> Account Details
                          </p>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                            {isBank && <Field label="Bank Name" value={method.bankName} />}
                            <Field label="Account Name" value={method.accountName} />
                            <Field label="Account Number" value={method.accountNumber} />
                            {isBank && (
                              <>
                                {method.bankCode && <Field label="Bank Code" value={method.bankCode} />}
                                {method.swift && <Field label="SWIFT / BIC" value={method.swift} />}
                                {method.iban && <Field label="IBAN" value={method.iban} />}
                                {method.routingNumber && <Field label="Routing Number" value={method.routingNumber} />}
                              </>
                            )}
                            {isMobile && <Field label="Phone Number" value={method.phoneNumber} />}
                            {isPaypal && <Field label="PayPal Email" value={method.email} />}
                          </div>
                        </div>

                        {/* Region row */}
                        {(method.currency || method.country) && (
                          <div className="flex items-center gap-6 border-t border-border-muted pt-3.5">
                            <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-widest flex items-center gap-1.5">
                              <Globe className="h-3 w-3" /> Region
                            </span>
                            {method.currency && (
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-muted px-2.5 py-1 text-xs font-medium text-text-primary">
                                {method.currency}
                              </span>
                            )}
                            {method.country && (
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-muted px-2.5 py-1 text-xs font-medium text-text-primary">
                                {method.country}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Additional notes */}
                        {method.details && (
                          <div className="border-t border-border-muted pt-3.5">
                            <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-widest mb-1.5">Notes</p>
                            <p className="text-sm text-text-primary leading-relaxed">{method.details}</p>
                          </div>
                        )}

                        {/* Footer with date + verify */}
                        <div className="flex items-center justify-between border-t border-border-muted pt-3.5">
                          {method.createdAt ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
                              <Calendar className="h-3 w-3" />
                              Added {formatDate(method.createdAt)}
                            </span>
                          ) : <span />}
                          <Button
                            size="sm"
                            variant={method.verified ? "outline" : "default"}
                            onClick={() => verifyMutation.mutate({ methodId: method.id, verified: !method.verified })}
                            disabled={verifyMutation.isPending}
                            className="gap-1.5"
                          >
                            {method.verified ? <EyeOff className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                            {method.verified ? "Unverify" : "Verify"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Sub-components ── */

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-sm bg-surface-muted/50 px-3 py-2">
      <p className="text-[11px] text-text-tertiary uppercase tracking-wider">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-text-primary">{value || "—"}</p>
    </div>
  );
}
