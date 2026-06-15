import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "@/lib/query-client";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { hasPermission } from "@/hooks/usePermission";
import { getDefaultRoute } from "@/lib/permissions";
import { useDataSocket } from "@/hooks/useDataSocket";

import LoginPage from "@/pages/Login";
import OverviewPage from "@/pages/Overview";
import RevenueTrendPage from "@/pages/revenue/RevenueTrend";
import SearchAnalyticsPage from "@/pages/revenue/SearchAnalytics";
import CartAbandonmentPage from "@/pages/revenue/CartAbandonment";
import UserGrowthPage from "@/pages/users/UserGrowth";
import CustomerLifetimeValuePage from "@/pages/users/CustomerLifetimeValue";
import ConversionFunnelPage from "@/pages/users/ConversionFunnel";
import TourPerformancePage from "@/pages/tours/TourPerformance";
import TourDetailPage from "@/pages/tours/TourDetail";
import SupplierApplicationsPage from "@/pages/suppliers/SupplierApplications";
import SupplierDetailPage from "@/pages/suppliers/SupplierDetail";
import ActiveSuppliersPage from "@/pages/suppliers/ActiveSuppliers";
import { ArrowLeft } from "lucide-react";
import PayoutsOverview from "@/pages/finance/PayoutsOverview";
import PayoutsList from "@/pages/finance/PayoutsList";
import PayoutMethodsPage from "@/pages/finance/PayoutMethods";
import ReviewModerationPage from "@/pages/reviews/ReviewModeration";
import ChatPage from "@/pages/chat/ChatPage";
import SettingsPage from "@/pages/settings/SettingsPage";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DataSocketInit />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/admin/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomeRedirect />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="revenue-trend" element={<PermissionRoute permission="analytics.view"><RevenueTrendPage /></PermissionRoute>} />
            <Route path="search-analytics" element={<PermissionRoute permission="analytics.view"><SearchAnalyticsPage /></PermissionRoute>} />
            <Route path="cart-abandonment" element={<PermissionRoute permission="analytics.view"><CartAbandonmentPage /></PermissionRoute>} />
            <Route path="user-growth" element={<PermissionRoute permission="users.view"><UserGrowthPage /></PermissionRoute>} />
            <Route path="clv" element={<PermissionRoute permission="users.view"><CustomerLifetimeValuePage /></PermissionRoute>} />
            <Route path="funnel" element={<PermissionRoute permission="users.view"><ConversionFunnelPage /></PermissionRoute>} />
            <Route path="tours" element={<PermissionRoute permission="tours.view"><TourPerformancePage /></PermissionRoute>} />
            <Route path="tours/:id" element={<PermissionRoute permission="tours.view"><TourDetailPage /></PermissionRoute>} />
            <Route path="suppliers" element={<PermissionRoute permission="suppliers.view"><SupplierApplicationsPage /></PermissionRoute>} />
            <Route path="suppliers/:id" element={<PermissionRoute permission="suppliers.view"><SupplierDetailPage /></PermissionRoute>} />
            <Route path="suppliers/active" element={<PermissionRoute permission="suppliers.view"><ActiveSuppliersPage /></PermissionRoute>} />
            <Route path="payouts" element={<PermissionRoute permission="payouts.view"><PayoutsTabPage /></PermissionRoute>} />
            <Route path="payout-methods" element={<PermissionRoute permission="payout-methods.view"><PayoutMethodsPage /></PermissionRoute>} />
            <Route path="reviews" element={<PermissionRoute permission="reviews.view"><ReviewModerationPage /></PermissionRoute>} />
            <Route path="chat/suppliers" element={<PermissionRoute permission="chat.suppliers"><ChatPage /></PermissionRoute>} />
            <Route path="chat/customers" element={<PermissionRoute permission="chat.customers"><ChatPage /></PermissionRoute>} />
            <Route path="settings" element={<PermissionRoute permission="settings.access"><SettingsPage /></PermissionRoute>} />
          </Route>
          <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
            borderRadius: "8px",
          },
        }}
      />
    </QueryClientProvider>
  );
}

function DataSocketInit() {
  useDataSocket();
  return null;
}

function HomeRedirect() {
  return <Navigate to={getDefaultRoute()} replace />;
}

function PermissionRoute({ permission, children }: { permission: string; children: React.ReactNode }) {
  return hasPermission(permission) ? <>{children}</> : <Navigate to="/admin" replace />;
}

function PayoutsTabPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"overview" | "list">("overview");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="rounded-sm bg-white p-1.5 shadow-sm hover:ring-2 hover:ring-green-300 transition-all">
          <ArrowLeft className="h-4 w-4 text-text-primary" />
        </button>
        <h1 className="text-lg font-semibold text-text-primary">Payouts</h1>
      </div>
      <div className="flex gap-2 border-b border-border-muted">
        {(["overview", "list"] as const).map((t) => (
          <button
            key={t}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors focus:outline-none ${
              tab === t
                ? "border-b-2 border-green-600 text-green-700"
                : "text-text-secondary hover:text-green-600"
            }`}
            onClick={() => setTab(t)}
          >
            {t === "overview" ? "Overview" : "All Payouts"}
          </button>
        ))}
      </div>
      {tab === "overview" ? <PayoutsOverview /> : <PayoutsList />}
    </div>
  );
}
