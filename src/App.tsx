import { createBrowserRouter, RouterProvider, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "@/lib/query-client";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { useAdminRole } from "@/auth/useAdminRole";
import { getDefaultRoute } from "@/lib/permissions";
import { useDataSocket } from "@/hooks/useDataSocket";

import LoginPage from "@/pages/Login";
import AuthCallback from "@/pages/auth/AuthCallback";
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
import BookingsPage from "@/pages/bookings/BookingsPage";
import ChatPage from "@/pages/chat/ChatPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import ActivityLogPage from "@/pages/activity/ActivityLogPage";
import BlogListPage from "@/pages/blog/BlogListPage";
import BlogPreviewPage from "@/pages/blog/BlogPreviewPage";
import BlogEditorPage from "@/pages/blog/BlogEditorPage";
import CategoryManagerPage from "@/pages/blog/CategoryManagerPage";
import TagManagerPage from "@/pages/blog/TagManagerPage";
import BlogAnalytics from "@/pages/blog/BlogAnalytics";
import ExpeditionListingsPage from "@/pages/expedition/ExpeditionListingsPage";

function DataSocketInit() {
  useDataSocket();
  return null;
}

function HomeRedirect() {
  return <Navigate to={getDefaultRoute()} replace />;
}

function PermissionRoute({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { data: role, isLoading } = useAdminRole();

  if (isLoading) return null;
  if (!role) return <Navigate to="/admin" replace />;
  if (role.name === "super_admin") return <>{children}</>;
  if (!role.permissions?.includes(permission)) return <Navigate to="/admin" replace />;

  return <>{children}</>;
}

function PayoutsTabPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "list" ? "list" : "overview";

  const switchTab = (t: "overview" | "list") => {
    const next = new URLSearchParams(searchParams);
    if (t === "list") next.set("tab", "list");
    else next.delete("tab");
    setSearchParams(next, { replace: true });
  };

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
            onClick={() => switchTab(t)}
          >
            {t === "overview" ? "Overview" : "All Payouts"}
          </button>
        ))}
      </div>
      {tab === "overview" ? <PayoutsOverview /> : <PayoutsList />}
    </div>
  );
}

function AdminLayout() {
  return (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  );
}

const router = createBrowserRouter([
  { path: "/admin/login", element: <LoginPage /> },
  { path: "/auth/callback", element: <AuthCallback /> },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: "overview", element: <OverviewPage /> },
      { path: "revenue-trend", element: <PermissionRoute permission="analytics.view"><RevenueTrendPage /></PermissionRoute> },
      { path: "search-analytics", element: <PermissionRoute permission="analytics.view"><SearchAnalyticsPage /></PermissionRoute> },
      { path: "cart-abandonment", element: <PermissionRoute permission="analytics.view"><CartAbandonmentPage /></PermissionRoute> },
      { path: "user-growth", element: <PermissionRoute permission="users.view"><UserGrowthPage /></PermissionRoute> },
      { path: "clv", element: <PermissionRoute permission="users.view"><CustomerLifetimeValuePage /></PermissionRoute> },
      { path: "funnel", element: <PermissionRoute permission="users.view"><ConversionFunnelPage /></PermissionRoute> },
      { path: "tours", element: <PermissionRoute permission="tours.view"><TourPerformancePage /></PermissionRoute> },
      { path: "tours/:id", element: <PermissionRoute permission="tours.view"><TourDetailPage /></PermissionRoute> },
      { path: "suppliers", element: <PermissionRoute permission="suppliers.view"><SupplierApplicationsPage /></PermissionRoute> },
      { path: "suppliers/:id", element: <PermissionRoute permission="suppliers.view"><SupplierDetailPage /></PermissionRoute> },
      { path: "suppliers/active", element: <PermissionRoute permission="suppliers.view"><ActiveSuppliersPage /></PermissionRoute> },
      { path: "payouts", element: <PermissionRoute permission="payouts.view"><PayoutsTabPage /></PermissionRoute> },
      { path: "payout-methods", element: <PermissionRoute permission="payout-methods.view"><PayoutMethodsPage /></PermissionRoute> },
      { path: "bookings", element: <PermissionRoute permission="bookings.view"><BookingsPage /></PermissionRoute> },
      { path: "reviews", element: <PermissionRoute permission="reviews.view"><ReviewModerationPage /></PermissionRoute> },
      { path: "chat/suppliers", element: <PermissionRoute permission="chat.suppliers"><ChatPage /></PermissionRoute> },
      { path: "chat/customers", element: <PermissionRoute permission="chat.customers"><ChatPage /></PermissionRoute> },
      { path: "settings", element: <PermissionRoute permission="settings.access"><SettingsPage /></PermissionRoute> },
      { path: "activity-log", element: <PermissionRoute permission="settings.access"><ActivityLogPage /></PermissionRoute> },
      { path: "blog", element: <PermissionRoute permission="blog.manage"><BlogListPage /></PermissionRoute> },
      { path: "blog/preview/:id", element: <PermissionRoute permission="blog.manage"><BlogPreviewPage /></PermissionRoute> },
      { path: "blog/new", element: <PermissionRoute permission="blog.manage"><BlogEditorPage /></PermissionRoute> },
      { path: "blog/:id", element: <PermissionRoute permission="blog.manage"><BlogEditorPage /></PermissionRoute> },
      { path: "blog/categories", element: <PermissionRoute permission="blog.manage"><CategoryManagerPage /></PermissionRoute> },
      { path: "blog/tags", element: <PermissionRoute permission="blog.manage"><TagManagerPage /></PermissionRoute> },
      { path: "blog/analytics", element: <PermissionRoute permission="blog.manage"><BlogAnalytics /></PermissionRoute> },
      { path: "expedition", element: <PermissionRoute permission="tours.view"><ExpeditionListingsPage /></PermissionRoute> },
    ],
  },
  { path: "*", element: <Navigate to={getDefaultRoute()} replace /> },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DataSocketInit />
      <RouterProvider router={router} />
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
