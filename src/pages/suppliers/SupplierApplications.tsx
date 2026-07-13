import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, X, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/DataTable";
import type { Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { usePermission } from "@/hooks/usePermission";
import { useSocketInvalidate } from "@/hooks/useSocketEvent";
import api from "@/lib/axios";
import { formatDate } from "@/lib/utils";

interface Application {
  id: string;
  user?: { name?: string; email?: string; photoURL?: string };
  businessInfo?: { legalBusinessName?: string; businessName?: string; displayName?: string };
  status?: string;
  createdAt?: string;
}

const tabs = ["All", "Pending", "Under Review", "Approved", "Rejected", "Active", "Suspended"];

export default function SupplierApplicationsPage() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const limit = 20;

  useSocketInvalidate("admin:supplier-application", ["admin", "suppliers"]);
  useSocketInvalidate("admin:supplier-status-change", ["admin", "suppliers"]);

  const statusParam = activeTab === "All" ? "" : activeTab.toUpperCase().replace(/\s+/g, "_");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "suppliers", { page, limit, status: statusParam }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusParam) params.set("status", statusParam);
      return api.get(`/suppliers/admin/applications?${params.toString()}`).then((r) => r.data);
    },
  });

  const columns: Column<Application>[] = [
    { key: "name", header: "Name", render: (r) => (
      <div className="flex items-center gap-3">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-green-400 to-green-600 text-xs font-bold text-white">
          <span>{(r.user?.name || r.user?.email || "?").charAt(0).toUpperCase()}</span>
          {r.user?.photoURL && (
            <img
              src={r.user.photoURL}
              alt=""
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
        </div>
        <span className="text-sm font-medium text-text-primary truncate">{r.user?.name || "—"}</span>
      </div>
    )},
    { key: "email", header: "Email", render: (r) => r.user?.email || "—" },
    { key: "businessName", header: "Business Name", render: (r) => r.businessInfo?.legalBusinessName || r.businessInfo?.businessName || r.businessInfo?.displayName || r.user?.name || "—" },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status || "UNKNOWN"} /> },
    { key: "createdAt", header: "Submitted", render: (r) => formatDate(r.createdAt) },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        can('suppliers.view') ? (
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/admin/suppliers/${r.id}`); }}>
            Review
          </Button>
        ) : null
      ),
    },
  ];

  const rawApplications = data?.applications || data?.data?.applications || [];
  const pagination = data?.pagination || data?.data?.pagination;

  const query = searchQuery.toLowerCase().trim();
  const applications: Application[] = query
    ? rawApplications
        .filter((app: Application) =>
          [app.user?.name, app.user?.email, app.businessInfo?.legalBusinessName, app.businessInfo?.businessName, app.businessInfo?.displayName]
            .some((f) => f?.toLowerCase().includes(query))
        )
        .sort((a: Application, b: Application) => {
          const aName = (a.user?.name || a.businessInfo?.legalBusinessName || "").toLowerCase();
          const bName = (b.user?.name || b.businessInfo?.legalBusinessName || "").toLowerCase();
          const aStarts = aName.startsWith(query) ? 0 : 1;
          const bStarts = bName.startsWith(query) ? 0 : 1;
          return aStarts - bStarts;
        })
    : rawApplications;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="rounded-sm bg-white p-1.5 shadow-sm hover:ring-2 hover:ring-green-300 transition-all">
          <ArrowLeft className="h-4 w-4 text-text-primary" />
        </button>
        <h1 className="text-lg font-semibold text-text-primary">Supplier Applications</h1>
      </div>

      <Card className="border-l-2 border-l-green-500/60">
        <CardHeader className="border-b border-border pb-3">
          <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-border-muted">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <Input
                placeholder="Search suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                  activeTab === tab
                    ? "border-b-2 border-green-600 text-green-700"
                    : "text-text-secondary hover:text-green-600"
                }`}
                onClick={() => { setActiveTab(tab); setPage(1); }}
              >
                {tab}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <DataTable
            columns={columns}
            data={applications}
            loading={isLoading}
            error={isError ? "Failed to load applications" : null}
            emptyMessage="No applications found"
            onRowClick={(row) => navigate(`/admin/suppliers/${row.id}`)}
            pagination={pagination ? { page: pagination.page || page, totalPages: pagination.totalPages || 1, totalCount: pagination.totalCount || 0, onPageChange: setPage } : undefined}
            onRetry={() => refetch()}
            keyExtractor={(r) => r.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
