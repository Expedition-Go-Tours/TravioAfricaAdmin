import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ErrorBoundary } from "react-error-boundary";
import { RefreshCw, AlertTriangle, ChevronRight } from "lucide-react";
import { useAdminRole } from "@/auth/useAdminRole";
import { GeneralTab } from "./GeneralTab";
import { RolesTab } from "./RolesTab";
import { AdminUsersTab } from "./AdminUsersTab";
import { SystemTab } from "./SystemTab";
import { AuditLogTab } from "./AuditLogTab";
import { EmailTab } from "./EmailTab";
import { isSuperAdmin } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "general", label: "General", desc: "Platform name, currency, booking rules", adminOnly: false },
  { id: "roles", label: "Admin Roles", desc: "Manage roles and permissions", adminOnly: true },
  { id: "users", label: "Admin Users", desc: "Manage admin accounts", adminOnly: true },
  { id: "system", label: "System", desc: "Maintenance and health", adminOnly: true },
  { id: "audit", label: "Audit Log", desc: "Track admin actions", adminOnly: true },
  { id: "email", label: "Email", desc: "Email branding and templates", adminOnly: true },
];

const TAB_ACCENTS: Record<string, string> = {
  general: "from-emerald-500 to-green-600",
  roles: "from-violet-500 to-purple-600",
  users: "from-blue-500 to-indigo-600",
  system: "from-amber-500 to-orange-600",
  audit: "from-rose-500 to-pink-600",
  email: "from-sky-500 to-cyan-600",
};

const contentVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15, ease: "easeIn" as const } },
};

function TabFallback({ error, resetErrorBoundary }: { error: unknown; resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-white px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 mb-4 ring-1 ring-red-200/50">
        <AlertTriangle className="h-6 w-6 text-red-500" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1">Something went wrong</h3>
      <p className="text-sm text-text-secondary mb-6 max-w-md">
        {(error instanceof Error ? error.message : "An unexpected error occurred while rendering this section.")}
      </p>
      <Button variant="outline" size="sm" onClick={resetErrorBoundary} className="gap-2 shadow-sm">
        <RefreshCw className="h-4 w-4" /> Try Again
      </Button>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="flex gap-6">
      <div className="w-52 shrink-0 space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
            <Skeleton className="h-4 w-4" />
            <div className="space-y-1 flex-1">
              <Skeleton className={cn("h-3.5", i === 0 ? "w-20" : i === 1 ? "w-24" : "w-16")} />
              <Skeleton className="h-2.5 w-28" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1 space-y-5">
        {Array.from({ length: 3 }).map((_, s) => (
          <div key={s} className="rounded-xl border border-border/60 bg-white p-6 space-y-5 shadow-sm">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const superAdmin = isSuperAdmin();
  const { isLoading: roleLoading } = useAdminRole(true);

  const visibleTabs = TABS.filter((t) => !t.adminOnly || superAdmin);

  if (!superAdmin && activeTab !== "general") {
    setActiveTab("general");
  }

  if (roleLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-1 shrink-0 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <SettingsSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="w-1 h-10 bg-gradient-to-b from-green-500 to-green-300 rounded-full shrink-0" />
        <div>
          <h1 className="text-lg font-semibold text-text-primary">System Settings</h1>
          <p className="text-sm text-text-secondary">Configure and manage all system preferences</p>
        </div>
      </div>

      <div className="flex gap-6">
        <nav className="w-52 shrink-0">
          <div className="rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden">
            <div className="p-1.5 space-y-0.5">
              {visibleTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-green-50 to-white text-green-800 shadow-sm"
                        : "text-text-secondary hover:text-green-700 hover:bg-green-50/40",
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="settingsNavActive"
                        className={cn(
                          "absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-gradient-to-b",
                          TAB_ACCENTS[tab.id],
                        )}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <div className="min-w-0">
                      <div className={cn("text-sm font-medium truncate", isActive ? "text-green-800" : "text-text-primary")}>
                        {tab.label}
                      </div>
                      <div className="text-[11px] text-text-tertiary truncate leading-tight">{tab.desc}</div>
                    </div>
                    {isActive && (
                      <ChevronRight className="h-3.5 w-3.5 text-green-400 ml-auto shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={contentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <ErrorBoundary FallbackComponent={TabFallback} key={activeTab}>
                {activeTab === "general" && <GeneralTab />}
                {activeTab === "roles" && superAdmin && <RolesTab />}
                {activeTab === "users" && superAdmin && <AdminUsersTab />}
                {activeTab === "system" && superAdmin && <SystemTab />}
                {activeTab === "audit" && superAdmin && <AuditLogTab />}
                {activeTab === "email" && superAdmin && <EmailTab />}
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
