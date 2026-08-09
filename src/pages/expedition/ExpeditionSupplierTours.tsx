import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, Globe, ExternalLink, Star, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SafeImage } from "@/components/shared/SafeImage";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { staggerContainer, fadeIn } from "@/lib/animations";
import { formatNumber, formatDate } from "@/lib/utils";
import api from "@/lib/axios";

interface Supplier {
  id: string;
  name: string;
  email: string;
  photoURL: string | null;
  totalTours: number;
  onExpedition: number;
  activeOnExpedition: number;
  directCount: number;
}

interface ExpeditionTour {
  id: string;
  isActive: boolean;
  bookingFlow: "DIRECT" | "EXTERNAL";
  externalUrl: string | null;
  isFeatured: boolean;
  displayOrder: number;
  syncStatus: string | null;
  lastSyncAt: string | null;
  syncError: string | null;
  publishedAt: string | null;
  publishedBy: { id: string; name: string } | null;
  unpublishedAt: string | null;
  unpublishReason: string | null;
}

interface Tour {
  id: string;
  title: string;
  slug: string;
  coverPhoto: string | null;
  status: string;
  category: string | null;
  totalBookings: number;
  averageRating: number;
  createdAt: string;
  expeditionTour: ExpeditionTour | null;
}

interface SupplierToursProps {
  supplier: Supplier;
  onBack: () => void;
}

function TourRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-4 animate-pulse">
      <Skeleton className="h-9 w-9 rounded-lg" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-6 w-12 rounded-full" />
    </div>
  );
}

export default function ExpeditionSupplierTours({ supplier, onBack }: SupplierToursProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmTarget, setConfirmTarget] = useState<{ tourId: string; title: string; publish: boolean } | null>(null);
  const [statusFilter, setStatusFilter] = useState("active");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "expedition-supplier-tours", supplier.id, statusFilter],
    queryFn: () => api.get(`/admin/expedition/suppliers/${supplier.id}/tours?status=${statusFilter}`).then((r) => r.data?.data),
  });

  const tours: Tour[] = useMemo(() => data?.tours || [], [data]);
  const supplierDetail = data?.supplier;

  const publishMut = useMutation({
    mutationFn: ({ tourId, isActive }: { tourId: string; isActive: boolean }) =>
      api.patch(`/admin/tours/${tourId}/expedition-publish`, { isActive }),
    onSuccess: () => {
      toast.success("Updated on Expedition Go");
      queryClient.invalidateQueries({ queryKey: ["admin", "expedition-supplier-tours", supplier.id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "expedition-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "expedition-listings"] });
      setConfirmTarget(null);
    },
    onError: () => toast.error("Failed to update"),
  });

  const stats = useMemo(() => {
    const total = tours.length;
    const onEG = tours.filter((t) => t.expeditionTour?.isActive).length;
    const direct = tours.filter((t) => t.expeditionTour?.bookingFlow === "DIRECT").length;
    const synced = tours.filter((t) => t.expeditionTour?.syncStatus === "synced").length;
    return { total, onEG, direct, synced };
  }, [tours]);

  const handleToggle = (tour: Tour) => {
    const currentlyActive = tour.expeditionTour?.isActive ?? false;
    setConfirmTarget({
      tourId: tour.id,
      title: tour.title,
      publish: !currentlyActive,
    });
  };

  const accentMap = {
    emerald: { bg: "bg-emerald-50", dot: "bg-emerald-500", text: "text-emerald-700" },
    blue: { bg: "bg-blue-50", dot: "bg-blue-500", text: "text-blue-700" },
    amber: { bg: "bg-amber-50", dot: "bg-amber-500", text: "text-amber-700" },
  };

  const kpis = [
    { label: "Total Tours", value: stats.total, icon: Globe, accent: "blue" as const },
    { label: "On Expedition Go", value: stats.onEG, icon: CheckCircle, accent: "emerald" as const },
    { label: "Direct Booking", value: stats.direct, icon: ExternalLink, accent: "amber" as const },
    { label: "Synced", value: stats.synced, icon: Eye, accent: "emerald" as const },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-6"
    >
      {/* Back + Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm transition-all hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600" />
          </button>
          <SafeImage
            src={supplierDetail?.photoURL || supplier.photoURL || undefined}
            alt={supplier.name}
            className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-slate-100"
            fallback={
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-bold text-white ring-2 ring-emerald-100">
                {supplier.name.charAt(0).toUpperCase()}
              </div>
            }
          />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{supplier.name}</h2>
            <p className="text-xs text-slate-400">{supplierDetail?.email || supplier.email}</p>
          </div>
        </div>
      </div>

      {/* Mini KPIs */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {kpis.map((k) => {
          const a = accentMap[k.accent];
          return (
            <motion.div
              key={k.label}
              variants={fadeIn}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-xl font-bold text-slate-900">{formatNumber(k.value)}</p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${a.bg}`}>
                  <k.icon className={`h-4 w-4 ${a.text}`} />
                </div>
              </div>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">{k.label}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Status filter */}
      <div className="flex items-center justify-end">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active (excl. Archived)</SelectItem>
            <SelectItem value="ACTIVE">Active only</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <Skeleton className="h-4 w-32" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => <TourRowSkeleton key={i} />)}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-16 text-center">
          <p className="text-sm font-semibold text-slate-800">Failed to load tours</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* Tour rows */}
      {!isLoading && !isError && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-700">Tours</h3>
            <span className="text-xs text-slate-400">{tours.length} tour{tours.length !== 1 ? "s" : ""}</span>
          </div>
          {tours.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Globe className="mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">No tours from this supplier</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tours.map((tour, i) => {
                const et = tour.expeditionTour;
                const isPublished = et?.isActive ?? false;
                return (
                  <motion.div
                    key={tour.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => navigate(`/admin/tours/${tour.id}`)}
                    className="flex cursor-pointer items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-100/50"
                  >
                    {/* Thumbnail */}
                    <SafeImage
                      src={tour.coverPhoto || undefined}
                      alt={tour.title}
                      className="h-9 w-9 shrink-0 rounded-lg object-cover"
                      fallback={
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                          <Globe className="h-4 w-4 text-slate-400" />
                        </div>
                      }
                    />

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 hover:text-blue-600">{tour.title}</p>
                      <div className="flex items-center gap-2.5 text-xs text-slate-400">
                        <span className={`font-medium ${
                          tour.status === "ACTIVE" ? "text-emerald-600" : "text-slate-400"
                        }`}>
                          {tour.status?.replace(/_/g, " ") || "—"}
                        </span>
                        {tour.category && <span>{tour.category}</span>}
                        {tour.averageRating > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-amber-600">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {Number(tour.averageRating).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sync status dot */}
                    {et?.syncStatus && (
                      <div className="group relative hidden sm:block">
                        <span className={`inline-block h-2 w-2 rounded-full ${
                          et.syncStatus === "synced" ? "bg-emerald-500" :
                          et.syncStatus === "failed" ? "bg-red-500" : "bg-amber-400"
                        }`} />
                        {et.syncError && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                            <div className="max-w-[180px] truncate rounded bg-slate-800 px-2 py-1 text-[11px] text-white">
                              {et.syncError}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Booking flow badge */}
                    {et && (
                      <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline-block ${
                        et.bookingFlow === "DIRECT"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {et.bookingFlow === "DIRECT" ? "DIRECT" : "EXTERNAL"}
                      </span>
                    )}

                    {/* Published date */}
                    {et?.publishedAt && (
                      <span className="hidden text-[11px] text-slate-400 lg:block">
                        {formatDate(et.publishedAt)}
                      </span>
                    )}

                    {/* Publish toggle */}
                    <button
                      onClick={() => handleToggle(tour)}
                      disabled={publishMut.isPending}
                      className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 ${
                        isPublished ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                      title={isPublished ? "Unpublish from Expedition Go" : "Publish to Expedition Go"}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                          isPublished ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* External link hint */}
      {tours.some((t) => t.expeditionTour?.externalUrl) && (
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <ExternalLink className="h-3 w-3" />
          Tours with EXTERNAL flow redirect to TravioAfrica. Only DIRECT flow suppliers book through Expedition Go.
        </p>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        open={!!confirmTarget}
        icon={confirmTarget?.publish ? "publish" : "unpublish"}
        title={confirmTarget?.publish ? "Publish to Expedition Go" : "Unpublish from Expedition Go"}
        description={
          confirmTarget?.publish
            ? `"${confirmTarget?.title}" will go live on Expedition Go Tours. The booking flow (DIRECT or EXTERNAL) is auto-detected based on the supplier's account type.`
            : `"${confirmTarget?.title}" will be removed from Expedition Go Tours and hidden from the marketplace.`
        }
        confirmLabel={confirmTarget?.publish ? "Publish" : "Unpublish"}
        confirmVariant={confirmTarget?.publish ? "default" : "destructive"}
        loading={publishMut.isPending}
        onConfirm={() => {
          if (confirmTarget) {
            publishMut.mutate({ tourId: confirmTarget.tourId, isActive: confirmTarget.publish });
          }
        }}
        onCancel={() => setConfirmTarget(null)}
      />
    </motion.div>
  );
}
