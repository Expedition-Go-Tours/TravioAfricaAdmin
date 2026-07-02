import { useState, useEffect, useCallback, useRef, type ReactNode, type ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, RefreshCw, ChevronDown, Loader2, Save, CheckCircle2, X } from "lucide-react";
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-white px-8 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 mb-5 ring-1 ring-red-200/50">
        <AlertTriangle className="h-6 w-6 text-red-500" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1.5">{title}</h3>
      <p className="text-sm text-text-secondary mb-7 max-w-md leading-relaxed">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="gap-2 shadow-sm">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      )}
    </div>
  );
}

export function FormSkeleton({ rows = 3, fieldsPerRow = 4 }: { rows?: number; fieldsPerRow?: number }) {
  return (
    <div className="space-y-5">
      {Array.from({ length: rows }).map((_, s) => (
        <div key={s} className="rounded-xl border border-border/60 bg-white p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: fieldsPerRow }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className={cn("rounded-lg", i % 3 === 0 ? "h-10 w-full" : i % 3 === 1 ? "h-10 w-3/4" : "h-10 w-full")} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const SECTION_ACCENTS: Record<string, string> = {
  Platform: "from-emerald-500 to-green-600",
  "Commission & Fees": "from-amber-400 to-orange-500",
  "Booking Rules": "from-blue-400 to-indigo-500",
  Branding: "from-violet-400 to-purple-500",
  System: "from-rose-400 to-pink-500",
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
        "rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden",
        section && SECTION_ACCENTS[section] && "border-t-0",
        className,
      )}
    >
      {section && SECTION_ACCENTS[section] && (
        <div className={cn("h-1 w-full bg-gradient-to-r", SECTION_ACCENTS[section])} />
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-muted/60 transition-colors"
      >
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <p className="text-xs text-text-secondary/80">{description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {errorCount !== undefined && errorCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {errorCount} error{errorCount !== 1 ? "s" : ""}
            </span>
          ) : open && errorCount === 0 ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-100 px-2.5 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" />
              Good
            </span>
          ) : null}
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-surface-muted border border-border/50">
            <ChevronDown className={cn("h-3.5 w-3.5 text-text-tertiary transition-transform duration-200", open && "rotate-180")} />
          </div>
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
            <div className="px-6 pb-5 pt-4 border-t border-border/40">{children}</div>
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
    <div className="sticky bottom-6 z-20">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-xl border border-border/50 bg-white/90 backdrop-blur-md px-6 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <div className="text-sm text-center sm:text-left">
          {dirty ? (
            <span className="flex items-center justify-center sm:justify-start gap-2 text-amber-700 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              {changedCount} unsaved change{changedCount !== 1 ? "s" : ""}
            </span>
          ) : (
            <span className="flex items-center justify-center sm:justify-start gap-2 text-green-700">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
              </span>
              All settings saved
            </span>
          )}
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button variant="outline" onClick={onReset} disabled={!dirty || isPending} className="px-5 shadow-sm flex-1 sm:flex-none">
            {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <X className="mr-1.5 h-3.5 w-3.5" />}
            Reset
          </Button>
          <Button onClick={onSave} disabled={!dirty || hasErrors || isPending} className="px-6 gap-2 shadow-sm flex-1 sm:flex-none">
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

