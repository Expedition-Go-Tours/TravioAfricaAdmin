import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  tour?: { title?: string };
  supplier?: { name?: string };
  photos?: string[];
  createdAt?: string;
}

export default function ReviewModerationPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [actionReview, setActionReview] = useState<Review | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "flag" | null>(null);
  const [reason, setReason] = useState("");
  const limit = 20;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "reviews", { page, limit }],
    queryFn: () => api.get(`/reviews/admin/pending?page=${page}&limit=${limit}`).then((r) => r.data),
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

  const reviews: Review[] = data?.reviews || data?.data?.reviews || [];
  const pagination = data?.pagination || data?.data?.pagination;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-text-primary">Review Moderation</h1>

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
        <SectionEmpty message="No reviews pending moderation" />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {reviews.map((review) => (
              <Card
                key={review.id}
                className="p-4 transition-all duration-300"
              >
                <div className="flex items-center gap-1 text-status-pending">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < (review.rating || 0) ? "fill-current" : "opacity-30"}`}
                    />
                  ))}
                  <span className="ml-1 text-sm text-text-secondary">({review.rating}/5)</span>
                </div>

                {review.title && (
                  <p className="mt-2 text-sm font-semibold text-text-primary">{review.title}</p>
                )}

                {review.comment && (
                  <p className="mt-1 text-sm italic text-text-secondary">"{review.comment}"</p>
                )}

                <div className="mt-3 text-xs text-text-tertiary">
                  — {review.customer?.name || "Anonymous"} · {review.tour?.title || "Unknown Tour"} · {review.supplier?.name || "Unknown Supplier"}
                  <br />
                  Submitted {timeAgo(review.createdAt)}
                </div>

                {review.photos && review.photos.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {review.photos.slice(0, 4).map((photo, i) => (
                      <img
                        key={i}
                        src={photo}
                        alt={`Review photo ${i + 1}`}
                        className="h-12 w-12 rounded-sm object-cover"
                      />
                    ))}
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-status-active hover:bg-status-active/80 text-white"
                    onClick={() => { setActionReview(review); setActionType("approve"); setReason(""); }}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => { setActionReview(review); setActionType("reject"); setReason(""); }}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-status-flagged text-status-flagged hover:bg-status-flagged/10"
                    onClick={() => { setActionReview(review); setActionType("flag"); setReason(""); }}
                  >
                    Flag
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-text-secondary">
                Page {page} of {pagination.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Action Modal */}
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
          onConfirm={handleAction}
          onCancel={() => { setActionReview(null); setActionType(null); setReason(""); }}
        >
          <div className="space-y-2 py-2">
            <Label htmlFor="reviewReason">Reason (required, min 10 chars)</Label>
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

      {/* Approve Confirmation (no reason needed) */}
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
