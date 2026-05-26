import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function AnimatedCard({ children, className, delay = 0 }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.001, ease: "easeOut" }}
      whileHover={{ y: -2, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
      className={cn(
        "rounded-sm border border-border bg-surface-base p-4 shadow-2",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
