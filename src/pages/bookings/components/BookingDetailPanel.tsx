import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  X,
  MapPin,
  Calendar,
  Clock,
  Hash,
  CreditCard,
  Banknote,
  CheckCircle2,
  Users,
  Percent,
  Mail,
  Phone,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/hooks/usePermission";
import { cn, timeAgo, getStatusColor } from "@/lib/utils";
import { BookingTimeline } from "./BookingTimeline";
import type { Booking } from "@/types/booking";
import { isPaymentPaid } from "@/types/booking";
import OptimizedImage from "@/components/shared/OptimizedImage";

interface BookingDetailPanelProps {
  booking: Booking;
  onClose: () => void;
  onConfirmPayment: (booking: Booking) => void;
  onViewCustomer: (customerId: string) => void;
}

function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        getStatusColor(status),
      )}
    >
      {status}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">{children}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-xs font-medium text-text-primary text-right">{children}</div>
    </div>
  );
}

export function BookingDetailPanel({ booking, onClose, onConfirmPayment, onViewCustomer }: BookingDetailPanelProps) {
  const navigate = useNavigate();
  const { can } = usePermission();

  const timelineSteps = [
    { label: "Booking Created", date: booking.createdAt, active: true },
    { label: "Payment Confirmed", date: booking.paidAt || null, active: isPaymentPaid(booking.paymentStatus) },
    { label: "Tour Completed", date: booking.status === "COMPLETED" ? booking.updatedAt : null, active: booking.status === "COMPLETED" },
    { label: "Payout Processed", date: booking.payouts?.[0]?.paidAt || null, active: booking.payouts?.[0]?.status === "PAID" },
  ];

  const travelerCount = Array.isArray(booking.travelers) ? booking.travelers.length : 0;
  const commissionRate = Number(booking.commissionRate || 0) * 100;

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
        className="fixed right-0 top-0 z-50 h-full w-full sm:w-[420px] md:w-[480px] bg-surface-base border-l border-border shadow-[-4px_0_16px_rgba(0,0,0,0.06)] flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Booking Detail</p>
            <h2 className="text-base font-semibold text-text-primary truncate mt-0.5">{booking.bookingNumber}</h2>
            <div className="flex items-center gap-1.5 mt-2">
              <StatusChip status={booking.status} />
              <StatusChip status={booking.paymentStatus} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">
            <div className="flex items-start gap-4">
              <button
                onClick={() => onViewCustomer(booking.customer.id)}
                className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-full"
                title="View customer profile"
              >
                <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-base font-bold text-primary ring-2 ring-primary/10">
                  {booking.customer.photoURL ? (
                    <OptimizedImage src={booking.customer.photoURL} alt="" width={48} className="absolute inset-0 h-full w-full object-cover" />
                  ) : null}
                  <span className={booking.customer.photoURL ? "opacity-0" : ""}>
                    {(booking.customer.name || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
              </button>
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="text-sm font-semibold text-text-primary truncate">{booking.customer.name}</h3>
                {booking.customer.email && (
                  <p className="flex items-center gap-1.5 text-xs text-text-secondary truncate">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{booking.customer.email}</span>
                  </p>
                )}
                {booking.customer.phone && (
                  <p className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <Phone className="h-3 w-3 shrink-0" />
                    {booking.customer.phone}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={() => navigate(`/admin/tours/${booking.tour.id}`)}
              className="w-full rounded-xl border border-border bg-surface-base p-4 space-y-1 text-left cursor-pointer hover:border-primary/40 hover:shadow-tinted transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg shrink-0 overflow-hidden bg-surface-muted border border-border">
                  {booking.tour.coverPhoto ? (
                    <OptimizedImage src={booking.tour.coverPhoto} alt="" width={40} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-text-tertiary" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">{booking.tour.title}</p>
                  <p className="text-xs text-text-secondary">by {booking.tour.supplier.name}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-text-tertiary shrink-0" />
              </div>
            </button>

            <div>
              <SectionTitle>Booking Details</SectionTitle>
              <div className="space-y-0.5">
                <DetailRow icon={<Calendar className="h-3 w-3" />} label="Travel Date">
                  {new Date(booking.selectedDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                </DetailRow>
                {booking.selectedTime && (
                  <DetailRow icon={<Clock className="h-3 w-3" />} label="Time">
                    {booking.selectedTime}
                  </DetailRow>
                )}
                <DetailRow icon={<Users className="h-3 w-3" />} label="Travelers">
                  {travelerCount} {travelerCount === 1 ? "person" : "people"}
                </DetailRow>
                <DetailRow icon={<Hash className="h-3 w-3" />} label="Booking #">
                  {booking.bookingNumber}
                </DetailRow>
                <DetailRow icon={<Clock className="h-3 w-3" />} label="Created">
                  {timeAgo(booking.createdAt)}
                </DetailRow>
                {booking.paidAt && (
                  <DetailRow icon={<CheckCircle2 className="h-3 w-3" />} label="Paid At">
                    {new Date(booking.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </DetailRow>
                )}
              </div>
            </div>

            <div>
              <SectionTitle>Pricing</SectionTitle>
              <div className="rounded-xl border border-border p-4 space-y-0.5">
                <DetailRow icon={<Banknote className="h-3 w-3" />} label="Subtotal">
                  {booking.currency} {Number(booking.subtotal).toLocaleString()}
                </DetailRow>
                <DetailRow icon={<CreditCard className="h-3 w-3" />} label="Fees">
                  {booking.currency} {Number(booking.fees).toLocaleString()}
                </DetailRow>
                {Number(booking.discounts) > 0 && (
                  <DetailRow icon={<Percent className="h-3 w-3" />} label="Discounts">
                    -{booking.currency} {Number(booking.discounts).toLocaleString()}
                  </DetailRow>
                )}
                <div className="border-t border-border pt-2 mt-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-primary">Total</span>
                  <span className="text-sm font-bold text-text-primary tabular-nums">
                    {booking.currency} {Number(booking.total).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {commissionRate > 0 && (
              <div>
                <SectionTitle>Commission</SectionTitle>
                <div className="rounded-xl border border-border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">Commission Rate</span>
                    <span className="text-xs font-medium text-text-primary tabular-nums">{commissionRate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">Platform Commission</span>
                    <span className="text-xs font-medium text-text-primary tabular-nums">
                      {booking.currency} {Number(booking.commissionAmount).toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t border-border pt-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-text-primary">Supplier Payout</span>
                    <span className="text-xs font-semibold text-text-primary tabular-nums">
                      {booking.currency} {Number(booking.supplierPayout).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <SectionTitle>Payment</SectionTitle>
              <div className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-text-tertiary" />
                    <span className="text-xs font-medium text-text-secondary">Payment Status</span>
                  </span>
                  <StatusChip status={booking.paymentStatus} />
                </div>
                {booking.paymentStatus === "PENDING" && can('bookings.confirm-payment') && (
                  <Button
                    onClick={() => onConfirmPayment(booking)}
                    size="sm"
                    className="w-full h-8"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Confirm Payment
                  </Button>
                )}
              </div>
            </div>

            {booking.payouts && booking.payouts.length > 0 && (
              <div>
                <SectionTitle>Payout</SectionTitle>
                <div className="rounded-xl border border-border p-4 space-y-2">
                  {booking.payouts.map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Banknote className="h-4 w-4 text-text-tertiary shrink-0" />
                        <span className="text-xs font-medium text-text-primary">
                          {payout.currency} {Number(payout.amount).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusChip status={payout.status} />
                        <button
                          onClick={() => navigate(`/admin/payouts?tab=list&payoutId=${payout.id}&payoutStatus=${payout.status}`)}
                          className="text-[10px] font-medium text-primary hover:text-primary/80 hover:underline whitespace-nowrap"
                        >
                          View Payout
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {booking.specialRequests && (
              <div>
                <SectionTitle>Special Requests</SectionTitle>
                <div className="rounded-xl border border-border bg-surface-muted/50 p-3">
                  <p className="text-xs text-text-secondary">{booking.specialRequests}</p>
                </div>
              </div>
            )}

            {booking.cancellationReason && (
              <div>
                <SectionTitle>Cancellation Reason</SectionTitle>
                <div className="rounded-xl border border-status-rejected/30 bg-status-rejected/10 p-3">
                  <p className="text-xs text-status-rejected">{booking.cancellationReason}</p>
                </div>
              </div>
            )}

            <div>
              <SectionTitle>Timeline</SectionTitle>
              <div className="rounded-xl border border-border p-4">
                <BookingTimeline steps={timelineSteps} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>,
    document.body
  );
}
