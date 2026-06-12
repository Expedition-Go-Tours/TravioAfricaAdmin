import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ErrorBoundary } from "react-error-boundary";
import { RefreshCw, AlertTriangle, Settings, Shield, Users, Sliders, ClipboardList, ScrollText, Mail } from "lucide-react";
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

const TABS = [
  { id: "general", label: "General", icon: Sliders, adminOnly: false },
  { id: "roles", label: "Admin Roles", icon: Shield, adminOnly: true },
  { id: "users", label: "Admin Users", icon: Users, adminOnly: true },
  { id: "system", label: "System", icon: ClipboardList, adminOnly: true },
  { id: "audit", label: "Audit Log", icon: ScrollText, adminOnly: true },
  { id: "email", label: "Email", icon: Mail, adminOnly: true },
];

const tabVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: "easeIn" as const } },
};

const spring = { type: "spring" as const, stiffness: 380, damping: 30 };

function TabFallback({ error, resetErrorBoundary }: { error: unknown; resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-sm border border-border-muted bg-white px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mb-4">
        <AlertTriangle className="h-6 w-6 text-red-500" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1">Something went wrong</h3>
      <p className="text-sm text-text-secondary mb-6 max-w-md">
        {(error instanceof Error ? error.message : "An unexpected error occurred while rendering this section.")}
      </p>
      <Button variant="outline" size="sm" onClick={resetErrorBoundary} className="gap-2">
        <RefreshCw className="h-4 w-4" /> Try Again
      </Button>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="rounded-lg border border-border-muted p-5 space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-border-muted p-5 space-y-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-border-muted p-5 space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-44" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const superAdmin = isSuperAdmin();
  const { isLoading: roleLoading } = useAdminRole(true);

  const visibleTabs = TABS.filter((t) => !t.adminOnly || superAdmin);

  if (roleLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-1 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <div className="rounded-xl bg-gray-100 p-1">
          <div className="flex gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 flex-1 rounded-lg" />
            ))}
          </div>
        </div>
        <SettingsSkeleton />
      </div>
    );
  }

  if (!superAdmin && activeTab !== "general") {
    setActiveTab("general");
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="w-1 h-10 bg-gradient-to-b from-green-500 to-green-300 rounded-full shrink-0" />
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Settings</h1>
          <p className="text-sm text-text-secondary">Manage platform configuration and admin access</p>
        </div>
      </div>

      <div className="relative rounded-xl bg-gray-100 p-1">
        <div className="relative flex gap-1">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`relative z-10 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-lg flex-1 sm:flex-none ${
                  isActive ? "text-green-800" : "text-text-secondary hover:text-green-700"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="settingsTab"
                    className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10"
                    transition={spring}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabVariants}
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
  );
}
