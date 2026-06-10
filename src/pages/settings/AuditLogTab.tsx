import { useState, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Download, Clock, ChevronRight } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import type { Column } from "@/components/shared/DataTable";
import api from "@/lib/axios";
import { formatDateTime, truncateId } from "@/lib/utils";

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
    debounceRef.current = setTimeout(() => {
      setDebouncedAction(val);
      setPage(1);
    }, 300);
  };

  const handleResourceChange = (val: string) => {
    setResourceFilter(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedResource(val);
      setPage(1);
    }, 300);
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
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 text-[10px] font-bold text-white shrink-0">
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
            <Badge
              variant={r.oldValues && r.newValues ? "warning" : r.newValues ? "success" : "error"}
              className="text-[9px]"
            >
              {r.oldValues && r.newValues ? "Modified" : r.newValues ? "Created" : "Removed"}
            </Badge>
          )}
          <ChevronRight
            className={`h-4 w-4 text-text-tertiary transition-transform duration-200 ${
              expandedId === r.id ? "rotate-90" : ""
            }`}
          />
        </div>
      ),
      className: "w-[140px]",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
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
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-text-tertiary" />
                {DATE_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => { setDatePreset(p.value); setPage(1); }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${
                      datePreset === p.value
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : "bg-gray-50 text-text-secondary border border-border-muted hover:bg-gray-100"
                    }`}
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
                  } catch {
                    /* ignore */
                  }
                }}
                className="gap-2"
              >
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Audit Log Entries</h3>
              <p className="text-xs text-text-secondary">Track all admin actions and configuration changes</p>
            </div>
            {totalCount > 0 && (
              <span className="text-xs text-text-tertiary">{totalCount.toLocaleString()} total entries</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
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
              <div className="px-5 py-4 bg-gray-50/50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-text-primary">Entry Details</span>
                  <span className="font-mono text-[10px] text-text-secondary">{entry.action}</span>
                </div>
                {entry.oldValues || entry.newValues ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {entry.oldValues && (
                      <div>
                        <p className="text-[10px] font-medium text-red-500 mb-1.5 uppercase tracking-wider">
                          Previous Values
                        </p>
                        <pre className="bg-white border border-border-muted rounded-sm p-3 text-[11px] font-mono text-text-secondary overflow-x-auto max-h-[240px] whitespace-pre-wrap">
                          {JSON.stringify(entry.oldValues, null, 2)}
                        </pre>
                      </div>
                    )}
                    {entry.newValues && (
                      <div>
                        <p className="text-[10px] font-medium text-green-600 mb-1.5 uppercase tracking-wider">
                          New Values
                        </p>
                        <pre className="bg-white border border-border-muted rounded-sm p-3 text-[11px] font-mono text-text-secondary overflow-x-auto max-h-[240px] whitespace-pre-wrap">
                          {JSON.stringify(entry.newValues, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary">No additional details recorded for this entry.</p>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
