import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

function flattenPermissions(raw: { permissions?: unknown[] }): string[] {
  if (!raw?.permissions) return [];
  return raw.permissions.map((p: unknown) => {
    if (typeof p === "string") return p;
    if (p && typeof p === "object" && "permission" in (p as Record<string, unknown>)) {
      const perm = (p as Record<string, unknown>).permission as Record<string, unknown> | undefined;
      if (perm && typeof perm.key === "string") return perm.key;
    }
    if (p && typeof p === "object" && "key" in (p as Record<string, unknown>)) {
      const key = (p as Record<string, unknown>).key;
      if (typeof key === "string") return key;
    }
    return "";
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
        localStorage.setItem("userName", userData.name || "");
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
