import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  X,
  Calendar,
  Clock,
  Hash,
  MapPin,
  Users,
  Ban,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ShieldOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency, formatDateTime, timeAgo } from "@/lib/utils";
import {
  cancellationStatusLabel,
  cancellationStatusVariant,
  isDecidable,
  type CancellationRequest,
} from "@/types/cancellation";

interface CancellationDetailPanelProps {
  request: CancellationRequest | null;
  loading?: boolean;
  error?: boolean;
  canDecide?: boolean;
  deciding?: boolean;
  onClose: () => void;
  onApprove: (request: CancellationRequest) => void;
  onReject: (request: CancellationRequest) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
          {title}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
      {children}
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
        {icon}
        <span>{label}</span>
      </div>
      <div className="max-w-[60%] text-right text-xs font-medium text-text-primary">
        {children}
      </div>
    </div>
  );
}

function boolLabel(value: boolean | null | undefined): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

export function CancellationDetailPanel({
  request,
  loading,
  error,
  canDecide,
  deciding,
  onClose,
  onApprove,
  onReject,
}: CancellationDetailPanelProps) {
  const booking = request?.booking ?? null;
  const currency = booking?.currency;
  const decidable = canDecide && isDecidable(request?.status);
  const outcome = booking;
  const hasOutcome =
    !!request &&
    (!!booking?.cancelledAt ||
      !!booking?.refundStatus ||
      !!booking?.cancellationCode ||
      !!request.decidedAt);

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/10"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-border bg-surface-base shadow-[-4px_0_16px_rgba(0,0,0,0.06)] sm:w-[440px] md:w-[480px]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              Cancellation Request
            </p>
            <h2 className="mt-0.5 truncate text-base font-semibold text-text-primary">
              {booking?.bookingNumber || "—"}
            </h2>
            {request && (
              <div className="mt-2">
                <Badge
                  variant={cancellationStatusVariant(request.status)}
                  className="text-[10px]"
                >
                  {cancellationStatusLabel(request.status)}
                </Badge>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-muted hover:text-text-primary"
            aria-label="Close cancellation request"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && !request ? (
            <div className="space-y-4 p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : error && !request ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <AlertTriangle className="mb-3 h-8 w-8 text-status-rejected" />
              <p className="text-sm text-text-secondary">
                Failed to load this cancellation request.
              </p>
            </div>
          ) : !request ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <Ban className="mb-3 h-8 w-8 text-text-tertiary" />
              <p className="text-sm text-text-secondary">Request not found.</p>
            </div>
          ) : (
            <div className="space-y-5 p-5">
              {/* Request meta */}
              <div className="rounded-xl border border-border p-4">
                <Row icon={<Clock className="h-3 w-3" />} label="Requested">
                  {timeAgo(request.createdAt)}
                </Row>
                <Row icon={<Clock className="h-3 w-3" />} label="Requested at">
                  {formatDateTime(request.createdAt)}
                </Row>
                {request.batchId && (
                  <Row icon={<Hash className="h-3 w-3" />} label="Batch">
                    <span className="font-mono text-[11px]">{request.batchId}</span>
                  </Row>
                )}
                {typeof request.reminderCount === "number" && request.reminderCount > 0 && (
                  <Row icon={<AlertTriangle className="h-3 w-3 text-status-pending" />} label="Reminders sent">
                    {request.reminderCount}
                  </Row>
                )}
                <Row icon={<ShieldOff className="h-3 w-3" />} label="Stop-selling applied">
                  {request.stopSellingApplied ? (
                    <span className="text-status-pending">Yes — dates blocked</span>
                  ) : (
                    "No"
                  )}
                </Row>
              </div>

              {/* Booking / tour / customer */}
              <Section title="Booking">
                <div className="rounded-xl border border-border p-4">
                  <Row icon={<Hash className="h-3 w-3" />} label="Booking #">
                    {booking?.bookingNumber || "—"}
                  </Row>
                  <Row icon={<Users className="h-3 w-3" />} label="Customer">
                    <span className="block">{booking?.customer?.name || "—"}</span>
                    {booking?.customer?.email && (
                      <span className="block text-[10px] font-normal text-text-tertiary">
                        {booking.customer.email}
                      </span>
                    )}
                  </Row>
                  <Row icon={<MapPin className="h-3 w-3" />} label="Tour">
                    {request.tour?.title || "—"}
                  </Row>
                  <Row label="Supplier">
                    {request.supplier?.name || request.tour?.supplier?.name || "—"}
                  </Row>
                  <Row icon={<Calendar className="h-3 w-3" />} label="Travel date">
                    {booking?.travelDate
                      ? formatDateTime(booking.travelDate)
                      : "—"}
                    {booking?.selectedTime ? ` · ${booking.selectedTime}` : ""}
                  </Row>
                  <Row label="Booking status">{booking?.status || "—"}</Row>
                  <Row label="Payment status">{booking?.paymentStatus || "—"}</Row>
                </div>
              </Section>

              {/* Supplier payload */}
              <Section title="Supplier Request">
                <div className="rounded-xl border border-border p-4">
                  <Row label="Category">
                    {request.payload?.cancellationCategory || "—"}
                  </Row>
                  <Row label="Code">{request.payload?.cancellationCode || "—"}</Row>
                  <Row label="Agreed to terms">
                    {boolLabel(request.payload?.agreedToTerms)}
                  </Row>
                  <Row label="Customer refund agreed">
                    {boolLabel(request.payload?.customerRefundAgreed)}
                  </Row>
                  {request.payload?.explanation && (
                    <div className="mt-2 rounded-lg bg-surface-muted/50 p-3">
                      <p className="text-xs text-text-secondary">
                        {request.payload.explanation}
                      </p>
                    </div>
                  )}
                  {request.payload?.supplierNotes && (
                    <div className="mt-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                        Supplier notes
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {request.payload.supplierNotes}
                      </p>
                    </div>
                  )}
                  {request.payload?.evidenceUrl && (
                    <a
                      href={request.payload.evidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View evidence
                    </a>
                  )}
                </div>
              </Section>

              {/* Money preview */}
              <Section title="Refund & Fee Preview">
                <div className="rounded-xl border border-border p-4">
                  <Row label="Customer refund">
                    <span className="text-status-rejected">
                      {formatCurrency(Number(request.preview?.refund?.amount || 0), currency)}
                    </span>
                  </Row>
                  {request.preview?.refund?.note && (
                    <p className="mt-1 text-[10px] text-text-tertiary">
                      {request.preview.refund.note}
                    </p>
                  )}
                  <Row label="Cancellation fee">
                    {formatCurrency(Number(request.preview?.fee || 0), currency)}
                  </Row>
                  <Row label="Counts toward rate">
                    {boolLabel(request.preview?.countsTowardRate)}
                  </Row>
                  <Row label="Booking total">
                    {formatCurrency(Number(booking?.grossAmount || 0), currency)}
                  </Row>
                </div>
              </Section>

              {/* Decision + structured outcome */}
              {hasOutcome && (
                <Section title="Decision & Outcome">
                  <div className="rounded-xl border border-border p-4">
                    {request.decidedAt && (
                      <Row label="Decided">
                        {formatDateTime(request.decidedAt)}
                      </Row>
                    )}
                    {request.decidedBy?.name && (
                      <Row label="Decided by">{request.decidedBy.name}</Row>
                    )}
                    {request.decisionNote && (
                      <Row label="Note">
                        <span className="font-normal text-text-secondary">
                          {request.decisionNote}
                        </span>
                      </Row>
                    )}
                    {outcome?.cancellationCode && (
                      <Row label="Cancellation code">{outcome.cancellationCode}</Row>
                    )}
                    {outcome?.cancellationCategory && (
                      <Row label="Cancellation category">
                        {outcome.cancellationCategory}
                      </Row>
                    )}
                    {outcome?.cancellationOrigin && (
                      <Row label="Origin">{outcome.cancellationOrigin}</Row>
                    )}
                    {outcome?.countsTowardRate != null && (
                      <Row label="Counts toward rate">
                        {boolLabel(outcome.countsTowardRate)}
                      </Row>
                    )}
                    {outcome?.cancellationFee != null && (
                      <Row label="Cancellation fee">
                        {formatCurrency(Number(outcome.cancellationFee), currency)}
                      </Row>
                    )}
                    {outcome?.refundStatus && (
                      <Row label="Refund status">{outcome.refundStatus}</Row>
                    )}
                    {outcome?.refundAmount != null && (
                      <Row label="Refund amount">
                        {formatCurrency(Number(outcome.refundAmount), currency)}
                      </Row>
                    )}
                    {outcome?.cancelledAt && (
                      <Row label="Cancelled at">
                        {formatDateTime(outcome.cancelledAt)}
                      </Row>
                    )}
                    {outcome?.cancellationChoiceDeadline && (
                      <Row label="Customer choice deadline">
                        {formatDateTime(outcome.cancellationChoiceDeadline)}
                      </Row>
                    )}
                    {outcome?.customerChoice && (
                      <Row label="Customer choice">{outcome.customerChoice}</Row>
                    )}
                  </div>
                </Section>
              )}

              {decidable && (
                <div className="flex items-center gap-2 rounded-xl border border-status-pending/30 bg-status-pending/5 p-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-status-pending" />
                  <p className="text-xs text-text-secondary">
                    Nothing has been executed yet. Approving issues a full refund;
                    rejecting leaves the booking untouched.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {request && decidable && (
          <div className="flex shrink-0 items-center gap-2 border-t border-border px-5 py-4">
            <Button
              onClick={() => onReject(request)}
              disabled={deciding}
              variant="outline"
              className="flex-1 gap-2"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            <Button
              onClick={() => onApprove(request)}
              disabled={deciding}
              variant="destructive"
              className={cn("flex-1 gap-2")}
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </Button>
          </div>
        )}
      </motion.div>
    </>,
    document.body,
  );
}
