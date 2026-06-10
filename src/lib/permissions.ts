export interface AdminPermission {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  isSystem: boolean;
}

export interface AdminRole {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isDefault: boolean;
  _count?: { users: number };
  permissions: { permission: AdminPermission }[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  photoURL: string;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  adminRoleId: string | null;
  adminRole: { id: string; name: string; description: string | null } | null;
}

export interface AdminSettings {
  [key: string]: unknown;
}

export interface PermissionGroup {
  [category: string]: AdminPermission[];
}

export interface SystemConfig {
  [key: string]: unknown;
}
