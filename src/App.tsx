import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "@/lib/query-client";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/auth/ProtectedRoute";

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
import PayoutsOverview from "@/pages/finance/PayoutsOverview";
import PayoutsList from "@/pages/finance/PayoutsList";
import PayoutMethodsPage from "@/pages/finance/PayoutMethods";
import ReviewModerationPage from "@/pages/reviews/ReviewModeration";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
            <Route index element={<Navigate to="/admin/overview" replace />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="revenue-trend" element={<RevenueTrendPage />} />
            <Route path="search-analytics" element={<SearchAnalyticsPage />} />
            <Route path="cart-abandonment" element={<CartAbandonmentPage />} />
            <Route path="user-growth" element={<UserGrowthPage />} />
            <Route path="clv" element={<CustomerLifetimeValuePage />} />
            <Route path="funnel" element={<ConversionFunnelPage />} />
            <Route path="tours" element={<TourPerformancePage />} />
            <Route path="tours/:id" element={<TourDetailPage />} />
            <Route path="suppliers" element={<SupplierApplicationsPage />} />
            <Route path="suppliers/:id" element={<SupplierDetailPage />} />
            <Route path="suppliers/active" element={<ActiveSuppliersPage />} />
            <Route path="payouts" element={<PayoutsTabPage />} />
            <Route path="payout-methods" element={<PayoutMethodsPage />} />
            <Route path="reviews" element={<ReviewModerationPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/admin/overview" replace />} />
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

function PayoutsTabPage() {
  const [tab, setTab] = useState<"overview" | "list">("overview");

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-text-primary">Payouts</h1>
      <div className="flex gap-2 border-b border-border-muted">
        {(["overview", "list"] as const).map((t) => (
          <button
            key={t}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring ${
              tab === t
                ? "border-b-2 border-text-primary text-text-primary"
                : "text-text-secondary hover:text-text-primary"
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
