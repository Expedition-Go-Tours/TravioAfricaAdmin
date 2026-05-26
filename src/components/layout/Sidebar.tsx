import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { auth } from "@/lib/firebase";
import type { User as FirebaseUser } from "firebase/auth";
import {
  LayoutDashboard,
  TrendingUp,
  Search,
  ShoppingCart,
  Users,
  DollarSign,
  GitFork,
  Map,
  UserCheck,
  UserPlus,
  CreditCard,
  Banknote,
  Wallet,
  Star,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeInLeft, listItem } from "@/lib/animations";

interface NavItem {
  label: string;
  path?: string;
  icon: React.ReactNode;
  children?: { label: string; path: string }[];
}

const navGroups: { group: string; items: NavItem[] }[] = [
  {
    group: "Analytics",
    items: [
      { label: "Overview", path: "/admin/overview", icon: <LayoutDashboard className="h-4 w-4" /> },
      {
        label: "Revenue",
        icon: <TrendingUp className="h-4 w-4" />,
        children: [
          { label: "Revenue Trend", path: "/admin/revenue-trend" },
          { label: "Search Analytics", path: "/admin/search-analytics" },
          { label: "Cart Abandonment", path: "/admin/cart-abandonment" },
        ],
      },
      {
        label: "Users",
        icon: <Users className="h-4 w-4" />,
        children: [
          { label: "User Growth", path: "/admin/user-growth" },
          { label: "CLV", path: "/admin/clv" },
          { label: "Conversion Funnel", path: "/admin/funnel" },
        ],
      },
      { label: "Tours", path: "/admin/tours", icon: <Map className="h-4 w-4" /> },
    ],
  },
  {
    group: "Management",
    items: [
      { label: "Suppliers", path: "/admin/suppliers", icon: <UserPlus className="h-4 w-4" /> },
      { label: "Active Suppliers", path: "/admin/suppliers/active", icon: <UserCheck className="h-4 w-4" /> },
      { label: "Reviews", path: "/admin/reviews", icon: <Star className="h-4 w-4" /> },
    ],
  },
  {
    group: "Finance",
    items: [
      { label: "Payouts", path: "/admin/payouts", icon: <Banknote className="h-4 w-4" /> },
      { label: "Payout Methods", path: "/admin/payout-methods", icon: <Wallet className="h-4 w-4" /> },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["Revenue", "Users"]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return unsub;
  }, []);

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label],
    );
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path;
  };

  const isChildActive = (children?: { path: string }[]) => {
    return children?.some((c) => location.pathname === c.path) ?? false;
  };

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border-muted bg-surface-base transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
      aria-label="Sidebar navigation"
    >
      <div className="flex h-14 items-center justify-between border-b border-border-muted px-4">
        {!collapsed && (
          <div className="flex items-center gap-2 truncate">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-text-secondary">
              {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <span className="truncate text-sm font-semibold text-text-primary">
              {user?.displayName || user?.email?.split("@")[0] || "Admin"}
            </span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="rounded-sm p-1.5 text-text-secondary hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2" role="navigation">
        {navGroups.map((group) => (
          <motion.div
            key={group.group}
            className="mb-4"
            variants={fadeInLeft}
            initial="hidden"
            animate="visible"
          >
            {!collapsed && (
              <p className="border-b border-border-muted px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-primary">
                {group.group}
              </p>
            )}
            {group.items.map((item) => {
              if (item.children) {
                const isOpen = expandedMenus.includes(item.label) || isChildActive(item.children);
                return (
                  <div key={item.label}>
                    <motion.button
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleMenu(item.label)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm text-text-primary border-b border-border-muted hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                        isChildActive(item.children) && "bg-text-primary/[0.06] font-semibold",
                      )}
                      aria-label={item.label}
                      aria-expanded={isOpen}
                    >
                      {item.icon}
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          <motion.span
                            animate={{ rotate: isOpen ? 0 : -90 }}
                            transition={{ duration: 0.2 }}
                          >
                            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </motion.span>
                        </>
                      )}
                    </motion.button>
                    {isOpen && !collapsed && (
                      <div className="ml-6 mt-1 space-y-1 overflow-hidden">
                        {item.children.map((child) => (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={cn(
                              "block rounded-sm px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                              location.pathname === child.path && "bg-text-primary/[0.06] text-text-primary font-semibold",
                            )}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <motion.div key={item.path} variants={listItem}>
                  <Link
                    to={item.path!}
                    className={cn(
                      "flex items-center gap-3 rounded-sm px-3 py-2 text-sm text-text-secondary hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      isActive(item.path) && "bg-text-primary/[0.06] text-text-primary font-semibold",
                    )}
                    aria-label={item.label}
                  >
                    {item.icon}
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        ))}
      </nav>
    </aside>
  );
}
