import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Map, Star, Eye, Calendar, DollarSign,
  ChevronRight, Clock, CheckCircle, XCircle, Shield, BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SectionError } from "@/components/shared/SectionError";
import api from "@/lib/axios";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";

interface TourDetail {
  id: string;
  title?: string;
  description?: string;
  status?: string;
  category?: string;
  duration?: string;
  difficulty?: string;
  groupSize?: string;
  price?: number;
  currency?: string;
  photos?: string[];
  coverPhoto?: string;
  supplier?: { id?: string; name?: string; email?: string };
  bookingCount?: number;
  totalRevenue?: number;
  averageRating?: number;
  reviewCount?: number;
  viewCount?: number;
  createdAt?: string;
  updatedAt?: string;
  highlights?: string[];
  itinerary?: { day?: number; title?: string; description?: string }[];
  inclusions?: string[];
  exclusions?: string[];

  categorization?: {
    category?: string;
    subcategory?: string;
    difficulty?: string;
    duration?: { days?: number; hours?: number; minutes?: number };
    groupSize?: { min?: number; max?: number };
    transportMode?: unknown;
  };
  productContent?: {
    highlights?: string[];
    included?: string[];
    excluded?: string[];
    itinerary?: { day?: number; title?: string; description?: string }[];
    whatToBring?: string[];
    location?: { city?: string; country?: string; address?: string };
  };
  schedulesAndPricing?: {
    pricingSchedules?: {
      currency?: string;
      schedules?: Array<{
        startDate?: string;
        endDate?: string;
        prices?: Array<{ ageGroup?: string; retailPrice?: number }>;
      }>;
    };
    travelerDetails?: { pricingModel?: string; maxTravelersPerBooking?: number };
    availability?: { daysOfWeek?: string[]; timeSlots?: string[] };
  };
  bookingAndTickets?: {
    confirmationType?: string;
    cancellationPolicy?: string;
    meetingPoint?: unknown;
  };
}

function ensureArray(value: unknown): unknown[] | undefined {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* not JSON */ }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const vals = Object.values(value);
    if (vals.length > 0) return vals;
  }
  return undefined;
}

function normalizeTour(raw: Record<string, unknown>): TourDetail {
  const categorization = (raw.categorization || {}) as TourDetail["categorization"];
  const productContent = (raw.productContent || {}) as TourDetail["productContent"];
  const schedulesAndPricing = (raw.schedulesAndPricing || {}) as TourDetail["schedulesAndPricing"];
  const pricingSchedules = schedulesAndPricing?.pricingSchedules || {};
  const schedules = pricingSchedules?.schedules || [];
  const firstSchedule = schedules[0] || {};
  const prices = firstSchedule?.prices || [];
  const firstPrice = prices[0] || {};

  let durationStr: string | undefined;
  const dur = categorization?.duration;
  if (dur) {
    if (dur.days) durationStr = `${dur.days} day${dur.days > 1 ? "s" : ""}`;
    else if (dur.hours) durationStr = `${dur.hours} hour${dur.hours > 1 ? "s" : ""}`;
    else if (dur.minutes) durationStr = `${dur.minutes} min`;
  } else if (raw.durationMinutes) {
    const hours = Math.floor((raw.durationMinutes as number) / 60);
    const mins = (raw.durationMinutes as number) % 60;
    durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  let groupSizeStr: string | undefined;
  const gs = categorization?.groupSize;
  if (gs) {
    if (gs.min != null && gs.max != null) groupSizeStr = `${gs.min}–${gs.max}`;
    else if (gs.max != null) groupSizeStr = `Up to ${gs.max}`;
    else if (gs.min != null) groupSizeStr = `Min ${gs.min}`;
  }

  const avgRating =
    raw.averageRating != null
      ? Number(raw.averageRating)
      : undefined;

  return {
    ...raw,
    duration: durationStr,
    groupSize: groupSizeStr,
    price: firstPrice?.retailPrice ?? undefined,
    currency: pricingSchedules?.currency || undefined,
    highlights: ensureArray(productContent?.highlights),
    itinerary: (() => {
      const raw = productContent?.itinerary;
      if (Array.isArray(raw)) return raw as TourDetail["itinerary"];
      if (typeof raw === "string") {
        try { const p = JSON.parse(raw); if (Array.isArray(p)) return p as TourDetail["itinerary"]; } catch { /* not JSON */ }
        return [{ description: raw }] as TourDetail["itinerary"];
      }
      if (raw && typeof raw === "object") {
        const vals = Object.values(raw);
        if (vals.length > 0) return vals as TourDetail["itinerary"];
      }
      return undefined;
    })(),
    inclusions: ensureArray(productContent?.included) as string[] | undefined,
    exclusions: ensureArray(productContent?.excluded) as string[] | undefined,
    averageRating: avgRating,
    bookingCount: (raw._count as { bookings?: number })?.bookings ?? (raw.totalBookings as number ?? undefined),
    reviewCount: (raw._count as { reviews?: number })?.reviews ?? (raw.reviewCount as number ?? undefined),
    totalRevenue: raw.totalRevenue != null ? Number(raw.totalRevenue) : undefined,
  } as TourDetail;
}

export default function TourDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: tour, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "tour-detail", id],
    queryFn: async () => {
      const res = await api.get(`/tours/${id}`);
      const tour = res.data?.data?.tour || res.data?.tour || res.data;
      if (!tour) throw new Error("Tour not found");
      return normalizeTour(tour);
    },
    enabled: !!id,
  });

  const conversionRate = tour?.viewCount && tour?.bookingCount
    ? ((tour.bookingCount / tour.viewCount) * 100).toFixed(1)
    : null;

  const revenuePerBooking = tour?.totalRevenue && tour?.bookingCount
    ? tour.totalRevenue / tour.bookingCount
    : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-48 w-full rounded-sm" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (isError) return <SectionError message="Failed to load tour details" onRetry={() => refetch()} />;
  if (!tour) return <div className="py-12 text-center text-sm text-text-secondary">Tour not found</div>;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-tertiary">
        <button onClick={() => navigate(-1)} className="rounded-sm bg-white p-1.5 shadow-sm hover:ring-2 hover:ring-green-300 transition-all">
          <ArrowLeft className="h-4 w-4 text-text-primary" />
        </button>
        <button onClick={() => navigate("/admin/tours")} className="hover:text-text-primary transition-colors">Tours</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-text-primary font-medium truncate">{tour.title || "Tour Detail"}</span>
      </div>

      {/* Profile Header */}
      <div className="rounded-sm border border-border bg-white shadow-2">
        {tour.coverPhoto || tour.photos?.[0] ? (
          <div className="relative h-36 rounded-t-sm overflow-hidden bg-gradient-to-r from-green-600 to-green-700">
            <img src={tour.coverPhoto || tour.photos![0]} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          </div>
        ) : (
          <div className="relative h-20 rounded-t-sm bg-gradient-to-r from-green-600 to-green-700" />
        )}
        <div className="relative px-6 pb-5 pt-9">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-white bg-green-100 shadow-sm overflow-hidden">
                {tour.coverPhoto || tour.photos?.[0] ? (
                  <img src={tour.coverPhoto || tour.photos![0]} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <span className="text-xl font-bold text-green-700">{tour.title?.charAt(0)?.toUpperCase() || "?"}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-lg font-semibold text-text-primary">{tour.title || "Unknown Tour"}</h1>
                  <StatusBadge status={tour.status || "UNKNOWN"} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-text-secondary">
                  {tour.category && (
                    <span className="inline-flex items-center gap-1">
                      <Map className="h-3.5 w-3.5 text-text-tertiary" />
                      {tour.category}
                    </span>
                  )}
                  {tour.duration && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-text-tertiary" />
                      {tour.duration}
                    </span>
                  )}
                  {tour.difficulty && (
                    <span className="inline-flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5 text-text-tertiary" />
                      {tour.difficulty}
                    </span>
                  )}
                  {tour.price && (
                    <span className="font-semibold text-green-700">
                      {formatCurrency(tour.price)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Revenue" value={formatCurrency(tour.totalRevenue)} icon={<DollarSign className="h-4 w-4" />} accent="green" />
        <KpiCard label="Bookings" value={formatNumber(tour.bookingCount)} icon={<Calendar className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Avg Rating" value={tour.averageRating != null ? Number(tour.averageRating).toFixed(1) : "—"} icon={<Star className="h-4 w-4" />} accent="amber" />
        <KpiCard label="Views" value={formatNumber(tour.viewCount)} icon={<Eye className="h-4 w-4" />} accent="green" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {tour.description && (
            <Card>
              <CardHeader className="border-b border-border pb-3 border-l-2 border-l-green-500/60"><CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">Description</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary leading-relaxed">{tour.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Tabs content */}
          <Tabs defaultValue="details">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="details"><BookOpen className="mr-1.5 h-3.5 w-3.5" /> Details</TabsTrigger>
              <TabsTrigger value="itinerary"><Map className="mr-1.5 h-3.5 w-3.5" /> Itinerary</TabsTrigger>
              <TabsTrigger value="inclusions"><CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Inclusions</TabsTrigger>
              <TabsTrigger value="exclusions"><XCircle className="mr-1.5 h-3.5 w-3.5" /> Exclusions</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <Card>
                <CardContent className="p-0">
                  <DetailTable
                    rows={[
                      { label: "Duration", value: tour.duration },
                      { label: "Group Size", value: tour.groupSize },
                      { label: "Difficulty", value: tour.difficulty },
                      { label: "Price", value: tour.price ? formatCurrency(tour.price) : null, highlight: true },
                      { label: "Category", value: tour.category },
                      { label: "Created", value: tour.createdAt ? formatDate(tour.createdAt) : null },
                      { label: "Updated", value: tour.updatedAt ? formatDate(tour.updatedAt) : null },
                    ]}
                  />
                </CardContent>
              </Card>
              {tour.highlights && tour.highlights.length > 0 && (
                <Card className="mt-6">
                  <CardHeader className="border-b border-border pb-3 border-l-2 border-l-green-500/60"><CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">Highlights</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {tour.highlights.map((h, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-sm border border-border-muted px-3 py-2">
                          <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                          <span className="text-sm text-text-secondary">{h}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="itinerary">
              {tour.itinerary && tour.itinerary.length > 0 ? (
                <Card>
                  <CardContent className="p-0">
                    {tour.itinerary.map((item, idx) => {
                      const entry = item as Record<string, unknown>;
                      const hasTime = "time" in entry || "day" in entry;
                      const dayNumber = hasTime ? String(entry.day ?? entry.time ?? (idx + 1)) : null;
                      const title = hasTime ? String(entry.title || entry.activity || "") : null;
                      const description = (entry.description as string) || null;
                      if (!hasTime && !title && description) {
                        return (
                          <div key={idx} className="px-5 py-4">
                            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">{description}</p>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={idx}
                          className={`px-5 py-4 ${idx < (tour.itinerary?.length || 0) - 1 ? "border-b border-border-muted" : ""} ${idx % 2 === 0 ? "bg-white" : "bg-green-50/20"}`}
                        >
                          <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                                {dayNumber}
                              </div>
                              {idx < (tour.itinerary?.length || 0) - 1 && (
                                <div className="mt-1 h-full w-px bg-green-200" />
                              )}
                            </div>
                            <div className="pb-4 min-w-0">
                              {title && <p className="text-sm font-semibold text-text-primary">{title}</p>}
                              {description && (
                                <p className={`mt-1 text-sm text-text-secondary leading-relaxed whitespace-pre-line ${title ? "" : ""}`}>{description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-text-tertiary">No itinerary available</CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="inclusions">
              <Card>
                <CardContent className="p-0">
                  {tour.inclusions && tour.inclusions.length > 0 ? (
                    <div className="divide-y divide-border-muted">
                      {tour.inclusions.map((inc, i) => (
                        <div key={i} className={`flex items-center gap-3 px-5 py-3 ${i % 2 === 0 ? "bg-white" : "bg-green-50/20"}`}>
                          <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
                          <span className="text-sm text-text-primary">{inc}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-sm text-text-tertiary">No inclusions listed</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="exclusions">
              <Card>
                <CardContent className="p-0">
                  {tour.exclusions && tour.exclusions.length > 0 ? (
                    <div className="divide-y divide-border-muted">
                      {tour.exclusions.map((exc, i) => (
                        <div key={i} className={`flex items-center gap-3 px-5 py-3 ${i % 2 === 0 ? "bg-white" : "bg-green-50/20"}`}>
                          <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                          <span className="text-sm text-text-secondary">{exc}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-sm text-text-tertiary">No exclusions listed</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Supplier Card */}
          <Card>
            <CardHeader className="border-b border-border pb-3 border-l-2 border-l-green-500/60"><CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">Supplier</CardTitle></CardHeader>
            <CardContent>
              {tour.supplier ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                    {tour.supplier.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">{tour.supplier.name || "Unknown"}</p>
                    {tour.supplier.email && (
                      <p className="text-xs text-text-tertiary truncate">{tour.supplier.email}</p>
                    )}
                    {tour.supplier.id && (
                      <Link to={`/admin/suppliers/${tour.supplier.id}`} className="mt-1 inline-block text-xs text-green-600 hover:underline">
                        View Supplier →
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-secondary">No supplier info</p>
              )}
            </CardContent>
          </Card>

          {/* Performance Stats */}
          <Card>
            <CardHeader className="border-b border-border pb-3 border-l-2 border-l-green-500/60"><CardTitle className="flex items-center gap-2 text-sm font-semibold text-text-primary">Performance</CardTitle></CardHeader>
            <CardContent className="p-0">
              <DetailTable
                rows={[
                  { label: "Reviews", value: formatNumber(tour.reviewCount) },
                  { label: "Avg Rating", value: tour.averageRating != null ? Number(tour.averageRating).toFixed(1) : "—" },
                  { label: "Conversion", value: conversionRate ? `${conversionRate}%` : null },
                  { label: "Revenue/Booking", value: revenuePerBooking ? formatCurrency(revenuePerBooking) : null, highlight: true },
                ]}
              />
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-sm border border-green-200/40 bg-gradient-to-br from-green-50 to-white p-3 text-center shadow-2">
              <p className="text-xs text-text-secondary">Bookings</p>
              <p className="text-xl font-bold text-green-700">{formatNumber(tour.bookingCount)}</p>
            </div>
            <div className="rounded-sm border border-amber-200/40 bg-gradient-to-br from-amber-50 to-white p-3 text-center shadow-2">
              <p className="text-xs text-text-secondary">Rating</p>
              <p className="text-xl font-bold text-amber-700">{tour.averageRating != null ? Number(tour.averageRating).toFixed(1) : "—"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function KpiCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent: "green" | "blue" | "amber" }) {
  const accentMap = {
    green: { bg: "bg-gradient-to-br from-green-50 to-white", border: "border-green-200/40", iconBg: "bg-green-100", iconColor: "text-green-600" },
    blue: { bg: "bg-gradient-to-br from-blue-50 to-white", border: "border-blue-200/40", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
    amber: { bg: "bg-gradient-to-br from-amber-50 to-white", border: "border-amber-200/40", iconBg: "bg-amber-100", iconColor: "text-amber-600" },
  };
  const a = accentMap[accent];
  return (
    <div className={`rounded-sm border ${a.border} ${a.bg} p-3.5 shadow-2 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-text-secondary truncate">{label}</p>
          <p className="mt-1 text-lg font-bold text-text-primary leading-tight">{value}</p>
        </div>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${a.iconBg} ${a.iconColor}`}>{icon}</div>
      </div>
    </div>
  );
}

function DetailTable({ rows }: { rows: Array<{ label: string; value?: string | null; highlight?: boolean }> }) {
  const hasValue = rows.some((r) => r.value != null);
  if (!hasValue) return <p className="text-sm text-text-tertiary py-4 text-center">No information</p>;

  return (
    <table className="w-full text-sm border-collapse">
      <tbody>
        {rows.map((r, idx) => (
          <tr key={r.label} className={`border-b border-border-muted transition-colors hover:bg-green-50/40 ${idx % 2 === 0 ? "bg-white" : "bg-green-50/20"}`}>
            <td className="w-2/5 py-3 px-5 text-xs font-medium text-text-secondary uppercase tracking-wider border-r border-border-muted align-middle">
              {r.label}
            </td>
            <td className="py-3 px-5 align-middle leading-relaxed">
              {r.value ? (
                <span className={`${r.highlight ? "font-semibold text-green-700" : "font-medium text-text-primary"}`}>
                  {r.value}
                </span>
              ) : (
                <span className="text-text-tertiary italic">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
