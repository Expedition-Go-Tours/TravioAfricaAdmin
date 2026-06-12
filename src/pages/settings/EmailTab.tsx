import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Loader2, AlertTriangle, RefreshCw, Info, Pencil, X, Mail } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/axios";
import { queryClient } from "@/lib/query-client";
import { isSuperAdmin } from "@/hooks/usePermission";

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "email" | "url";
  required?: boolean;
  hint: string;
  section: string;
}

const FIELDS: FieldDef[] = [
  {
    key: "email.support_email",
    label: "Support Email",
    type: "email",
    required: true,
    hint: "Displayed in email footers so recipients know where to reach support",
    section: "Branding",
  },
  {
    key: "email.logo_url",
    label: "Logo URL",
    type: "url",
    hint: "Appears in the header of all transactional emails",
    section: "Branding",
  },
  {
    key: "email.hero_image_url",
    label: "Hero Image URL",
    type: "url",
    hint: "Banner image used as a visual header in supplier notification emails",
    section: "Branding",
  },
];

const SECTION_LABELS: Record<string, { title: string; desc: string }> = {
  Branding: {
    title: "Branding",
    desc: "How your brand appears in all outbound emails to customers and suppliers",
  },
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
  if (field.type === "url" && value.trim()) {
    try {
      new URL(value);
    } catch {
      return "Please enter a valid URL";
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
      {Array.from({ length: 2 }).map((_, s) => (
        <Card key={s}>
          <CardHeader>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
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
      <h3 className="text-base font-semibold text-text-primary mb-1">Failed to load email settings</h3>
      <p className="text-sm text-text-secondary mb-6 max-w-md">
        Could not fetch email settings from the server. Please check your connection and try again.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" /> Retry
      </Button>
    </div>
  );
}

function ValueDisplay({ label, value, type }: { label: string; value: string; type: string }) {
  if (!value) {
    return <span className="text-sm text-text-tertiary italic">Not set</span>;
  }
  if (type === "url" && value) {
    return (
      <div className="relative">
        <img
          src={value}
          alt={label}
          className="h-12 max-w-full rounded-xl border border-border/80 object-contain bg-white"
          onError={(e) => {
            (e.target as HTMLImageElement).classList.add("hidden");
          }}
        />
        <span className="text-sm text-blue-600 truncate block hidden" title={value}>
          {value}
        </span>
      </div>
    );
  }
  return <span className="text-sm text-text-primary">{value}</span>;
}

export function EmailTab() {
  const superAdmin = isSuperAdmin();
  const [editing, setEditing] = useState(false);
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
      setForm(flattened);
      setOriginal(flattened);
      setErrors({});
      setEditing(false);
      queryClient.setQueryData(["admin", "settings"], saved);
      toast.success("Email settings updated");
    },
    onError: () => toast.error("Failed to save email settings. Please try again."),
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

  const handleCancel = () => {
    setForm({ ...original });
    setErrors({});
    setEditing(false);
  };

  const sections = [...new Set(FIELDS.map((f) => f.section))];

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (isError) {
    return <QueryErrorState onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start gap-3 rounded-xl border border-green-200/50 bg-green-50/50 px-5 py-4 text-sm text-green-800">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
        <p>
          These values are injected into all 11 transactional email templates
          (booking confirmations, cancellations, payout notifications, supplier
          status updates, review alerts, team invites, and more). Changes apply
          immediately to all future emails.
        </p>
      </div>

      {sections.map((section) => {
        const sectionFields = FIELDS.filter((f) => f.section === section);
        const sectionErrors = sectionFields.filter((f) => errors[f.key]).length;
        return (
          <Card key={section} className="rounded-xl shadow-sm overflow-hidden">
            <CardHeader className="px-6 py-5 border-b border-border/80 flex flex-row items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-text-primary">
                  {SECTION_LABELS[section]?.title || section}
                </h3>
                <p className="text-xs text-text-secondary">
                  {SECTION_LABELS[section]?.desc}
                </p>
              </div>
              {sectionErrors > 0 && (
                <span className="text-xs text-red-500 font-medium">
                  {sectionErrors} error{sectionErrors !== 1 ? "s" : ""}
                </span>
              )}
            </CardHeader>
            <CardContent className="px-6 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {sectionFields.map((field) => {
                  const value = form[field.key] ?? "";
                  const error = errors[field.key];

                  if (!editing) {
                    return (
                      <div key={field.key} className="space-y-1.5">
                        <Label className="text-sm font-medium text-text-primary">
                          {field.label}
                        </Label>
                        <div className="min-h-[36px] flex items-center">
                          <ValueDisplay label={field.label} value={value} type={field.type} />
                        </div>
                        <p className="text-xs text-text-tertiary">{field.hint}</p>
                      </div>
                    );
                  }

                  const isChanged = original[field.key] !== undefined && form[field.key] !== original[field.key];
                  const isImageUrl = field.type === "url" && value && /\.(png|jpe?g|gif|svg|webp|ico)(\?|$)/i.test(value);
                  return (
                    <div key={field.key} className={`space-y-1.5 ${isImageUrl ? "sm:col-span-2" : ""}`}>
                      <Label
                        htmlFor={field.key}
                        className={`text-sm font-medium text-text-primary ${isChanged ? "text-amber-700" : ""}`}
                      >
                        {field.label}
                        {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        {isChanged && (
                          <span className="ml-1.5 text-[10px] text-amber-600 font-medium">(modified)</span>
                        )}
                      </Label>
                      <Input
                        id={field.key}
                        type={field.type}
                        value={value}
                        onChange={(e) => update(field.key, e.target.value)}
                        disabled={mutation.isPending}
                        className={error ? "border-red-400 ring-red-400/50" : isChanged ? "border-amber-300" : undefined}
                      />
                      {isImageUrl && (
                        <img
                          src={value}
                          alt={field.label}
                          className="mt-1 h-20 rounded-xl border border-border/80 object-contain bg-white"
                          onError={(e) => {
                            (e.target as HTMLImageElement).classList.add("hidden");
                          }}
                        />
                      )}
                      <p className="text-xs text-text-tertiary">{field.hint}</p>
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

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-text-tertiary">
          {editing && dirty ? (
            <span className="text-amber-600">
              {Object.keys(form).filter((k) => form[k] !== original[k]).length} unsaved change(s)
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              {editing ? "All values saved" : "Click Edit to make changes"}
            </span>
          )}
        </div>
        <div className="flex gap-3">
          {editing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={mutation.isPending}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleSave} disabled={!dirty || hasErrors || mutation.isPending}>
                {mutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </>
          ) : (
            superAdmin && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
