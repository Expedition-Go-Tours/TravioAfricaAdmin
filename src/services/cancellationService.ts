import api from "@/lib/axios";
import type {
  BatchApproveResult,
  CancellationDecisionResult,
  CancellationListResult,
  CancellationRequest,
  CancellationStatus,
} from "@/types/cancellation";

export interface CancellationListParams {
  status?: CancellationStatus | "ALL" | string;
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Admin cancellation queue. The axios interceptor rewrites `/admin/*` to the
 * brand-scoped `/travioafrica/admin/*` namespace, so this dashboard only ever
 * sees Africa requests.
 */
export const getCancellationRequests = (params: CancellationListParams = {}) =>
  api
    .get("/admin/cancellation-requests", { params })
    .then(
      (r) =>
        (r.data?.data ? r.data.data : r.data) as CancellationListResult,
    );

export const getCancellationRequest = (id: string) =>
  api.get(`/admin/cancellation-requests/${id}`).then((r) => {
    const body = r.data?.data ?? r.data;
    return (body?.request ?? body) as CancellationRequest;
  });

export const approveCancellationRequest = (id: string, note?: string) =>
  api
    .post(
      `/admin/cancellation-requests/${id}/approve`,
      note && note.trim() ? { note: note.trim() } : {},
    )
    .then((r) => r.data?.data as CancellationDecisionResult);

export const rejectCancellationRequest = (id: string, note: string) =>
  api
    .post(`/admin/cancellation-requests/${id}/reject`, { note: note.trim() })
    .then((r) => (r.data?.data ?? r.data) as { request: CancellationRequest });

export const batchApproveCancellationRequests = (ids: string[], note?: string) =>
  api
    .post("/admin/cancellation-requests/batch-approve", {
      ids,
      ...(note && note.trim() ? { note: note.trim() } : {}),
    })
    .then((r) => r.data?.data as BatchApproveResult);

/** Extract a user-facing message (and 409 conflict flag) from an API error. */
export function decisionErrorInfo(err: unknown): { message: string; conflict: boolean } {
  const e = err as {
    response?: { status?: number; data?: { message?: string } };
    message?: string;
  };
  return {
    message:
      e?.response?.data?.message ||
      e?.message ||
      "Something went wrong. Please try again.",
    conflict: e?.response?.status === 409,
  };
}
