import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Loader2, Settings, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { useAuth } from "@/auth/useAuth";
import { isSuperAdmin } from "@/hooks/usePermission";

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
  chat: "Messages",
  settings: "Settings",
};

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const segments = location.pathname.split("/").filter(Boolean);
  const superAdmin = isSuperAdmin();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-text-secondary hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <UserCircle className="h-5 w-5" />
            <span className="hidden sm:inline">Admin</span>
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-1 w-48 rounded-md border border-border-muted bg-white py-1 shadow-lg z-50"
              >
                {superAdmin && (
                  <button
                    onClick={() => { navigate("/admin/settings"); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-green-50"
                  >
                    <Settings className="h-4 w-4" /> Settings
                  </button>
                )}
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  {signingOut ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  {signingOut ? "Signing out..." : "Sign Out"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}
