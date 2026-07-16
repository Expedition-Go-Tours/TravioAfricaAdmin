import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Star, Banknote, Users, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationStats {
  pendingReviews?: number;
  pendingSuppliers?: number;
  pendingPayouts?: number;
  totalPending?: number;
}

interface NotificationsCardProps {
  stats?: NotificationStats;
  loading?: boolean;
}

const notificationItems = [
  { key: "pendingSuppliers", label: "New Supplier Applications", icon: Users, route: "/admin/suppliers" },
  { key: "pendingReviews", label: "Reviews to Moderate", icon: Star, route: "/admin/reviews" },
  { key: "pendingPayouts", label: "Payout Requests", icon: Banknote, route: "/admin/payouts" },
];

export function NotificationsCard({ stats, loading }: NotificationsCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="h-full border-0 shadow-sm bg-white rounded-2xl">
      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="h-4 w-4 text-gray-500" />
            Notifications
          </CardTitle>
          {stats && stats.totalPending !== undefined && stats.totalPending > 0 && (
            <span className="text-[11px] font-semibold text-white bg-red-500 px-2 py-0.5 rounded-full">
              {stats.totalPending}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {notificationItems.map((item) => {
              const count = stats?.[item.key as keyof NotificationStats] ?? 0;
              const Icon = item.icon;
              
              return (
                <button
                  key={item.key}
                  onClick={() => navigate(item.route)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3.5 rounded-xl",
                    "hover:bg-gray-50 transition-colors text-left group"
                  )}
                >
                  <Icon className="h-5 w-5 text-gray-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className={cn(
                      "text-xs font-medium",
                      count > 0 ? "text-amber-600" : "text-gray-400"
                    )}>
                      {count > 0 ? `${count} pending` : "All clear"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-600 transition-colors" />
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
