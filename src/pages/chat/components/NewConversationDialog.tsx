import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Loader2, MessageSquare, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import api from "@/lib/axios";

interface SupplierResult {
  id: string;
  status?: string;
  user?: {
    id: string;
    name?: string;
    email?: string;
    photoURL?: string;
  };
  businessInfo?: {
    legalBusinessName?: string;
    businessName?: string;
    displayName?: string;
  };
}

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (recipientId: string, recipientName: string) => void;
}

function SupplierSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="h-10 w-10 animate-pulse rounded-full bg-green-100/60" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-32 animate-pulse rounded bg-green-100/60" />
        <div className="h-2.5 w-24 animate-pulse rounded bg-green-100/60" />
      </div>
    </div>
  );
}

export function NewConversationDialog({
  open,
  onOpenChange,
  onSelect,
}: NewConversationDialogProps) {
  const [query, setQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const debounceRef = useRef<number | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const searchQuery = query.trim().toLowerCase();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["admin", "suppliers", "search", searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "50",
        status: "ACTIVE",
      });
      if (searchQuery) params.set("search", searchQuery);
      const res = await api.get(
        `/suppliers/admin/applications?${params.toString()}`
      );
      return (res.data.data?.applications || res.data.applications || []) as SupplierResult[];
    },
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setQuery("");
      setFocusedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [suppliers.length, searchQuery]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => setQuery(val), 300);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < suppliers.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev > 0 ? prev - 1 : suppliers.length - 1
        );
      } else if (e.key === "Enter" && focusedIndex >= 0) {
        e.preventDefault();
        const supplier = suppliers[focusedIndex];
        if (supplier) {
          onSelect(supplier.user?.id || supplier.id, getSupplierName(supplier));
        }
      }
    },
    [suppliers, focusedIndex, onSelect]
  );

  const getSupplierName = (supplier: SupplierResult) =>
    supplier.user?.name ||
    supplier.businessInfo?.legalBusinessName ||
    supplier.businessInfo?.businessName ||
    supplier.businessInfo?.displayName ||
    supplier.user?.email ||
    "Unknown";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-xl">
        <div className="border-b border-border/50 px-5 py-4">
          <DialogHeader className="p-0">
            <DialogTitle className="text-base font-bold text-text-primary">
              New conversation
            </DialogTitle>
          </DialogHeader>
          <p className="mt-0.5 text-xs text-text-tertiary">
            Search for a supplier to start messaging
          </p>
        </div>

        <div className="relative border-b border-border/50 px-4 py-3">
          <Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            ref={inputRef}
            placeholder="Search suppliers by name or email..."
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            className="w-full rounded-lg border border-border/60 bg-green-50/20 py-2 pl-9 pr-9 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:border-green-400 focus-visible:bg-white transition-colors"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-2.5">
          <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
            {searchQuery
              ? `Results (${suppliers.length})`
              : "Active suppliers"}
          </span>
        </div>

        <div
          ref={listRef}
          className="max-h-[320px] overflow-y-auto scrollbar-none"
        >
          {isLoading ? (
            <div className="space-y-1 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <SupplierSkeleton key={i} />
              ))}
            </div>
          ) : suppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              {searchQuery ? (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                    <Search className="h-5 w-5 text-green-400" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-text-secondary">
                    No results found
                  </p>
                  <p className="mt-1 text-xs text-text-tertiary">
                    Try a different name or email
                  </p>
                  <button
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    className="mt-3 text-xs font-medium text-green-600 hover:text-green-700 transition-colors"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                    <UserPlus className="h-5 w-5 text-green-400" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-text-secondary">
                    No suppliers available
                  </p>
                  <p className="mt-1 text-xs text-text-tertiary">
                    Active suppliers will appear here
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="py-1">
              {suppliers.map((supplier, idx) => {
                const name = getSupplierName(supplier);
                const initial = name.charAt(0).toUpperCase();
                const isFocused = focusedIndex === idx;
                return (
                  <button
                    key={supplier.id}
                    onClick={() =>
                      onSelect(supplier.user?.id || supplier.id, name)
                    }
                    className={cn(
                      "flex w-full items-center gap-3 px-5 py-3 text-left transition-all duration-200 focus-visible:outline-none",
                      isFocused && "bg-green-50"
                    )}
                  >
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-green-400 to-green-600 text-sm font-bold text-white shadow-sm">
                      <span>{initial}</span>
                      {supplier.user?.photoURL && (
                        <img
                          src={supplier.user.photoURL}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {name}
                        </p>
                        {supplier.businessInfo?.legalBusinessName && (
                          <span className="shrink-0 rounded-full bg-blue-50 px-1.5 py-[1px] text-[10px] font-medium text-blue-600">
                            Business
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        {supplier.user?.email && (
                          <p className="truncate text-xs text-text-tertiary">
                            {supplier.user.email}
                          </p>
                        )}
                        {supplier.status && (
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-1.5 py-[1px] text-[10px] font-medium",
                              supplier.status === "ACTIVE"
                                ? "bg-green-50 text-green-600"
                                : "bg-amber-50 text-amber-600"
                            )}
                          >
                            {supplier.status === "ACTIVE" ? "Active" : supplier.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-green-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border/50 px-5 py-3">
          <p className="text-[11px] text-text-tertiary text-center">
            {suppliers.length > 0
              ? "Type to filter · ↑↓ to navigate · Enter to select"
              : ""}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
