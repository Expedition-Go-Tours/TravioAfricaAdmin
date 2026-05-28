import { useState, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { useAuth } from "@/auth/useAuth";

const breadcrumbMap: Record<string, string> = {
  overview: "Overview",
  "revenue-trend": "Revenue Trend",
  "search-analytics": "Search Analytics",
  "cart-abandonment": "Cart Abandonment",
  "user-growth": "User Growth",
  clv: "Customer Lifetime Value",
  funnel: "Conversion Funnel",
  tours: "Tour Performance",
  suppliers: "Supplier Applications",
  active: "Active Suppliers",
  payouts: "Payouts",
  "payout-methods": "Payout Methods",
  reviews: "Review Moderation",
};

export function Header() {
  const location = useLocation();
  const { logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const segments = location.pathname.split("/").filter(Boolean);

  const handleSignOut = useCallback(() => {
    setSigningOut(true);
    setTimeout(() => {
      logout();
    }, 2000);
  }, [logout]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex h-[72px] items-center justify-between border-b border-green-100 bg-white px-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-text-secondary">
        <Link to="/admin/overview" className="hover:text-text-primary">
          Home
        </Link>
        {segments.slice(1).map((seg, idx) => {
          const label = breadcrumbMap[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);
          return (
            <span key={seg} className="flex items-center gap-2">
              <span className="text-text-tertiary">/</span>
              <span className={idx === segments.slice(1).length - 1 ? "text-text-primary font-medium" : ""}>
                {label}
              </span>
            </span>
          );
        })}
      </nav>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <Button variant="ghost" size="sm" onClick={handleSignOut} disabled={signingOut} aria-label="Sign out">
          {signingOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          {signingOut ? "Please wait..." : "Sign Out"}
        </Button>
      </div>
    </motion.header>
  );
}
