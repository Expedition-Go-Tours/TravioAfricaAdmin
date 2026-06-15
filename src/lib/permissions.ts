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

const ROUTE_PRIORITY = [
  { permission: 'dashboard.*', route: '/admin/overview' },
  { permission: 'analytics.view', route: '/admin/overview' },
  { permission: 'chat.customers', route: '/admin/chat/customers' },
  { permission: 'chat.suppliers', route: '/admin/chat/suppliers' },
  { permission: 'reviews.view', route: '/admin/reviews' },
  { permission: 'suppliers.view', route: '/admin/suppliers' },
  { permission: 'payouts.view', route: '/admin/payouts' },
  { permission: 'tours.view', route: '/admin/tours' },
  { permission: 'users.view', route: '/admin/user-growth' },
  { permission: 'payout-methods.view', route: '/admin/payout-methods' },
  { permission: 'settings.access', route: '/admin/settings' },
];

function hasStoredPermission(permissionKey: string): boolean {
  try {
    const raw = localStorage.getItem('adminRole');
    if (!raw) return false;
    const role = JSON.parse(raw);
    if (role.name === 'super_admin') return true;
    if (permissionKey.endsWith('*')) {
      const prefix = permissionKey.slice(0, -1);
      return role.permissions?.some((p: string) => p.startsWith(prefix));
    }
    return role.permissions?.includes(permissionKey);
  } catch {
    return false;
  }
}

export function getDefaultRoute(): string {
  for (const { permission, route } of ROUTE_PRIORITY) {
    if (hasStoredPermission(permission)) return route;
  }
  return '/admin/overview';
}
