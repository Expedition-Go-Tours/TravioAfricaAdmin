import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Star, Banknote, Users, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationStats {
  pendingReviews?: number;
  pendingSuppliers?: number;
  pendingPayouts?: number;
  totalPending?: number;
}

interface PendingActionsPanelProps {
  stats?: NotificationStats;
  loading?: boolean;
}

const actions = [
  { 
    key: "pendingSuppliers", 
    label: "Supplier Applications", 
    icon: Users, 
    color: "bg-blue-100 text-blue-600",
    route: "/admin/suppliers",
    filter: "PENDING"
  },
  { 
    key: "pendingReviews", 
    label: "Reviews to Moderate", 
    icon: Star, 
    color: "bg-yellow-100 text-yellow-600",
    route: "/admin/reviews"
  },
  { 
    key: "pendingPayouts", 
    label: "Payouts to Approve", 
    icon: Banknote, 
    color: "bg-green-100 text-green-600",
    route: "/admin/payouts"
  },
];

export function PendingActionsPanel({ stats, loading }: PendingActionsPanelProps) {
  const navigate = useNavigate();

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Pending Actions
          </CardTitle>
          {stats && stats.totalPending !== undefined && stats.totalPending > 0 && (
            <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
              {stats.totalPending} total
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {actions.map((action) => {
              const count = stats?.[action.key as keyof NotificationStats] ?? 0;
              const Icon = action.icon;
              
              return (
                <button
                  key={action.key}
                  onClick={() => navigate(action.route)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border border-border",
                    "hover:bg-surface-muted/50 transition-colors text-left group"
                  )}
                >
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", action.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{action.label}</p>
                    <p className={cn(
                      "text-xs font-semibold",
                      count > 0 ? "text-amber-600" : "text-text-tertiary"
                    )}>
                      {count > 0 ? `${count} pending` : "All clear"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-text-tertiary group-hover:text-primary transition-colors" />
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
