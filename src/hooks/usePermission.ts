import { useEffect, useState } from "react";
import api from "@/lib/axios";

interface StoredAdminRole {
  id: string;
  name: string;
  permissions: string[];
}

function getStoredAdminRole(): StoredAdminRole | null {
  try {
    const raw = localStorage.getItem("adminRole");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredAdminRole(role: StoredAdminRole | null) {
  if (role) {
    localStorage.setItem("adminRole", JSON.stringify(role));
  } else {
    localStorage.removeItem("adminRole");
  }
}

export function usePermission() {
  const [adminRole, setAdminRole] = useState<StoredAdminRole | null>(getStoredAdminRole);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = getStoredAdminRole();
    if (stored) return;

    setLoading(true);
    api
      .get("/admin/roles")
      .then((res) => {
        const data = res.data?.data;
        const matching: StoredAdminRole | undefined = data?.find?.(
          (r: StoredAdminRole) => r.id === localStorage.getItem("adminRoleId"),
        );
        if (matching) setStoredAdminRole(matching);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const can = (permissionKey: string): boolean => {
    if (!adminRole) return false;
    if (adminRole.name === "super_admin") return true;
    return adminRole.permissions.includes(permissionKey);
  };

  const isSuperAdmin = adminRole?.name === "super_admin";

  return { can, isSuperAdmin, adminRole, loading, setAdminRole };
}

export function hasPermission(permissionKey: string): boolean {
  try {
    const raw = localStorage.getItem("adminRole");
    if (!raw) return false;
    const role: StoredAdminRole = JSON.parse(raw);
    if (role.name === "super_admin") return true;
    return role.permissions.includes(permissionKey);
  } catch {
    return false;
  }
}

export function isSuperAdmin(): boolean {
  try {
    const raw = localStorage.getItem("adminRole");
    if (!raw) return false;
    const role: StoredAdminRole = JSON.parse(raw);
    return role.name === "super_admin";
  } catch {
    return false;
  }
}
