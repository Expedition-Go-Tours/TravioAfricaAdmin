import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { HelpCircle, Save, Loader2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";
import { queryClient } from "@/lib/query-client";
import { isSuperAdmin } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";
import { useUnsavedChangesWarning, useCtrlSave, QueryErrorState, SettingsCard, FormSkeleton, type FieldDef, validateAllFields } from "./shared";

const CURRENCIES = ["USD", "EUR", "GBP", "KES", "TZS", "UGX", "RWF", "ZAR", "NGN", "GHS"];
const TIMEZONES = ["UTC", "Africa/Dar_es_Salaam", "Africa/Nairobi", "Africa/Kampala", "Africa/Kigali", "Africa/Johannesburg", "Africa/Lagos", "America/New_York", "Europe/London"];
const PAYOUT_SCHEDULES = ["daily", "weekly", "biweekly", "monthly"];

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
  Platform: { title: "Platform", desc: "General platform information and regional settings" },
  "Commission & Fees": { title: "Commission & Fees", desc: "Platform revenue and payout configuration" },
  "Booking Rules": { title: "Booking Rules", desc: "Default constraints for new bookings" },
};

export function GeneralTab() {
  const superAdmin = isSuperAdmin();
  const [form, setForm] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savingSections, setSavingSections] = useState<Record<string, boolean>>({});

  const sections = [...new Set(FIELDS.map((f) => f.section))];

  const isSectionDirty = useCallback((section: string) => {
    const keys = FIELDS.filter((f) => f.section === section).map((f) => f.key);
    return keys.some((k) => original[k] !== undefined && form[k] !== original[k]);
  }, [form, original]);

  const sectionChangedCount = useCallback((section: string) => {
    const keys = FIELDS.filter((f) => f.section === section).map((f) => f.key);
    return keys.filter((k) => original[k] !== undefined && form[k] !== original[k]).length;
  }, [form, original]);

  const anyDirty = Object.keys(form).length > 0 && sections.some((s) => isSectionDirty(s));

  useUnsavedChangesWarning(anyDirty);

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
      setForm(flattened);
      setOriginal(flattened);
      setErrors({});
      setSavingSections({});
      queryClient.setQueryData(["admin", "settings"], saved);
      toast.success("Settings saved successfully");
    },
    onError: () => {
      setSavingSections({});
      toast.error("Failed to save settings. Please try again.");
    },
  });

  const update = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    const field = FIELDS.find((f) => f.key === key);
    if (field) {
      const err = validateAllFields([field], { [key]: value })[key];
      setErrors((prev) => {
        const next = { ...prev };
        if (err) next[key] = err;
        else delete next[key];
        return next;
      });
    }
  }, []);

  const hasErrors = Object.keys(errors).length > 0;

  const saveSection = (section: string) => {
    const sectionKeys = FIELDS.filter((f) => f.section === section).map((f) => f.key);
    const sectionForm: Record<string, string> = {};
    for (const k of sectionKeys) {
      sectionForm[k] = form[k] ?? "";
    }
    const newErrors = validateAllFields(FIELDS.filter((f) => f.section === section), sectionForm);
    setErrors((prev) => ({ ...prev, ...newErrors }));
    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fix the highlighted errors before saving");
      return;
    }
    setSavingSections((prev) => ({ ...prev, [section]: true }));
    mutation.mutate(sectionForm);
  };

  const resetSection = (section: string) => {
    const sectionKeys = FIELDS.filter((f) => f.section === section).map((f) => f.key);
    const newErrors = { ...errors };
    for (const k of sectionKeys) {
      delete newErrors[k];
      form[k] = original[k] ?? "";
    }
    setForm({ ...form });
    setErrors(newErrors);
  };

  const saveAllDirty = useCallback(() => {
    const allErrors = validateAllFields(FIELDS, form);
    setErrors(allErrors);
    if (Object.keys(allErrors).length > 0) {
      toast.error("Please fix the highlighted errors before saving");
      return;
    }
    const dirtyKeys = FIELDS.filter((f) => isSectionDirty(f.section)).map((f) => f.key);
    if (dirtyKeys.length === 0) return;
    const dirtyForm: Record<string, string> = {};
    for (const k of dirtyKeys) {
      dirtyForm[k] = form[k] ?? "";
    }
    setSavingSections(
      Object.fromEntries(sections.filter((s) => isSectionDirty(s)).map((s) => [s, true])),
    );
    mutation.mutate(dirtyForm);
  }, [form, isSectionDirty, sections, mutation]);

  const resetAll = () => {
    setForm({ ...original });
    setErrors({});
  };

  useCtrlSave(saveAllDirty, anyDirty && !hasErrors);

  if (isLoading) return <FormSkeleton rows={3} fieldsPerRow={2} />;

  if (isError) return <QueryErrorState title="Failed to load settings" message="Could not fetch platform settings from the server." onRetry={() => refetch()} />;

  return (
    <div className="space-y-5">
      {sections.map((section) => {
        const sectionFields = FIELDS.filter((f) => f.section === section);
        const sectionErrors = sectionFields.filter((f) => errors[f.key]).length;
        const hasSectionErrors = sectionErrors > 0;
        const dirty = isSectionDirty(section);
        const changed = sectionChangedCount(section);
        const isSaving = savingSections[section];
        return (
          <SettingsCard
            key={section}
            title={SECTION_LABELS[section]?.title || section}
            description={SECTION_LABELS[section]?.desc || ""}
            section={section}
            errorCount={sectionErrors}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {sectionFields.map((field) => {
                const value = form[field.key] ?? "";
                const error = errors[field.key];
                const isChanged = original[field.key] !== undefined && form[field.key] !== original[field.key];

                return (
                  <div key={field.key} className={cn("space-y-1.5", error && "md:col-span-1")}>
                    <div className="flex items-center gap-1.5">
                      <Label
                        htmlFor={field.key}
                        className={cn(
                          "text-sm font-medium",
                          error ? "text-red-600" : isChanged ? "text-amber-700" : "text-text-primary",
                        )}
                      >
                        {field.label}
                        {field.required && <span className="text-red-500 ml-0.5">*</span>}
                      </Label>
                      {isChanged && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      )}
                    </div>
                    <div className={cn("relative", isChanged && !error && "ring-1 ring-amber-300 rounded-lg")}>
                      {field.type === "select" ? (
                        <Select
                          value={value}
                          onValueChange={(v) => update(field.key, v)}
                          disabled={!superAdmin || Object.values(savingSections).some(Boolean)}
                        >
                          <SelectTrigger
                            id={field.key}
                            className={cn(error && "border-red-400 ring-red-400/50")}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(field.options || []).map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
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
                          disabled={!superAdmin || Object.values(savingSections).some(Boolean)}
                          className={cn(error && "border-red-400 ring-red-400/50")}
                        />
                      )}
                    </div>
                    {error && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <HelpCircle className="h-3 w-3 text-red-500 shrink-0" />
                        <p className="text-xs text-red-500">{error}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {superAdmin && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 mt-5 border-t border-border/40">
                <div className="text-sm text-center sm:text-left">
                  {dirty ? (
                    <span className="flex items-center justify-center sm:justify-start gap-2 text-amber-700 font-medium">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                      </span>
                      {changed} unsaved change{changed !== 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center sm:justify-start gap-2 text-green-700">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
                        <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      All saved
                    </span>
                  )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  {dirty && (
                    <Button variant="outline" size="sm" onClick={() => resetSection(section)} disabled={isSaving} className="shadow-sm flex-1 sm:flex-none">
                      <X className="mr-1 h-3.5 w-3.5" />
                      Reset
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => saveSection(section)}
                    disabled={(!dirty && !hasSectionErrors) || isSaving}
                    className="gap-1.5 shadow-sm flex-1 sm:flex-none"
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            )}
          </SettingsCard>
        );
      })}
    </div>
  );
}
