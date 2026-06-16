import { useState, useEffect, useCallback } from "react";

interface RawPermission {
  permission?: { key: string };
  key?: string;
}

interface StoredAdminRole {
  id: string;
  name: string;
  permissions: string[];
}

function flattenPermissions(raw: any): string[] {
  if (!raw?.permissions) return [];
  return raw.permissions.map((p: any) => {
    if (typeof p === "string") return p;
    return p.permission?.key || p.key || "";
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
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handler = () => setVersion((v) => v + 1);

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
  }, [version]);

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
