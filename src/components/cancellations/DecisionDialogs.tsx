import { useState } from "react";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import type { CancellationDecisionContext } from "@/types/cancellation";

const MIN_REJECT_REASON = 3;

interface DialogProps {
  open: boolean;
  request: CancellationDecisionContext | null;
  loading?: boolean;
  onCancel: () => void;
}

interface ApproveDialogProps extends DialogProps {
  onConfirm: (note: string) => void;
}

interface RejectDialogProps extends DialogProps {
  onConfirm: (note: string) => void;
}

function money(amount: number | null | undefined, currency: string | undefined): string {
  return formatCurrency(Number(amount || 0), currency || "USD");
}

/**
 * Approval is the money path: it executes immediately, refunds the customer in
 * full and may apply the 25% supplier cancellation fee. The copy says so
 * explicitly so an admin cannot approve by accident.
 */
export function ApproveCancellationDialog({
  open,
  request,
  loading,
  onConfirm,
  onCancel,
}: ApproveDialogProps) {
  const [note, setNote] = useState("");

  const currency = request?.booking?.currency;
  const refund = request?.preview?.refund?.amount ?? 0;
  const fee = request?.preview?.fee ?? 0;
  const bookingNumber = request?.booking?.bookingNumber;

  return (
    <ConfirmModal
      open={open}
      icon="danger"
      confirmVariant="destructive"
      confirmLabel="Approve & refund customer"
      loading={loading}
      title="Approve cancellation request"
      description={
        <span className="block space-y-2 text-left">
          <span className="block">
            Approving executes the cancellation immediately and issues a{" "}
            <strong className="font-semibold text-text-primary">
              FULL customer refund of {money(refund, currency)}
            </strong>
            {bookingNumber ? ` for booking ${bookingNumber}` : ""}. A 25% supplier
            cancellation fee of{" "}
            <strong className="font-semibold text-text-primary">
              {money(fee, currency)}
            </strong>{" "}
            may be applied.
          </span>
          <span className="block text-xs text-status-rejected">
            This cannot be undone — the customer is emailed and the refund starts now.
          </span>
        </span>
      }
      onConfirm={() => onConfirm(note.trim())}
      onCancel={onCancel}
    >
      <div className="space-y-1.5">
        <Label htmlFor="approve-note">Note (optional)</Label>
        <Textarea
          id="approve-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Internal note recorded with the decision…"
          rows={2}
        />
      </div>
    </ConfirmModal>
  );
}

/**
 * Rejection changes nothing on the booking and re-opens any dates the request
 * blocked. A reason is mandatory (min 3 characters) and is shown to the supplier.
 */
export function RejectCancellationDialog({
  open,
  request,
  loading,
  onConfirm,
  onCancel,
}: RejectDialogProps) {
  const [note, setNote] = useState("");

  const trimmed = note.trim();
  const tooShort = trimmed.length < MIN_REJECT_REASON;
  const bookingNumber = request?.booking?.bookingNumber;

  return (
    <ConfirmModal
      open={open}
      icon="unpublish"
      confirmVariant="destructive"
      confirmLabel="Reject request"
      confirmDisabled={tooShort}
      loading={loading}
      title="Reject cancellation request"
      description={
        <span className="block space-y-2 text-left">
          <span className="block">
            Rejecting {bookingNumber ? `booking ${bookingNumber}` : "this request"}{" "}
            changes <strong className="font-semibold text-text-primary">nothing</strong> on
            the booking and re-opens any dates this request blocked. The supplier is
            notified with your reason.
          </span>
          <span className="block text-xs text-text-tertiary">
            A reason is required (at least {MIN_REJECT_REASON} characters).
          </span>
        </span>
      }
      onConfirm={() => onConfirm(trimmed)}
      onCancel={onCancel}
    >
      <div className="space-y-1.5">
        <Label htmlFor="reject-note">Rejection reason</Label>
        <Textarea
          id="reject-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Explain why this request is rejected…"
          rows={3}
        />
        {!tooShort && (
          <p className="text-[11px] text-text-tertiary">{trimmed.length} characters</p>
        )}
      </div>
    </ConfirmModal>
  );
}
