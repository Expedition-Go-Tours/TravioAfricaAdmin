import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, AlertTriangle, RefreshCw, RotateCw } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/axios";
import { formatDateTime } from "@/lib/utils";

interface AuditEntry {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  oldValues: unknown;
  newValues: unknown;
  createdAt: string;
}

function AuditSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-44" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-28" />
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-muted">
                {["Date/Time", "Admin", "Action", "Resource", "Details"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left">
                    <Skeleton className="h-3 w-14" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border-muted">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-3 py-2">
                      <Skeleton className={`h-3.5 ${j === 0 ? "w-24" : j === 2 ? "w-20" : j === 1 ? "w-28" : "w-12"}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function MaintSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-52" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-3 w-28" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SystemTab() {
  const queryClient = useQueryClient();
  const [auditPage, setAuditPage] = useState(1);
  const [auditAction, setAuditAction] = useState("");

  const { data: maintMode, isLoading: maintLoading } = useQuery({
    queryKey: ["admin", "settings", "system.maintenance_mode"],
    queryFn: () =>
      api.get("/admin/settings/system.maintenance_mode").then((r) => r.data?.data?.["system.maintenance_mode"] === true || r.data?.data?.["system.maintenance_mode"] === "true"),
  });

  const toggleMaint = useMutation({
    mutationFn: (enabled: boolean) =>
      api.put("/admin/settings", { settings: { "system.maintenance_mode": enabled } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings", "system.maintenance_mode"] });
    },
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ["admin", "audit-log", { page: auditPage, action: auditAction }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(auditPage), limit: "20" });
      if (auditAction) params.set("action", auditAction);
      return api.get(`/admin/audit-log?${params.toString()}`).then((r) => r.data?.data || { entries: [], total: 0, pages: 1 });
    },
  });

  const auditEntries: AuditEntry[] = auditData?.entries || [];
  const totalPages = auditData?.pages || 1;

  return (
    <div className="space-y-6 max-w-4xl">
      {maintLoading ? (
        <MaintSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${maintMode ? "text-red-500" : "text-amber-500"}`} />
              <h3 className="text-sm font-semibold text-text-primary">Maintenance Mode</h3>
            </div>
            <p className="text-xs text-text-secondary">Put the platform in maintenance mode</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                disabled={toggleMaint.isPending}
                onClick={() => toggleMaint.mutate(!maintMode)}
                className={maintMode
                  ? "text-green-600 border-green-200 hover:bg-green-50"
                  : "text-amber-600 border-amber-200 hover:bg-amber-50"
                }
              >
                {toggleMaint.isPending ? (
                  <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="mr-2 h-4 w-4" />
                )}
                {maintMode ? "Disable Maintenance Mode" : "Enable Maintenance Mode"}
              </Button>
              <span className="text-xs text-text-secondary">
                Currently:{" "}
                <strong className={maintMode ? "text-red-600" : "text-green-600"}>
                  {maintMode ? "Under Maintenance" : "Live"}
                </strong>
              </span>
            </div>
            {toggleMaint.isError && (
              <p className="mt-2 text-xs text-red-500">Failed to toggle maintenance mode</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-text-primary">Audit Log</h3>
          </div>
          <p className="text-xs text-text-secondary">Track all admin actions and configuration changes</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="space-y-1.5 flex-1 max-w-xs">
              <Label htmlFor="audit-filter">Filter by Action</Label>
              <Input
                id="audit-filter"
                placeholder="e.g. admin.role_changed, settings.updated"
                value={auditAction}
                onChange={(e) => setAuditAction(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await api.get('/admin/audit-log/export', { responseType: 'blob' });
                  const url = window.URL.createObjectURL(new Blob([res.data]));
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                } catch {
                  // silently fail
                }
              }}
              className="inline-flex items-center gap-2 rounded-sm border border-border-muted px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-gray-50 mt-5"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>

          {auditLoading ? (
            <AuditSkeleton />
          ) : auditEntries.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-secondary">No audit entries found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-muted">
                    <th className="px-3 py-2 text-left font-medium text-text-secondary">Date/Time</th>
                    <th className="px-3 py-2 text-left font-medium text-text-secondary">Admin</th>
                    <th className="px-3 py-2 text-left font-medium text-text-secondary">Action</th>
                    <th className="px-3 py-2 text-left font-medium text-text-secondary">Resource</th>
                    <th className="px-3 py-2 text-left font-medium text-text-secondary">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-border-muted last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-text-secondary whitespace-nowrap">
                        {formatDateTime(entry.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-text-primary">{entry.userName || entry.userEmail || entry.userId}</td>
                      <td className="px-3 py-2">
                        <span className="inline-block rounded bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-text-secondary text-xs">{entry.resource}</td>
                      <td className="px-3 py-2 text-xs text-text-secondary max-w-[200px] truncate">
                        {entry.action.includes("role_changed") && `Role changed`}
                        {entry.action.includes("settings.updated") && `Settings updated`}
                        {entry.action.includes("admin.granted") && `Admin access granted`}
                        {entry.action.includes("admin.revoked") && `Admin access revoked`}
                        {entry.action.includes("created") && `Created`}
                        {entry.action.includes("deleted") && `Deleted`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-text-secondary">
                Page {auditPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={auditPage <= 1} onClick={() => setAuditPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={auditPage >= totalPages} onClick={() => setAuditPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
