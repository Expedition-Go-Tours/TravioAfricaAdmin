import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { SectionError } from "@/components/shared/SectionError";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/axios";
import { formatDate } from "@/lib/utils";

interface SupplierData {
  id?: string;
  user?: { id?: string; name?: string; email?: string; photo?: string; role?: string; roles?: string[] };
  businessInfo?: {
    legalBusinessName?: string; businessName?: string; displayName?: string; businessType?: string;
    country?: string; city?: string; state?: string; address?: string | { line1?: string; city?: string; state?: string; postalCode?: string };
    registrationNumber?: string; taxId?: string; phone?: string; phoneNumber?: string;
    website?: string;
  };
  operatingInfo?: {
    tourCategories?: string[]; destinations?: string[]; languages?: string[];
    cancellationPolicy?: string; meetingStyle?: string; operatingSince?: string;
    regions?: string[]; serviceArea?: string;
    hours?: Record<string, string>;
    capacity?: { maxGroupSize?: number; monthlyBookings?: number };
  };
  representativeInfo?: {
    fullName?: string; email?: string; phone?: string; phoneNumber?: string; dateOfBirth?: string;
    idType?: string; idNumber?: string; idDocumentUrl?: string;
    position?: string;
    address?: string | { line1?: string; city?: string; state?: string; postalCode?: string };
  };
  businessDocuments?: {
    certificateOfRegistration?: string; taxCertificate?: string; proofOfAddress?: string;
    identification?: string; insurance?: string; licenses?: string[];
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
    queryFn: () => api.get<{ data: { applications?: SupplierData[] } }>(`/suppliers/admin/applications`).then((r) => {
      const app = r.data?.data?.applications?.find((a: SupplierData) => a.id === id);
      if (app) return app;
      throw new Error("Supplier not found");
    }),
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

  const isValidReason = () => {
    const modal = modalAction ? actionModals[modalAction] : null;
    if (!modal?.reasonRequired) return true;
    return reason.length >= (modal.reasonMin || 1);
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
              <DetailGrid
                fields={[
                  { label: "Legal Business Name", value: supplier.businessInfo?.legalBusinessName || supplier.businessInfo?.businessName || supplier.businessInfo?.displayName },
                  { label: "Display Name", value: supplier.businessInfo?.displayName || supplier.businessInfo?.legalBusinessName || supplier.businessInfo?.businessName },
                  { label: "Business Type", value: supplier.businessInfo?.businessType },
                  { label: "Phone", value: supplier.businessInfo?.phone || supplier.businessInfo?.phoneNumber },
                  { label: "Country", value: supplier.businessInfo?.country },
                  { label: "City", value: supplier.businessInfo?.city || (typeof supplier.businessInfo?.address === "object" ? supplier.businessInfo?.address?.city : undefined) },
                  { label: "State", value: supplier.businessInfo?.state || (typeof supplier.businessInfo?.address === "object" ? supplier.businessInfo?.address?.state : undefined) },
                  { label: "Address", value: typeof supplier.businessInfo?.address === "string" ? supplier.businessInfo.address : supplier.businessInfo?.address?.line1 },
                  { label: "Registration Number", value: supplier.businessInfo?.registrationNumber },
                  { label: "Tax ID", value: supplier.businessInfo?.taxId },
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
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Tour Categories</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {supplier.operatingInfo?.tourCategories?.length ? supplier.operatingInfo.tourCategories.map((c, i) => <Badge key={i} variant="secondary">{c}</Badge>) : <span className="text-sm text-text-tertiary">None</span>}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-secondary">Destinations</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {supplier.operatingInfo?.destinations?.length ? supplier.operatingInfo.destinations.map((d, i) => <Badge key={i} variant="secondary">{d}</Badge>) : <span className="text-sm text-text-tertiary">None</span>}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-secondary">Languages</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {supplier.operatingInfo?.languages?.length ? supplier.operatingInfo.languages.map((l, i) => <Badge key={i} variant="secondary">{l}</Badge>) : <span className="text-sm text-text-tertiary">None</span>}
                  </div>
                </div>
                {supplier.operatingInfo?.regions?.length ? (
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Regions</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {supplier.operatingInfo.regions.map((r, i) => <Badge key={i} variant="secondary">{r}</Badge>)}
                    </div>
                  </div>
                ) : null}
                {supplier.operatingInfo?.serviceArea ? (
                  <DetailGrid fields={[{ label: "Service Area", value: supplier.operatingInfo.serviceArea }]} />
                ) : null}
                <DetailGrid
                  fields={[
                    { label: "Cancellation Policy", value: supplier.operatingInfo?.cancellationPolicy },
                    { label: "Meeting Style", value: supplier.operatingInfo?.meetingStyle },
                    { label: "Operating Since", value: supplier.operatingInfo?.operatingSince },
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="representative">
          <Card>
            <CardHeader><CardTitle>Representative Information</CardTitle></CardHeader>
            <CardContent>
              <DetailGrid
                fields={[
                  { label: "Full Name", value: supplier.representativeInfo?.fullName },
                  { label: "Position", value: supplier.representativeInfo?.position },
                  { label: "Email", value: supplier.representativeInfo?.email },
                  { label: "Phone", value: supplier.representativeInfo?.phone || supplier.representativeInfo?.phoneNumber },
                  { label: "Date of Birth", value: supplier.representativeInfo?.dateOfBirth || supplier.representativeInfo?.dob || supplier.representativeInfo?.birthDate },
                  { label: "ID Type", value: supplier.representativeInfo?.idType },
                  { label: "ID Number", value: supplier.representativeInfo?.idNumber || supplier.representativeInfo?.idDocumentUrl },
                  { label: "Address", value: typeof supplier.representativeInfo?.address === "string" ? supplier.representativeInfo.address : supplier.representativeInfo?.address?.line1 },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
            <CardContent>
              <DetailGrid
                fields={[
                  { label: "Registration Document", value: supplier.businessDocuments?.certificateOfRegistration || supplier.documents?.registrationDocument, isLink: true },
                  { label: "Tax Document", value: supplier.businessDocuments?.taxCertificate || supplier.documents?.taxDocument, isLink: true },
                  { label: "Insurance", value: supplier.businessDocuments?.insurance, isLink: true },
                  { label: "ID Document", value: supplier.businessDocuments?.identification || supplier.documents?.idDocument, isLink: true },
                  { label: "Proof of Address", value: supplier.businessDocuments?.proofOfAddress || supplier.documents?.proofOfAddress, isLink: true },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payout">
          <Card>
            <CardHeader><CardTitle>Payout Information</CardTitle></CardHeader>
            <CardContent>
              <DetailGrid
                fields={[
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
              <DetailGrid
                fields={[
                  { label: "Accepted Terms", value: (supplier.compliance?.acceptedTerms ?? supplier.compliance?.termsAccepted) ? "Yes" : "No", isBadge: true, badgeColor: (supplier.compliance?.acceptedTerms ?? supplier.compliance?.termsAccepted) ? "bg-status-active/10 text-status-active" : "bg-status-rejected/10 text-status-rejected" },
                  { label: "Privacy Accepted", value: supplier.compliance?.privacyAccepted ? "Yes" : "No", isBadge: true, badgeColor: supplier.compliance?.privacyAccepted ? "bg-status-active/10 text-status-active" : "bg-status-rejected/10 text-status-rejected" },
                  { label: "Agreed to Payout Terms", value: supplier.compliance?.agreedToPayoutTerms ? "Yes" : "No", isBadge: true, badgeColor: supplier.compliance?.agreedToPayoutTerms ? "bg-status-active/10 text-status-active" : "bg-status-rejected/10 text-status-rejected" },
                  { label: "Verified", value: supplier.compliance?.verified ? "Yes" : "No", isBadge: true, badgeColor: supplier.compliance?.verified ? "bg-status-active/10 text-status-active" : "bg-status-rejected/10 text-status-rejected" },
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

function DetailGrid({ fields }: { fields: Array<{ label: string; value?: string | null; isLink?: boolean; isBadge?: boolean; badgeColor?: string }> }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {fields.map((f) => (
        <div key={f.label}>
          <p className="text-xs font-medium text-text-secondary">{f.label}</p>
          {f.isBadge ? (
            <span className={`inline-block mt-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${f.badgeColor || "bg-surface-muted text-text-secondary"}`}>{f.value || "—"}</span>
          ) : f.isLink && f.value ? (
            <a href={f.value} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-sm text-status-approved hover:underline">
              <ExternalLink className="h-3 w-3" /> View Document
            </a>
          ) : (
            <p className="mt-1 text-sm text-text-primary">{f.value || "—"}</p>
          )}
        </div>
      ))}
    </div>
  );
}
