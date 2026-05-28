import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle, Building2, Check, AlertCircle, ArrowLeft } from "lucide-react";
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
                {(selectedSupplier?.name || selectedSupplier?.user?.name)?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base">{selectedSupplier?.name || selectedSupplier?.user?.name || "Supplier"}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 text-xs mt-0.5">
                  <span>{selectedSupplier?.email || selectedSupplier?.user?.email || ""}</span>
                  <span className="h-3 w-px bg-border-muted" />
                  <StatusBadge status={selectedSupplier?.supplierProfile?.status || selectedSupplier?.status || "UNKNOWN"} />
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {methodsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-sm" />)}
            </div>
          ) : !methodsData?.data?.methods?.length ? (
            <SectionEmpty message="No payout methods set up yet" />
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-3 px-1">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {methodsData.data.methods.length} Method{methodsData.data.methods.length > 1 ? "s" : ""}
                </span>
                <span className="h-3 w-px bg-border-muted" />
                <span className="text-xs text-text-secondary">
                  Default:{" "}
                  <span className="font-medium text-text-primary">
                    {methodsData.data.methods.find((m: PayoutMethod) => m.isDefault)?.type?.replace(/_/g, " ") || "None set"}
                  </span>
                </span>
              </div>

              {methodsData.data.methods.map((method: PayoutMethod) => (
                <div key={method.id} className="rounded-sm border border-border bg-white shadow-2 overflow-hidden">
                  <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-green-50/80 px-4 py-3 border-b border-border-muted">
                    <div className="flex items-center gap-2.5">
                      <Building2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-800">{method.type?.replace(/_/g, " ") || "Unknown"}</span>
                      {method.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-700 px-2 py-0.5 text-xs font-medium text-white">
                          <Check className="h-3 w-3" /> Default
                        </span>
                      )}
                    </div>
                    {method.verified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        <CheckCircle className="h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        <AlertCircle className="h-3 w-3" /> Unverified
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Bank Details */}
                    <div>
                      <p className="mb-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">Bank Account Details</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                        <Field label="Bank Name" value={method.bankName} />
                        <Field label="Account Name" value={method.accountName} />
                        <Field label="Account Number" value={method.accountNumber} />
                        <Field label="Bank Code" value={method.bankCode} />
                        <Field label="SWIFT / BIC" value={method.swift} />
                        <Field label="IBAN" value={method.iban} />
                        <Field label="Routing Number" value={method.routingNumber} />
                      </div>
                    </div>

                    {/* Currency & Country */}
                    {(method.currency || method.country) && (
                      <div className="border-t border-border-muted pt-4">
                        <p className="mb-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">Region</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                          <Field label="Currency" value={method.currency} />
                          <Field label="Country" value={method.country} />
                        </div>
                      </div>
                    )}

                    {/* Contact Details (mobile money / PayPal) */}
                    {(method.phoneNumber || method.email) && (
                      <div className="border-t border-border-muted pt-4">
                        <p className="mb-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">Contact</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                          <Field label="Phone Number" value={method.phoneNumber} />
                          <Field label="Email" value={method.email} />
                        </div>
                      </div>
                    )}

                    {/* Additional Details */}
                    {method.details && (
                      <div className="border-t border-border-muted pt-4">
                        <p className="mb-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">Additional Notes</p>
                        <p className="text-sm text-text-primary leading-relaxed">{method.details}</p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-border-muted pt-3">
                      {method.createdAt && (
                        <span className="text-xs text-text-tertiary">
                          Added {formatDate(method.createdAt)}
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant={method.verified ? "outline" : "default"}
                        onClick={() => verifyMutation.mutate({ methodId: method.id, verified: !method.verified })}
                        disabled={verifyMutation.isPending}
                        className="gap-1.5 ml-auto"
                      >
                        {method.verified ? <EyeOff className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                        {method.verified ? "Unverify" : "Verify"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Sub-components ── */

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-text-secondary uppercase tracking-wider">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-text-primary">{value || "—"}</p>
    </div>
  );
}
