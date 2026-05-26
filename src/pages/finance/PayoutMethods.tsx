import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import type { Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionError } from "@/components/shared/SectionError";
import { SectionEmpty } from "@/components/shared/SectionEmpty";
import api from "@/lib/axios";

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
  isDefault?: boolean;
  verified?: boolean;
}

const filterOptions = [
  { value: "all", label: "All" },
  { value: "true", label: "Only with methods" },
  { value: "false", label: "Only without methods" },
];

export default function PayoutMethodsPage() {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">Payout Methods</h1>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Supplier Payout Methods</DialogTitle>
            <DialogDescription>Manage payout methods for this supplier.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {methodsLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : !methodsData?.data?.methods?.length ? (
              <SectionEmpty message="No payout methods found" />
            ) : (
              methodsData.data.methods.map((method: PayoutMethod) => (
                <div key={method.id} className="flex items-center justify-between rounded-sm border border-border p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{method.type || "Unknown"}</Badge>
                      {method.isDefault && <Badge variant="info">Default</Badge>}
                      {method.verified ? (
                        <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3" /> Verified</Badge>
                      ) : (
                        <Badge variant="error"><XCircle className="mr-1 h-3 w-3" /> Unverified</Badge>
                      )}
                    </div>
                    {method.bankName && <p className="text-sm text-text-primary">{method.bankName}</p>}
                    {method.accountName && <p className="text-sm text-text-secondary">{method.accountName}</p>}
                    {method.details && <p className="text-sm text-text-tertiary">{method.details}</p>}
                  </div>
                  <Button
                    size="sm"
                    variant={method.verified ? "outline" : "default"}
                    onClick={() => verifyMutation.mutate({ methodId: method.id, verified: !method.verified })}
                    disabled={verifyMutation.isPending}
                  >
                    {method.verified ? "Unverify" : "Verify"}
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
