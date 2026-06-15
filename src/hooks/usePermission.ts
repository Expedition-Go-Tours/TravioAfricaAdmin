import { useMemo } from "react";

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

export function usePermission() {
  const adminRole = useMemo(() => getStoredAdminRole(), []);

  const can = (permissionKey: string): boolean => {
    if (!adminRole) return false;
    if (adminRole.name === "super_admin") return true;
    if (permissionKey.endsWith('*')) {
      const prefix = permissionKey.slice(0, -1);
      return adminRole.permissions.some((p) => p.startsWith(prefix));
    }
    return adminRole.permissions.includes(permissionKey);
  };

  const isSuperAdmin = adminRole?.name === "super_admin";

  return { can, isSuperAdmin, adminRole, loading: false, setAdminRole: () => {} };
}

export function hasPermission(permissionKey: string): boolean {
  try {
    const raw = localStorage.getItem("adminRole");
    if (!raw) return false;
    const role: StoredAdminRole = JSON.parse(raw);
    if (role.name === "super_admin") return true;
    if (permissionKey.endsWith('*')) {
      const prefix = permissionKey.slice(0, -1);
      return role.permissions.some((p) => p.startsWith(prefix));
    }
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
