/**
 * Supplier cancellation requests — admin approval gate.
 *
 * Mirrors the frozen backend contract (CANCELLATION-APPROVAL-CONTRACT.md) for
 * the admin queue (`/admin/cancellation-requests`). The backend is the source
 * of truth; every field here is tolerated as optional/nullable because the
 * queue is also served in flag-OFF mode where `pendingCancellation` is null.
 */

export type CancellationStatus =
  | "PENDING_APPROVAL"
  | "APPROVING"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN"
  | "SUPERSEDED";

export interface CancellationRequestCustomer {
  id: string;
  name: string;
  email: string;
}

export interface CancellationRequestBooking {
  id: string;
  bookingNumber: string;
  status: string;
  paymentStatus: string;
  refundStatus?: string | null;
  refundAmount?: number | null;
  grossAmount: number;
  currency: string;
  travelDate: string;
  selectedTime?: string | null;
  cancellationCode?: string | null;
  cancellationCategory?: string | null;
  cancellationOrigin?: string | null;
  countsTowardRate?: boolean | null;
  cancellationFee?: number | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  cancellationChoiceDeadline?: string | null;
  customerChoice?: string | null;
  customer?: CancellationRequestCustomer | null;
}

export interface CancellationRequestTour {
  id: string;
  title: string;
  supplier?: { id: string; name: string } | null;
}

export interface CancellationRequestPreview {
  refund?: { amount: number; note?: string | null } | null;
  fee?: number | null;
  countsTowardRate?: boolean;
  /** Snapshot of stop-selling overrides so reject/withdraw can revert them. */
  stopSell?: {
    tourId?: string;
    marker?: string;
    blocked?: Array<{ date: string }>;
    snapshot?: unknown;
  } | null;
}

export interface CancellationRequestPayload {
  cancellationCode?: string;
  cancellationCategory?: string;
  explanation?: string;
  evidenceUrl?: string | null;
  customerRefundAgreed?: boolean;
  agreedToTerms?: boolean;
  countsTowardRate?: boolean;
  refundRate?: number | null;
  supplierNotes?: string | null;
}

export interface CancellationRequest {
  id: string;
  status: CancellationStatus | string;
  bookingId: string;
  booking: CancellationRequestBooking | null;
  tour: CancellationRequestTour | null;
  supplier?: { id: string; name: string; email?: string } | null;
  payload?: CancellationRequestPayload | null;
  preview?: CancellationRequestPreview | null;
  stopSellingApplied?: boolean;
  batchId?: string | null;
  decidedBy?: { id: string; name: string; email?: string } | null;
  decidedAt?: string | null;
  decisionNote?: string | null;
  reminderCount?: number;
  createdAt: string;
  updatedAt?: string;
}

/** Minimal context the decision dialogs need, satisfied by both the queue
 *  request shape and a booking's inline `pendingCancellation`. */
export interface CancellationDecisionContext {
  id: string;
  preview?: CancellationRequestPreview | null;
  booking?: {
    bookingNumber?: string;
    currency?: string;
  } | null;
}

export interface CancellationPagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
}

export interface CancellationListResult {
  requests: CancellationRequest[];
  pendingCount: number;
  pagination: CancellationPagination;
}

export interface CancellationDecisionResult {
  booking?: unknown;
  cancellation?: {
    refundStatus?: string | null;
    refundAmount?: number | null;
    refundExecuted?: boolean;
    fee?: number | null;
    countsTowardRate?: boolean;
    choiceDeadline?: string | null;
  } | null;
  request: CancellationRequest;
}

export interface BatchApproveResult {
  requested: number;
  approved: number;
  failed: number;
  results: Array<{ id: string; ok: boolean; error?: string; bookingId?: string }>;
}

export const CANCELLATION_TABS = [
  { key: "PENDING_APPROVAL", label: "Pending Approval" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "WITHDRAWN", label: "Withdrawn" },
  { key: "SUPERSEDED", label: "Superseded" },
  { key: "ALL", label: "All" },
] as const;

export type CancellationTab = (typeof CANCELLATION_TABS)[number]["key"];

export const CANCELLATION_QUEUE_PAGE_SIZE = 20;

export type CancellationBadgeVariant = "success" | "warning" | "error" | "info";

export function cancellationStatusVariant(status: string): CancellationBadgeVariant {
  switch (status) {
    case "APPROVED":
      return "success";
    case "PENDING_APPROVAL":
    case "APPROVING":
      return "warning";
    case "REJECTED":
      return "error";
    case "WITHDRAWN":
    case "SUPERSEDED":
    default:
      return "info";
  }
}

/** Human label for a decision status enum value. */
export function cancellationStatusLabel(status: string): string {
  return (status || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** True while the request is still decidable by an admin. */
export function isDecidable(status: string | undefined): boolean {
  return status === "PENDING_APPROVAL" || status === "APPROVING";
}
