import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";

function MaintSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-52" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-3 w-28" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SystemTab() {
  const queryClient = useQueryClient();

  const { data: maintMode, isLoading: maintLoading } = useQuery({
    queryKey: ["admin", "settings", "system.maintenance_mode"],
    queryFn: () =>
      api.get("/admin/settings/system.maintenance_mode").then((r) => r.data?.data?.["system.maintenance_mode"] === true || r.data?.data?.["system.maintenance_mode"] === "true"),
  });

  const toggleMaint = useMutation({
    mutationFn: (enabled: boolean) =>
      api.put("/admin/settings", { settings: { "system.maintenance_mode": enabled } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings", "system.maintenance_mode"] });
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {maintLoading ? (
        <MaintSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${maintMode ? "text-red-500" : "text-amber-500"}`} />
              <h3 className="text-sm font-semibold text-text-primary">Maintenance Mode</h3>
            </div>
            <p className="text-xs text-text-secondary">Put the platform in maintenance mode</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                disabled={toggleMaint.isPending}
                onClick={() => toggleMaint.mutate(!maintMode)}
                className={maintMode
                  ? "text-green-600 border-green-200 hover:bg-green-50"
                  : "text-amber-600 border-amber-200 hover:bg-amber-50"
                }
              >
                {toggleMaint.isPending ? (
                  <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="mr-2 h-4 w-4" />
                )}
                {maintMode ? "Disable Maintenance Mode" : "Enable Maintenance Mode"}
              </Button>
              <span className="text-xs text-text-secondary">
                Currently:{" "}
                <strong className={maintMode ? "text-red-600" : "text-green-600"}>
                  {maintMode ? "Under Maintenance" : "Live"}
                </strong>
              </span>
            </div>
            {toggleMaint.isError && (
              <p className="mt-2 text-xs text-red-500">Failed to toggle maintenance mode</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
