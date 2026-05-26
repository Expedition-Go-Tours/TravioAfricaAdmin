import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./AnimatedNumber";

interface KPICardProps {
  label: string;
  value: string;
  icon: ReactNode;
  numericValue?: number;
  format?: (n: number) => string;
  trend?: { value: number; isPositive: boolean };
  className?: string;
  color?: string;
}

export function KPICard({ label, value, icon, numericValue, format, trend, className, color }: KPICardProps) {
  const hasBg = className?.includes("bg-");
  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: "0 6px 20px rgba(0,0,0,0.1)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "rounded-sm border border-border p-4 shadow-2",
        !hasBg && "bg-surface-base",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-text-secondary">{label}</p>
          <p className="mt-1 text-lg font-semibold text-text-primary">
            {numericValue != null ? <AnimatedNumber value={numericValue} format={format} /> : value}
          </p>
          {trend && (
            <p className={cn("mt-1 text-xs", trend.isPositive ? "text-status-active" : "text-status-rejected")}>
              {trend.isPositive ? "\u2191" : "\u2193"} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <motion.div
          whileHover={{ scale: 1.1, rotate: 3 }}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-sm",
            color || "bg-surface-muted",
          )}
        >
          {icon}
        </motion.div>
      </div>
    </motion.div>
  );
}
