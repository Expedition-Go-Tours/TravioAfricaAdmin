import { useState, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, ChevronRight, CalendarDays, Filter, FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import type { Column } from "@/components/shared/DataTable";
import api from "@/lib/axios";
import { formatDateTime, truncateId } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AuditEntry {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName: string;
  action: string;
  resource: string;
  resourceId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: string;
}

const DATE_PRESETS = [
  { label: "24h", value: "24h", days: 1 },
  { label: "7d", value: "7d", days: 7 },
  { label: "30d", value: "30d", days: 30 },
  { label: "90d", value: "90d", days: 90 },
  { label: "All", value: "all", days: 0 },
] as const;

function getDateRange(preset: string) {
  if (preset === "all") return {};
  const p = DATE_PRESETS.find((x) => x.value === preset);
  if (!p) return {};
  const start = new Date();
  start.setDate(start.getDate() - p.days);
  return { startDate: start.toISOString() };
}

function actionBadge(action: string): { variant: "success" | "warning" | "error" | "info" | "default"; label: string } {
  if (action.startsWith("admin.granted")) return { variant: "success", label: "Granted" };
  if (action.startsWith("admin.revoked")) return { variant: "error", label: "Revoked" };
  if (action.startsWith("role.")) return { variant: "warning", label: "Role" };
  if (action.startsWith("settings.")) return { variant: "info", label: "Settings" };
  if (action.includes("created")) return { variant: "success", label: "Created" };
  if (action.includes("deleted")) return { variant: "error", label: "Deleted" };
  if (action.includes("updated")) return { variant: "info", label: "Updated" };
  return { variant: "default", label: action };
}

function DiffBlock({ oldV, newV }: { oldV: Record<string, unknown> | null; newV: Record<string, unknown> | null }) {
  const allKeys = [...new Set([...Object.keys(oldV || {}), ...Object.keys(newV || {})])];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wider">Previous</span>
        </div>
        {oldV ? (
          <div className="bg-white border border-red-100 rounded-lg p-3 text-[11px] font-mono text-text-secondary overflow-x-auto max-h-[260px] whitespace-pre-wrap shadow-sm">
            {allKeys.map((key) => {
              const oldVal = oldV[key];
              const changed = newV && key in newV && JSON.stringify(newV[key]) !== JSON.stringify(oldVal);
              return (
                <div key={key} className={cn("py-0.5", changed && "bg-red-50/50 -mx-2 px-2 rounded")}>
                  <span className="text-text-tertiary">"{key}": </span>
                  <span className={cn(changed ? "text-red-600 line-through" : "text-text-secondary")}>
                    {oldVal !== undefined ? JSON.stringify(oldVal) : "undefined"}
                  </span>
                  {changed && ","}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-surface-muted border border-border/40 rounded-lg p-4 text-xs text-text-tertiary italic text-center">No previous data</div>
        )}
      </div>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wider">New</span>
        </div>
        {newV ? (
          <div className="bg-white border border-green-100 rounded-lg p-3 text-[11px] font-mono text-text-secondary overflow-x-auto max-h-[260px] whitespace-pre-wrap shadow-sm">
            {allKeys.map((key) => {
              const newVal = newV[key];
              const changed = oldV && key in oldV && JSON.stringify(oldV[key]) !== JSON.stringify(newVal);
              return (
                <div key={key} className={cn("py-0.5", changed && "bg-green-50/50 -mx-2 px-2 rounded")}>
                  <span className="text-text-tertiary">"{key}": </span>
                  <span className={cn(changed ? "text-green-700 font-medium" : "text-text-secondary")}>
                    {newVal !== undefined ? JSON.stringify(newVal) : "undefined"}
                  </span>
                  {changed && ","}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-surface-muted border border-border/40 rounded-lg p-4 text-xs text-text-tertiary italic text-center">No new data</div>
        )}
      </div>
    </div>
  );
}

export function AuditLogTab() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [debouncedAction, setDebouncedAction] = useState("");
  const [debouncedResource, setDebouncedResource] = useState("");

  const handleActionChange = (val: string) => {
    setActionFilter(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedAction(val); setPage(1); }, 300);
  };

  const handleResourceChange = (val: string) => {
    setResourceFilter(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedResource(val); setPage(1); }, 300);
  };

  const dateRange = useMemo(() => getDateRange(datePreset), [datePreset]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "audit-log", { page, action: debouncedAction, resource: debouncedResource, ...dateRange }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (debouncedAction) params.set("action", debouncedAction);
      if (debouncedResource) params.set("resource", debouncedResource);
      if (dateRange.startDate) params.set("startDate", dateRange.startDate);
      return api.get(`/admin/audit-log?${params.toString()}`).then((r) => r.data?.data || { entries: [], total: 0, page: 1, pages: 1 });
    },
  });

  const entries: AuditEntry[] = data?.entries || [];
  const totalPages = data?.pages || 1;
  const totalCount = data?.total || 0;

  const columns: Column<AuditEntry>[] = [
    {
      key: "createdAt",
      header: "Date/Time",
      render: (r) => (
        <span className="text-xs text-text-secondary whitespace-nowrap font-mono">
          {formatDateTime(r.createdAt)}
        </span>
      ),
      className: "w-[140px]",
    },
    {
      key: "admin",
      header: "Admin",
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 text-[10px] font-bold text-white shadow-sm shrink-0">
            {(r.userName || r.userEmail || "S").charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-text-primary truncate">{r.userName || r.userEmail || "System"}</span>
        </div>
      ),
      className: "min-w-[160px]",
    },
    {
      key: "action",
      header: "Action",
      render: (r) => {
        const { variant, label } = actionBadge(r.action);
        return (
          <Badge variant={variant} className="font-mono text-[10px]">
            {label}
          </Badge>
        );
      },
      className: "w-[120px]",
    },
    {
      key: "resource",
      header: "Resource",
      render: (r) => <span className="text-sm text-text-primary">{r.resource || "—"}</span>,
      className: "w-[110px]",
    },
    {
      key: "resourceId",
      header: "Resource ID",
      render: (r) => (
        <span className="text-xs text-text-secondary font-mono">{r.resourceId ? truncateId(r.resourceId, 10) : "—"}</span>
      ),
      className: "w-[110px]",
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          {(r.oldValues || r.newValues) && (
            <span className={cn(
              "text-[9px] font-medium px-1.5 py-0.5 rounded",
              r.oldValues && r.newValues ? "bg-amber-50 text-amber-700" : r.newValues ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700",
            )}>
              {r.oldValues && r.newValues ? "Modified" : r.newValues ? "Created" : "Removed"}
            </span>
          )}
          <ChevronRight className={cn(
            "h-4 w-4 text-text-tertiary transition-transform duration-200",
            expandedId === r.id && "rotate-90",
          )} />
        </div>
      ),
      className: "w-[140px]",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border/60 bg-white/90 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-rose-500 to-pink-600" />
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <Input
                placeholder="Filter by action..."
                value={actionFilter}
                onChange={(e) => handleActionChange(e.target.value)}
                className="pl-9"
              />
              {actionFilter && (
                <button
                  type="button"
                  onClick={() => { setActionFilter(""); setDebouncedAction(""); setPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <Input
                placeholder="Filter by resource..."
                value={resourceFilter}
                onChange={(e) => handleResourceChange(e.target.value)}
                className="pl-9"
              />
              {resourceFilter && (
                <button
                  type="button"
                  onClick={() => { setResourceFilter(""); setDebouncedResource(""); setPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <CalendarDays className="h-4 w-4 text-text-tertiary mr-1 shrink-0" />
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => { setDatePreset(p.value); setPage(1); }}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap",
                    datePreset === p.value
                      ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-sm"
                      : "bg-surface-muted text-text-secondary border border-border/60 hover:bg-surface-muted/80",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const params = new URLSearchParams();
                  if (debouncedAction) params.set("action", debouncedAction);
                  if (debouncedResource) params.set("resource", debouncedResource);
                  if (dateRange.startDate) params.set("startDate", dateRange.startDate);
                  const res = await api.get(`/admin/audit-log/export?${params.toString()}`, { responseType: "blob" });
                  const url = window.URL.createObjectURL(new Blob([res.data]));
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                } catch { /* ignore */ }
              }}
              className="gap-2 shadow-sm w-full sm:w-auto"
            >
              <FileDown className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Audit Log Entries</h3>
            <p className="text-xs text-text-secondary">Track all admin actions and configuration changes</p>
          </div>
          {totalCount > 0 && (
            <span className="text-xs text-text-tertiary bg-surface-muted px-2.5 py-1 rounded-lg border border-border/40">
              {totalCount.toLocaleString()} total
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={entries}
            loading={isLoading}
            error={isError ? "Failed to load audit log" : null}
            emptyMessage="No audit entries found matching your filters"
            onRetry={() => refetch()}
            onRowClick={(row) => setExpandedId(expandedId === row.id ? null : row.id)}
            pagination={{ page, totalPages, totalCount, onPageChange: (p) => setPage(p) }}
            keyExtractor={(r) => r.id}
            expandedRow={expandedId}
            renderExpanded={(entry) => (
              <div className="px-6 py-5 bg-gradient-to-b from-surface-muted/80 to-transparent">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-semibold text-text-primary">Details</span>
                  <Badge variant="outline" className="text-[9px] font-mono">{entry.action}</Badge>
                </div>
                {entry.oldValues || entry.newValues ? (
                  <DiffBlock oldV={entry.oldValues} newV={entry.newValues} />
                ) : (
                  <p className="text-xs text-text-secondary py-4 text-center bg-white rounded-lg border border-border/40">
                    No additional details recorded for this entry.
                  </p>
                )}
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
}

