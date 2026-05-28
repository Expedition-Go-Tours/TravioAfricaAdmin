import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import type { Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import api from "@/lib/axios";
import { formatDate } from "@/lib/utils";

interface Application {
  id: string;
  user?: { name?: string; email?: string };
  businessInfo?: { legalBusinessName?: string; businessName?: string; displayName?: string };
  status?: string;
  createdAt?: string;
}

const tabs = ["All", "Pending", "Under Review", "Approved", "Rejected", "Active", "Suspended"];

export default function SupplierApplicationsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("All");
  const limit = 20;

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
    { key: "name", header: "Name", render: (r) => r.user?.name || "—" },
    { key: "email", header: "Email", render: (r) => r.user?.email || "—" },
    { key: "businessName", header: "Business Name", render: (r) => r.businessInfo?.legalBusinessName || r.businessInfo?.businessName || r.businessInfo?.displayName || r.user?.name || "—" },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status || "UNKNOWN"} /> },
    { key: "createdAt", header: "Submitted", render: (r) => formatDate(r.createdAt) },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/admin/suppliers/${r.id}`); }}>
          Review
        </Button>
      ),
    },
  ];

  const applications = data?.applications || data?.data?.applications || [];
  const pagination = data?.pagination || data?.data?.pagination;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-text-primary">Supplier Applications</h1>

      <Card>
        <CardHeader>
          <div className="flex gap-2 border-b border-border-muted">
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
        <CardContent>
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
