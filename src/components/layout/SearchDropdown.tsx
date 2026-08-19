import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CornerDownLeft, Clock, ArrowRight, X } from "lucide-react";
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

const RECENT_KEY = "admin-search-recent";
const MAX_RECENT = 5;

function persistRecent(recent: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch { /* ignore */ }
}

function getRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecent(path: string, validPaths: Set<string>) {
  if (!validPaths.has(path)) return;
  try {
    const recent = getRecent().filter((p) => p !== path);
    recent.unshift(path);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch { /* ignore */ }
}

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function SearchDropdown() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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

  const recentPaths = useMemo(() => {
    const raw = getRecent();
    const valid = raw.filter((p) => validPaths.has(p));
    if (valid.length !== raw.length) {
      persistRecent(valid);
    }
    return valid;
  }, [open, validPaths]);

  const recentItems = useMemo(() => {
    return recentPaths
      .map((path) => items.find((i) => i.path === path))
      .filter(Boolean) as FlatItem[];
  }, [recentPaths, items]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, query]);

  const displayItems = query.trim() ? results : recentItems;
  const isEmpty = query.trim() ? results.length === 0 : recentItems.length === 0;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setHighlight(0);
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const goTo = useCallback(
    (path: string) => {
      if (!validPaths.has(path)) {
        console.warn(`[SearchDropdown] Navigation blocked: path "${path}" not in permission-filtered items`);
        return;
      }
      saveRecent(path, validPaths);
      setOpen(false);
      setQuery("");
      navigate(path);
    },
    [navigate, validPaths],
  );

  const groups = useMemo(() => {
    const map = new Map<string, FlatItem[]>();
    for (const item of displayItems) {
      const arr = map.get(item.group) || [];
      arr.push(item);
      map.set(item.group, arr);
    }
    return Array.from(map.entries());
  }, [displayItems]);

  const flatResults = displayItems;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "hidden md:flex h-9 items-center gap-2 rounded-xl border px-3 text-sm transition-colors",
          open
            ? "border-primary/40 bg-surface-base text-text-primary shadow-sm"
            : "border-border/60 bg-surface-muted/60 text-text-tertiary hover:border-border hover:text-text-secondary",
        )}
        aria-label="Search pages"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Search className="h-3.5 w-3.5" />
        <span>{query || "Search…"}</span>
        {!open && (
          <kbd className="ml-2 rounded-md border border-border bg-surface-base px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
            Ctrl K
          </kbd>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
            className="absolute left-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-surface-base shadow-soft-lg z-50"
            role="dialog"
            aria-modal="true"
            aria-label="Search"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="h-4 w-4 shrink-0 text-text-tertiary" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHighlight((h) => Math.min(h + 1, flatResults.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlight((h) => Math.max(h - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const target = flatResults[highlight];
                    if (target) goTo(target.path);
                  } else if (e.key === "Escape") {
                    setOpen(false);
                  }
                }}
                placeholder="Search pages, settings, tours…"
                className="h-12 w-full bg-transparent py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:bg-surface-muted hover:text-text-secondary transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <kbd className="hidden shrink-0 rounded-md border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary sm:block">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[360px] overflow-y-auto scrollbar-thin p-2">
              {isEmpty ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted mb-3">
                    <Search className="h-4 w-4 text-text-tertiary" />
                  </div>
                  <p className="text-sm font-medium text-text-secondary">
                    {query.trim() ? `No results for "${query}"` : "No recent searches"}
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">
                    {query.trim() ? "Try a different search term" : "Start typing to search pages"}
                  </p>
                </div>
              ) : (
                <>
                  {!query.trim() && recentItems.length > 0 && (
                    <div className="mb-1">
                      <div className="flex items-center gap-2 px-3 py-1.5">
                        <Clock className="h-3 w-3 text-text-tertiary" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                          Recent
                        </span>
                      </div>
                    </div>
                  )}
                  {groups.map(([group, groupItems]) => (
                    <div key={group} className="mb-1">
                      {query.trim() && (
                        <div className="flex items-center gap-2 px-3 py-1.5">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                            {group}
                          </span>
                        </div>
                      )}
                      {groupItems.map((item) => {
                        const idx = flatResults.indexOf(item);
                        return (
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
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {highlightMatch(item.label, query.trim())}
                            </span>
                            <span className="shrink-0 text-xs text-text-tertiary">{item.group}</span>
                            {idx === highlight && (
                              <CornerDownLeft className="h-3.5 w-3.5 shrink-0 opacity-60" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
              <div className="flex items-center gap-3 text-[11px] text-text-tertiary">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-surface-muted px-1 py-0.5 text-[10px] font-medium">↑</kbd>
                  <kbd className="rounded border border-border bg-surface-muted px-1 py-0.5 text-[10px] font-medium">↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-surface-muted px-1 py-0.5 text-[10px] font-medium">↵</kbd>
                  select
                </span>
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  window.dispatchEvent(new Event("open-command-palette"));
                }}
                className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors"
              >
                <ArrowRight className="h-3 w-3" />
                open full search
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
