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
  Building,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  BarChart3,
  LineChart,
  Activity,
  UserCog,
  Target,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fadeInLeft, listItem } from "@/lib/animations";

interface ChildItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavItem {
  label: string;
  path?: string;
  icon: React.ReactNode;
  children?: ChildItem[];
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
          { label: "Revenue Trend", path: "/admin/revenue-trend", icon: <BarChart3 className="h-4 w-4" /> },
          { label: "Search Analytics", path: "/admin/search-analytics", icon: <Search className="h-4 w-4" /> },
          { label: "Cart Abandonment", path: "/admin/cart-abandonment", icon: <ShoppingCart className="h-4 w-4" /> },
        ],
      },
      {
        label: "Users",
        icon: <Users className="h-4 w-4" />,
        children: [
          { label: "Customer Support", path: "/admin/chat/customers", icon: <MessageSquare className="h-4 w-4" /> },
          { label: "User Growth", path: "/admin/user-growth", icon: <UserCog className="h-4 w-4" /> },
          { label: "CLV", path: "/admin/clv", icon: <DollarSign className="h-4 w-4" /> },
          { label: "Conversion Funnel", path: "/admin/funnel", icon: <Target className="h-4 w-4" /> },
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
      { label: "Supplier Messages", path: "/admin/chat/suppliers", icon: <Building className="h-4 w-4" /> },
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
        "flex h-screen flex-col bg-gradient-to-b from-green-700 to-green-800 transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
      aria-label="Sidebar navigation"
    >
      <div className="flex h-[72px] items-center justify-between border-b border-white/10 px-4">
        {!collapsed && (
          <div className="flex items-center gap-2 truncate">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 text-sm font-semibold text-white">
              <span>{user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "A"}</span>
              {user?.photoURL && (
                <img
                  src={user.photoURL}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
            </div>
            <span className="truncate text-sm font-semibold text-white">
              {user?.displayName || user?.email?.split("@")[0] || "Admin"}
            </span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="rounded-sm p-1.5 text-green-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-none p-2" role="navigation">
        {navGroups.map((group) => (
          <motion.div
            key={group.group}
            className="mb-4"
            variants={fadeInLeft}
            initial="hidden"
            animate="visible"
          >
            {!collapsed && (
              <p className="border-b border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-green-200">
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
                        "flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm text-green-100 border-b border-white/5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40",
                        isChildActive(item.children) && "bg-white/15 font-semibold text-white",
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
                      <div className="ml-3 border-l border-white/10 pl-2 mt-1 space-y-0.5 overflow-hidden">
                        {item.children.map((child) => (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={cn(
                              "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-green-200 hover:bg-white/10 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40",
                              location.pathname === child.path && "bg-white/15 text-white font-semibold",
                            )}
                          >
                            <span className="text-green-300">{child.icon}</span>
                            <span>{child.label}</span>
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
                      "flex items-center gap-3 rounded-sm px-3 py-2 text-sm text-green-100 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40",
                      isActive(item.path) && "bg-white/15 text-white font-semibold",
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
