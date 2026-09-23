import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Ban,
  CalendarX,
  CheckCircle2,
  RefreshCw,
  Search,
  ShieldOff,
  X,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { DateCell, MoneyCell } from "@/components/shared/table-cells";
import {
  ApproveCancellationDialog,
  RejectCancellationDialog,
} from "@/components/cancellations/DecisionDialogs";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";
import {
  approveCancellationRequest,
  batchApproveCancellationRequests,
  decisionErrorInfo,
  getCancellationRequest,
  getCancellationRequests,
  rejectCancellationRequest,
} from "@/services/cancellationService";
import {
  CANCELLATION_QUEUE_PAGE_SIZE,
  CANCELLATION_TABS,
  cancellationStatusLabel,
  cancellationStatusVariant,
  isDecidable,
  type CancellationRequest,
  type CancellationTab,
} from "@/types/cancellation";
import { CancellationDetailPanel } from "./components/CancellationDetailPanel";

const TAB_KEYS = CANCELLATION_TABS.map((t) => t.key) as readonly string[];

function isTab(value: string | null): value is CancellationTab {
  return !!value && TAB_KEYS.includes(value);
}

export default function CancellationsPage() {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const canDecide = can("cancellations.approve");
  const [searchParams, setSearchParams] = useSearchParams();

  const statusParam = searchParams.get("status");
  const initialTab: CancellationTab = isTab(statusParam) ? statusParam : "PENDING_APPROVAL";

  const [statusFilter, setStatusFilter] = useState<CancellationTab>(initialTab);
  const [page, setPage] = useState(1);
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [decisionTarget, setDecisionTarget] = useState<{
    request: CancellationRequest;
    action: "approve" | "reject";
  } | null>(null);
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(rawSearch);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [rawSearch]);

  // Deep link: /cancellations?request=<id>. The detail drawer is driven purely
  // by the URL so notification clicks re-target it without local state sync.
  const selectedId = searchParams.get("request");

  const openDetail = useCallback(
    (id: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("request", id);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const closeDetail = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("request");
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin", "cancellations", { status: statusFilter, search, page }],
    queryFn: () =>
      getCancellationRequests({
        status: statusFilter,
        search: search || undefined,
        page,
        limit: CANCELLATION_QUEUE_PAGE_SIZE,
      }),
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });

  const requests = useMemo(() => data?.requests ?? [], [data]);
  const pendingCount = data?.pendingCount ?? 0;
  const pagination = data?.pagination;

  const { data: detail, isLoading: detailLoading, isError: detailError } = useQuery({
    queryKey: ["admin", "cancellation-request", selectedId],
    queryFn: () => getCancellationRequest(selectedId as string),
    enabled: !!selectedId,
  });

  const selectedRequest =
    detail ?? requests.find((r) => r.id === selectedId) ?? null;

  const invalidateAll = useCallback(
    (id?: string) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "cancellations"] });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: ["admin", "cancellation-request", id],
        });
      }
    },
    [queryClient],
  );

  const approveMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      approveCancellationRequest(id, note),
    onSuccess: (result, variables) => {
      const currency = result?.request?.booking?.currency;
      const refund = result?.cancellation?.refundAmount;
      toast.success(
        refund != null
          ? `Cancellation approved — refund of ${currency || ""} ${Number(refund).toLocaleString()} issued`
          : "Cancellation approved — the refund has been executed",
      );
      invalidateAll(variables.id);
      setDecisionTarget(null);
      closeDetail();
    },
    onError: (err) => {
      const { message, conflict } = decisionErrorInfo(err);
      toast.error(conflict ? `${message} — refreshing the queue` : message);
      invalidateAll();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      rejectCancellationRequest(id, note),
    onSuccess: (_result, variables) => {
      toast.success("Cancellation request rejected — the booking is unchanged");
      invalidateAll(variables.id);
      setDecisionTarget(null);
      closeDetail();
    },
    onError: (err) => {
      const { message, conflict } = decisionErrorInfo(err);
      toast.error(conflict ? `${message} — refreshing the queue` : message);
      invalidateAll();
    },
  });

  const batchMutation = useMutation({
    mutationFn: (ids: string[]) =>
      batchApproveCancellationRequests(ids, "Batch approved"),
    onSuccess: (result) => {
      if (result.failed > 0) {
        const failed = result.results
          .filter((r) => !r.ok)
          .map((r) => r.error)
          .filter(Boolean)
          .slice(0, 3)
          .join("; ");
        toast.warning(
          `Approved ${result.approved} of ${result.requested} — ${result.failed} failed`,
          failed ? { description: failed } : undefined,
        );
      } else {
        toast.success(
          `Approved ${result.approved} cancellation request${result.approved === 1 ? "" : "s"}`,
        );
      }
      invalidateAll();
      setSelectedIds(new Set());
      setShowBatchConfirm(false);
      closeDetail();
    },
    onError: (err) => {
      const { message } = decisionErrorInfo(err);
      toast.error(message);
      setShowBatchConfirm(false);
    },
  });

  const deciding = approveMutation.isPending || rejectMutation.isPending;

  const handleTabChange = useCallback(
    (key: CancellationTab) => {
      setStatusFilter(key);
      setPage(1);
      setSelectedIds(new Set());
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (key === "PENDING_APPROVAL") next.delete("status");
          else next.set("status", key);
          next.delete("request");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectableOnPage = useMemo(
    () => requests.filter((r) => canDecide && isDecidable(r.status)),
    [requests, canDecide],
  );
  const allSelected =
    selectableOnPage.length > 0 &&
    selectableOnPage.every((r) => selectedIds.has(r.id));

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selectableOnPage.every((r) => next.has(r.id))) {
        selectableOnPage.forEach((r) => next.delete(r.id));
      } else {
        selectableOnPage.forEach((r) => next.add(r.id));
      }
      return next;
    });
  }, [selectableOnPage]);

  const selectedRequests = useMemo(
    () => requests.filter((r) => selectedIds.has(r.id)),
    [requests, selectedIds],
  );
  const selectedRefundTotal = selectedRequests.reduce(
    (sum, r) => sum + Number(r.preview?.refund?.amount || 0),
    0,
  );
  const selectedCurrency = selectedRequests[0]?.booking?.currency;

  const columns = useMemo<Column<CancellationRequest>[]>(() => {
    const cols: Column<CancellationRequest>[] = [];

    if (canDecide) {
      cols.push({
        key: "select",
        header: (
          <input
            type="checkbox"
            aria-label="Select all decidable requests on this page"
            className="h-3.5 w-3.5 cursor-pointer accent-[hsl(var(--primary))]"
            checked={allSelected}
            disabled={selectableOnPage.length === 0}
            onChange={toggleAll}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        className: "w-10",
        align: "center",
        render: (r) => (
          <input
            type="checkbox"
            aria-label={`Select request for ${r.booking?.bookingNumber || r.id}`}
            className="h-3.5 w-3.5 cursor-pointer accent-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-40"
            checked={selectedIds.has(r.id)}
            disabled={!isDecidable(r.status)}
            onChange={() => toggleRow(r.id)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      });
    }

    cols.push(
      {
        key: "booking",
        header: "Booking",
        className: "min-w-[150px]",
        render: (r) => (
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-text-primary">
              {r.booking?.bookingNumber || "—"}
            </p>
            <p className="truncate text-[10px] text-text-tertiary">
              {r.booking?.customer?.name || r.booking?.customer?.email || "—"}
            </p>
          </div>
        ),
      },
      {
        key: "tour",
        header: "Tour / Supplier",
        className: "min-w-[190px]",
        render: (r) => (
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-text-primary">
              {r.tour?.title || "—"}
            </p>
            <p className="truncate text-[10px] text-text-tertiary">
              {r.supplier?.name || r.tour?.supplier?.name || "—"}
            </p>
          </div>
        ),
      },
      {
        key: "travelDate",
        header: "Travel date",
        className: "min-w-[110px]",
        render: (r) => <DateCell value={r.booking?.travelDate} />,
      },
      {
        key: "requestedAt",
        header: "Requested",
        className: "min-w-[110px]",
        render: (r) => <DateCell value={r.createdAt} withTime />,
      },
      {
        key: "category",
        header: "Category / Code",
        className: "min-w-[140px]",
        render: (r) => (
          <div className="min-w-0">
            <p className="truncate text-xs text-text-secondary">
              {r.payload?.cancellationCategory || "—"}
            </p>
            <p className="truncate text-[10px] font-mono text-text-tertiary">
              {r.payload?.cancellationCode || "—"}
            </p>
          </div>
        ),
      },
      {
        key: "explanation",
        header: "Explanation",
        className: "min-w-[200px] max-w-[260px]",
        render: (r) => (
          <p className="line-clamp-2 text-xs text-text-secondary" title={r.payload?.explanation || ""}>
            {r.payload?.explanation || "—"}
          </p>
        ),
      },
      {
        key: "money",
        header: "Refund / Fee",
        className: "min-w-[140px]",
        align: "right",
        render: (r) => (
          <div className="flex flex-col items-end gap-0.5">
            <MoneyCell
              value={Number(r.preview?.refund?.amount || 0)}
              currency={r.booking?.currency}
              className="text-xs"
            />
            <span className="text-[10px] text-text-tertiary">
              fee {Number(r.preview?.fee || 0).toLocaleString()}
            </span>
          </div>
        ),
      },
      {
        key: "stopSell",
        header: "Stop-sell",
        className: "min-w-[90px]",
        align: "center",
        render: (r) =>
          r.stopSellingApplied ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-status-pending/40 bg-status-pending/10 px-2 py-0.5 text-[10px] font-semibold text-status-pending">
              <ShieldOff className="h-3 w-3" />
              Blocked
            </span>
          ) : (
            <span className="text-[10px] text-text-tertiary">—</span>
          ),
      },
      {
        key: "status",
        header: "Status / Decision",
        className: "min-w-[170px]",
        render: (r) => (
          <div className="space-y-1">
            <Badge variant={cancellationStatusVariant(r.status)} className="text-[10px]">
              {cancellationStatusLabel(r.status)}
            </Badge>
            {r.decidedAt && (
              <p className="text-[10px] text-text-tertiary">
                {r.decidedBy?.name || "Admin"} ·{" "}
                {new Date(r.decidedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}
            {r.decisionNote && (
              <p className="line-clamp-1 text-[10px] text-text-tertiary" title={r.decisionNote ?? undefined}>
                {r.decisionNote}
              </p>
            )}
          </div>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        className: "min-w-[150px]",
        align: "right",
        render: (r) => (
          <div className="flex items-center justify-end gap-1">
            {canDecide && isDecidable(r.status) ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-[11px]"
                  disabled={deciding}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDecisionTarget({ request: r, action: "reject" });
                  }}
                >
                  <XCircle className="h-3 w-3" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 gap-1 px-2 text-[11px]"
                  disabled={deciding}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDecisionTarget({ request: r, action: "approve" });
                  }}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Approve
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px]"
                onClick={(e) => {
                  e.stopPropagation();
                  openDetail(r.id);
                }}
              >
                View
              </Button>
            )}
          </div>
        ),
      },
    );

    return cols;
  }, [
    canDecide,
    allSelected,
    selectableOnPage,
    toggleAll,
    selectedIds,
    toggleRow,
    deciding,
    openDetail,
  ]);

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarX className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">
              Cancellation Requests
            </h1>
            <p className="text-sm text-text-secondary">
              Supplier cancellations awaiting admin approval ·{" "}
              <span className="font-medium text-status-pending">
                {pendingCount} pending
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canDecide && selectedIds.size > 0 && (
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5"
              onClick={() => setShowBatchConfirm(true)}
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve {selectedIds.size} selected
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface-muted p-0.5 scrollbar-none">
        {CANCELLATION_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              statusFilter === tab.key
                ? "bg-surface-base text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
        <Input
          placeholder="Search booking #, customer, tour…"
          value={rawSearch}
          onChange={(e) => setRawSearch(e.target.value)}
          className="h-9 pl-9"
        />
        {rawSearch && (
          <button
            onClick={() => setRawSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1">
        <DataTable
          columns={columns}
          data={requests}
          loading={isLoading}
          error={
            isError
              ? "Failed to load cancellation requests. Please try again."
              : null
          }
          onRetry={() => refetch()}
          onRowClick={(r) => openDetail(r.id)}
          keyExtractor={(r) => r.id}
          highlightedKey={selectedId ?? undefined}
          emptyMessage={
            search
              ? "No cancellation requests match your search."
              : "No cancellation requests in this view."
          }
          pagination={{
            page,
            totalPages: pagination?.totalPages ?? 1,
            totalCount: pagination?.totalCount ?? requests.length,
            pageSize: CANCELLATION_QUEUE_PAGE_SIZE,
            onPageChange: setPage,
          }}
          size="compact"
        />
      </div>

      {selectedId && (
        <CancellationDetailPanel
          request={selectedRequest}
          loading={detailLoading}
          error={detailError}
          canDecide={canDecide}
          deciding={deciding}
          onClose={closeDetail}
          onApprove={(request) => setDecisionTarget({ request, action: "approve" })}
          onReject={(request) => setDecisionTarget({ request, action: "reject" })}
        />
      )}

      {decisionTarget?.action === "approve" && (
        <ApproveCancellationDialog
          open
          request={decisionTarget.request}
          loading={approveMutation.isPending}
          onConfirm={(note) =>
            approveMutation.mutate({ id: decisionTarget.request.id, note })
          }
          onCancel={() => setDecisionTarget(null)}
        />
      )}

      {decisionTarget?.action === "reject" && (
        <RejectCancellationDialog
          open
          request={decisionTarget.request}
          loading={rejectMutation.isPending}
          onConfirm={(note) =>
            rejectMutation.mutate({ id: decisionTarget.request.id, note })
          }
          onCancel={() => setDecisionTarget(null)}
        />
      )}

      {showBatchConfirm && (
        <BatchApproveConfirm
          count={selectedIds.size}
          refundTotal={selectedRefundTotal}
          currency={selectedCurrency}
          loading={batchMutation.isPending}
          onConfirm={() => batchMutation.mutate(Array.from(selectedIds))}
          onCancel={() => setShowBatchConfirm(false)}
        />
      )}
    </div>
  );
}

function BatchApproveConfirm({
  count,
  refundTotal,
  currency,
  loading,
  onConfirm,
  onCancel,
}: {
  count: number;
  refundTotal: number;
  currency?: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm batch approval"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-surface-base p-6 shadow-soft-lg">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-status-rejected/10">
            <Ban className="h-5 w-5 text-status-rejected" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              Approve {count} cancellation request{count === 1 ? "" : "s"}?
            </h3>
            <p className="text-xs text-text-secondary">
              This executes immediately and cannot be undone.
            </p>
          </div>
        </div>
        <p className="text-sm text-text-secondary">
          Each approval issues a{" "}
          <strong className="font-semibold text-text-primary">
            FULL customer refund
          </strong>{" "}
          totalling{" "}
          <strong className="font-semibold text-text-primary">
            {currency || ""} {Number(refundTotal || 0).toLocaleString()}
          </strong>{" "}
          and may apply the 25% supplier cancellation fee. Customers are emailed
          and refunds start immediately.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? "Approving…" : `Approve ${count}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
