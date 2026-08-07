import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Search,
  X,
  Check,
  Flag,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Clock,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Store,
  RefreshCw,
  Inbox,
  Tag,
  CalendarClock,
  FileWarning,
  Eye,
  PenLine,
  GitCompareArrows,
  ListChecks,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermission } from "@/hooks/usePermission";
import { useSocketInvalidate } from "@/hooks/useSocketEvent";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { cn, timeAgo, formatDate } from "@/lib/utils";
import {
  getTourReviewQueue,
  reviewTour,
  getTourDraftReview,
  reviewTourDraft,
  type ReviewQueueTour,
} from "@/services/tourService";

const STATUS_PILLS = ["All", "Pending Approval", "Pending Edits", "Rejected", "Live"] as const;

const STATUS_BADGE: Record<string, "success" | "warning" | "error" | "info" | "secondary"> = {
  PENDING_APPROVAL: "warning",
  REJECTED: "error",
  ACTIVE: "success",
  DRAFT: "secondary",
  PENDING_EDITS: "info",
};

const staggerList = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const fadeSlide = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
};

function getHighlights(pc?: Record<string, unknown> | null): string[] {
  const highlights = pc?.highlights;
  if (Array.isArray(highlights)) return highlights.map(String).filter(Boolean);
  return [];
}

function getMeetingPoint(tour: ReviewQueueTour): { name?: string; address?: string } | null {
  const mp = tour.bookingAndTickets?.meetingPoint ?? tour.productContent?.meetingPoint;
  if (mp && typeof mp === "object") {
    const m = mp as Record<string, unknown>;
    const name = m.name ? String(m.name) : "";
    const address = m.address ? String(m.address) : "";
    if (name || address) return { name, address };
  }
  return null;
}

export default function TourModerationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { can } = usePermission();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_PILLS)[number]>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [actionTour, setActionTour] = useState<ReviewQueueTour | null>(null);
  const [actionType, setActionType] = useState<"approve" | "flag" | null>(null);
  const [reason, setReason] = useState("");

  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const deepLinkHandled = useRef(false);
  const limit = 20;

  useSocketInvalidate("admin:tour-update", ["admin", "tour-review"]);

  const statusParam =
    statusFilter === "All" ? "" : statusFilter === "Pending Approval" ? "PENDING_APPROVAL" : statusFilter === "Pending Edits" ? "PENDING_EDITS" : statusFilter === "Rejected" ? "REJECTED" : "ACTIVE";

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["admin", "tour-review", { page, limit, status: statusParam, search: searchQuery.trim() }],
    queryFn: () =>
      getTourReviewQueue({
        status: statusParam || undefined,
        page,
        limit,
        search: searchQuery.trim() || undefined,
      }),
  });

  const tours: ReviewQueueTour[] = useMemo(() => data?.tours || [], [data]);
  const pagination = data?.pagination;
  const counts = data?.counts || { pending: 0, rejected: 0, active: 0, pendingEdits: 0 };

  const pendingCount = counts?.pending ?? pagination?.totalCount ?? tours.length;
  const rejectedCount = counts?.rejected ?? 0;
  const activeCount = counts?.active ?? 0;
  const pendingEditsCount = counts?.pendingEdits ?? 0;

  const reviewMutation = useMutation({
    mutationFn: (body: { action: "approve" | "flag"; reason?: string }) => {
      const tourId = actionTour?.id || "";
      if (actionTour?.draftStatus === "PENDING_APPROVAL") return reviewTourDraft(tourId, body);
      return reviewTour(tourId, body);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["admin", "tour-review"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "tours"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "tour-detail"] });
      queryClient.removeQueries({ queryKey: ["admin", "tour-draft"] });
      toast.success(
        actionType === "approve"
          ? actionTour?.draftStatus === "PENDING_APPROVAL"
            ? "Update approved and applied to the live tour"
            : "Tour approved and is now live"
          : actionTour?.draftStatus === "PENDING_APPROVAL"
            ? "Update flagged — the live tour is unchanged"
            : "Tour flagged and returned to the supplier",
      );
      closeAction();
    },
    onError: () => toast.error("Failed to update the tour"),
  });

  const deepLinkTourId = location.state?.tourId as string | undefined;
  useEffect(() => {
    if (!deepLinkTourId || deepLinkHandled.current) return;
    if (!tours.some((t) => t.id === deepLinkTourId)) return;
    deepLinkHandled.current = true;
    navigate(location.pathname, { replace: true, state: {} });
    window.setTimeout(() => setSelectedTourId(deepLinkTourId), 0);
  }, [tours, location.pathname, navigate, deepLinkTourId]);

  const effectiveSelectedTourId =
    selectedTourId && tours.some((t) => t.id === selectedTourId) ? selectedTourId : (tours[0]?.id ?? null);
  const selectedTour = useMemo(
    () => tours.find((t) => t.id === effectiveSelectedTourId) || null,
    [tours, effectiveSelectedTourId],
  );

  const isPendingEdit = selectedTour?.draftStatus === "PENDING_APPROVAL";

  const { data: draftReview, isLoading: draftReviewLoading } = useQuery({
    queryKey: ["admin", "tour-draft", selectedTour?.id],
    queryFn: () => getTourDraftReview(selectedTour!.id),
    enabled: !!selectedTour?.id && isPendingEdit,
    staleTime: 30_000,
  });

  const openAction = (type: "approve" | "flag", tour: ReviewQueueTour) => {
    setActionTour(tour);
    setActionType(type);
    setReason("");
  };

  const closeAction = () => {
    setActionTour(null);
    setActionType(null);
    setReason("");
  };

  const handleAction = () => {
    if (!actionType || !actionTour) return;
    const body: { action: "approve" | "flag"; reason?: string } = { action: actionType };
    if (actionType === "flag") body.reason = reason;
    reviewMutation.mutate(body);
  };

  const renderStatusBadge = (status?: string) => {
    const s = status || "DRAFT";
    return <Badge variant={STATUS_BADGE[s] || "secondary"} className="shrink-0">{s.replace(/_/g, " ")}</Badge>;
  };

  const renderPendingEditBadge = (tour: ReviewQueueTour) => {
    if (tour.draftStatus !== "PENDING_APPROVAL") return null;
    return (
      <Badge variant="info" className="shrink-0 gap-1">
        <PenLine className="h-3 w-3" />
        Edit pending
      </Badge>
    );
  };

  const formatDiffPath = (path: string) => path.split(".").join(" › ");

  const renderDiffRow = (entry: { path: string; kind: string; before?: string; after?: string }) => (
    <div key={entry.path} className="flex items-start gap-3 rounded-lg border border-border bg-surface-muted/40 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wider break-all">{formatDiffPath(entry.path)}</p>
        <div className="flex items-center gap-2 text-xs mt-1 flex-wrap">
          {entry.before !== undefined && (
            <span className="rounded bg-red-50 border border-red-100 text-red-600 px-1.5 py-0.5 line-through max-w-xs truncate">{entry.before}</span>
          )}
          <GitCompareArrows className="h-3 w-3 text-text-tertiary shrink-0" />
          {entry.after !== undefined && (
            <span className="rounded bg-emerald-50 border border-emerald-100 text-emerald-700 px-1.5 py-0.5 max-w-xs truncate">{entry.after}</span>
          )}
        </div>
      </div>
      <Badge variant={entry.kind === "removed" ? "error" : entry.kind === "added" ? "success" : "warning"} className="shrink-0 capitalize">
        {entry.kind}
      </Badge>
    </div>
  );

  const renderThumb = (tour: ReviewQueueTour, size: string) => (
    <div className={cn("rounded-lg shrink-0 overflow-hidden bg-surface-muted border border-border relative", size)}>
      {tour.coverPhoto ? (
        <img src={tour.coverPhoto} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      ) : tour.photos?.[0] ? (
        <img src={tour.photos[0]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-text-tertiary">
          {tour.title?.charAt(0) || "T"}
        </div>
      )}
    </div>
  );

  const contentKey = `${statusFilter}-${page}-${searchQuery.trim()}`;

  return (
    <div className="space-y-4 md:space-y-5 w-full h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-base hover:bg-surface-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-text-secondary" />
            </motion.button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-text-primary truncate">Tour Moderation</h1>
              <p className="text-sm text-text-secondary truncate">Review and approve tours submitted by suppliers</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center justify-center h-9 px-3 text-xs font-medium rounded-xl border border-border bg-surface-base text-text-secondary hover:bg-surface-muted transition-colors disabled:opacity-50 gap-1.5"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")} />
              <span className="hidden sm:inline">{isRefetching ? "Refreshing..." : "Refresh"}</span>
            </motion.button>
            <Badge variant="warning" className="px-2.5 py-1 text-xs gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
              {pendingCount}
            </Badge>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
      >
        {[
          { label: "Pending Approval", value: pendingCount, bg: "bg-amber-50", text: "text-amber-600", Icon: Clock },
          { label: "Pending Edits", value: pendingEditsCount, bg: "bg-sky-50", text: "text-sky-600", Icon: PenLine },
          { label: "Rejected", value: rejectedCount, bg: "bg-red-50", text: "text-red-500", Icon: FileWarning },
          { label: "Live", value: activeCount, bg: "bg-emerald-50", text: "text-emerald-600", Icon: ShieldCheck },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-border bg-surface-base p-4 md:p-5 transition-shadow hover:shadow-soft"
          >
            <div className="flex items-center gap-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", stat.bg)}>
                <stat.Icon className={cn("h-5 w-5", stat.text)} />
              </div>
              <div>
                <p className="text-xs font-medium text-text-secondary">{stat.label}</p>
                <div className="text-xl font-bold text-text-primary">
                  {isLoading ? <Skeleton className="inline-block w-10 h-6 align-middle" /> : <AnimatedNumber value={stat.value} />}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3"
      >
        <div className="relative w-full sm:flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <Input
            placeholder="Search tours or suppliers..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-9 h-10 w-full"
          />
          {searchQuery && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" />
            </motion.button>
          )}
        </div>
        <div className="flex gap-1 bg-surface-muted p-0.5 rounded-xl border border-border overflow-x-auto scrollbar-none w-full sm:w-auto">
          {STATUS_PILLS.map((pill) => (
            <motion.button
              key={pill}
              layout
              onClick={() => { setStatusFilter(pill); setPage(1); }}
              className={cn(
                "relative px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors",
                statusFilter === pill ? "text-green-700" : "text-text-secondary hover:text-text-primary",
              )}
            >
              {statusFilter === pill && (
                <motion.span
                  layoutId="tourModPill"
                  className="absolute inset-0 bg-surface-base rounded-lg border border-border shadow-sm"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{pill}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 grid"
          >
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border border-border rounded-xl p-4 bg-surface-base">
                  <Skeleton className="h-4 w-36 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
            <div className="border border-border rounded-xl p-6 space-y-5 bg-surface-base">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </motion.div>
        ) : isError ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/10 mb-4">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">Failed to load tours</p>
            <p className="text-xs text-text-tertiary mb-5">Could not fetch tour submissions from the server.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </motion.div>
        ) : tours.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface-muted mb-4">
              <Inbox className="h-7 w-7 text-text-tertiary" />
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">
              {searchQuery.trim() ? "No tours match your search" : "All caught up!"}
            </p>
            <p className="text-xs text-text-tertiary">
              {searchQuery.trim()
                ? "Try adjusting your search terms."
                : statusFilter === "Pending Approval"
                  ? "No tours are awaiting approval right now."
                  : statusFilter === "Pending Edits"
                    ? "No live tours have pending updates awaiting review."
                    : "No tours found in this view."}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={contentKey}
            variants={staggerList}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 grid flex-1 min-h-0 overflow-hidden"
          >
            <div className="overflow-y-auto space-y-2 pr-1">
              {tours.map((tour) => {
                const isSelected = effectiveSelectedTourId === tour.id;
                return (
                  <motion.div
                    key={tour.id}
                    variants={fadeSlide}
                    layout
                    onClick={() => setSelectedTourId(tour.id)}
                    className={cn(
                      "rounded-xl border p-4 cursor-pointer transition-all",
                      isSelected
                        ? "border-primary/30 bg-primary/5 shadow-sm"
                        : "border-border bg-surface-base hover:border-border-muted hover:bg-surface-muted/30",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {renderThumb(tour, "w-12 h-12")}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-text-primary truncate">{tour.title || "Untitled Tour"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-text-tertiary mt-1">
                          <Store className="h-3 w-3" />
                          <span className="truncate">{tour.supplier?.name || "Unknown supplier"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-tertiary mt-1.5 flex-wrap">
                          {renderPendingEditBadge(tour)}
                          {renderStatusBadge(tour.status)}
                          {(tour.draftSubmittedAt || tour.submittedAt) && (
                            <span className="flex items-center gap-1 whitespace-nowrap">
                              <CalendarClock className="h-3 w-3" />
                              {timeAgo(tour.draftSubmittedAt || tour.submittedAt || "")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="min-h-0 flex flex-col overflow-hidden">
              {selectedTour ? (
                <>
                  <div className="flex items-center justify-between flex-shrink-0 pb-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {renderThumb(selectedTour, "w-10 h-10")}
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold text-text-primary truncate">{selectedTour.title || "Untitled Tour"}</h2>
                        <div className="flex items-center gap-2 text-xs text-text-secondary flex-wrap">
                          <span className="flex items-center gap-1">
                            <Store className="h-3 w-3" />
                            {selectedTour.supplier?.name || "Unknown supplier"}
                          </span>
                          {selectedTour.category && (
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {selectedTour.category}
                            </span>
                          )}
                          {renderPendingEditBadge(selectedTour)}
                          {renderStatusBadge(selectedTour.status)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <motion.div
                    variants={staggerList}
                    initial="hidden"
                    animate="visible"
                    className="overflow-y-auto space-y-4 flex-1 pr-1"
                  >
                    {selectedTour.reviewNote && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <FileWarning className="h-4 w-4 text-red-500" />
                          <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Reviewer note</span>
                        </div>
                        <p className="text-sm text-red-700 leading-relaxed">{selectedTour.reviewNote}</p>
                      </div>
                    )}

                    {isPendingEdit && (
                      <div className="bg-white rounded-xl border border-sky-200 p-5">
                        <div className="flex items-center gap-2">
                          <PenLine className="h-4 w-4 text-sky-600" />
                          <h3 className="text-sm font-semibold text-text-primary">Pending update</h3>
                        </div>
                        <p className="text-xs text-text-secondary mt-1">
                          The live tour keeps selling the current approved version. Review the proposed changes below before applying them.
                        </p>
                        {draftReviewLoading ? (
                          <div className="space-y-2 mt-4">
                            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                          </div>
                        ) : draftReview ? (
                          <>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge variant="info" className="gap-1">
                                <ListChecks className="h-3 w-3" />
                                {draftReview.changesSummary.count} change{draftReview.changesSummary.count === 1 ? "" : "s"}
                              </Badge>
                              {draftReview.changesSummary.sections.map((s) => (
                                <Badge key={s.section} variant="secondary">
                                  {s.section} ({s.changes})
                                </Badge>
                              ))}
                            </div>
                            <div className="mt-4 space-y-2 max-h-80 overflow-y-auto pr-1">
                              {draftReview.diff.map(renderDiffRow)}
                            </div>
                          </>
                        ) : null}
                      </div>
                    )}

                    <div className="bg-white rounded-xl border border-border p-5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-text-primary">Submission details</h3>
                        <div className="flex items-center gap-2 text-xs text-text-tertiary">
                          {(selectedTour.draftSubmittedAt || selectedTour.submittedAt) && (
                            <span className="flex items-center gap-1">
                              <CalendarClock className="h-3 w-3" />
                              {isPendingEdit ? "Update submitted " : "Submitted "}
                              {timeAgo(selectedTour.draftSubmittedAt || selectedTour.submittedAt || "")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                        {[
                          { label: "Category", value: selectedTour.category || "—" },
                          { label: "Subcategory", value: selectedTour.subcategory || "—" },
                          { label: "Location", value: [selectedTour.city, selectedTour.country].filter(Boolean).join(", ") || "—" },
                          { label: "Price", value: selectedTour.price ? `${selectedTour.currency || ""} ${selectedTour.price}`.trim() : "—" },
                          { label: "Bookings", value: String(selectedTour._count?.bookings ?? 0) },
                          { label: "Reviews", value: String(selectedTour._count?.reviews ?? 0) },
                        ].map((f) => (
                          <div key={f.label} className="rounded-lg bg-surface-muted/60 border border-border px-3 py-2.5">
                            <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">{f.label}</p>
                            <p className="text-sm font-medium text-text-primary mt-0.5 truncate">{f.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-border p-5">
                      <h3 className="text-sm font-semibold text-text-primary">Description</h3>
                      <p className="text-sm text-text-secondary leading-relaxed mt-2">
                        {selectedTour.description || "No description provided."}
                      </p>
                    </div>

                    {(() => {
                      const highlights = getHighlights(selectedTour.productContent);
                      const meetingPoint = getMeetingPoint(selectedTour);
                      if (highlights.length === 0 && !meetingPoint) return null;
                      return (
                        <div className="bg-white rounded-xl border border-border p-5">
                          <h3 className="text-sm font-semibold text-text-primary">Product content</h3>
                          {highlights.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-text-secondary mb-1.5">Highlights</p>
                              <div className="flex flex-wrap gap-1.5">
                                {highlights.map((h, i) => (
                                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2.5 py-1 text-xs text-green-700">
                                    <Check className="h-3 w-3" />
                                    {h}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {meetingPoint && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-text-secondary mb-1.5 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                Meeting point
                              </p>
                              <p className="text-sm text-text-primary">
                                {meetingPoint.name}
                                {meetingPoint.address ? ` · ${meetingPoint.address}` : ""}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {selectedTour.photos && selectedTour.photos.length > 0 && (
                      <div className="bg-white rounded-xl border border-border p-5">
                        <h3 className="text-sm font-semibold text-text-primary mb-3">Photos ({selectedTour.photos.length})</h3>
                        <div className="flex gap-2 flex-wrap">
                          {selectedTour.photos.map((photo, i) => (
                            <img
                              key={i}
                              src={photo}
                              alt=""
                              className="w-24 h-24 rounded-lg object-cover border border-border bg-surface-muted"
                              loading="lazy"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {(selectedTour.status === "PENDING_APPROVAL" || isPendingEdit) && can("tours.approve") && (
                      <div className="flex items-center gap-2 pt-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          disabled={reviewMutation.isPending}
                          className="inline-flex items-center justify-center h-9 px-4 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                          onClick={() => openAction("approve", selectedTour)}
                        >
                          {reviewMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                          {isPendingEdit ? "Apply & Make Live" : "Approve & Make Live"}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          disabled={reviewMutation.isPending}
                          className="inline-flex items-center justify-center h-9 px-4 text-xs font-semibold rounded-lg border border-border text-text-secondary bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                          onClick={() => openAction("flag", selectedTour)}
                        >
                          <Flag className="h-3.5 w-3.5 mr-1.5" />
                          {isPendingEdit ? "Flag Update" : "Flag & Request Changes"}
                        </motion.button>
                      </div>
                    )}

                    {selectedTour.status === "ACTIVE" && (
                      <div className={cn("rounded-xl border p-4 flex items-center gap-3", isPendingEdit ? "border-sky-200 bg-sky-50" : "border-emerald-200 bg-emerald-50")}>
                        {isPendingEdit ? <PenLine className="h-5 w-5 text-sky-600 shrink-0" /> : <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />}
                        <p className={cn("text-sm", isPendingEdit ? "text-sky-700" : "text-emerald-700")}>
                          {isPendingEdit
                            ? "This tour is live on the platform and keeps selling while this update awaits review."
                            : "This tour is live on the platform."}
                        </p>
                      </div>
                    )}
                  </motion.div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface-muted mb-4">
                    <Eye className="h-7 w-7 text-text-tertiary" />
                  </div>
                  <p className="text-sm font-medium text-text-primary mb-1">Select a tour</p>
                  <p className="text-xs text-text-tertiary">Choose a submission from the list to review its details.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {pagination && pagination.totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border border-border rounded-xl bg-surface-base"
        >
          <p className="text-xs text-text-tertiary order-2 sm:order-1">
            Page {pagination.currentPage} of {pagination.totalPages} &middot; {pagination.totalCount} total
          </p>
          <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={pagination.currentPage <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="inline-flex flex-1 sm:flex-none items-center justify-center h-9 px-3 text-xs font-medium rounded-xl border border-border bg-surface-base text-text-secondary hover:bg-surface-muted transition-colors disabled:opacity-40 disabled:pointer-events-none gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex flex-1 sm:flex-none items-center justify-center h-9 px-3 text-xs font-medium rounded-xl border border-border bg-surface-base text-text-secondary hover:bg-surface-muted transition-colors disabled:opacity-40 disabled:pointer-events-none gap-1"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </motion.button>
          </div>
        </motion.div>
      )}

      {actionTour && actionType === "flag" && (
        <Dialog open onOpenChange={(open) => { if (!open) closeAction(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Flag Tour &amp; Request Changes</DialogTitle>
              <DialogDescription>
                {actionTour?.draftStatus === "PENDING_APPROVAL"
                  ? "The update will be sent back to the supplier with your note. The live tour stays exactly as it is."
                  : "This tour will be sent back to the supplier as rejected with your note. The supplier can fix the issues and resubmit."}
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-border bg-surface-muted/50 p-4">
              <p className="text-sm font-medium text-text-primary truncate">{actionTour.title}</p>
              <p className="text-xs text-text-tertiary mt-0.5">
                {actionTour.supplier?.name || "Unknown supplier"} ·{" "}
                {formatDate(actionTour.draftSubmittedAt || actionTour.submittedAt)}
              </p>
            </div>
            <div className="space-y-3 py-2">
              <Label htmlFor="flag-reason">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="flag-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain what needs to change before this tour can go live..."
                rows={3}
              />
              {reason.length > 0 && reason.length < 10 && (
                <p className="text-xs text-red-500">Minimum 10 characters required</p>
              )}
              <p className="text-xs text-text-tertiary">{reason.length}/10 minimum</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeAction} disabled={reviewMutation.isPending}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={reason.length < 10 || reviewMutation.isPending}
                onClick={handleAction}
              >
                {reviewMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1" />Flagging...</>
                ) : (
                  "Flag Tour"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {actionTour && actionType === "approve" && (
        <Dialog open onOpenChange={(open) => { if (!open) closeAction(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Approve Tour</DialogTitle>
              <DialogDescription>
                {actionTour?.draftStatus === "PENDING_APPROVAL"
                  ? "The supplier's update will be applied to the live listing immediately and the supplier will be notified."
                  : "This tour will become live on the public storefront immediately and the supplier will be notified."}
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-border bg-surface-muted/50 p-4 space-y-1.5">
              <p className="text-sm font-semibold text-text-primary">{actionTour.title}</p>
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Store className="h-3 w-3" />
                {actionTour.supplier?.name || "Unknown supplier"}
              </div>
              {actionTour.price && (
                <p className="text-xs text-text-secondary">
                  {selectedTour?.currency || ""} {actionTour.price}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeAction} disabled={reviewMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleAction} disabled={reviewMutation.isPending}>
                {reviewMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1" />Applying...</>
                ) : (
                  actionTour?.draftStatus === "PENDING_APPROVAL" ? "Apply Update" : "Approve & Make Live"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
