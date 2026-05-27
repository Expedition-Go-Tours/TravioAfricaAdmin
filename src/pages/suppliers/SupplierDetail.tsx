import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { SectionError } from "@/components/shared/SectionError";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/axios";

interface SupplierData {
  id?: string;
  user?: { id?: string; name?: string; email?: string; photo?: string; role?: string; roles?: string[] };
  businessInfo?: {
    legalBusinessName?: string; businessName?: string; displayName?: string; businessType?: string;
    country?: string; city?: string; state?: string; address?: string | { line1?: string; city?: string; state?: string; postalCode?: string };
    phoneNumber?: string; phone?: string;
    website?: string;
  };
  operatingInfo?: {
    tourCategories?: string[]; destinations?: string[]; languages?: string[];
    cancellationPolicy?: string; meetingStyle?: string; yearsInBusiness?: string;
    regions?: string[]; serviceArea?: string;
    hours?: Record<string, string>;
    capacity?: { maxGroupSize?: number; monthlyBookings?: number };
  };
  representativeInfo?: {
    fullName?: string; email?: string; phoneNumber?: string; phone?: string; dateOfBirth?: string;
    dob?: string; birthDate?: string;
    idType?: string; idNumber?: string; idDocumentUrl?: string;
    address?: string | { line1?: string; city?: string; state?: string; postalCode?: string };
  };
  businessDocuments?: {
    registrationDocumentUrl?: string; taxDocumentUrl?: string; proofOfAddressUrl?: string;
    licenses?: string[];
  };
  documents?: {
    registrationDocument?: string; taxDocument?: string; proofOfAddress?: string;
    idDocument?: string; licenses?: string[];
  };
  payoutInfo?: {
    bankAccountName?: string; bankName?: string; bankCountry?: string; bankCode?: string;
    payoutCurrency?: string; currency?: string; method?: string;
    accountName?: string; accountNumber?: string;
  };
  compliance?: {
    acceptedTerms?: boolean; agreedToPayoutTerms?: boolean; verified?: boolean; reviewStatus?: string;
    termsAccepted?: boolean; privacyAccepted?: boolean; codeOfConductAccepted?: boolean;
    dataProcessingAccepted?: boolean; marketingConsent?: boolean;
  };
  status?: string;
}

type ActionType = "approve" | "reject" | "request_info" | "activate" | "suspend" | "reactivate" | "delete";

const actionModals: Record<string, { title: string; description: string; hasReason?: boolean; reasonRequired?: boolean; reasonMin?: number; confirmLabel?: string; confirmVariant?: "default" | "destructive" }> = {
  approve: { title: "Approve Application", description: "Approve this supplier application?", hasReason: true, confirmLabel: "Approve", confirmVariant: "default" },
  reject: { title: "Reject Application", description: "Reject this supplier application?", hasReason: true, reasonRequired: true, reasonMin: 10, confirmLabel: "Reject", confirmVariant: "destructive" },
  request_info: { title: "Request Info", description: "Request more information from the supplier?", hasReason: true, reasonRequired: true, reasonMin: 10, confirmLabel: "Request Info", confirmVariant: "default" },
  activate: { title: "Activate Supplier", description: "Activate this supplier? They will be able to create tours.", confirmLabel: "Activate", confirmVariant: "default" },
  suspend: { title: "Suspend Supplier", description: "Suspend this supplier?", hasReason: true, reasonRequired: true, reasonMin: 10, confirmLabel: "Suspend", confirmVariant: "destructive" },
  reactivate: { title: "Reactivate Supplier", description: "Reactivate this supplier?", confirmLabel: "Reactivate", confirmVariant: "default" },
};

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("business");
  const [modalAction, setModalAction] = useState<ActionType | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "supplier", id],
    queryFn: async () => {
      try {
        const direct = await api.get(`/suppliers/admin/applications/${id}`);
        if (direct.data?.data || direct.data) return direct.data?.data || direct.data;
      } catch {
        // try applications list fallback
      }
      const res = await api.get<{ data: { applications?: SupplierData[] } }>(`/suppliers/admin/applications?limit=500`);
      const byId = (a: SupplierData) => a.id === id || a.user?.id === id;
      const found = res.data?.data?.applications?.find(byId);
      if (found) return found;
      throw new Error("Supplier not found");
    },
    enabled: !!id,
  });

  const supplier = data as SupplierData | undefined;
  const user = supplier?.user;
  const status = supplier?.status || "";
  const userId = user?.id || id;

  const reviewMutation = useMutation({
    mutationFn: (body: { action: string; notes?: string }) =>
      api.patch(`/suppliers/admin/applications/${id}/review`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "supplier", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "suppliers"] });
      toast.success("Action completed successfully");
      setModalAction(null);
      setReason("");
    },
    onError: () => toast.error("Failed to perform action"),
  });

  const toggleMutation = useMutation({
    mutationFn: (body: { suspend: boolean; reason?: string }) =>
      api.patch(`/suppliers/admin/${userId}/suspend`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "supplier", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "suppliers"] });
      toast.success("Status updated");
      setModalAction(null);
      setReason("");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const activateMutation = useMutation({
    mutationFn: () => api.patch(`/suppliers/admin/${userId}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "supplier", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "suppliers"] });
      toast.success("Supplier activated!");
      setModalAction(null);
    },
    onError: () => toast.error("Failed to activate supplier"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/users/${userId}`),
    onSuccess: () => {
      toast.success("User deleted");
      navigate("/admin/suppliers");
    },
    onError: () => toast.error("Failed to delete user"),
  });

  const handleAction = () => {
    if (!modalAction) return;
    if (modalAction === "activate") {
      activateMutation.mutate();
    } else if (modalAction === "suspend") {
      toggleMutation.mutate({ suspend: true, reason });
    } else if (modalAction === "reactivate") {
      toggleMutation.mutate({ suspend: false, reason });
    } else if (["approve", "reject", "request_info"].includes(modalAction)) {
      const body: { action: string; notes?: string } = { action: modalAction };
      if (reason) body.notes = reason;
      reviewMutation.mutate(body);
    }
  };

  const getActionButtons = () => {
    const s = status;
    if (["PENDING", "UNDER_REVIEW"].includes(s)) {
      return [
        { label: "Approve", action: "approve" as ActionType, variant: "default" as const },
        { label: "Reject", action: "reject" as ActionType, variant: "destructive" as const },
        { label: "Request Info", action: "request_info" as ActionType, variant: "outline" as const },
      ];
    }
    if (s === "APPROVED") return [{ label: "Activate", action: "activate" as ActionType, variant: "default" as const }];
    if (s === "ACTIVE") return [{ label: "Suspend", action: "suspend" as ActionType, variant: "destructive" as const }];
    if (s === "SUSPENDED") return [{ label: "Reactivate", action: "reactivate" as ActionType, variant: "default" as const }];
    return [];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (isError) return <SectionError message="Failed to load supplier" onRetry={() => refetch()} />;
  if (!supplier) return <SectionError message="Supplier not found" />;

  const actions = getActionButtons();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/suppliers")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <h1 className="text-lg font-semibold text-text-primary">Supplier Detail</h1>
      </div>

      {/* User Info Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-lg font-bold text-text-secondary">
            {user?.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="text-md font-semibold text-text-primary">{user?.name || "Unknown"}</p>
            <p className="text-sm text-text-secondary">{user?.email || "—"}</p>
            <p className="text-xs text-text-tertiary">Role: {user?.role || (user?.roles?.length ? user.roles.join(", ") : "Supplier")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          {actions.map((btn) => (
            <Button
              key={btn.action}
              variant={btn.variant}
              size="sm"
              onClick={() => { setModalAction(btn.action); setReason(""); }}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="operating">Operating</TabsTrigger>
          <TabsTrigger value="representative">Representative</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="payout">Payout</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card>
            <CardHeader><CardTitle>Business Information</CardTitle></CardHeader>
            <CardContent>
              <DetailTable
                rows={[
                  { label: "Legal Business Name", value: supplier.businessInfo?.legalBusinessName || supplier.businessInfo?.businessName || supplier.businessInfo?.displayName },
                  { label: "Display Name", value: supplier.businessInfo?.displayName || supplier.businessInfo?.legalBusinessName || supplier.businessInfo?.businessName },
                  { label: "Business Type", value: supplier.businessInfo?.businessType },
                  { label: "Phone", value: supplier.businessInfo?.phoneNumber || supplier.businessInfo?.phone },
                  { label: "Country", value: supplier.businessInfo?.country },
                  { label: "City", value: supplier.businessInfo?.city || (typeof supplier.businessInfo?.address === "object" ? supplier.businessInfo?.address?.city : undefined) },
                  { label: "State", value: supplier.businessInfo?.state || (typeof supplier.businessInfo?.address === "object" ? supplier.businessInfo?.address?.state : undefined) },
                  { label: "Address", value: typeof supplier.businessInfo?.address === "string" ? supplier.businessInfo.address : supplier.businessInfo?.address?.line1 },
                  { label: "Website", value: supplier.businessInfo?.website },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operating">
          <Card>
            <CardHeader><CardTitle>Operating Information</CardTitle></CardHeader>
            <CardContent>
              <DetailTable
                rows={[
                  { label: "Tour Categories", value: supplier.operatingInfo?.tourCategories?.length ? supplier.operatingInfo.tourCategories.join(", ") : "—" },
                  { label: "Destinations", value: supplier.operatingInfo?.destinations?.length ? supplier.operatingInfo.destinations.join(", ") : "—" },
                  { label: "Languages", value: supplier.operatingInfo?.languages?.length ? supplier.operatingInfo.languages.join(", ") : "—" },
                  { label: "Regions", value: supplier.operatingInfo?.regions?.length ? supplier.operatingInfo.regions.join(", ") : "—" },
                  { label: "Service Area", value: supplier.operatingInfo?.serviceArea },
                  { label: "Cancellation Policy", value: supplier.operatingInfo?.cancellationPolicy },
                  { label: "Meeting Style", value: supplier.operatingInfo?.meetingStyle },
                  { label: "Years in Business", value: supplier.operatingInfo?.yearsInBusiness },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="representative">
          <Card>
            <CardHeader><CardTitle>Representative Information</CardTitle></CardHeader>
            <CardContent>
              <DetailTable
                rows={[
                  { label: "Full Name", value: supplier.representativeInfo?.fullName },
                  { label: "Email", value: supplier.representativeInfo?.email },
                  { label: "Phone", value: supplier.representativeInfo?.phoneNumber || supplier.representativeInfo?.phone },
                  { label: "Date of Birth", value: supplier.representativeInfo?.dateOfBirth || supplier.representativeInfo?.dob || supplier.representativeInfo?.birthDate },
                  { label: "ID Type", value: supplier.representativeInfo?.idType },
                  { label: "Address", value: typeof supplier.representativeInfo?.address === "string" ? supplier.representativeInfo.address : supplier.representativeInfo?.address?.line1 },
                ]}
              />
              <div className="mt-4">
                <DetailTable
                  rows={[
                    { label: "ID Document", value: supplier.representativeInfo?.idDocumentUrl, type: "image" },
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
            <CardContent>
              <DetailTable
                rows={[
                  { label: "Registration Document", value: supplier.businessDocuments?.registrationDocumentUrl, type: "image" },
                  { label: "Tax Document", value: supplier.businessDocuments?.taxDocumentUrl, type: "image" },
                  { label: "Proof of Address", value: supplier.businessDocuments?.proofOfAddressUrl, type: "image" },
                ]}
              />
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-text-secondary">Licenses</p>
                <div className="flex flex-wrap gap-3">
                  {supplier.businessDocuments?.licenses?.length ? supplier.businessDocuments.licenses.map((l, i) => (
                    <a key={i} href={l} target="_blank" rel="noopener noreferrer" className="group relative">
                      <img src={l} alt={`License ${i + 1}`} className="h-24 w-32 rounded-lg border border-border-muted object-cover shadow-sm transition-shadow hover:shadow-md" />
                      <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 text-xs text-white transition-colors group-hover:bg-black/40">View</span>
                    </a>
                  )) : <span className="text-sm text-text-tertiary">None</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payout">
          <Card>
            <CardHeader><CardTitle>Payout Information</CardTitle></CardHeader>
            <CardContent>
              <DetailTable
                rows={[
                  { label: "Bank Account Name", value: supplier.payoutInfo?.bankAccountName || supplier.payoutInfo?.accountName },
                  { label: "Account Number", value: supplier.payoutInfo?.accountNumber },
                  { label: "Bank Name", value: supplier.payoutInfo?.bankName },
                  { label: "Bank Code", value: supplier.payoutInfo?.bankCode },
                  { label: "Bank Country", value: supplier.payoutInfo?.bankCountry },
                  { label: "Payout Currency", value: supplier.payoutInfo?.payoutCurrency || supplier.payoutInfo?.currency },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader><CardTitle>Compliance</CardTitle></CardHeader>
            <CardContent>
              <DetailTable
                rows={[
                  { label: "Accepted Terms", value: (supplier.compliance?.acceptedTerms ?? supplier.compliance?.termsAccepted) ? "Yes" : "No", type: "badge", badgeColor: (supplier.compliance?.acceptedTerms ?? supplier.compliance?.termsAccepted) ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700" },
                  { label: "Privacy Accepted", value: supplier.compliance?.privacyAccepted ? "Yes" : "No", type: "badge", badgeColor: supplier.compliance?.privacyAccepted ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700" },
                  { label: "Agreed to Payout Terms", value: supplier.compliance?.agreedToPayoutTerms ? "Yes" : "No", type: "badge", badgeColor: supplier.compliance?.agreedToPayoutTerms ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700" },
                  { label: "Verified", value: supplier.compliance?.verified ? "Yes" : "No", type: "badge", badgeColor: supplier.compliance?.verified ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700" },
                  { label: "Review Status", value: supplier.compliance?.reviewStatus || supplier.status },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete User */}
      <div className="flex justify-end border-t border-border-muted pt-4">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setModalAction("delete" as ActionType)}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete User
        </Button>
      </div>

      {/* Action Modal */}
      {modalAction && modalAction !== "delete" && (
        <ConfirmModal
          open={!!modalAction}
          title={actionModals[modalAction]?.title || "Confirm"}
          description={actionModals[modalAction]?.description || "Are you sure?"}
          confirmLabel={actionModals[modalAction]?.confirmLabel || "Confirm"}
          confirmVariant={actionModals[modalAction]?.confirmVariant}
          loading={reviewMutation.isPending || toggleMutation.isPending || activateMutation.isPending}
          onConfirm={handleAction}
          onCancel={() => { setModalAction(null); setReason(""); }}
        >
          {modalAction && (actionModals as Record<string, { hasReason?: boolean }>)[modalAction]?.hasReason && (
            <div className="space-y-2 py-2">
              <Label htmlFor="reason">
                Notes {(actionModals as Record<string, { reasonRequired?: boolean }>)[modalAction]?.reasonRequired ? "(required)" : "(optional)"}
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={(actionModals as Record<string, { reasonRequired?: boolean }>)[modalAction]?.reasonRequired ? "Enter reason (min 10 characters)..." : "Enter notes..."}
                rows={3}
              />
              {(actionModals as Record<string, { reasonRequired?: boolean; reasonMin?: number }>)[modalAction]?.reasonRequired && reason.length > 0 && reason.length < ((actionModals as Record<string, { reasonMin?: number }>)[modalAction]?.reasonMin || 10) && (
                <p className="text-xs text-status-rejected">Minimum {(actionModals as Record<string, { reasonMin?: number }>)[modalAction]?.reasonMin} characters</p>
              )}
            </div>
          )}
        </ConfirmModal>
      )}

      {/* Delete Modal */}
      {modalAction === "delete" && (
        <ConfirmModal
          open={true}
          title="Delete User?"
          description={`This will permanently delete ${user?.name || "this user"}'s account. This action cannot be undone.`}
          confirmLabel="Delete"
          confirmVariant="destructive"
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setModalAction(null)}
        >
          <div className="rounded-sm bg-surface-muted p-3 text-sm space-y-1">
            <p><span className="text-text-secondary">Name:</span> {user?.name || "—"}</p>
            <p><span className="text-text-secondary">Email:</span> {user?.email || "—"}</p>
            <p><span className="text-text-secondary">Role:</span> {user?.role || (user?.roles?.length ? user.roles.join(", ") : "—")}</p>
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}

function DetailTable({ rows }: { rows: Array<{ label: string; value?: string | null | undefined; type?: "text" | "badge" | "image"; badgeColor?: string }> }) {
  return (
    <table className="w-full text-sm border-collapse border border-border-muted">
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-b border-border-muted">
            <td className="w-1/3 py-2.5 px-4 text-xs font-medium text-text-secondary uppercase tracking-wider border-r border-border-muted align-middle">{r.label}</td>
            <td className="py-2.5 px-4 text-text-primary align-middle">
              {r.type === "badge" ? (
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${r.badgeColor || "bg-surface-muted text-text-secondary"}`}>{r.value || "—"}</span>
              ) : r.type === "image" && r.value ? (
                <a href={r.value} target="_blank" rel="noopener noreferrer" className="group relative inline-block">
                  <img src={r.value} alt={r.label} className="h-24 w-32 rounded-lg border border-border-muted object-cover shadow-sm transition-shadow hover:shadow-md" />
                  <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 text-xs text-white transition-colors group-hover:bg-black/40">View</span>
                </a>
              ) : (
                <span>{r.value || "—"}</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
