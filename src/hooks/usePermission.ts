import { useEffect, useCallback } from "react";

interface StoredAdminRole {
  id: string;
  name: string;
  permissions: string[];
}

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

function getStoredAdminRole(): StoredAdminRole | null {
  try {
    const raw = localStorage.getItem("adminRole");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      id: parsed.id || "",
      name: parsed.name || "",
      permissions: flattenPermissions(parsed),
    };
  } catch {
    return null;
  }
}

export function usePermission() {
  useEffect(() => {
    const handler = () => {
      window.dispatchEvent(new Event("local-storage-change"));
    };

    window.addEventListener("storage", handler);

    const origSetItem = localStorage.setItem;
    localStorage.setItem = function (key, value) {
      origSetItem.call(this, key, value);
      if (key === "adminRole") handler();
    };

    return () => {
      window.removeEventListener("storage", handler);
      localStorage.setItem = origSetItem;
    };
  }, []);

  const adminRole = getStoredAdminRole();

  const can = useCallback((permissionKey: string): boolean => {
    const role = getStoredAdminRole();
    if (!role) return false;
    if (role.name === "super_admin") return true;
    if (permissionKey.endsWith("*")) {
      const prefix = permissionKey.slice(0, -1);
      return role.permissions.some((p) => p.startsWith(prefix));
    }
    return role.permissions.includes(permissionKey);
  }, []);

  const isSuperAdmin = adminRole?.name === "super_admin";

  return { can, isSuperAdmin, adminRole, loading: false, setAdminRole: () => {} };
}

export function hasPermission(permissionKey: string): boolean {
  try {
    const raw = localStorage.getItem("adminRole");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed.name === "super_admin") return true;
    const permissions = flattenPermissions(parsed);
    if (permissionKey.endsWith("*")) {
      const prefix = permissionKey.slice(0, -1);
      return permissions.some((p: string) => p.startsWith(prefix));
    }
    return permissions.includes(permissionKey);
  } catch {
    return false;
  }
}

export function isSuperAdmin(): boolean {
  try {
    const raw = localStorage.getItem("adminRole");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed.name === "super_admin";
  } catch {
    return false;
  }
}
