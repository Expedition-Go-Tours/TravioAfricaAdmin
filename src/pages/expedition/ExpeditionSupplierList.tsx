import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Search, X, Users, Globe, CheckCircle, ExternalLink, Building2, ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SafeImage } from "@/components/shared/SafeImage";
import { staggerContainer, fadeIn } from "@/lib/animations";
import { formatNumber } from "@/lib/utils";
import api from "@/lib/axios";

interface Supplier {
  id: string;
  name: string;
  email: string;
  photoURL: string | null;
  totalTours: number;
  onExpedition: number;
  activeOnExpedition: number;
  directCount: number;
}

function SupplierCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-4 flex gap-3">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

interface SupplierListProps {
  onSelectSupplier: (supplier: Supplier) => void;
}

export default function ExpeditionSupplierList({ onSelectSupplier }: SupplierListProps) {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "expedition-suppliers"],
    queryFn: () => api.get("/admin/expedition/suppliers").then((r) => r.data?.data?.suppliers as Supplier[]),
  });

  const suppliers = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase().trim();
    if (!q) return data;
    return data.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [data, search]);

  const stats = useMemo(() => {
    if (!data) return { total: 0, onExp: 0, active: 0, direct: 0 };
    return {
      total: data.length,
      onExp: data.reduce((a, s) => a + s.onExpedition, 0),
      active: data.reduce((a, s) => a + s.activeOnExpedition, 0),
      direct: data.reduce((a, s) => a + s.directCount, 0),
    };
  }, [data]);

  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-sm">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Expedition Go Tours</h1>
            <p className="text-sm text-slate-500">Manage which supplier tours are published on Expedition Go</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {!isLoading && !isError && data && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            { label: "Suppliers", value: stats.total, icon: Building2, color: "bg-blue-100 text-blue-600" },
            { label: "On Expedition", value: stats.onExp, icon: Globe, color: "bg-emerald-100 text-emerald-600" },
            { label: "Active on EG", value: stats.active, icon: CheckCircle, color: "bg-green-100 text-green-600" },
            { label: "Direct Booking", value: stats.direct, icon: ExternalLink, color: "bg-amber-100 text-amber-600" },
          ].map((k) => (
            <motion.div
              key={k.label}
              variants={fadeIn}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-slate-900">{formatNumber(k.value)}</p>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${k.color}`}>
                  <k.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-1 text-xs font-medium text-slate-500">{k.label}</p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search suppliers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-9"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Results count */}
      {!isLoading && !isError && data && (
        <p className="text-xs text-slate-400">
          Showing {suppliers.length} of {data.length} supplier{data.length !== 1 ? "s" : ""}
          {search && suppliers.length !== data.length && (
            <button onClick={() => setSearch("")} className="ml-2 font-medium text-emerald-600 hover:underline">
              Clear filter
            </button>
          )}
        </p>
      )}

      {/* Error */}
      {isError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 py-16 text-center"
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
            <Users className="h-6 w-6 text-red-400" />
          </div>
          <p className="text-sm font-semibold text-slate-800">Failed to load suppliers</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SupplierCardSkeleton key={i} />)}
        </div>
      )}

      {/* Supplier cards */}
      {!isLoading && !isError && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {suppliers.map((supplier) => (
            <motion.button
              key={supplier.id}
              variants={fadeUp}
              whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectSupplier(supplier)}
              className="group relative w-full rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-emerald-200"
            >
              {/* Hover arrow hint */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100">
                <ChevronRight className="h-5 w-5" />
              </div>

              <div className="flex items-center gap-4">
                <SafeImage
                  src={supplier.photoURL || undefined}
                  alt={supplier.name}
                  className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-slate-100"
                  fallback={
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-bold text-white ring-2 ring-emerald-100">
                      {supplier.name.charAt(0).toUpperCase()}
                    </div>
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{supplier.name}</p>
                  <p className="truncate text-xs text-slate-400">{supplier.email}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-medium text-slate-700">{formatNumber(supplier.totalTours)}</span> tours
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Globe className={`h-3.5 w-3.5 ${supplier.onExpedition > 0 ? "text-emerald-500" : "text-slate-300"}`} />
                  <span className={`font-medium ${supplier.onExpedition > 0 ? "text-emerald-700" : "text-slate-400"}`}>
                    {formatNumber(supplier.onExpedition)}
                  </span> on EG
                </div>
                <div className="ml-auto">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    supplier.activeOnExpedition > 0
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-50 text-slate-400"
                  }`}>
                    {supplier.activeOnExpedition > 0 ? "Live" : "Offline"}
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Empty */}
      {!isLoading && !isError && data && suppliers.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
            <Building2 className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-800">No suppliers found</p>
          <p className="mt-1 text-xs text-slate-500">
            {search ? "Try a different search term" : "No suppliers with tours yet"}
          </p>
        </div>
      )}
    </motion.div>
  );
}
