import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

function flattenPermissions(raw: any): string[] {
  if (!raw?.permissions) return [];
  return raw.permissions.map((p: any) => {
    if (typeof p === "string") return p;
    return p.permission?.key || p.key || "";
  }).filter(Boolean);
}

export function useAdminRole(enabled = true) {
  return useQuery({
    queryKey: ["admin", "me"],
    queryFn: async () => {
      const res = await api.get("/admin/me");
      const userData = res.data?.data;

      if (userData?.adminRoleId && userData?.adminRole) {
        const flat = {
          ...userData.adminRole,
          permissions: flattenPermissions(userData.adminRole),
        };
        localStorage.setItem("adminRoleId", userData.adminRoleId);
        localStorage.setItem("adminRole", JSON.stringify(flat));
        return flat;
      }

      if (!userData?.adminRoleId) {
        localStorage.removeItem("adminRoleId");
        localStorage.removeItem("adminRole");
      }

      return null;
    },
    enabled,
    staleTime: 60 * 1000,
    refetchInterval: 3 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
