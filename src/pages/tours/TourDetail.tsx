import { useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ChevronRight, ChevronLeft,
  Map, Star, Eye, Calendar, DollarSign,
  Clock, Shield, CheckCircle, XCircle, Check, X, Users, Image as ImageIcon,
  BarChart3, TrendingUp, Globe,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SectionError } from "@/components/shared/SectionError";
import api from "@/lib/axios";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { usePermission } from "@/hooks/usePermission";
import { toast } from "sonner";

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
  supplier?: { id?: string; name?: string; email?: string; photoURL?: string };
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
    includes?: string[];
    excludes?: string[];
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
  expeditionTour?: {
    isActive: boolean;
    bookingFlow: "DIRECT" | "EXTERNAL";
    externalUrl: string | null;
    syncStatus: string | null;
    lastSyncAt: string | null;
    syncError: string | null;
    publishedAt: string | null;
    publishedBy: { id: string; name: string; email: string } | null;
    unpublishedAt: string | null;
  } | null;
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
    inclusions: (ensureArray(productContent?.included) || ensureArray(raw.includes) || ensureArray(categorization?.includes)) as string[] | undefined,
    exclusions: (ensureArray(productContent?.excluded) || ensureArray(raw.excludes) || ensureArray(categorization?.excludes)) as string[] | undefined,
    averageRating: avgRating,
    bookingCount: (raw._count as { bookings?: number })?.bookings ?? (raw.totalBookings as number ?? undefined),
    reviewCount: (raw._count as { reviews?: number })?.reviews ?? (raw.reviewCount as number ?? undefined),
    totalRevenue: raw.totalRevenue != null ? Number(raw.totalRevenue) : undefined,
  } as TourDetail;
}

export default function TourDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = usePermission();

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

  const queryClient = useQueryClient();

  const expeditionMutation = useMutation({
    mutationFn: (isActive: boolean) =>
      api.patch(`/admin/tours/${id}/expedition-publish`, { isActive }),
    onSuccess: (_, isActive) => {
      toast.success(isActive ? "Published to Expedition Go" : "Removed from Expedition Go");
      queryClient.invalidateQueries({ queryKey: ["admin", "tour-detail", id] });
    },
    onError: () => toast.error("Failed to update Expedition Go listing"),
  });

  const allPhotos = useMemo(() => {
    const set = new Set<string>();
    if (tour?.coverPhoto) set.add(tour.coverPhoto);
    tour?.photos?.forEach((p) => set.add(p));
    return [...set];
  }, [tour]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const hasMultiple = allPhotos.length > 1;

  const goNext = useCallback(() => setActiveImageIndex((i) => (i + 1) % allPhotos.length), [allPhotos.length]);
  const goPrev = useCallback(() => setActiveImageIndex((i) => (i - 1 + allPhotos.length) % allPhotos.length), [allPhotos.length]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-[420px] w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) return <SectionError message="Failed to load tour details" onRetry={() => refetch()} />;
  if (!tour) return <div className="py-12 text-center text-sm text-slate-500">Tour not found</div>;

  return (
    <div className="space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <button onClick={() => navigate(-1)} className="rounded-lg bg-white p-1.5 shadow-sm hover:ring-2 hover:ring-slate-300 transition-all">
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </button>
        <button onClick={() => navigate("/admin/tours")} className="hover:text-slate-700 transition-colors">Tours</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-900 font-medium truncate">{tour.title || "Tour Detail"}</span>
      </div>

      {/* Hero Section — image left + info/performance right */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-5">
          {/* Left: Image gallery */}
          <div className="md:col-span-3 relative min-h-[280px] md:min-h-[55vh] bg-slate-100 group">
            {allPhotos.length > 0 ? (
              <>
                <img
                  src={allPhotos[activeImageIndex]}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />

                {/* Navigation arrows */}
                {hasMultiple && (
                  <>
                    <button
                      onClick={goPrev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={goNext}
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}

                {/* Dot indicators */}
                {hasMultiple && (
                  <div className="absolute bottom-3 left-3 flex gap-1.5">
                    {allPhotos.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImageIndex(i)}
                        className={`h-2 rounded-full transition-all ${
                          i === activeImageIndex ? "w-4 bg-white" : "w-2 bg-white/50 hover:bg-white/70"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                <ImageIcon className="h-16 w-16" />
              </div>
            )}
          </div>

          {/* Right: Tour info + Performance cards */}
          <div className="md:col-span-2 flex flex-col p-7 sm:p-8">
            {/* Title + Status */}
            <div className="flex items-start gap-3 mb-3">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{tour.title || "Unknown Tour"}</h1>
              <StatusBadge status={tour.status || "UNKNOWN"} className="shrink-0 mt-0.5" />
            </div>

            {/* Meta tags */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-500">
              {tour.category && (
                <span className="inline-flex items-center gap-1.5">
                  <Map className="h-3.5 w-3.5 text-slate-400" />
                  {tour.category}
                </span>
              )}
              {tour.duration && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {tour.duration}
                </span>
              )}
              {tour.difficulty && (
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-slate-400" />
                  {tour.difficulty}
                </span>
              )}
            </div>

            {/* Price callout */}
            {tour.price && (
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-slate-900">{formatCurrency(tour.price)}</span>
                <span className="text-sm text-slate-400">/ person</span>
              </div>
            )}

            {/* Detail specs */}
            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Spec label="Category" value={tour.category} />
              <Spec label="Duration" value={tour.duration} />
              <Spec label="Difficulty" value={tour.difficulty} />
              <Spec label="Group Size" value={tour.groupSize} />
            </div>

            {/* KPI cards */}
            <div className="mt-auto">
              <div className="border-t border-slate-100 my-5" />
              <div className="grid grid-cols-2 gap-3">
                {can('analytics.view') && (
                  <KpiCard label="Revenue" value={tour.totalRevenue != null ? formatCurrency(tour.totalRevenue) : "—"} icon={<DollarSign className="h-4 w-4" />} accent="green" />
                )}
                {can('bookings.view') && (
                  <KpiCard label="Bookings" value={tour.bookingCount != null ? formatNumber(tour.bookingCount) : "—"} icon={<Calendar className="h-4 w-4" />} accent="blue" />
                )}
                <KpiCard label="Rating" value={tour.averageRating != null ? Number(tour.averageRating).toFixed(1) : "—"} icon={<Star className="h-4 w-4" />} accent="amber" />
                {can('analytics.view') && (
                  <KpiCard label="Views" value={tour.viewCount != null ? formatNumber(tour.viewCount) : "—"} icon={<Eye className="h-4 w-4" />} accent="green" />
                )}
              </div>

              {/* Footer info */}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                {tour.createdAt && <span>Created {formatDate(tour.createdAt)}</span>}
                {tour.supplier?.name && <span>by {tour.supplier.name}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Thumbnail strip (full width below) */}
        {hasMultiple && (
          <div className="flex gap-2 overflow-x-auto px-5 py-3 border-t border-slate-100">
            {allPhotos.map((photo, i) => (
              <button
                key={i}
                onClick={() => setActiveImageIndex(i)}
                className={`shrink-0 h-14 w-20 rounded-lg overflow-hidden border-2 transition-all ${
                  i === activeImageIndex
                    ? "border-slate-900 ring-1 ring-slate-900"
                    : "border-transparent hover:border-slate-300"
                }`}
              >
                <img src={photo} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main 2-col grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column — content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Description */}
          {tour.description && (
            <Card className="rounded-xl border border-slate-200 shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <p className="text-sm text-slate-600 leading-relaxed">{tour.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Highlights */}
          {tour.highlights && tour.highlights.length > 0 && (
            <Card className="rounded-xl border border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-3 pl-5 pr-5 pt-4">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Star className="h-4 w-4 text-amber-500" />
                  Highlights
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {tour.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      <span className="text-sm text-slate-600 flex-1 min-w-0 break-words">{h}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Itinerary — Viator-style timeline */}
          <Card className="rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-100 pb-4 pl-6 pr-6 pt-5">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Map className="h-4 w-4 text-slate-400" />
                Itinerary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {tour.itinerary && tour.itinerary.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {tour.itinerary.map((item, idx) => {
                    const entry = item as Record<string, unknown>;
                    const dayNumber = "day" in entry ? String(entry.day) : "time" in entry ? String(entry.time) : null;
                    const title = String(entry.title || entry.activity || "");
                    const description = (entry.description as string) || null;
                    const isLast = idx === (tour.itinerary?.length || 0) - 1;
                    if (!dayNumber && !title && description) {
                      return (
                        <div key={idx} className="px-6 py-5">
                          <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-line">{description}</p>
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="flex gap-5 px-6 py-5 relative">
                        <div className="flex flex-col items-center shrink-0">
                          <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-sm font-bold text-slate-700 shadow-sm">
                            {dayNumber || idx + 1}
                          </div>
                          {!isLast && (
                            <div className="absolute top-[42px] bottom-0 w-px bg-slate-200" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5">
                          {dayNumber && (
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Day {dayNumber}</p>
                          )}
                          {title && (
                            <p className="text-base font-semibold text-slate-900 leading-snug">{title}</p>
                          )}
                          {description && (
                            <p className={`text-sm text-slate-500 leading-relaxed ${title ? "mt-2" : ""}`}>{description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-6 py-10">
                  <p className="text-sm text-slate-400 text-center">No itinerary available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inclusions + Exclusions side by side */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card className="rounded-xl border border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-3 pl-5 pr-5 pt-4">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Check className="h-4 w-4 text-emerald-500" />
                  Inclusions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-4">
                {tour.inclusions && tour.inclusions.length > 0 ? (
                  <ul className="space-y-2.5">
                    {tour.inclusions.map((inc, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="text-sm text-slate-600 flex-1 min-w-0 break-words">{inc}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4">None listed</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-3 pl-5 pr-5 pt-4">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <X className="h-4 w-4 text-red-400" />
                  Exclusions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-4">
                {tour.exclusions && tour.exclusions.length > 0 ? (
                  <ul className="space-y-2.5">
                    {tour.exclusions.map((exc, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                        <span className="text-sm text-slate-500 flex-1 min-w-0 break-words">{exc}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4">None listed</p>
                )}
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Right column — sidebar */}
        <div className="space-y-6">

          {/* Quick Info */}
          <Card className="rounded-xl border border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-3 pl-5 pr-5 pt-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Clock className="h-4 w-4 text-slate-400" />
                Quick Info
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <InfoItem label="Duration" value={tour.duration} icon={<Clock className="h-3.5 w-3.5 text-slate-400" />} />
                <InfoItem label="Group Size" value={tour.groupSize} icon={<Users className="h-3.5 w-3.5 text-slate-400" />} />
                <InfoItem label="Difficulty" value={tour.difficulty} icon={<Shield className="h-3.5 w-3.5 text-slate-400" />} />
                <InfoItem label="Price" value={tour.price ? formatCurrency(tour.price) : null} icon={<DollarSign className="h-3.5 w-3.5 text-slate-400" />} highlight />
                <InfoItem label="Category" value={tour.category} icon={<Map className="h-3.5 w-3.5 text-slate-400" />} className="col-span-2" />
                <InfoItem label="Created" value={tour.createdAt ? formatDate(tour.createdAt) : null} icon={<Calendar className="h-3.5 w-3.5 text-slate-400" />} className="col-span-2" />
              </div>
            </CardContent>
          </Card>

          {/* Expedition Go */}
          <Card className="rounded-xl border border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-3 pl-5 pr-5 pt-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Globe className="h-4 w-4 text-slate-400" />
                Expedition Go Tours
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-4">
              {tour.expeditionTour?.isActive ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                      <CheckCircle className="h-3 w-3" />
                      Published
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => expeditionMutation.mutate(false)}
                      disabled={expeditionMutation.isPending}
                    >
                      Unpublish
                    </Button>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p>
                      <span className="font-medium text-slate-700">Flow:</span>{" "}
                      {tour.expeditionTour.bookingFlow === "DIRECT" ? "Direct booking on EG" : "External → TravioAfrica"}
                    </p>
                    {tour.expeditionTour.externalUrl && (
                      <p className="truncate">
                        <span className="font-medium text-slate-700">Link:</span>{" "}
                        <a href={tour.expeditionTour.externalUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {tour.expeditionTour.externalUrl}
                        </a>
                      </p>
                    )}
                    {tour.expeditionTour.syncStatus && (
                      <p className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-700">Sync:</span>
                        <span className={`inline-block h-2 w-2 rounded-full ${
                          tour.expeditionTour.syncStatus === "synced" ? "bg-emerald-500" :
                          tour.expeditionTour.syncStatus === "failed" ? "bg-red-500" :
                          "bg-amber-400"
                        }`} />
                        <span className="capitalize">{tour.expeditionTour.syncStatus}</span>
                        {tour.expeditionTour.lastSyncAt && (
                          <span className="text-slate-400">({formatDate(tour.expeditionTour.lastSyncAt)})</span>
                        )}
                      </p>
                    )}
                    {tour.expeditionTour.publishedAt && (
                      <p>
                        <span className="font-medium text-slate-700">Published:</span>{" "}
                        {formatDate(tour.expeditionTour.publishedAt)}
                        {tour.expeditionTour.publishedBy && ` by ${tour.expeditionTour.publishedBy.name}`}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    <XCircle className="h-3 w-3" />
                    Not Published
                  </span>
                  <Button
                    size="sm"
                    className="h-7 text-xs w-full"
                    onClick={() => expeditionMutation.mutate(true)}
                    disabled={expeditionMutation.isPending}
                  >
                    Publish to Expedition Go
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supplier */}
          {can('suppliers.view') && (
            <Card className="rounded-xl border border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-3 pl-5 pr-5 pt-4">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Users className="h-4 w-4 text-slate-400" />
                  Supplier
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-4">
                {tour.supplier ? (
                  <div className="flex items-center gap-3">
                    {tour.supplier.photoURL ? (
                      <img src={tour.supplier.photoURL} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                        {tour.supplier.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{tour.supplier.name || "Unknown"}</p>
                      {tour.supplier.email && (
                        <p className="text-xs text-slate-400 truncate">{tour.supplier.email}</p>
                      )}
                      {tour.supplier.id && (
                        <Link to={`/admin/suppliers/${tour.supplier.id}`} className="mt-1 inline-block text-xs text-blue-600 hover:underline">
                          View Supplier →
                        </Link>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No supplier info</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Gallery mini */}
          <Card className="rounded-xl border border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-3 pl-5 pr-5 pt-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ImageIcon className="h-4 w-4 text-slate-400" />
                Gallery
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-4">
              {allPhotos.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {allPhotos.slice(0, 6).map((photo, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImageIndex(i)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          i === activeImageIndex
                            ? "border-slate-900 ring-1 ring-slate-900"
                            : "border-transparent hover:border-slate-300"
                        }`}
                      >
                        <img src={photo} alt="" className="h-full w-full object-cover" />
                        {i === 5 && allPhotos.length > 6 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-semibold text-white">
                            +{allPhotos.length - 6}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{allPhotos.length} photo{allPhotos.length !== 1 ? "s" : ""}</p>
                </>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">No photos</p>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function Spec({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{label}</p>
      {value != null ? (
        <p className="mt-0.5 text-sm font-medium text-slate-800">{value}</p>
      ) : (
        <p className="mt-0.5 text-sm text-slate-300">—</p>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: "green" | "blue" | "amber" }) {
  const accentMap: Record<string, { iconBg: string; iconColor: string }> = {
    green: { iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
    blue: { iconBg: "bg-blue-100", iconColor: "text-blue-600" },
    amber: { iconBg: "bg-amber-100", iconColor: "text-amber-600" },
  };
  const a = accentMap[accent || "green"] || accentMap.green;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 truncate">{label}</p>
          <p className="mt-1 text-xl font-bold text-slate-900 leading-tight">{value}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${a.iconBg} ${a.iconColor}`}>{icon}</div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, icon, highlight, className }: { label: string; value?: string | null; icon: React.ReactNode; highlight?: boolean; className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon}
        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      {value != null ? (
        <span className={`text-sm ${highlight ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>{value}</span>
      ) : (
        <span className="text-sm text-slate-300">—</span>
      )}
    </div>
  );
}

function PerfRow({ label, value, icon, highlight }: { label: string; value: string; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <span className={`text-sm font-medium ${highlight ? "text-slate-900" : "text-slate-700"}`}>{value}</span>
    </div>
  );
}
