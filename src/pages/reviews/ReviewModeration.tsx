import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, ChevronLeft, ChevronRight, ArrowLeft, Search, X, ThumbsUp, MessageSquare, AlertTriangle, Clock } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { SectionError } from "@/components/shared/SectionError";
import { SectionEmpty } from "@/components/shared/SectionEmpty";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/axios";
import { timeAgo } from "@/lib/utils";

interface Review {
  id: string;
  rating?: number;
  title?: string;
  comment?: string;
  customer?: { name?: string };
  tour?: { title?: string; supplier?: { name?: string } };
  photos?: string[];
  createdAt?: string;
}

const statusFilters = ["All", "Pending", "Approved", "Rejected", "Flagged"];

export default function ReviewModerationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionReview, setActionReview] = useState<Review | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "flag" | null>(null);
  const [reason, setReason] = useState("");
  const limit = 20;

  const statusParam = statusFilter === "All" ? "" : statusFilter.toUpperCase();

  const { data, isLoading, isError, refetch } = useQuery({
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
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews-pending-count"] });
      toast.success(`Review ${actionType}d successfully`);
      setActionReview(null);
      setActionType(null);
      setReason("");
    },
    onError: () => toast.error("Failed to moderate review"),
  });

  const handleAction = () => {
    if (!actionType || !actionReview) return;
    const body: { action: string; reason?: string } = { action: actionType };
    if (reason) body.reason = reason;
    moderateMutation.mutate(body);
  };

  const rawReviews: Review[] = data?.reviews || data?.data?.reviews || [];
  const pagination = data?.pagination || data?.data?.pagination;
  const counts = data?.counts || data?.data?.counts;
  const pendingCount = counts?.pending ?? pagination?.totalCount ?? rawReviews.length;
  const flaggedCount = counts?.flagged ?? 0;
  const moderatedTodayCount = counts?.moderatedToday ?? 0;

  const query = searchQuery.toLowerCase().trim();
  const reviews = query
    ? rawReviews
        .filter((r) =>
          [r.customer?.name, r.tour?.title, r.tour?.supplier?.name, r.title, r.comment]
            .some((f) => f?.toLowerCase().includes(query))
        )
        .sort((a, b) => {
          const aName = (a.customer?.name || a.tour?.title || "").toLowerCase();
          const bName = (b.customer?.name || b.tour?.title || "").toLowerCase();
          const aStarts = aName.startsWith(query) ? 0 : 1;
          const bStarts = bName.startsWith(query) ? 0 : 1;
          return aStarts - bStarts;
        })
    : rawReviews;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="rounded-sm bg-white p-1.5 shadow-sm hover:ring-2 hover:ring-green-300 transition-all">
          <ArrowLeft className="h-4 w-4 text-text-primary" />
        </button>
        <h1 className="text-lg font-semibold text-text-primary">Review Moderation</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-sm border border-green-200/40 bg-gradient-to-br from-green-50 to-white p-4 shadow-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-secondary font-medium">Pending Reviews</p>
            <ThumbsUp className="h-4 w-4 text-green-600" />
          </div>
          <p className="mt-1 text-2xl font-bold text-green-700">{isLoading ? "..." : pendingCount}</p>
        </div>
        <div className="rounded-sm border border-amber-200/40 bg-gradient-to-br from-amber-50 to-white p-4 shadow-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-secondary font-medium">Flagged</p>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-700">{isLoading ? "..." : flaggedCount}</p>
        </div>
        <div className="rounded-sm border border-blue-200/40 bg-gradient-to-br from-blue-50 to-white p-4 shadow-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-secondary font-medium">Moderated Today</p>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-1 text-2xl font-bold text-blue-700">{isLoading ? "..." : moderatedTodayCount}</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-border-muted">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <Input
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            {statusFilters.map((tab) => (
              <button
                key={tab}
                className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                  statusFilter === tab
                    ? "border-b-2 border-green-600 text-green-700"
                    : "text-text-secondary hover:text-green-600"
                }`}
                onClick={() => { setStatusFilter(tab); setPage(1); }}
              >
                {tab}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="mb-2 h-4 w-24" />
                  <Skeleton className="mb-2 h-5 w-48" />
                  <Skeleton className="mb-2 h-16 w-full" />
                  <Skeleton className="h-4 w-36" />
                </Card>
              ))}
            </div>
          ) : isError ? (
            <SectionError message="Failed to load reviews" onRetry={() => refetch()} />
          ) : !reviews.length ? (
            <SectionEmpty message="No reviews found" />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {reviews.map((review) => (
                  <Card key={review.id} className="border-l-4 border-l-green-500/60 transition-all duration-300">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < (review.rating || 0) ? "fill-amber-400 text-amber-400" : "text-border-muted"}`}
                            />
                          ))}
                          <span className="ml-1 text-sm text-text-secondary">({review.rating || 0}/5)</span>
                        </div>
                        <span className="text-xs text-text-tertiary">{timeAgo(review.createdAt)}</span>
                      </div>

                      {review.title && (
                        <p className="mt-2 text-base font-semibold text-text-primary">{review.title}</p>
                      )}

                      {review.comment && (
                        <p className="mt-1 text-sm text-text-secondary leading-relaxed">"{review.comment}"</p>
                      )}

                      <div className="mt-3 space-y-0.5 text-xs text-text-tertiary">
                        <p><span className="font-medium text-text-secondary">{review.customer?.name || "Anonymous"}</span> on <span className="font-medium text-text-secondary">{review.tour?.title || "Unknown Tour"}</span></p>
                        <p>Supplier: {review.tour?.supplier?.name || "Unknown Supplier"}</p>
                      </div>

                      {review.photos && review.photos.length > 0 && (
                        <div className="mt-2 flex gap-2">
                          {review.photos.slice(0, 4).map((photo, i) => (
                            <img
                              key={i}
                              src={photo}
                              alt={`Review photo ${i + 1}`}
                              className="h-12 w-12 rounded-sm object-cover border border-border-muted"
                            />
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => { setActionReview(review); setActionType("approve"); setReason(""); }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => { setActionReview(review); setActionType("reject"); setReason(""); }}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-300 text-amber-600 hover:bg-amber-50"
                          onClick={() => { setActionReview(review); setActionType("flag"); setReason(""); }}
                        >
                          Flag
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border-muted px-1 pt-4 mt-4">
                  <p className="text-sm text-text-secondary">
                    Page {page} of {pagination.totalPages} · {pagination.totalCount || reviews.length} total
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                      Next <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {actionType && actionType !== "approve" && actionReview && (
        <ConfirmModal
          open={!!actionReview}
          title={actionType === "reject" ? "Reject Review" : "Flag Review"}
          description={
            actionType === "reject"
              ? "Enter the reason for rejection."
              : "Enter the reason for flagging this review."
          }
          confirmLabel={actionType === "reject" ? "Reject" : "Flag"}
          confirmVariant={actionType === "reject" ? "destructive" : "default"}
          loading={moderateMutation.isPending}
          confirmDisabled={reason.length < 10}
          onConfirm={handleAction}
          onCancel={() => { setActionReview(null); setActionType(null); setReason(""); }}
        >
          <div className="space-y-2 py-2">
            <Label htmlFor="reviewReason">Reason (required, min 10 characters)</Label>
            <Textarea
              id="reviewReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason..."
              rows={3}
            />
            {reason.length > 0 && reason.length < 10 && (
              <p className="text-xs text-status-rejected">Minimum 10 characters</p>
            )}
          </div>
        </ConfirmModal>
      )}

      {actionType === "approve" && actionReview && (
        <ConfirmModal
          open={true}
          title="Approve Review"
          description="Approve this review to make it visible?"
          confirmLabel="Approve"
          loading={moderateMutation.isPending}
          onConfirm={handleAction}
          onCancel={() => { setActionReview(null); setActionType(null); }}
        />
      )}
    </div>
  );
}
