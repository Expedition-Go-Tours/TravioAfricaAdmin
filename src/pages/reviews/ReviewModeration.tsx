import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Search,
  X,
  Star,
  Check,
  Flag,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Clock,
  AlertTriangle,
  MessageSquareText,
  ShieldCheck,
  MapPin,
  Store,
  RefreshCw,
  Inbox,
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
import api from "@/lib/axios";
import { cn, timeAgo } from "@/lib/utils";

interface Review {
  id: string;
  rating?: number;
  title?: string;
  comment?: string;
  customer?: { id?: string; name?: string; photoURL?: string };
  tour?: { id?: string; title?: string; coverPhoto?: string; supplier?: { id?: string; name?: string; photoURL?: string } };
  photos?: string[];
  createdAt?: string;
  status?: string;
  moderatedBy?: string;
  moderatedAt?: string;
  flagReason?: string;
  supplierResponse?: string;
  supplierResponseAt?: string;
  verified?: boolean;
  helpfulCount?: number;
  reportCount?: number;
}

interface TourGroup {
  tourId: string;
  tourTitle: string;
  supplierName: string;
  coverPhoto: string | null;
  reviews: Review[];
  avgRating: number;
  totalReviews: number;
  pendingReviewCount: number;
}

const STATUS_PILLS = ["All", "Pending", "Approved", "Rejected", "Flagged"];

const STATUS_BADGE: Record<string, "success" | "warning" | "error" | "info"> = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "error",
  FLAGGED: "info",
};

const staggerList = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const fadeSlide = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function ReviewModerationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { can } = usePermission();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [actionReview, setActionReview] = useState<Review | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "flag" | null>(null);
  const [reason, setReason] = useState("");

  const [editReview, setEditReview] = useState<Review | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editTitle, setEditTitle] = useState("");
  const [editComment, setEditComment] = useState("");

  const [deleteReview, setDeleteReview] = useState<Review | null>(null);

  const [editResponseReview, setEditResponseReview] = useState<Review | null>(null);
  const [editResponseText, setEditResponseText] = useState("");

  const [deleteResponseReview, setDeleteResponseReview] = useState<Review | null>(null);

  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);

  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  const deepLinkHandled = useRef(false);
  const limit = 20;

  useSocketInvalidate("admin:new-review", ["admin", "reviews"]);

  const statusParam = statusFilter === "All" ? "" : statusFilter.toUpperCase();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["admin", "reviews", { page, limit, status: statusParam }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusParam) params.set("status", statusParam);
      return api.get(`/reviews/admin/pending?${params.toString()}`).then((r) => r.data);
    },
  });

  const moderateMutation = useMutation({
    mutationFn: (body: { action: string; reason?: string }) =>
      api.patch(`/reviews/${actionReview?.id}/moderate`, body),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["admin", "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews-pending-count"] });
      toast.success(`Review ${actionType}d successfully`);
      closeModerate();
    },
    onError: () => toast.error("Failed to moderate review"),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data: body }: { id: string; data: { rating?: number; title?: string; comment?: string } }) =>
      api.patch(`/reviews/${id}/admin`, body),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["admin", "reviews"] });
      toast.success("Review updated");
      setEditReview(null);
    },
    onError: () => toast.error("Failed to update review"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/reviews/${id}/admin`),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["admin", "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews-pending-count"] });
      toast.success("Review deleted");
      setDeleteReview(null);
    },
    onError: () => toast.error("Failed to delete review"),
  });

  const editResponseMutation = useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) =>
      api.patch(`/reviews/${id}/admin/response`, { response }),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["admin", "reviews"] });
      toast.success("Response updated");
      setEditResponseReview(null);
    },
    onError: () => toast.error("Failed to update response"),
  });

  const deleteResponseMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/reviews/${id}/admin/response`),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["admin", "reviews"] });
      toast.success("Response deleted");
      setDeleteResponseReview(null);
    },
    onError: () => toast.error("Failed to delete response"),
  });

  const rawReviews: Review[] = useMemo(
    () => data?.reviews || data?.data?.reviews || [],
    [data],
  );
  const pagination = data?.pagination || data?.data?.pagination;
  const counts = data?.counts || data?.data?.counts || {};

  const pendingCount = counts?.pending ?? pagination?.totalCount ?? rawReviews.length;
  const flaggedCount = counts?.flagged ?? 0;
  const moderatedTodayCount = counts?.moderatedToday ?? 0;

  const deepLinkReviewId = location.state?.reviewId as string | undefined;
  useEffect(() => {
    if (!deepLinkReviewId || deepLinkHandled.current || rawReviews.length === 0) return;
    const found = rawReviews.find((r) => r.id === deepLinkReviewId);
    if (found) {
      deepLinkHandled.current = true;
      navigate(location.pathname, { replace: true, state: {} });
      const tourId = found.tour?.id;
      if (tourId) setSelectedTourId(tourId);
      setTimeout(() => openModerate("approve", found), 0);
    }
  }, [rawReviews, location.pathname, navigate, deepLinkReviewId]);

  const query = searchQuery.toLowerCase().trim();
  const filteredReviews = useMemo(() => {
    if (!query) return rawReviews;
    return rawReviews.filter((r) =>
      [r.customer?.name, r.tour?.title, r.tour?.supplier?.name, r.title, r.comment]
        .some((f) => f?.toLowerCase().includes(query)),
    );
  }, [rawReviews, query]);

  const tourGroups: TourGroup[] = useMemo(() => {
    const map = new Map<string, Review[]>();
    for (const review of filteredReviews) {
      const tourId = review.tour?.id || "unknown";
      if (!map.has(tourId)) map.set(tourId, []);
      map.get(tourId)!.push(review);
    }
    const groups: TourGroup[] = [];
    for (const [tourId, reviews] of map) {
      const first = reviews[0];
      const avgRating = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
      groups.push({
        tourId,
        tourTitle: first?.tour?.title || "Unknown Tour",
        supplierName: first?.tour?.supplier?.name || "",
        coverPhoto: first?.tour?.coverPhoto || null,
        reviews,
        avgRating: Math.round(avgRating * 10) / 10,
        totalReviews: reviews.length,
        pendingReviewCount: reviews.filter((r) => r.status === "PENDING").length,
      });
    }
    groups.sort((a, b) => {
      if (b.pendingReviewCount !== a.pendingReviewCount) return b.pendingReviewCount - a.pendingReviewCount;
      return a.tourTitle.localeCompare(b.tourTitle);
    });
    return groups;
  }, [filteredReviews]);

  const selectedTour = useMemo(
    () => tourGroups.find((g) => g.tourId === selectedTourId) || null,
    [tourGroups, selectedTourId],
  );

  useEffect(() => {
    if (tourGroups.length > 0) {
      const stillExists = tourGroups.some((g) => g.tourId === selectedTourId);
      if (!stillExists) setSelectedTourId(tourGroups[0].tourId);
    } else {
      setSelectedTourId(null);
    }
  }, [tourGroups, selectedTourId]);

  const openModerate = (type: "approve" | "reject" | "flag", review: Review) => {
    setActionReview(review);
    setActionType(type);
    setReason("");
  };

  const closeModerate = () => {
    setActionReview(null);
    setActionType(null);
    setReason("");
  };

  const handleAction = () => {
    if (!actionType || !actionReview) return;
    const body: { action: string; reason?: string } = { action: actionType };
    if (reason) body.reason = reason;
    moderateMutation.mutate(body);
  };

  const openEdit = (review: Review) => {
    setEditReview(review);
    setEditRating(review.rating || 0);
    setEditTitle(review.title || "");
    setEditComment(review.comment || "");
  };

  const handleEditSave = () => {
    if (!editReview) return;
    editMutation.mutate({
      id: editReview.id,
      data: { rating: editRating, title: editTitle, comment: editComment },
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteReview) return;
    deleteMutation.mutate(deleteReview.id);
  };

  const renderStars = (rating: number, size: "sm" | "md" = "sm") => {
    const cls = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
    return (
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(cls, i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-200")}
          />
        ))}
      </span>
    );
  };

  const renderAvatar = (url?: string, name?: string) => (
    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-bold text-slate-400 ring-1 ring-slate-200">
      {url ? (
        <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      ) : null}
      <span className={url ? "opacity-0" : ""}>{(name || "?").charAt(0).toUpperCase()}</span>
    </div>
  );

  const editableStars = (rating: number, onChange: (v: number) => void) => (
    <div className="flex items-center gap-0.5 mt-1.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <motion.button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          className="p-0.5 focus:outline-none"
        >
          <Star className={cn("h-5 w-5", s <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
        </motion.button>
      ))}
      <span className="text-sm text-slate-500 ml-2">{rating}/5</span>
    </div>
  );

  const renderReviewCard = (review: Review) => {
    const status = review.status || "PENDING";
    const isPending = status === "PENDING";

    return (
      <motion.div
        key={review.id}
        variants={fadeSlide}
        layout
        className="bg-white rounded-xl border border-slate-200 p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {renderAvatar(review.customer?.photoURL, review.customer?.name)}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-slate-900 truncate block">
                  {review.customer?.name || "Anonymous"}
                </span>
                {review.verified && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
              </div>
              <span className="text-xs text-slate-400">{timeAgo(review.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {renderStars(review.rating || 0)}
            <span className="text-xs text-slate-400 whitespace-nowrap">({review.rating || 0}/5)</span>
            <Badge variant={STATUS_BADGE[status] || "warning"} className="shrink-0">
              {status}
            </Badge>
          </div>
        </div>

        {review.title && (
          <p className="text-sm font-semibold text-slate-900 mt-4">{review.title}</p>
        )}
        {review.comment && (
          <p className="text-sm text-slate-600 leading-relaxed mt-1.5">{review.comment}</p>
        )}

        {review.photos && review.photos.length > 0 && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {review.photos.map((photo, i) => (
              <motion.img
                key={i}
                src={photo}
                alt=""
                whileHover={{ scale: 1.04 }}
                className="w-20 h-20 rounded-lg object-cover border border-slate-200 bg-slate-50 cursor-pointer"
                loading="lazy"
                onClick={() => setLightbox({ images: review.photos!, index: i })}
              />
            ))}
          </div>
        )}

        {review.supplierResponse && (
          <div className="mt-4 bg-slate-50 rounded-lg p-4 border border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-500">
                <MessageSquareText className="h-3 w-3 inline-block mr-1 -mt-0.5" />
                Response from {review.tour?.supplier?.name || "Supplier"}
                {review.supplierResponseAt && (
                  <span className="font-normal text-slate-400"> · {timeAgo(review.supplierResponseAt)}</span>
                )}
              </span>
              {can("reviews.moderate") && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                    title="Edit response"
                    onClick={() => {
                      setEditResponseReview(review);
                      setEditResponseText(review.supplierResponse || "");
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Delete response"
                    onClick={() => setDeleteResponseReview(review)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </motion.button>
                </div>
              )}
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{review.supplierResponse}</p>
          </div>
        )}

        <div className="flex items-center gap-2 pt-4 mt-4 border-t border-slate-100">
          {isPending ? (
            <>
              {can("reviews.moderate") && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center h-8 px-4 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  onClick={() => openModerate("approve", review)}
                >
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Approve
                </motion.button>
              )}
              {can("reviews.moderate") && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center h-8 px-4 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                  onClick={() => openModerate("reject", review)}
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Reject
                </motion.button>
              )}
              {can("reviews.moderate") && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                  title="Flag"
                  onClick={() => openModerate("flag", review)}
                >
                  <Flag className="h-4 w-4" />
                </motion.button>
              )}
              {can("reviews.moderate") && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Edit review"
                  onClick={() => openEdit(review)}
                >
                  <Pencil className="h-4 w-4" />
                </motion.button>
              )}
            </>
          ) : (
            <>
              {can("reviews.moderate") && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Edit review"
                  onClick={() => openEdit(review)}
                >
                  <Pencil className="h-4 w-4" />
                </motion.button>
              )}
              {can("reviews.moderate") && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium rounded-lg text-red-600 hover:bg-red-50 transition-colors gap-1.5"
                  onClick={() => setDeleteReview(review)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </motion.button>
              )}
            </>
          )}
        </div>
      </motion.div>
    );
  };

  const contentKey = `${statusFilter}-${page}`;

  return (
    <div className="space-y-5 max-w-7xl mx-auto h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-slate-700" />
            </motion.button>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Review Moderation</h1>
              <p className="text-sm text-slate-500">Moderate customer reviews across all tours</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 gap-1.5"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")} />
              {isRefetching ? "Refreshing..." : "Refresh"}
            </motion.button>
            <Badge variant="warning" className="px-2.5 py-0.5 text-xs gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
              {pendingCount} pending
            </Badge>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid grid-cols-3 gap-4"
      >
        {[
          { label: "Pending", value: pendingCount, bg: "bg-amber-50", text: "text-amber-600", Icon: Clock },
          { label: "Flagged", value: flaggedCount, bg: "bg-red-50", text: "text-red-500", Icon: AlertTriangle },
          { label: "Moderated Today", value: moderatedTodayCount, bg: "bg-indigo-50", text: "text-indigo-500", Icon: RefreshCw },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", stat.bg)}>
                <stat.Icon className={cn("h-5 w-5", stat.text)} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">{stat.label}</p>
                <p className="text-xl font-bold text-slate-900">
                  {isLoading ? <Skeleton className="inline-block w-10 h-6 align-middle" /> : <AnimatedNumber value={stat.value} />}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex items-center gap-4 flex-wrap"
      >
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
          {searchQuery && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </motion.button>
          )}
        </div>
        <div className="flex gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
          {STATUS_PILLS.map((pill) => (
            <motion.button
              key={pill}
              layout
              onClick={() => { setStatusFilter(pill); setPage(1); }}
              className={cn(
                "relative px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                statusFilter === pill ? "text-indigo-700" : "text-slate-500 hover:text-slate-700",
              )}
            >
              {statusFilter === pill && (
                <motion.span
                  layoutId="activePill"
                  className="absolute inset-0 bg-white rounded-md border border-slate-200 shadow-sm"
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
            className="grid grid-cols-[340px_1fr] gap-5"
          >
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4">
                  <Skeleton className="h-4 w-36 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
            <div className="border border-slate-200 rounded-xl p-6 space-y-5">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
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
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-50 mb-4">
              <AlertTriangle className="h-7 w-7 text-red-400" />
            </div>
            <p className="text-sm font-medium text-slate-900 mb-1">Failed to load reviews</p>
            <p className="text-xs text-slate-500 mb-5">Could not fetch reviews from the server.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </motion.div>
        ) : tourGroups.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-50 mb-4">
              <Inbox className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-900 mb-1">
              {query ? "No reviews match your search" : "All caught up!"}
            </p>
            <p className="text-xs text-slate-500">
              {query ? "Try adjusting your search terms." : "No reviews to moderate right now."}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={contentKey}
            variants={staggerList}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="grid grid-cols-[340px_1fr] gap-5 flex-1 min-h-0 overflow-hidden"
          >
            <div className="overflow-y-auto space-y-2 pr-1">
              {tourGroups.map((group) => {
                const isSelected = selectedTourId === group.tourId;
                return (
                  <motion.div
                    key={group.tourId}
                    variants={fadeSlide}
                    layout
                    onClick={() => setSelectedTourId(group.tourId)}
                    className={cn(
                      "rounded-xl border p-4 cursor-pointer transition-all",
                      isSelected
                        ? "border-indigo-200 bg-indigo-50/50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg shrink-0 overflow-hidden bg-slate-100 border border-slate-200 relative">
                        {group.coverPhoto ? (
                          <img src={group.coverPhoto} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                            {group.tourTitle.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-slate-900 truncate">{group.tourTitle}</span>
                          {group.pendingReviewCount > 0 && (
                            <span className="shrink-0 inline-flex items-center justify-center h-4 min-w-[18px] px-1 rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                              {group.pendingReviewCount}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                          {group.supplierName && <span className="truncate">{group.supplierName}</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                          {renderStars(group.avgRating)}
                          <span>{group.avgRating.toFixed(1)}</span>
                          <span>· {group.totalReviews}</span>
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
                  <div className="flex items-center justify-between flex-shrink-0 pb-3">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-indigo-500" />
                      <div>
                        <h2 className="text-base font-semibold text-slate-900">{selectedTour.tourTitle}</h2>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          {selectedTour.supplierName && (
                            <span className="flex items-center gap-1">
                              <Store className="h-3 w-3" />
                              {selectedTour.supplierName}
                            </span>
                          )}
                          <span>{renderStars(selectedTour.avgRating)} {selectedTour.avgRating.toFixed(1)}</span>
                          <span>· {selectedTour.totalReviews} review{selectedTour.totalReviews !== 1 ? "s" : ""}</span>
                          {selectedTour.pendingReviewCount > 0 && (
                            <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                              {selectedTour.pendingReviewCount} pending
                            </Badge>
                          )}
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
                    {selectedTour.reviews.map((review) => renderReviewCard(review))}
                  </motion.div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-50 mb-4">
                    <Inbox className="h-7 w-7 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-900 mb-1">No reviews to display</p>
                  <p className="text-xs text-slate-500">Select a tour from the left panel to view its reviews.</p>
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
          className="flex items-center justify-between px-5 py-3 border border-slate-200 rounded-xl bg-white"
        >
          <p className="text-sm text-slate-500">
            Page {pagination.currentPage} of {pagination.totalPages} · {pagination.totalCount} total
          </p>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={pagination.currentPage <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:pointer-events-none gap-1"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </motion.button>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {lightbox && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85"
            onClick={() => setLightbox(null)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setLightbox(null);
              if (e.key === "ArrowLeft")
                setLightbox((l) => (l ? { ...l, index: Math.max(0, l.index - 1) } : null));
              if (e.key === "ArrowRight")
                setLightbox((l) =>
                  l ? { ...l, index: Math.min(l.images.length - 1, l.index + 1) } : null,
                );
            }}
            tabIndex={0}
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
              onClick={() => setLightbox(null)}
            >
              <X className="h-6 w-6" />
            </motion.button>

            {lightbox.images.length > 1 && lightbox.index > 0 && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((l) => (l ? { ...l, index: l.index - 1 } : null));
                }}
              >
                <ChevronLeft className="h-8 w-8" />
              </motion.button>
            )}

            <motion.img
              key={lightbox.index}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              src={lightbox.images[lightbox.index]}
              alt=""
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {lightbox.images.length > 1 && lightbox.index < lightbox.images.length - 1 && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((l) => (l ? { ...l, index: l.index + 1 } : null));
                }}
              >
                <ChevronRight className="h-8 w-8" />
              </motion.button>
            )}

            {lightbox.images.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2"
              >
                <span className="px-3 py-1 rounded-full bg-black/40 text-white/80 text-xs">
                  {lightbox.index + 1} / {lightbox.images.length}
                </span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {actionReview && actionType && actionType !== "approve" && (
        <Dialog open onOpenChange={(open) => { if (!open) closeModerate(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{actionType === "reject" ? "Reject Review" : "Flag Review"}</DialogTitle>
              <DialogDescription>
                {actionType === "reject"
                  ? "This review will be removed from the tour page and the customer will be notified."
                  : "This review will be flagged for further investigation."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label htmlFor="reason">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this review is being rejected or flagged..."
                rows={3}
              />
              {reason.length > 0 && reason.length < 10 && (
                <p className="text-xs text-red-500">Minimum 10 characters required</p>
              )}
              <p className="text-xs text-slate-400">{reason.length}/10 minimum</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeModerate} disabled={moderateMutation.isPending}>
                Cancel
              </Button>
              <Button
                variant={actionType === "reject" ? "destructive" : "default"}
                disabled={reason.length < 10 || moderateMutation.isPending}
                onClick={handleAction}
              >
                {moderateMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1" />Processing...</>
                ) : actionType === "reject" ? (
                  "Reject Review"
                ) : (
                  "Flag Review"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {actionReview && actionType === "approve" && (
        <Dialog open onOpenChange={(open) => { if (!open) closeModerate(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Approve Review</DialogTitle>
              <DialogDescription>
                This review will become visible to all customers on the tour page.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-1.5">
              <div className="flex items-center gap-2">
                {renderStars(actionReview.rating || 0)}
                <span className="text-sm font-medium text-slate-900 ml-1">{actionReview.customer?.name || "Anonymous"}</span>
              </div>
              {actionReview.title && <p className="text-sm font-medium text-slate-900">{actionReview.title}</p>}
              {actionReview.comment && <p className="text-sm text-slate-600 line-clamp-3">{actionReview.comment}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeModerate} disabled={moderateMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleAction} disabled={moderateMutation.isPending}>
                {moderateMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1" />Approving...</>
                ) : (
                  "Approve Review"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {editReview && (
        <Dialog open onOpenChange={(open) => { if (!open) setEditReview(null); }}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Edit Review</DialogTitle>
              <DialogDescription>
                {editReview.tour?.title
                  ? `Review from ${editReview.customer?.name || "Anonymous"} on "${editReview.tour.title}"`
                  : `Review from ${editReview.customer?.name || "Anonymous"}`}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 space-y-3">
              <div className="flex items-center gap-2 pb-1">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Original Review</span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              <div className="flex items-start gap-3">
                {renderAvatar(editReview.customer?.photoURL, editReview.customer?.name)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{editReview.customer?.name || "Anonymous"}</p>
                  <p className="text-xs text-slate-400">{timeAgo(editReview.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {renderStars(editReview.rating || 0)}
                  <span className="text-xs text-slate-400 ml-1">({editReview.rating || 0}/5)</span>
                </div>
              </div>
              {editReview.title && (
                <p className="text-sm font-medium text-slate-900">{editReview.title}</p>
              )}
              {editReview.comment && (
                <div className="rounded-lg bg-white border border-slate-100 p-3">
                  <p className="text-sm text-slate-600 leading-relaxed">{editReview.comment}</p>
                </div>
              )}
            </div>

            <div className="space-y-5 pt-1">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Edit Fields</span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              <div>
                <Label className="text-sm font-medium">Rating</Label>
                {editableStars(editRating, setEditRating)}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-title">Title</Label>
                <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Review title" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-comment">Comment</Label>
                <Textarea id="edit-comment" value={editComment} onChange={(e) => setEditComment(e.target.value)} placeholder="Review comment" rows={4} className="min-h-[100px]" />
              </div>
            </div>
            <DialogFooter className="pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setEditReview(null)} disabled={editMutation.isPending}>Cancel</Button>
              <Button onClick={handleEditSave} disabled={editMutation.isPending}>
                {editMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Saving...</> : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {deleteReview && (
        <Dialog open onOpenChange={(open) => { if (!open) setDeleteReview(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </div>
                Delete Review
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. The review and all associated data will be permanently removed.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 space-y-3">
              <div className="flex items-center gap-2 pb-1">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Review to Delete</span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              <div className="flex items-start gap-3">
                {renderAvatar(deleteReview.customer?.photoURL, deleteReview.customer?.name)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{deleteReview.customer?.name || "Anonymous"}</p>
                  <p className="text-xs text-slate-400">{deleteReview.createdAt ? timeAgo(deleteReview.createdAt) : ""}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {renderStars(deleteReview.rating || 0)}
                  <span className="text-xs text-slate-400 ml-1">({deleteReview.rating || 0}/5)</span>
                </div>
              </div>
              {deleteReview.title && (
                <p className="text-sm font-medium text-slate-900">{deleteReview.title}</p>
              )}
              {deleteReview.comment && (
                <div className="rounded-lg bg-white border border-slate-100 p-3">
                  <p className="text-sm text-slate-600 leading-relaxed">{deleteReview.comment}</p>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1 border-t border-slate-100">
                <MapPin className="h-3 w-3" />
                <span>on <span className="font-medium text-slate-500">{deleteReview.tour?.title || "Unknown tour"}</span></span>
              </div>
            </div>

            <div className="rounded-xl border border-red-200/60 bg-gradient-to-b from-red-50/50 to-white p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-red-100" />
                <span className="text-[11px] font-medium text-red-500 uppercase tracking-wider">Danger Zone</span>
                <div className="h-px flex-1 bg-red-100" />
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 mt-0.5">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-red-900">Permanent deletion</p>
                  <p className="text-xs text-red-600/80 leading-relaxed">
                    This will permanently remove the review, all associated photos, supplier response, and moderation history. This action cannot be reversed.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={() => setDeleteReview(null)} disabled={deleteMutation.isPending}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Deleting...</> : "Delete Review"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {editResponseReview && (
        <Dialog open onOpenChange={(open) => { if (!open) setEditResponseReview(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Supplier Response</DialogTitle>
              <DialogDescription>Update the supplier's response to this review.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label htmlFor="edit-response">Response</Label>
              <Textarea id="edit-response" value={editResponseText} onChange={(e) => setEditResponseText(e.target.value)} placeholder="Supplier response..." rows={4} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditResponseReview(null)} disabled={editResponseMutation.isPending}>Cancel</Button>
              <Button
                onClick={() => { if (!editResponseReview) return; editResponseMutation.mutate({ id: editResponseReview.id, response: editResponseText }); }}
                disabled={!editResponseText.trim() || editResponseMutation.isPending}
              >
                {editResponseMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Saving...</> : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {deleteResponseReview && (
        <Dialog open onOpenChange={(open) => { if (!open) setDeleteResponseReview(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" /> Delete Response
              </DialogTitle>
              <DialogDescription>This will permanently remove the supplier's response from this review.</DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-red-200/60 bg-red-50/30 p-3">
              <p className="text-sm text-red-700 line-clamp-3">{deleteResponseReview.supplierResponse}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteResponseReview(null)} disabled={deleteResponseMutation.isPending}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => { if (!deleteResponseReview) return; deleteResponseMutation.mutate(deleteResponseReview.id); }}
                disabled={deleteResponseMutation.isPending}
              >
                {deleteResponseMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Deleting...</> : "Delete Response"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
