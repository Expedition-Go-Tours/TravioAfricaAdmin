import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
  Wallet,
  Smartphone,
  CreditCard,
  Check,
  EyeOff,
  AlertCircle,
  BarChart3,
  List,
  Eye,
  DollarSign,
  Star,
  BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { SectionError } from "@/components/shared/SectionError";
import { SectionEmpty } from "@/components/shared/SectionEmpty";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/axios";
import { formatDate, formatCurrency, formatNumber } from "@/lib/utils";

interface SupplierData {
  id?: string;
  userId?: string;
  user?: { id?: string; name?: string; email?: string; photoURL?: string; photo?: string; role?: string; roles?: string[] };
  businessInfo?: {
    legalBusinessName?: string; businessName?: string; displayName?: string; businessType?: string;
    country?: string; city?: string; state?: string; address?: string | { line1?: string; city?: string; state?: string; postalCode?: string };
    phoneNumber?: string; phone?: string;
    website?: string;
  };
  operatingInfo?: {
    tourCategories?: string[]; destinations?: string[]; languages?: string[];
    cancellationPolicy?: string; meetingStyle?: string; yearsInBusiness?: string | number;
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
    certificateOfRegistration?: string; taxCertificate?: string; proofOfAddress?: string;
    licenses?: string[];
  };
  documents?: {
    registrationDocument?: string; taxDocument?: string; proofOfAddress?: string;
    idDocument?: string; licenses?: string[];
  };
  payoutInfo?: {
    bankAccountName?: string; bankAccountNumber?: string; bankName?: string; bankCountry?: string; bankCode?: string;
    payoutCurrency?: string; currency?: string; method?: string;
    accountName?: string; accountNumber?: string;
  };
  compliance?: {
    acceptedTerms?: boolean; agreedToPayoutTerms?: boolean; verified?: boolean; reviewStatus?: string;
    termsAccepted?: boolean; privacyAccepted?: boolean; codeOfConductAccepted?: boolean;
    dataProcessingAccepted?: boolean; marketingConsent?: boolean;
  };
  status?: string;
  totalBookings?: number;
  totalEarnings?: string | number;
  averageRating?: number;
  adminNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface SupplierOverview {
  earnings: number;
  totalBookings: number;
  averageRating: number;
  totalReviews: number;
  tours: { total: number; active: number; draft: number; paused: number; archived: number };
  bookings: { total: number; pending: number; confirmed: number; completed: number; cancelled: number };
}

interface SupplierTour {
  id: string;
  title: string;
  coverPhoto?: string;
  slug: string;
  status: string;
  totalBookings: number;
  averageRating?: number;
  reviewCount: number;
  city?: string;
  country?: string;
  createdAt: string;
}

interface SupplierToursResponse {
  tours: SupplierTour[];
  pagination: { currentPage: number; totalPages: number; totalCount: number; hasNextPage: boolean; limit: number };
}

type ActionType = "approve" | "reject" | "request_info" | "activate" | "suspend" | "reactivate" | "delete";

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");
  const [modalAction, setModalAction] = useState<ActionType | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "supplier", id],
    queryFn: async () => {
      const res = await api.get(`/suppliers/admin/applications?limit=500`);
      const apps: SupplierData[] = res.data?.data?.applications || res.data?.applications || [];
      const byId = (a: SupplierData) => a.id === id || a.user?.id === id;
      const found = apps.find(byId);
      if (found) return found;
      throw new Error("Supplier not found");
    },
    enabled: !!id,
  });

  const supplier = data as SupplierData | undefined;
  const user = supplier?.user;
  const status = supplier?.status || "";
  const userId = user?.id || id;

  const { data: payoutData, isLoading: payoutLoading } = useQuery({
    queryKey: ["admin", "payout-methods", "supplier", user?.id],
    queryFn: () => api.get(`/payout-methods/admin/suppliers/${user?.id}`).then((r) => r.data?.data),
    enabled: !!user?.id,
  });

  const payoutMethods = payoutData?.methods || [];

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["admin", "supplier", id, "overview"],
    queryFn: () => api.get(`/suppliers/admin/${id}/overview`).then((r) => r.data?.data as SupplierOverview),
    enabled: !!id,
  });

  const { data: toursData, isLoading: toursLoading } = useQuery({
    queryKey: ["admin", "supplier", id, "tours"],
    queryFn: () => api.get(`/suppliers/admin/${id}/tours?limit=50`).then((r) => r.data?.data as SupplierToursResponse),
    enabled: !!id,
  });

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
      api.patch(`/suppliers/admin/${id}/suspend`, body),
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
    mutationFn: () => api.patch(`/suppliers/admin/${id}/activate`),
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
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-green-100 text-xl font-bold text-green-700 shadow-sm">
                <span>{user?.name?.charAt(0)?.toUpperCase() || "?"}</span>
                {user?.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user?.name || ""}
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
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
          <TabsTrigger value="overview"><BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="business"><Building2 className="mr-1.5 h-3.5 w-3.5" /> Business</TabsTrigger>
          <TabsTrigger value="operating"><Globe className="mr-1.5 h-3.5 w-3.5" /> Operating</TabsTrigger>
          <TabsTrigger value="representative"><Shield className="mr-1.5 h-3.5 w-3.5" /> Rep</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="payout">Payout</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="tours"><List className="mr-1.5 h-3.5 w-3.5" /> Tours</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader className="border-b border-border pb-3 border-l-2 border-l-green-500/60"><CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">Performance Overview</CardTitle></CardHeader>
            <CardContent className="p-5">
              {overviewLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
              ) : !overview ? (
                <SectionEmpty message="No overview data available" />
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="rounded-sm border border-border bg-card p-4 border-l-2 border-l-green-500/60">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <p className="text-xs text-text-secondary">Earnings</p>
                      </div>
                      <p className="text-lg font-bold text-text-primary">{formatCurrency(overview.earnings)}</p>
                    </div>
                    <div className="rounded-sm border border-border bg-card p-4 border-l-2 border-l-blue-500/60">
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        <p className="text-xs text-text-secondary">Total Bookings</p>
                      </div>
                      <p className="text-lg font-bold text-text-primary">{formatNumber(overview.totalBookings)}</p>
                    </div>
                    <div className="rounded-sm border border-border bg-card p-4 border-l-2 border-l-amber-500/60">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="h-4 w-4 text-amber-500" />
                        <p className="text-xs text-text-secondary">Avg Rating</p>
                      </div>
                      <p className="text-lg font-bold text-text-primary">{overview.averageRating.toFixed(1)}</p>
                    </div>
                    <div className="rounded-sm border border-border bg-card p-4 border-l-2 border-l-green-500/60">
                      <div className="flex items-center gap-2 mb-1">
                        <Eye className="h-4 w-4 text-green-600" />
                        <p className="text-xs text-text-secondary">Total Tours</p>
                      </div>
                      <p className="text-lg font-bold text-text-primary">{overview.tours.total}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-semibold text-text-primary mb-3 border-b border-border pb-2">Tours by Status</p>
                      <div className="space-y-2">
                        {[
                          { label: "Active", value: overview.tours.active, color: "bg-green-500" },
                          { label: "Draft", value: overview.tours.draft, color: "bg-blue-500" },
                          { label: "Paused", value: overview.tours.paused, color: "bg-amber-500" },
                          { label: "Archived", value: overview.tours.archived, color: "bg-gray-500" },
                        ].map((item) => {
                          const maxVal = Math.max(overview.tours.total, 1);
                          return (
                            <div key={item.label} className="flex items-center gap-3">
                              <span className="w-16 text-xs text-text-secondary">{item.label}</span>
                              <div className="flex-1 h-4 rounded-sm bg-surface-muted overflow-hidden">
                                <div className={`h-full rounded-sm ${item.color} transition-all`} style={{ width: `${(item.value / maxVal) * 100}%` }} />
                              </div>
                              <span className="w-8 text-xs text-right text-text-primary font-medium">{item.value}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-text-primary mb-3 border-b border-border pb-2">Bookings by Status</p>
                      <div className="space-y-2">
                        {[
                          { label: "Confirmed", value: overview.bookings.confirmed, color: "bg-green-500" },
                          { label: "Pending", value: overview.bookings.pending, color: "bg-amber-500" },
                          { label: "Completed", value: overview.bookings.completed, color: "bg-blue-500" },
                          { label: "Cancelled", value: overview.bookings.cancelled, color: "bg-red-500" },
                        ].map((item) => {
                          const maxVal = Math.max(overview.bookings.total, 1);
                          return (
                            <div key={item.label} className="flex items-center gap-3">
                              <span className="w-16 text-xs text-text-secondary">{item.label}</span>
                              <div className="flex-1 h-4 rounded-sm bg-surface-muted overflow-hidden">
                                <div className={`h-full rounded-sm ${item.color} transition-all`} style={{ width: `${(item.value / maxVal) * 100}%` }} />
                              </div>
                              <span className="w-8 text-xs text-right text-text-primary font-medium">{item.value}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business">
          <Card>
            <CardHeader className="border-b border-border pb-3 border-l-2 border-l-green-500/60"><CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">Business Information</CardTitle></CardHeader>
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
            <CardHeader className="border-b border-border pb-3 border-l-2 border-l-green-500/60"><CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">Operating Information</CardTitle></CardHeader>
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
                  { label: "Years in Business", value: supplier.operatingInfo?.yearsInBusiness != null ? String(supplier.operatingInfo.yearsInBusiness) : null },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="representative">
          <Card>
            <CardHeader className="border-b border-border pb-3 border-l-2 border-l-green-500/60"><CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">Representative Information</CardTitle></CardHeader>
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
            <CardHeader className="border-b border-border pb-3 border-l-2 border-l-green-500/60"><CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">Business Documents</CardTitle></CardHeader>
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
          <div className="space-y-4">
            {payoutLoading ? (
              <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
            ) : payoutMethods.length > 0 ? (
              payoutMethods.map((method: PayoutMethodItem) => (
                <PayoutMethodCard key={method.id} method={method} />
              ))
            ) : (
              <Card>
                <CardHeader className="border-b border-border pb-3 border-l-2 border-l-green-500/60"><CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">Payout Information</CardTitle></CardHeader>
                <CardContent>
                  <DetailTable
                    rows={[
                      { label: "Bank Account Name", value: supplier.payoutInfo?.bankAccountName || supplier.payoutInfo?.accountName },
                      { label: "Account Number", value: supplier.payoutInfo?.bankAccountNumber },
                      { label: "Bank Name", value: supplier.payoutInfo?.bankName },
                      { label: "Bank Code", value: supplier.payoutInfo?.bankCode },
                      { label: "Bank Country", value: supplier.payoutInfo?.bankCountry },
                      { label: "Payout Currency", value: supplier.payoutInfo?.payoutCurrency || supplier.payoutInfo?.currency },
                    ]}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader className="border-b border-border pb-3 border-l-2 border-l-green-500/60"><CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">Compliance Checklist</CardTitle></CardHeader>
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

        <TabsContent value="tours">
          <Card>
            <CardHeader className="border-b border-border pb-3 border-l-2 border-l-green-500/60"><CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">Tours ({toursData?.pagination?.totalCount ?? "..."})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {toursLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !toursData?.tours?.length ? (
                <SectionEmpty message="No tours" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-muted/40">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-secondary">Tour</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-text-secondary">Status</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-text-secondary">Bookings</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-text-secondary">Rating</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-text-secondary">Location</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-text-secondary">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {toursData.tours.map((tour) => (
                        <tr
                          key={tour.id}
                          className="border-b border-border last:border-b-0 cursor-pointer hover:bg-surface-muted/30 transition-colors"
                          onClick={() => navigate(`/admin/tours/${tour.id}`)}
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter") navigate(`/admin/tours/${tour.id}`); }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 shrink-0 rounded-sm bg-surface-muted overflow-hidden">
                                {tour.coverPhoto ? (
                                  <img src={tour.coverPhoto} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-xs text-text-tertiary">—</div>
                                )}
                              </div>
                              <span className="font-medium text-text-primary truncate">{tour.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={tour.status} />
                          </td>
                          <td className="px-4 py-3 text-center text-text-primary">{formatNumber(tour.totalBookings)}</td>
                          <td className="px-4 py-3 text-center text-text-primary">
                            {tour.averageRating != null ? Number(tour.averageRating).toFixed(1) : "—"}
                          </td>
                          <td className="px-4 py-3 text-center text-text-secondary text-xs">
                            {[tour.city, tour.country].filter(Boolean).join(", ") || "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-text-tertiary text-xs">{formatDate(tour.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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

interface PayoutMethodItem {
  id: string;
  type?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  sortCode?: string;
  branchCode?: string;
  swiftCode?: string;
  iban?: string;
  routingNumber?: string;
  bankCountry?: string;
  currency?: string;
  mobileProvider?: string;
  mobileNumber?: string;
  paypalEmail?: string;
  isDefault?: boolean;
  verified?: boolean;
  createdAt?: string;
}

function PayoutMethodCard({ method }: { method: PayoutMethodItem }) {
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
    <Card className="overflow-hidden border-0 shadow-sm">
      <div className={`flex items-center justify-between bg-gradient-to-r ${scheme.bg} px-5 py-3.5 border-b ${scheme.border} border-l-2 ${scheme.border.replace("border-", "border-l-")}`}>
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
      <CardContent className="p-5 space-y-4">
        <div>
          <p className="mb-2.5 text-[11px] font-semibold text-text-tertiary uppercase tracking-widest">Account Details</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {isBank && <Field label="Bank Name" value={method.bankName} />}
            {isBank && <Field label="Account Name" value={method.accountName} />}
            {isBank && <Field label="Account Number" value={method.accountNumber} />}
            {isBank && method.sortCode && <Field label="Sort Code" value={method.sortCode} />}
            {isBank && method.branchCode && <Field label="Branch Code" value={method.branchCode} />}
            {isBank && method.swiftCode && <Field label="SWIFT / BIC" value={method.swiftCode} />}
            {isBank && method.iban && <Field label="IBAN" value={method.iban} />}
            {isBank && method.routingNumber && <Field label="Routing Number" value={method.routingNumber} />}
            {isMobile && <Field label="Mobile Provider" value={method.mobileProvider} />}
            {isMobile && <Field label="Mobile Number" value={method.mobileNumber} />}
            {isPaypal && <Field label="PayPal Email" value={method.paypalEmail} />}
            {isPaypal && <Field label="Account Name" value={method.accountName} />}
          </div>
        </div>
        {(method.currency || method.bankCountry) && (
          <div className="flex items-center gap-6 border-t border-border-muted pt-3.5">
            <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-widest flex items-center gap-1.5">
              <Globe className="h-3 w-3" /> Region
            </span>
            {method.currency && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-muted px-2.5 py-1 text-xs font-medium text-text-primary">
                {method.currency}
              </span>
            )}
            {method.bankCountry && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-muted px-2.5 py-1 text-xs font-medium text-text-primary">
                {method.bankCountry}
              </span>
            )}
          </div>
        )}
        {method.createdAt && (
          <div className="flex items-center border-t border-border-muted pt-3.5">
            <span className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
              <Calendar className="h-3 w-3" />
              Added {formatDate(method.createdAt)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-sm bg-surface-muted/50 px-3 py-2">
      <p className="text-[11px] text-text-tertiary uppercase tracking-wider">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-text-primary">{value || "—"}</p>
    </div>
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
