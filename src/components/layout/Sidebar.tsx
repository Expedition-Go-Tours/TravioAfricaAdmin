import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/axios";
import {
  LayoutDashboard,
  TrendingUp,
  Search,
  ShoppingCart,
  Users,
  DollarSign,
  Map,
  UserCheck,
  UserPlus,
  Banknote,
  Wallet,
  Star,
  Building,
  ChevronDown,
  BarChart3,
  UserCog,
  Target,
  MessageSquare,
  Settings,
  X,
  FileText,
  FolderTree,
  Tags,
  Globe,
  History,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermission } from "@/hooks/usePermission";
import OptimizedImage from "@/components/shared/OptimizedImage";

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

function getNavGroups(can: (key: string) => boolean): { group: string; items: NavItem[] }[] {
  const groups: { group: string; items: NavItem[] }[] = [
    {
      group: "Analytics",
      items: [
        ...(can('dashboard.*') || can('analytics.view') ? [{ label: "Overview", path: "/admin/overview", icon: <LayoutDashboard className="h-4 w-4" /> }] : []),
        ...(can('analytics.view') ? [{
          label: "Revenue",
          icon: <TrendingUp className="h-4 w-4" />,
          children: [
            { label: "Revenue Trend", path: "/admin/revenue-trend", icon: <BarChart3 className="h-4 w-4" /> },
            { label: "Search Analytics", path: "/admin/search-analytics", icon: <Search className="h-4 w-4" /> },
            { label: "Cart Abandonment", path: "/admin/cart-abandonment", icon: <ShoppingCart className="h-4 w-4" /> },
          ],
        }] : []),
        ...(can('users.view') || can('chat.customers') ? [{
          label: "Users",
          icon: <Users className="h-4 w-4" />,
          children: [
            ...(can('chat.customers') ? [{ label: "Customer Support", path: "/admin/chat/customers", icon: <MessageSquare className="h-4 w-4" /> }] : []),
            ...(can('users.view') ? [{ label: "User Growth", path: "/admin/user-growth", icon: <UserCog className="h-4 w-4" /> }] : []),
            ...(can('users.view') ? [{ label: "CLV", path: "/admin/clv", icon: <DollarSign className="h-4 w-4" /> }] : []),
            ...(can('users.view') ? [{ label: "Conversion Funnel", path: "/admin/funnel", icon: <Target className="h-4 w-4" /> }] : []),
          ],
        }] : []),
        ...(can('tours.view') ? [{ label: "Tours", path: "/admin/tours", icon: <Map className="h-4 w-4" /> }] : []),
      ].filter((i) => !i.children || i.children.length > 0),
    },
    ...(can('suppliers.view') || can('reviews.view') || can('bookings.view') || can('chat.suppliers') || can('blog.manage') || can('tours.approve') ? [{
      group: "Management",
      items: [
        ...(can('bookings.view') ? [{ label: "Bookings", path: "/admin/bookings", icon: <ShoppingCart className="h-4 w-4" /> }] : []),
        ...(can('suppliers.view') ? [{ label: "Suppliers", path: "/admin/suppliers", icon: <UserPlus className="h-4 w-4" /> }] : []),
        ...(can('suppliers.view') ? [{ label: "Active Suppliers", path: "/admin/suppliers/active", icon: <UserCheck className="h-4 w-4" /> }] : []),
        ...(can('tours.view') ? [{ label: "Expedition Go", path: "/admin/expedition", icon: <Globe className="h-4 w-4" /> }] : []),
        ...(can('reviews.view') ? [{ label: "Reviews", path: "/admin/reviews", icon: <Star className="h-4 w-4" /> }] : []),
        ...(can('tours.approve') ? [{ label: "Tour Moderation", path: "/admin/tour-moderation", icon: <ClipboardCheck className="h-4 w-4" /> }] : []),
        ...(can('chat.suppliers') ? [{ label: "Supplier Messages", path: "/admin/chat/suppliers", icon: <Building className="h-4 w-4" /> }] : []),
        ...(can('blog.manage') ? [{
          label: "Blog",
          icon: <FileText className="h-4 w-4" />,
          children: [
            { label: "Articles", path: "/admin/blog", icon: <FileText className="h-4 w-4" /> },
            { label: "Categories", path: "/admin/blog/categories", icon: <FolderTree className="h-4 w-4" /> },
            { label: "Tags", path: "/admin/blog/tags", icon: <Tags className="h-4 w-4" /> },
          ],
        }] : []),
      ],
    }] : []),
    ...(can('payouts.view') || can('payout-methods.view') ? [{
      group: "Finance",
      items: [
        ...(can('payouts.view') ? [{ label: "Payouts", path: "/admin/payouts", icon: <Banknote className="h-4 w-4" /> }] : []),
        ...(can('payout-methods.view') ? [{ label: "Payout Methods", path: "/admin/payout-methods", icon: <Wallet className="h-4 w-4" /> }] : []),
      ],
    }] : []),
  ];
  return groups;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}

const springEase = [0.32, 0.72, 0, 1] as const;

export function Sidebar({ open, onClose }: SidebarProps) {
  const [user, setUser] = useState<{ name?: string; email?: string; photoURL?: string } | null>(null);
  const location = useLocation();
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const { can, isSuperAdmin } = usePermission();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["Revenue", "Users"]);
  const navGroups = getNavGroups(can);
  const adminGroups: { group: string; items: NavItem[] }[] = isSuperAdmin ? [{
    group: "Administration",
    items: [
      { label: "Activity Log", path: "/admin/activity-log", icon: <History className="h-4 w-4" /> },
      { label: "Settings", path: "/admin/settings", icon: <Settings className="h-4 w-4" /> },
    ],
  }] : [];

  useEffect(() => {
    api.get("/admin/me").then((res) => {
      const u = res.data?.data;
      if (u) setUser({ name: u.name, email: u.email, photoURL: u.photoURL });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (window.innerWidth < 1024) onCloseRef.current();
  }, [location.pathname]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open]);

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
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col",
          "bg-gradient-to-b from-green-700 to-green-800",
          "transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]",
          "lg:relative lg:translate-x-0 lg:h-full",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Sidebar navigation"
      >
        <div className="relative flex flex-col items-center justify-center border-b border-white/10 px-4 py-6">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-green-200 hover:bg-white/10 transition-colors lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="relative">
            <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white/20 ring-2 ring-white/30 text-base font-semibold text-white">
              <span>{user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "A"}</span>
              {user?.photoURL && (
                <OptimizedImage
                  src={user.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover"
                  width={56}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-green-700 bg-emerald-400" />
          </div>
          <span className="mt-3 truncate text-sm font-semibold text-white">
            {user?.name || user?.email?.split("@")[0] || "Admin"}
          </span>
          <span className="mt-0.5 truncate text-xs text-green-200/70">
            {user?.email || ""}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3" role="navigation">
          {[...navGroups, ...adminGroups].map((group) => (
            <div key={group.group} className="mb-4">
              <div className="px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-green-200/70">
                  {group.group}
                </span>
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  if (item.children) {
                    const isOpen = expandedMenus.includes(item.label) || isChildActive(item.children);
                    return (
                      <div key={item.label}>
                        <button
                          onClick={() => toggleMenu(item.label)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                            "text-green-100 hover:bg-white/10 hover:text-white",
                            isChildActive(item.children) && "bg-white/15 text-white font-medium",
                          )}
                          aria-expanded={isOpen}
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                            {item.icon}
                          </span>
                          <span className="flex-1 text-left">{item.label}</span>
                          <motion.span
                            animate={{ rotate: isOpen ? 0 : -90 }}
                            transition={{ duration: 0.2, ease: springEase }}
                            className="shrink-0"
                          >
                            <ChevronDown className="h-3 w-3 opacity-60" />
                          </motion.span>
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: springEase }}
                              className="overflow-hidden"
                            >
                              <div className="ml-3 border-l border-white/10 pl-2 mt-0.5 space-y-0.5">
                                {item.children.map((child) => (
                                  <Link
                                    key={child.path}
                                    to={child.path}
                                    className={cn(
                                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                                      "text-green-200/80 hover:bg-white/10 hover:text-white",
                                      location.pathname === child.path && "bg-white/15 text-white font-medium",
                                    )}
                                  >
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-green-300">
                                      {child.icon}
                                    </span>
                                    <span>{child.label}</span>
                                  </Link>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={item.path}
                      to={item.path!}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                        "text-green-100 hover:bg-white/10 hover:text-white",
                        isActive(item.path) && "bg-white/15 text-white font-medium",
                      )}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </>
  );
}
