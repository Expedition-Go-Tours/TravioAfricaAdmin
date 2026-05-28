import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronUp, ChevronDown, ChevronsUpDown, AlertCircle, Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { staggerFast } from "@/lib/animations";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface Pagination {
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  pagination?: Pagination;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string) => void;
  onRetry?: () => void;
  keyExtractor: (row: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  error,
  emptyMessage = "No items found",
  onRowClick,
  pagination,
  sortBy,
  sortOrder,
  onSort,
  onRetry,
  keyExtractor,
}: DataTableProps<T>) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-secondary" aria-live="polite">
        <AlertCircle className="mb-2 h-8 w-8 text-status-rejected" />
        <p className="text-sm">{error}</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-1" aria-live="polite" aria-label="Loading data">
        <div className="flex border-b border-border-muted bg-surface-muted">
          {columns.map((col) => (
            <div key={col.key} className={cn("flex-1 px-4 py-3", col.className)}>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex border-b border-border-muted">
            {columns.map((col) => (
              <div key={col.key} className={cn("flex-1 px-4 py-3", col.className)}>
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-secondary" aria-live="polite">
        <Inbox className="mb-2 h-8 w-8" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-sm border border-border-muted">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-muted bg-gradient-to-r from-green-50 to-green-50/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-5 py-3.5 text-left text-xs font-semibold tracking-wider text-green-800 leading-tight",
                    col.sortable && "cursor-pointer select-none hover:text-green-900",
                    col.className,
                  )}
                  onClick={() => {
                    if (col.sortable && onSort) onSort(col.key);
                  }}
                  aria-label={
                    col.sortable
                      ? `${col.header}, sortable. Current sort: ${sortBy === col.key ? sortOrder : "none"}`
                      : col.header
                  }
                  tabIndex={col.sortable ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (col.sortable && onSort && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onSort(col.key);
                    }
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <>
                        {sortBy === col.key ? (
                          sortOrder === "asc" ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 text-text-tertiary" />
                        )}
                      </>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <motion.tbody
            variants={staggerFast}
            initial="hidden"
            animate="visible"
          >
            {data.map((row) => (
              <motion.tr
                key={keyExtractor(row)}
                variants={{
                  hidden: { opacity: 0, y: 6 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
                }}
                className={cn(
                  "border-b border-border-muted transition-all last:border-b-0",
                  onRowClick && "cursor-pointer hover:bg-green-50/40 hover:border-green-200",
                  "even:bg-green-50/20",
                )}
                onClick={() => onRowClick?.(row)}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onRowClick(row);
                  }
                }}
              >
                {columns.map((col) => (
                  <td key={col.key}                   className={cn(
                    "px-5 py-3.5 text-text-primary leading-relaxed align-middle",
                    col.className,
                  )}>
                    {col.render(row)}
                  </td>
                ))}
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 text-sm text-text-secondary">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
