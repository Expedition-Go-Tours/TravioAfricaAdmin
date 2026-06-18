import { useState, useEffect, useCallback, useRef, type ReactNode, type ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, RefreshCw, ChevronDown, FileText, Loader2, Save, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}

export function useCtrlSave(handler: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handler();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handler, enabled]);
}

export function flattenSettings(data: Record<string, unknown>): Record<string, string> {
  const flattened: Record<string, string> = {};
  for (const [key, val] of Object.entries(data)) {
    flattened[key] = String(val ?? "");
  }
  return flattened;
}

export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "email" | "number" | "select" | "url";
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  section: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
  compact?: boolean;
}

export function validateField(field: FieldDef, value: string): string | null {
  if (field.required && !value.trim()) return `${field.label} is required`;
  if (!value.trim()) return null;
  if (field.type === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Please enter a valid email address";
  }
  if (field.type === "url" && value.trim()) {
    try { new URL(value); } catch { return "Please enter a valid URL"; }
  }
  if (field.type === "number") {
    const num = parseFloat(value);
    if (isNaN(num)) return "Must be a valid number";
    if (field.min !== undefined && num < field.min) return `Must be at least ${field.min}`;
    if (field.max !== undefined && num > field.max) return `Must be at most ${field.max}`;
  }
  return null;
}

export function validateAllFields(fields: FieldDef[], form: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const err = validateField(field, form[field.key] ?? "");
    if (err) errors[field.key] = err;
  }
  return errors;
}

export function QueryErrorState({
  title = "Failed to load data",
  message = "Could not fetch data from the server. Please check your connection and try again.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border/80 bg-white px-8 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mb-5">
        <AlertTriangle className="h-6 w-6 text-red-500" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1.5">{title}</h3>
      <p className="text-sm text-text-secondary mb-6 max-w-md">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      )}
    </div>
  );
}

export function FormSkeleton({ rows = 3, fieldsPerRow = 4 }: { rows?: number; fieldsPerRow?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: rows }).map((_, s) => (
        <div key={s} className="rounded-xl border border-border/80 bg-white p-6 space-y-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: fieldsPerRow }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const SECTION_COLORS: Record<string, string> = {
  Platform: "from-emerald-500 to-green-600",
  "Commission & Fees": "from-amber-400 to-orange-500",
  "Booking Rules": "from-blue-400 to-indigo-500",
  Branding: "from-purple-400 to-violet-500",
};

const SECTION_BORDER_COLORS: Record<string, string> = {
  Platform: "border-l-emerald-500",
  "Commission & Fees": "border-l-amber-500",
  "Booking Rules": "border-l-blue-500",
  Branding: "border-l-purple-500",
};

export function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
  className,
  section,
  errorCount,
  defaultOpen = true,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  section?: string;
  errorCount?: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden",
        section && SECTION_BORDER_COLORS[section] && "border-l-4",
        section && SECTION_BORDER_COLORS[section],
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-7 py-5 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0">
          {Icon && (
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br text-white shadow-sm",
              SECTION_COLORS[section || ""] || "from-primary to-primary/70",
            )}>
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="text-left min-w-0">
            <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
            <p className="text-xs text-text-secondary/80">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {errorCount !== undefined && errorCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {errorCount} error{errorCount !== 1 ? "s" : ""}
            </span>
          ) : open ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" />
              Good
            </span>
          ) : null}
          <ChevronDown className={cn("h-4 w-4 text-text-tertiary transition-transform duration-200", open && "rotate-180")} />
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-7 pb-6 pt-4 border-t border-border/50">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SettingsSaveBar({
  dirty,
  changedCount,
  hasErrors,
  isPending,
  onSave,
  onReset,
}: {
  dirty: boolean;
  changedCount: number;
  hasErrors: boolean;
  isPending: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-white px-6 py-4 shadow-lg">
        <div className="text-sm">
          {dirty ? (
            <span className="flex items-center gap-2 text-amber-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              {changedCount} unsaved change{changedCount !== 1 ? "s" : ""}
            </span>
          ) : (
            <span className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              All settings saved
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onReset} disabled={!dirty || isPending} className="px-5">
            Reset
          </Button>
          <Button onClick={onSave} disabled={!dirty || hasErrors || isPending} className="px-6 gap-2">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
