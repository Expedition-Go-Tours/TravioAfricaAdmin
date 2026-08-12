import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, Pencil, X, Save, Loader2, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";
import { queryClient } from "@/lib/query-client";
import { isSuperAdmin } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";
import { useUnsavedChangesWarning, QueryErrorState, SettingsCard, FormSkeleton, type FieldDef, validateAllFields } from "./shared";
import OptimizedImage from "@/components/shared/OptimizedImage";

interface EmailField extends FieldDef {
  hint: string;
}

const FIELDS: EmailField[] = [
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

const VALUE_COLORS = {
  support_email: { bg: "from-sky-500 to-cyan-600" },
  logo_url: { bg: "from-violet-500 to-purple-600" },
  hero_image_url: { bg: "from-amber-500 to-orange-600" },
};

function ImagePreview({ url, label }: { url: string; label: string }) {
  const [loaded, setLoaded] = useState(true);
  if (!url || !loaded) return null;
  return (
    <div className="mt-2 rounded-lg border border-border/60 overflow-hidden bg-surface-muted shadow-sm">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-muted border-b border-border/40">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
          <span className="w-2 h-2 rounded-full bg-green-400" />
        </div>
        <span className="text-[10px] text-text-tertiary font-mono truncate ml-2">{label}</span>
      </div>
      <OptimizedImage
        src={url}
        alt={label}
        className="w-full h-28 object-contain p-3 bg-white"
        width={800}
        fit="fill"
        onError={() => setLoaded(false)}
      />
    </div>
  );
}

export function EmailTab() {
  const superAdmin = isSuperAdmin();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dirty = Object.keys(form).length > 0 && Object.keys(form).some(
    (k) => form[k] !== original[k],
  );

  useUnsavedChangesWarning(dirty);

  const changedCount = Object.keys(form).filter((k) => form[k] !== original[k]).length;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => api.get("/admin/settings").then((r) => r.data?.data || {}),
  });

  const [prevData, setPrevData] = useState<unknown>(null);
  if (data && data !== prevData && Object.keys(original).length === 0) {
    setPrevData(data);
    const flattened: Record<string, string> = {};
    for (const [key, val] of Object.entries(data)) {
      flattened[key] = String(val ?? "");
    }
    setForm(flattened);
    setOriginal(flattened);
  }

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

  const handleSave = () => {
    const newErrors = validateAllFields(FIELDS, form);
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

  if (isLoading) return <FormSkeleton rows={1} fieldsPerRow={2} />;

  if (isError) return <QueryErrorState title="Failed to load email settings" message="Could not fetch email settings from the server." onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-sky-200/60 bg-gradient-to-r from-sky-50/80 to-cyan-50/80 px-5 py-4 text-sm text-sky-900 shadow-sm">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-sm">
          <Info className="h-4 w-4" />
        </div>
        <div>
          <p className="font-medium text-sky-900">Email Branding</p>
          <p className="text-sky-700 text-xs mt-0.5 leading-relaxed">
            These values are injected into all 11 transactional email templates
            (booking confirmations, cancellations, payout notifications, supplier
            status updates, review alerts, team invites, and more).
          </p>
        </div>
      </div>

      <SettingsCard
        title={FIELDS[0].section}
        description="How your brand appears in all outbound emails"
        section="Branding"
      >
        <div className="grid grid-cols-1 gap-6">
          {FIELDS.map((field) => {
            const value = form[field.key] ?? "";
            const error = errors[field.key];
            const isChanged = original[field.key] !== undefined && form[field.key] !== original[field.key];
            const colors = VALUE_COLORS[field.key as keyof typeof VALUE_COLORS];

            if (!editing) {
              return (
                <div key={field.key}>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium text-text-primary">{field.label}</Label>
                    {superAdmin && (
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 px-2 py-1 rounded-md hover:bg-green-50 transition-colors"
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                    )}
                  </div>
                  <div className={cn(
                    "rounded-lg border border-border/60 bg-surface-muted/50 px-4 py-3 flex items-center",
                    !value && "text-text-tertiary italic",
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mr-3 bg-gradient-to-br text-white shadow-sm",
                      colors?.bg || "from-primary to-primary/70",
                    )}>
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {value ? (
                        <span className="text-sm text-text-primary truncate block">{value}</span>
                      ) : (
                        <span className="text-sm text-text-tertiary">Not set</span>
                      )}
                      <p className="text-[11px] text-text-tertiary">{field.hint}</p>
                    </div>
                  </div>
                  {field.type === "url" && value && <ImagePreview url={value} label={field.label} />}
                </div>
              );
            }

            return (
              <div key={field.key}>
                <Label
                  htmlFor={field.key}
                  className={cn(
                    "text-sm font-medium",
                    error ? "text-red-600" : isChanged ? "text-amber-700" : "text-text-primary",
                  )}
                >
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  {isChanged && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 ml-1.5" />}
                </Label>
                <div className="mt-1.5 space-y-1">
                  <Input
                    id={field.key}
                    type={field.type}
                    value={value}
                    onChange={(e) => update(field.key, e.target.value)}
                    disabled={mutation.isPending}
                    className={cn(error && "border-red-400 ring-red-400/50")}
                  />
                  <p className="text-xs text-text-tertiary">{field.hint}</p>
                  {error && (
                    <p className="text-xs text-red-500">{error}</p>
                  )}
                </div>
                {field.type === "url" && value && <ImagePreview url={value} label={field.label} />}
              </div>
            );
          })}
        </div>
      </SettingsCard>

      {editing && (
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
                    <Save className="h-3 w-3 text-green-600" />
                  </span>
                  All values saved
                </span>
              )}
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button variant="outline" onClick={handleCancel} disabled={mutation.isPending} className="px-5 shadow-sm flex-1 sm:flex-none">
                <X className="mr-1.5 h-3.5 w-3.5" /> Cancel
              </Button>
              <Button onClick={handleSave} disabled={!dirty || hasErrors || mutation.isPending} className="px-6 gap-2 shadow-sm flex-1 sm:flex-none">
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


