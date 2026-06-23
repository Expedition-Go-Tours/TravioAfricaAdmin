import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  X,
  User,
  MapPin,
  Calendar,
  Clock,
  Hash,
  DollarSign,
  CreditCard,
  Banknote,
  CheckCircle2,
  Users,
  FileText,
  Percent,
  Receipt,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermission } from "@/hooks/usePermission";
import { cn, timeAgo } from "@/lib/utils";
import { BookingTimeline } from "./BookingTimeline";
import type { Booking } from "@/types/booking";
import { isPaymentPaid } from "@/types/booking";

const STATUS_BADGE: Record<string, "success" | "warning" | "error" | "info"> = {
  PENDING: "warning",
  CONFIRMED: "info",
  COMPLETED: "success",
  CANCELLED: "error",
  NO_SHOW: "error",
  REFUNDED: "warning",
};

const PAYMENT_STATUS_BADGE: Record<string, "success" | "warning" | "error" | "info"> = {
  PENDING: "warning",
  PROCESSING: "warning",
  PAID: "success",
  SUCCEEDED: "success",
  FAILED: "error",
  REFUNDED: "info",
};

const PAYOUT_STATUS_BADGE: Record<string, "success" | "warning" | "error" | "info"> = {
  PENDING: "warning",
  APPROVED: "info",
  PROCESSING: "warning",
  PAID: "success",
  FAILED: "error",
  CANCELLED: "error",
};

interface BookingDetailPanelProps {
  booking: Booking;
  onClose: () => void;
  onConfirmPayment: (booking: Booking) => void;
  onViewCustomer: (customerId: string) => void;
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-xs font-medium text-slate-900 text-right">{children}</div>
    </div>
  );
}

export function BookingDetailPanel({ booking, onClose, onConfirmPayment, onViewCustomer }: BookingDetailPanelProps) {
  const navigate = useNavigate();
  const { can } = usePermission();

  const statusColor: Record<string, string> = {
    PENDING: "bg-amber-50 border-amber-200 text-amber-700",
    CONFIRMED: "bg-blue-50 border-blue-200 text-blue-700",
    COMPLETED: "bg-emerald-50 border-emerald-200 text-emerald-700",
    CANCELLED: "bg-red-50 border-red-200 text-red-700",
    NO_SHOW: "bg-red-50 border-red-200 text-red-700",
    REFUNDED: "bg-orange-50 border-orange-200 text-orange-700",
  };

  const timelineSteps = [
    { label: "Booking Created", date: booking.createdAt, active: true },
    { label: "Payment Confirmed", date: booking.paidAt || null, active: isPaymentPaid(booking.paymentStatus) },
    { label: "Tour Completed", date: booking.status === "COMPLETED" ? booking.updatedAt : null, active: booking.status === "COMPLETED" },
    { label: "Payout Processed", date: booking.payouts?.[0]?.paidAt || null, active: booking.payouts?.[0]?.status === "PAID" },
  ];

  const travelerCount = Array.isArray(booking.travelers) ? booking.travelers.length : 0;

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
        className="fixed right-0 top-0 z-50 h-full w-[480px] bg-white border-l border-slate-200 shadow-[-4px_0_16px_rgba(0,0,0,0.06)] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">{booking.bookingNumber}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className={cn("px-5 py-3 border-b text-xs font-semibold flex items-center gap-2", statusColor[booking.status] || "bg-slate-50")}>
            <span className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              booking.status === "PENDING" ? "bg-amber-500" :
              booking.status === "CONFIRMED" ? "bg-blue-500" :
              booking.status === "COMPLETED" ? "bg-emerald-500" :
              "bg-red-500"
            )} />
            {booking.status === "PENDING" ? "Pending Confirmation" :
             booking.status === "CONFIRMED" ? "Confirmed" :
             booking.status === "COMPLETED" ? "Completed" :
             booking.status === "CANCELLED" ? "Cancelled" :
             booking.status === "NO_SHOW" ? "No Show" :
             booking.status}
          </div>

          <div className="p-5 space-y-5">
            <div className="flex items-start gap-4">
              <button
                onClick={() => onViewCustomer(booking.customer.id)}
                className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-full"
                title="View customer profile"
              >
                <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-base font-bold text-indigo-600 ring-2 ring-indigo-100">
                  {booking.customer.photoURL ? (
                    <img src={booking.customer.photoURL} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                  ) : null}
                  <span className={booking.customer.photoURL ? "opacity-0" : ""}>
                    {(booking.customer.name || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900 truncate">{booking.customer.name}</h3>
                  <Badge variant={STATUS_BADGE[booking.status] || "info"} className="text-[10px] px-1.5 py-0">
                    {booking.status}
                  </Badge>
                </div>
                {booking.customer.email && (
                  <p className="text-xs text-slate-500 mt-0.5">{booking.customer.email}</p>
                )}
                {booking.customer.phone && (
                  <p className="text-xs text-slate-400 mt-0.5">{booking.customer.phone}</p>
                )}
              </div>
            </div>

            <button
              onClick={() => navigate(`/admin/tours/${booking.tour.id}`)}
              className="w-full rounded-xl border border-slate-200 p-4 space-y-1 text-left cursor-pointer hover:border-indigo-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg shrink-0 overflow-hidden bg-slate-100 border border-slate-200">
                  {booking.tour.coverPhoto ? (
                    <img src={booking.tour.coverPhoto} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">{booking.tour.title}</p>
                  <p className="text-xs text-slate-500">by {booking.tour.supplier.name}</p>
                </div>
              </div>
            </button>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Booking Details</span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
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
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Pricing Breakdown</span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              <div className="rounded-xl border border-slate-200 p-4 space-y-1">
                <DetailRow icon={<DollarSign className="h-3 w-3" />} label="Subtotal">
                  {booking.currency} {Number(booking.subtotal).toLocaleString()}
                </DetailRow>
                <DetailRow icon={<Percent className="h-3 w-3" />} label="Taxes">
                  {booking.currency} {Number(booking.taxes).toLocaleString()}
                </DetailRow>
                <DetailRow icon={<FileText className="h-3 w-3" />} label="Fees">
                  {booking.currency} {Number(booking.fees).toLocaleString()}
                </DetailRow>
                {Number(booking.discounts) > 0 && (
                  <DetailRow icon={<Receipt className="h-3 w-3" />} label="Discounts">
                    -{booking.currency} {Number(booking.discounts).toLocaleString()}
                  </DetailRow>
                )}
                <div className="border-t border-slate-200 pt-2 mt-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900">Total</span>
                  <span className="text-sm font-bold text-slate-900">
                    {booking.currency} {Number(booking.total).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Payment</span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-700">Payment Status</span>
                  </div>
                  <Badge variant={PAYMENT_STATUS_BADGE[booking.paymentStatus] || "info"} className="text-[10px] px-1.5 py-0">
                    {booking.paymentStatus}
                  </Badge>
                </div>
                {booking.paymentStatus === "PENDING" && can('bookings.confirm-payment') && (
                  <Button
                    onClick={() => onConfirmPayment(booking)}
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Confirm Payment
                  </Button>
                )}
              </div>
            </div>

            {booking.payouts && booking.payouts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1 bg-slate-100" />
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Payout</span>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>
                <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                  {booking.payouts.map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Banknote className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="text-xs font-medium text-slate-700">
                          {payout.currency} {Number(payout.amount).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={PAYOUT_STATUS_BADGE[payout.status] || "info"} className="text-[10px] px-1.5 py-0">
                          {payout.status}
                        </Badge>
                        <button
                          onClick={() => navigate(`/admin/payouts?tab=list&payoutId=${payout.id}&payoutStatus=${payout.status}`)}
                          className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800 hover:underline whitespace-nowrap"
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
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1 bg-slate-100" />
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Special Requests</span>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <p className="text-xs text-slate-600">{booking.specialRequests}</p>
                </div>
              </div>
            )}

            {booking.cancellationReason && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1 bg-slate-100" />
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Cancellation Reason</span>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-xs text-red-700">{booking.cancellationReason}</p>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Timeline</span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
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
