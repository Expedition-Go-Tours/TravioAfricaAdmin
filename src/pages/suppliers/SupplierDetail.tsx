import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Trash2,
  Building2,
  Globe,
  Phone,
  Mail,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
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
import { formatDate } from "@/lib/utils";

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
  createdAt?: string;
}

type ActionType = "approve" | "reject" | "request_info" | "activate" | "suspend" | "reactivate" | "delete";

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
        { label: "Approve", action: "approve" as ActionType, icon: <CheckCircle className="h-3.5 w-3.5" />, variant: "default" as const },
        { label: "Reject", action: "reject" as ActionType, icon: <XCircle className="h-3.5 w-3.5" />, variant: "destructive" as const },
        { label: "Request Info", action: "request_info" as ActionType, icon: <AlertTriangle className="h-3.5 w-3.5" />, variant: "outline" as const },
      ];
    }
    if (s === "APPROVED") return [{ label: "Activate", action: "activate" as ActionType, icon: <CheckCircle className="h-3.5 w-3.5" />, variant: "default" as const }];
    if (s === "ACTIVE") return [{ label: "Suspend", action: "suspend" as ActionType, icon: <AlertTriangle className="h-3.5 w-3.5" />, variant: "destructive" as const }];
    if (s === "SUSPENDED") return [{ label: "Reactivate", action: "reactivate" as ActionType, icon: <CheckCircle className="h-3.5 w-3.5" />, variant: "default" as const }];
    return [];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-40 w-full rounded-sm" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (isError) return <SectionError message="Failed to load supplier" onRetry={() => refetch()} />;
  if (!supplier) return <SectionError message="Supplier not found" />;

  const actions = getActionButtons();

  return (
    <div className="space-y-6">
      {/* Breadcrumb-style nav */}
      <div className="flex items-center gap-2 text-sm text-text-tertiary">
        <button onClick={() => navigate(-1)} className="rounded-sm bg-white p-1.5 shadow-sm hover:ring-2 hover:ring-green-300 transition-all">
          <ArrowLeft className="h-4 w-4 text-text-primary" />
        </button>
        <button onClick={() => navigate("/admin/suppliers")} className="hover:text-text-primary transition-colors">Suppliers</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-text-primary font-medium truncate">{user?.name || "Supplier Detail"}</span>
      </div>

      {/* Profile Header */}
      <div className="rounded-sm border border-border bg-white shadow-2">
        <div className="relative h-20 rounded-t-sm bg-gradient-to-r from-green-600 to-green-700" />
        <div className="relative px-6 pb-5 pt-9">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4 -mt-8">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-white bg-green-100 text-xl font-bold text-green-700 shadow-sm">
                {user?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="pb-0.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-lg font-semibold text-text-primary">{user?.name || "Unknown"}</h1>
                  <StatusBadge status={status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-text-secondary">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-text-tertiary" />
                    {user?.email || "—"}
                  </span>
                  {supplier.businessInfo?.phoneNumber && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-text-tertiary" />
                      {supplier.businessInfo.phoneNumber}
                    </span>
                  )}
                  {supplier.businessInfo?.country && (
                    <span className="inline-flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5 text-text-tertiary" />
                      {supplier.businessInfo.country}
                    </span>
                  )}
                  {supplier.createdAt && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
                      {formatDate(supplier.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-4">
              {actions.map((btn) => (
                <Button
                  key={btn.action}
                  variant={btn.variant}
                  size="sm"
                  onClick={() => { setModalAction(btn.action); setReason(""); }}
                  className="gap-1.5"
                >
                  {btn.icon}
                  {btn.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="business"><Building2 className="mr-1.5 h-3.5 w-3.5" /> Business</TabsTrigger>
          <TabsTrigger value="operating"><Globe className="mr-1.5 h-3.5 w-3.5" /> Operating</TabsTrigger>
          <TabsTrigger value="representative"><Shield className="mr-1.5 h-3.5 w-3.5" /> Rep</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="payout">Payout</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-text-primary">Business Information</CardTitle></CardHeader>
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
            <CardHeader><CardTitle className="text-sm font-semibold text-text-primary">Operating Information</CardTitle></CardHeader>
            <CardContent>
              <DetailTable
                rows={[
                  { label: "Tour Categories", value: supplier.operatingInfo?.tourCategories?.length ? supplier.operatingInfo.tourCategories.join(", ") : null },
                  { label: "Destinations", value: supplier.operatingInfo?.destinations?.length ? supplier.operatingInfo.destinations.join(", ") : null },
                  { label: "Languages", value: supplier.operatingInfo?.languages?.length ? supplier.operatingInfo.languages.join(", ") : null },
                  { label: "Regions", value: supplier.operatingInfo?.regions?.length ? supplier.operatingInfo.regions.join(", ") : null },
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
            <CardHeader><CardTitle className="text-sm font-semibold text-text-primary">Representative Information</CardTitle></CardHeader>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-text-primary">Business Documents</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Registration", url: supplier.businessDocuments?.registrationDocumentUrl || supplier.documents?.registrationDocument },
                  { label: "Tax Document", url: supplier.businessDocuments?.taxDocumentUrl || supplier.documents?.taxDocument },
                  { label: "Proof of Address", url: supplier.businessDocuments?.proofOfAddressUrl || supplier.documents?.proofOfAddress },
                  { label: "ID Document", url: supplier.representativeInfo?.idDocumentUrl || supplier.documents?.idDocument },
                ].map((doc) => (
                  <div key={doc.label} className="rounded-sm border border-border-muted overflow-hidden">
                    <div className="bg-gradient-to-r from-green-50 to-green-50/80 px-3 py-2 border-b border-border-muted">
                      <p className="text-xs font-medium text-green-800">{doc.label}</p>
                    </div>
                    <div className="p-2">
                      {doc.url ? (
                        <DocumentPreview url={doc.url} label={doc.label} />
                      ) : (
                        <div className="flex h-44 items-center justify-center rounded-sm bg-surface-muted text-xs text-text-tertiary">Not provided</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {!!supplier.businessDocuments?.licenses?.length && (
                <div className="mt-5 border-t border-border-muted pt-5">
                  <p className="mb-3 text-xs font-medium text-text-secondary uppercase tracking-wider">Licenses ({supplier.businessDocuments.licenses.length})</p>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {supplier.businessDocuments.licenses.map((l, i) => (
                      <div key={i} className="rounded-sm border border-border-muted overflow-hidden">
                        <div className="bg-gradient-to-r from-green-50 to-green-50/80 px-3 py-2 border-b border-border-muted">
                          <p className="text-xs font-medium text-green-800">License {i + 1}</p>
                        </div>
                        <div className="p-2">
                          <DocumentPreview url={l} label={`License ${i + 1}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payout">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-text-primary">Payout Information</CardTitle></CardHeader>
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
            <CardHeader><CardTitle className="text-sm font-semibold text-text-primary">Compliance Checklist</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "Accepted Terms", value: supplier.compliance?.acceptedTerms ?? supplier.compliance?.termsAccepted },
                  { label: "Privacy Accepted", value: supplier.compliance?.privacyAccepted },
                  { label: "Agreed to Payout Terms", value: supplier.compliance?.agreedToPayoutTerms },
                  { label: "Verified", value: supplier.compliance?.verified },
                  { label: "Code of Conduct", value: supplier.compliance?.codeOfConductAccepted },
                  { label: "Data Processing", value: supplier.compliance?.dataProcessingAccepted },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-sm border border-border-muted px-4 py-2.5">
                    <span className="text-sm text-text-primary">{item.label}</span>
                    {item.value ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                        <XCircle className="h-3.5 w-3.5" />
                        No
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete User — subtle, at bottom */}
      <div className="flex items-center justify-between rounded-sm border border-border-muted px-5 py-3">
        <div>
          <p className="text-sm font-medium text-text-primary">Danger Zone</p>
          <p className="text-xs text-text-tertiary">Permanently delete this user and all associated data</p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setModalAction("delete" as ActionType)}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete User
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
          {modalAction && actionModals[modalAction]?.hasReason && (
            <div className="space-y-2 py-2">
              <Label htmlFor="reason">
                Notes {actionModals[modalAction]?.reasonRequired ? "(required)" : "(optional)"}
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={actionModals[modalAction]?.reasonRequired ? "Enter reason (min 10 characters)..." : "Enter notes..."}
                rows={3}
              />
              {actionModals[modalAction]?.reasonRequired && reason.length > 0 && reason.length < (actionModals[modalAction]?.reasonMin || 10) && (
                <p className="text-xs text-status-rejected">Minimum {actionModals[modalAction]?.reasonMin} characters</p>
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

/* ── Sub-components ── */

const actionModals: Record<string, { title: string; description: string; hasReason?: boolean; reasonRequired?: boolean; reasonMin?: number; confirmLabel?: string; confirmVariant?: "default" | "destructive" }> = {
  approve: { title: "Approve Application", description: "Approve this supplier application?", hasReason: true, confirmLabel: "Approve", confirmVariant: "default" },
  reject: { title: "Reject Application", description: "Reject this supplier application?", hasReason: true, reasonRequired: true, reasonMin: 10, confirmLabel: "Reject", confirmVariant: "destructive" },
  request_info: { title: "Request Info", description: "Request more information from the supplier?", hasReason: true, reasonRequired: true, reasonMin: 10, confirmLabel: "Request Info", confirmVariant: "default" },
  activate: { title: "Activate Supplier", description: "Activate this supplier? They will be able to create tours.", confirmLabel: "Activate", confirmVariant: "default" },
  suspend: { title: "Suspend Supplier", description: "Suspend this supplier?", hasReason: true, reasonRequired: true, reasonMin: 10, confirmLabel: "Suspend", confirmVariant: "destructive" },
  reactivate: { title: "Reactivate Supplier", description: "Reactivate this supplier?", confirmLabel: "Reactivate", confirmVariant: "default" },
};

function DetailTable({ rows }: { rows: Array<{ label: string; value?: string | null | undefined }> }) {
  const hasValue = rows.some((r) => r.value != null);
  if (!hasValue) return <p className="text-sm text-text-tertiary py-4 text-center">No information provided</p>;

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-gradient-to-r from-green-50 to-green-50/80 border-b border-border-muted">
          <th className="w-2/5 py-3 px-5 text-xs font-semibold tracking-wider text-green-800 text-left leading-tight border-r border-border-muted">Field</th>
          <th className="py-3 px-5 text-xs font-semibold tracking-wider text-green-800 text-left leading-tight">Value</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, idx) => (
          <tr key={r.label} className={`border-b border-border-muted transition-colors hover:bg-green-50/40 ${idx % 2 === 0 ? "bg-white" : "bg-green-50/20"}`}>
            <td className="w-2/5 py-3 px-5 text-xs font-medium text-text-secondary uppercase tracking-wider border-r border-border-muted align-middle">{r.label}</td>
            <td className="py-3 px-5 text-text-primary align-middle leading-relaxed">
              {r.value || <span className="text-text-tertiary italic">Not provided</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DocumentPreview({ url, label }: { url: string; label: string }) {
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url.split("?")[0]);
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="group relative block">
        <img src={url} alt={label} className="h-44 w-full rounded-sm border border-border-muted object-cover shadow-sm transition-shadow group-hover:shadow-md" />
        <div className="absolute inset-0 flex items-center justify-center rounded-sm bg-black/0 text-xs font-medium text-white transition-colors group-hover:bg-black/40">
          <span className="opacity-0 group-hover:opacity-100">View →</span>
        </div>
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex h-44 items-center justify-center rounded-sm border border-border-muted bg-surface-muted text-xs font-medium text-green-700 hover:bg-green-50 transition-colors">
      View {label} →
    </a>
  );
}
