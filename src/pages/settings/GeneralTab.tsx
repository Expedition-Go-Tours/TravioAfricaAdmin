import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Loader2, AlertTriangle, RefreshCw, FileText } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/axios";
import { queryClient } from "@/lib/query-client";
import { isSuperAdmin } from "@/hooks/usePermission";

const CURRENCIES = ["USD", "EUR", "GBP", "KES", "TZS", "UGX", "RWF", "ZAR", "NGN", "GHS"];
const TIMEZONES = ["UTC", "Africa/Dar_es_Salaam", "Africa/Nairobi", "Africa/Kampala", "Africa/Kigali", "Africa/Johannesburg", "Africa/Lagos", "America/New_York", "Europe/London"];
const PAYOUT_SCHEDULES = ["daily", "weekly", "biweekly", "monthly"];

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "email" | "number" | "select";
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  section: string;
}

const FIELDS: FieldDef[] = [
  { key: "platform.name", label: "Platform Name", type: "text", required: true, section: "Platform" },
  { key: "platform.currency", label: "Currency", type: "select", required: true, options: CURRENCIES, section: "Platform" },
  { key: "platform.support_email", label: "Support Email", type: "email", required: true, section: "Platform" },
  { key: "platform.timezone", label: "Timezone", type: "select", required: true, options: TIMEZONES, section: "Platform" },
  { key: "commission.default_rate", label: "Default Commission (%)", type: "number", required: true, min: 0, max: 100, step: 0.1, section: "Commission & Fees" },
  { key: "commission.platform_fee", label: "Platform Fee", type: "number", required: true, min: 0, step: 0.01, section: "Commission & Fees" },
  { key: "payout.min_threshold", label: "Min Payout Threshold", type: "number", required: true, min: 0, step: 1, section: "Commission & Fees" },
  { key: "payout.schedule", label: "Payout Schedule", type: "select", required: true, options: PAYOUT_SCHEDULES, section: "Commission & Fees" },
  { key: "booking.min_advance_hours", label: "Min Advance Booking (hours)", type: "number", required: true, min: 0, section: "Booking Rules" },
  { key: "booking.max_advance_days", label: "Max Advance Booking (days)", type: "number", required: true, min: 1, section: "Booking Rules" },
  { key: "booking.auto_cancel_hours", label: "Auto-Cancel After (hours)", type: "number", required: true, min: 0, section: "Booking Rules" },
  { key: "booking.max_travelers", label: "Max Travelers Per Booking", type: "number", required: true, min: 1, section: "Booking Rules" },
];

const SECTION_LABELS: Record<string, { title: string; desc: string }> = {
  Platform: { title: "Platform", desc: "General platform information" },
  "Commission & Fees": { title: "Commission & Fees", desc: "Platform revenue settings" },
  "Booking Rules": { title: "Booking Rules", desc: "Default booking constraints" },
};

function validateField(field: FieldDef, value: string): string | null {
  if (field.required && !value.trim()) {
    return `${field.label} is required`;
  }
  if (!value.trim()) return null;
  if (field.type === "email") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "Please enter a valid email address";
    }
  }
  if (field.type === "number") {
    const num = parseFloat(value);
    if (isNaN(num)) return "Must be a valid number";
    if (field.min !== undefined && num < field.min) {
      return `Must be at least ${field.min}`;
    }
    if (field.max !== undefined && num > field.max) {
      return `Must be at most ${field.max}`;
    }
  }
  return null;
}

function useUnsavedChangesWarning(dirty: boolean) {
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

function FormSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, s) => (
        <Card key={s}>
          <CardHeader>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-44" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function QueryErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-sm border border-border-muted bg-white px-6 py-16 text-center max-w-3xl">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mb-4">
        <AlertTriangle className="h-6 w-6 text-red-500" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1">Failed to load settings</h3>
      <p className="text-sm text-text-secondary mb-6 max-w-md">
        Could not fetch platform settings from the server. Please check your connection and try again.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" /> Retry
      </Button>
    </div>
  );
}

export function GeneralTab() {
  const superAdmin = isSuperAdmin();
  const [form, setForm] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dirty = Object.keys(form).length > 0 && Object.keys(form).some(
    (k) => form[k] !== original[k]
  );

  useUnsavedChangesWarning(dirty);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => api.get("/admin/settings").then((r) => r.data?.data || {}),
  });

  useEffect(() => {
    if (data && Object.keys(original).length === 0) {
      const flattened: Record<string, string> = {};
      for (const [key, val] of Object.entries(data)) {
        flattened[key] = String(val ?? "");
      }
      setForm(flattened);
      setOriginal(flattened);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (settings: Record<string, unknown>) =>
      api.put("/admin/settings", { settings }),
    onSuccess: (res) => {
      const saved = res.data?.data || {};
      const flattened: Record<string, string> = {};
      for (const [key, val] of Object.entries(saved)) {
        flattened[key] = String(val ?? "");
      }
      const changed = Object.keys(form).filter((k) => form[k] !== original[k]);
      setForm(flattened);
      setOriginal(flattened);
      setErrors({});
      queryClient.setQueryData(["admin", "settings"], saved);
      toast.success(
        changed.length === 1
          ? `Updated ${changed[0]}`
          : `Updated ${changed.length} settings`
      );
    },
    onError: () => toast.error("Failed to save settings. Please try again."),
  });

  const update = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    const field = FIELDS.find((f) => f.key === key);
    if (field) {
      const err = validateField(field, value);
      setErrors((prev) => {
        const next = { ...prev };
        if (err) next[key] = err;
        else delete next[key];
        return next;
      });
    }
  }, []);

  const hasErrors = Object.keys(errors).length > 0;
  const isValid = dirty && !hasErrors;

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    for (const field of FIELDS) {
      const err = validateField(field, form[field.key] ?? "");
      if (err) newErrors[field.key] = err;
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fix the highlighted errors before saving");
      return;
    }
    mutation.mutate(form);
  };

  const handleReset = () => {
    setForm({ ...original });
    setErrors({});
  };

  const sections = [...new Set(FIELDS.map((f) => f.section))];

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (isError) {
    return <QueryErrorState onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {sections.map((section) => {
        const sectionFields = FIELDS.filter((f) => f.section === section);
        const sectionErrors = sectionFields.filter((f) => errors[f.key]).length;
        return (
          <Card key={section}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  {SECTION_LABELS[section]?.title || section}
                </h3>
                <p className="text-xs text-text-secondary">
                  {SECTION_LABELS[section]?.desc || ""}
                </p>
              </div>
              {sectionErrors > 0 && (
                <span className="text-xs text-red-500 font-medium">
                  {sectionErrors} error{sectionErrors !== 1 ? "s" : ""}
                </span>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sectionFields.map((field) => {
                  const value = form[field.key] ?? "";
                  const error = errors[field.key];
                  const isChanged = original[field.key] !== undefined && form[field.key] !== original[field.key];
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <Label
                        htmlFor={field.key}
                        className={isChanged ? "text-amber-700" : undefined}
                      >
                        {field.label}
                        {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        {isChanged && (
                          <span className="ml-1.5 text-[10px] text-amber-600 font-medium">(modified)</span>
                        )}
                      </Label>
                      {field.type === "select" ? (
                        <Select
                          value={value}
                          onValueChange={(v) => update(field.key, v)}
                          disabled={!superAdmin || mutation.isPending}
                        >
                          <SelectTrigger
                            id={field.key}
                            className={error ? "border-red-400 ring-red-400/50" : isChanged ? "border-amber-300" : undefined}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(field.options || []).map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={field.key}
                          type={field.type}
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          value={value}
                          onChange={(e) => update(field.key, e.target.value)}
                          disabled={!superAdmin || mutation.isPending}
                          className={error ? "border-red-400 ring-red-400/50" : isChanged ? "border-amber-300" : undefined}
                        />
                      )}
                      {error && (
                        <p className="text-xs text-red-500 mt-1">{error}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {superAdmin && (
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-text-tertiary">
            {dirty ? (
              <span className="text-amber-600">
                {Object.keys(form).filter((k) => form[k] !== original[k]).length} unsaved change(s)
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                All settings saved
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!dirty || mutation.isPending}
            >
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={!dirty || hasErrors || mutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
