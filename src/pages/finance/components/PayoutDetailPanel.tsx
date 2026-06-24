import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  X,
  User,
  MapPin,
  Calendar,
  Hash,
  DollarSign,
  Wallet,
  Building2,
  Smartphone,
  Percent,
  CheckCircle,
  Send,
  XCircle,
  Ban,
  Globe,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { Payout } from "@/pages/finance/PayoutsList";

interface PayoutDetailPanelProps {
  payout: Payout;
  onClose: () => void;
  onApprove?: (payout: Payout) => void;
  onRelease?: (payout: Payout) => void;
  onFail?: (payout: Payout) => void;
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

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-px flex-1 bg-slate-100" />
      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{label}</span>
      <div className="h-px flex-1 bg-slate-100" />
    </div>
  );
}

export function PayoutDetailPanel({ payout, onClose, onApprove, onRelease, onFail }: PayoutDetailPanelProps) {
  const navigate = useNavigate();

  const statusColor: Record<string, string> = {
    PENDING: "bg-amber-50 border-amber-200 text-amber-700",
    APPROVED: "bg-blue-50 border-blue-200 text-blue-700",
    PROCESSING: "bg-indigo-50 border-indigo-200 text-indigo-700",
    PAID: "bg-emerald-50 border-emerald-200 text-emerald-700",
    FAILED: "bg-red-50 border-red-200 text-red-700",
    CANCELLED: "bg-slate-50 border-slate-200 text-slate-600",
  };

  const status = payout.status || "UNKNOWN";
  const amount = Number(payout.amount) || 0;
  const commission = Number(payout.commissionAmount ?? payout.commission ?? 0);
  const commissionPct = amount > 0 ? ((commission / amount) * 100).toFixed(1) : null;
  const netPayout = amount - commission;

  const method = payout.payoutMethod;
  const isBank = method?.type?.toLowerCase().includes("bank");
  const isPaypal = method?.type?.toLowerCase().includes("paypal");
  const MethodIcon = isBank ? Building2 : isPaypal ? Wallet : Smartphone;

  const timelineSteps = [
    { label: "Created", date: payout.createdAt || null, active: true },
    { label: "Approved", date: payout.statusHistory?.find((s) => s.status === "APPROVED")?.timestamp || null, active: ["APPROVED", "PROCESSING", "PAID", "FAILED"].includes(status) },
    { label: "Processing", date: payout.statusHistory?.find((s) => s.status === "PROCESSING")?.timestamp || null, active: ["PROCESSING", "PAID"].includes(status) },
    { label: payout.status === "FAILED" ? "Failed" : "Paid", date: payout.paidAt || payout.statusHistory?.find((s) => s.status === "PAID")?.timestamp || null, active: status === "PAID" || status === "FAILED" },
  ];

  const supplier = payout.supplier;
  const businessInfo = supplier?.supplierProfile?.businessInfo;

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
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Hash className="h-4 w-4 text-slate-400 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-900 truncate">Payout {payout.id.slice(0, 8)}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Status Banner */}
          <div className={cn("px-5 py-3 border-b text-xs font-semibold flex items-center gap-2", statusColor[status] || "bg-slate-50")}>
            <span className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              status === "PENDING" ? "bg-amber-500" :
              status === "APPROVED" ? "bg-blue-500" :
              status === "PROCESSING" ? "bg-indigo-500" :
              status === "PAID" ? "bg-emerald-500" :
              status === "FAILED" ? "bg-red-500" :
              "bg-slate-400"
            )} />
            {status.replace(/_/g, " ")}
          </div>

          {/* Amount Hero */}
          <div className="px-5 py-5 border-b border-slate-100">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium mb-1">Payout Amount</p>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">{formatCurrency(amount)}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <StatusBadge status={status} />
              {payout.reference && (
                <span className="text-[11px] text-slate-400">Ref: {payout.reference}</span>
              )}
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Supplier Information */}
            <div>
              <SectionDivider label="Supplier Info" />
              <div className="flex items-start gap-3 mb-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                  <span className={supplier?.photoURL ? "opacity-0" : ""}>{(supplier?.name || "?").charAt(0).toUpperCase()}</span>
                  {supplier?.photoURL && (
                    <img
                      src={supplier.photoURL}
                      alt={supplier?.name || ""}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{supplier?.name || "—"}</p>
                  {businessInfo?.legalBusinessName && businessInfo.legalBusinessName !== supplier?.name && (
                    <p className="text-[11px] text-slate-400 truncate">{businessInfo.legalBusinessName}</p>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 space-y-0.5">
                <DetailRow icon={<User className="h-3 w-3" />} label="Display Name">{supplier?.name || "—"}</DetailRow>
                {businessInfo?.legalBusinessName && (
                  <DetailRow icon={<Building2 className="h-3 w-3" />} label="Legal Name">{businessInfo.legalBusinessName}</DetailRow>
                )}
                {supplier?.email && (
                  <DetailRow icon={<Wallet className="h-3 w-3" />} label="Email">{supplier.email}</DetailRow>
                )}
                {(supplier?.phone || businessInfo?.phone || businessInfo?.phoneNumber) && (
                  <DetailRow icon={<Smartphone className="h-3 w-3" />} label="Phone">{supplier?.phone || businessInfo?.phone || businessInfo?.phoneNumber || "—"}</DetailRow>
                )}
                {businessInfo?.country && (
                  <DetailRow icon={<Globe className="h-3 w-3" />} label="Country">{businessInfo.country}</DetailRow>
                )}
                {(businessInfo?.city || (typeof businessInfo?.address === 'string' ? businessInfo?.address : businessInfo?.address?.city)) && (
                  <DetailRow icon={<MapPin className="h-3 w-3" />} label="City">{(typeof businessInfo?.address === 'string' ? businessInfo?.address : businessInfo?.address?.city) || businessInfo?.city}</DetailRow>
                )}
              </div>
            </div>

            {/* Booking Details */}
            {(payout.booking || payout.tour) && (
              <div>
                <SectionDivider label="Booking Details" />
                <div className="rounded-xl border border-slate-200 p-3 space-y-0.5">
                  {payout.booking?.bookingNumber && (
                    <DetailRow icon={<Hash className="h-3 w-3" />} label="Booking #">{payout.booking.bookingNumber}</DetailRow>
                  )}
                  {(payout.booking?.tour?.title || payout.tour?.title) && (
                    <DetailRow icon={<MapPin className="h-3 w-3" />} label="Tour">{payout.booking?.tour?.title || payout.tour?.title}</DetailRow>
                  )}
                  {payout.booking?.total && (
                    <DetailRow icon={<DollarSign className="h-3 w-3" />} label="Total">{formatCurrency(payout.booking.total)}</DetailRow>
                  )}
                  {payout.createdAt && (
                    <DetailRow icon={<Calendar className="h-3 w-3" />} label="Created">{formatDate(payout.createdAt)}</DetailRow>
                  )}
                  {payout.paidAt && (
                    <DetailRow icon={<Clock className="h-3 w-3" />} label="Paid At">{formatDateTime(payout.paidAt)}</DetailRow>
                  )}
                </div>
              </div>
            )}

            {/* Commission Breakdown */}
            <div>
              <SectionDivider label="Commission Breakdown" />
              <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                <DetailRow icon={<DollarSign className="h-3 w-3" />} label="Booking Amount">{formatCurrency(amount + commission)}</DetailRow>
                <DetailRow icon={<Percent className="h-3 w-3" />} label="Commission">
                  {formatCurrency(commission)}
                  {commissionPct && <span className="text-slate-400 ml-1">({commissionPct})</span>}
                </DetailRow>
                <div className="border-t border-slate-200 pt-2 mt-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900">Net Payout</span>
                  <span className="text-sm font-bold text-emerald-700 tabular-nums">{formatCurrency(netPayout)}</span>
                </div>
              </div>
            </div>

            {/* Payout Method */}
            {method?.type && (
              <div>
                <SectionDivider label="Payout Method" />
                <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                      <MethodIcon className="h-4.5 w-4.5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{method.type?.replace(/_/g, " ")}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {method.verified !== undefined && (
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                            method.verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          )}>
                            {method.verified ? "Verified" : "Unverified"}
                          </span>
                        )}
                        {method.isDefault && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {method.details && (
                    <p className="text-xs text-slate-500">{method.details}</p>
                  )}
                  {method.bankName && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      {method.bankName && <Field label="Bank" value={method.bankName} />}
                      {method.accountNumber && <Field label="Account" value={`****${method.accountNumber.slice(-4)}`} />}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div>
              <SectionDivider label="Timeline" />
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="space-y-0">
                  {timelineSteps.map((step, idx) => {
                    const isLast = idx === timelineSteps.length - 1;
                    const dotClass = step.active
                      ? "bg-indigo-500 border-indigo-200"
                      : step.date
                      ? "bg-emerald-500 border-emerald-200"
                      : "bg-slate-200 border-slate-100";
                    return (
                      <div key={step.label} className="relative flex gap-3">
                        {!isLast && (
                          <div className={cn(
                            "absolute left-[11px] top-5 w-0.5 h-full -translate-x-1/2",
                            step.date ? "bg-indigo-100" : "bg-slate-100"
                          )} />
                        )}
                        <div className="flex flex-col items-center shrink-0 pt-0.5">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={cn("h-[22px] w-[22px] rounded-full border-2 flex items-center justify-center", dotClass)}
                          >
                            {step.date && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="h-2 w-2 rounded-full bg-current"
                              />
                            )}
                          </motion.div>
                        </div>
                        <div className={cn("pb-5", isLast && "pb-0")}>
                          <p className={cn(
                            "text-xs font-medium",
                            step.active ? "text-indigo-700" : step.date ? "text-slate-900" : "text-slate-400"
                          )}>
                            {step.label}
                          </p>
                          {step.date && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(step.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 px-5 py-4 shrink-0 space-y-2">
          {status === "PENDING" && onApprove && (
            <Button
              onClick={() => { onApprove(payout); onClose(); }}
              className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
            >
              <CheckCircle className="h-4 w-4" /> Approve Payout
            </Button>
          )}
          {status === "APPROVED" && (
            <div className="flex gap-2">
              {onRelease && (
                <Button
                  onClick={() => { onRelease(payout); onClose(); }}
                  className="flex-1 gap-1.5"
                  size="sm"
                >
                  <Send className="h-4 w-4" /> Release
                </Button>
              )}
              {onFail && (
                <Button
                  onClick={() => { onFail(payout); onClose(); }}
                  variant="outline"
                  className="flex-1 gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
                  size="sm"
                >
                  <XCircle className="h-4 w-4" /> Fail
                </Button>
              )}
            </div>
          )}
          {status === "PROCESSING" && onFail && (
            <Button
              onClick={() => { onFail(payout); onClose(); }}
              variant="outline"
              className="w-full gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
              size="sm"
            >
              <Ban className="h-4 w-4" /> Mark as Failed
            </Button>
          )}
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-slate-400"
            size="sm"
          >
            Close
          </Button>
        </div>
      </motion.div>
    </>,
    document.body
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-sm bg-slate-50/50 px-3 py-2">
      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="mt-0.5 text-xs font-medium text-slate-900">{value || "—"}</p>
    </div>
  );
}
