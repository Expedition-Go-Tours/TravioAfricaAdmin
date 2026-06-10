import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

interface AdminRoleInfo {
  id: string;
  name: string;
  permissions: string[];
}

export function useAdminRole(enabled = true) {
  return useQuery({
    queryKey: ["admin", "my-role"],
    queryFn: async () => {
      const res = await api.get("/admin/roles");
      const roles: AdminRoleInfo[] = res.data?.data || [];
      const adminRoleId = localStorage.getItem("adminRoleId");
      const match = roles.find((r) => r.id === adminRoleId) || null;

      if (match) {
        localStorage.setItem("adminRole", JSON.stringify(match));
      }

      return match;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
