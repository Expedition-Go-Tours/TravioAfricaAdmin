import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CornerDownLeft } from "lucide-react";
import { getNavGroups } from "@/components/layout/Sidebar";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";

interface FlatItem {
  label: string;
  path: string;
  group: string;
}

function flatten(groups: { group: string; items: { label: string; path?: string; children?: { label: string; path: string }[] }[] }[]): FlatItem[] {
  const out: FlatItem[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      if (item.children) {
        for (const child of item.children) {
          out.push({ label: `${item.label} — ${child.label}`, path: child.path, group: group.group });
        }
      } else if (item.path) {
        out.push({ label: item.label, path: item.path, group: group.group });
      }
    }
  }
  return out;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { can, isSuperAdmin } = usePermission();

  const adminItems: FlatItem[] = isSuperAdmin
    ? [
        { label: "Activity Log", path: "/admin/activity-log", group: "Administration" },
        { label: "Settings", path: "/admin/settings", group: "Administration" },
      ]
    : [];

  const items = useMemo(() => {
    const groups = [...getNavGroups(can), { group: "Administration", items: adminItems }];
    return flatten(groups);
  }, [can, adminItems]);

  const validPaths = useMemo(() => new Set(items.map((i) => i.path)), [items]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onOpenCommandPalette() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("open-command-palette", onOpenCommandPalette);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("open-command-palette", onOpenCommandPalette);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setHighlight(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  const goTo = useCallback(
    (path: string) => {
      if (!validPaths.has(path)) {
        console.warn(`[CommandPalette] Navigation blocked: path "${path}" not in permission-filtered items`);
        return;
      }
      setOpen(false);
      setQuery("");
      navigate(path);
    },
    [navigate, validPaths],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface-base shadow-soft-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="h-4 w-4 shrink-0 text-text-tertiary" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHighlight((h) => Math.min(h + 1, results.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlight((h) => Math.max(h - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const target = results[highlight];
                    if (target) goTo(target.path);
                  }
                }}
                placeholder="Search pages…"
                className="h-13 w-full bg-transparent py-4 text-sm text-text-primary placeholder:text-text-tertiary outline-none"
              />
              <kbd className="hidden shrink-0 rounded-md border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary sm:block">
                ESC
              </kbd>
            </div>
            <div className="max-h-[40vh] overflow-y-auto scrollbar-thin p-2">
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-text-tertiary">
                  No results for “{query}”
                </p>
              ) : (
                results.map((item, idx) => (
                  <button
                    key={item.path}
                    onClick={() => goTo(item.path)}
                    onMouseEnter={() => setHighlight(idx)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                      idx === highlight
                        ? "bg-accent text-accent-foreground"
                        : "text-text-primary hover:bg-surface-muted",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                    <span className="shrink-0 text-xs text-text-tertiary">{item.group}</span>
                    {idx === highlight && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 opacity-60" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}