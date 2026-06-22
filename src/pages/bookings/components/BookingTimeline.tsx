import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TimelineStep {
  label: string;
  date: string | null;
  active: boolean;
  description?: string;
}

interface BookingTimelineProps {
  steps: TimelineStep[];
}

const dotColors = {
  active: "bg-indigo-500 border-indigo-200",
  completed: "bg-emerald-500 border-emerald-200",
  pending: "bg-slate-200 border-slate-100",
};

export function BookingTimeline({ steps }: BookingTimelineProps) {
  return (
    <div className="space-y-0">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const dotClass = step.active ? dotColors.active : step.date ? dotColors.completed : dotColors.pending;

        return (
          <div key={step.label} className="relative flex gap-3">
            {!isLast && (
              <div className={cn(
                "absolute left-[11px] top-5 w-0.5 h-full -translate-x-1/2",
                step.date ? "bg-indigo-100" : "bg-slate-100"
              )} />
            )}
            <div className="flex flex-col items-center shrink-0 pt-0.5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn("h-[22px] w-[22px] rounded-full border-2 flex items-center justify-center", dotClass)}
              >
                {step.date && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-2 w-2 rounded-full bg-current"
                  />
                )}
              </motion.div>
            </div>
            <div className={cn("pb-5", isLast && "pb-0")}>
              <p className={cn(
                "text-xs font-medium",
                step.active ? "text-indigo-700" : step.date ? "text-slate-900" : "text-slate-400"
              )}>
                {step.label}
              </p>
              {step.date && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {new Date(step.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
              {step.description && (
                <p className="text-[10px] text-slate-500 mt-0.5">{step.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
