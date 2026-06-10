import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, ShieldCheck, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/axios";
import type { AdminRole, AdminPermission, PermissionGroup } from "@/lib/permissions";

const CATEGORY_COLORS: Record<string, string> = {
  Dashboard: "bg-blue-100 text-blue-700 border-blue-200",
  Analytics: "bg-purple-100 text-purple-700 border-purple-200",
  Suppliers: "bg-orange-100 text-orange-700 border-orange-200",
  Finance: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Reviews: "bg-pink-100 text-pink-700 border-pink-200",
  Tours: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Users: "bg-cyan-100 text-cyan-700 border-cyan-200",
  Chat: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Settings: "bg-slate-100 text-slate-700 border-slate-200",
};

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-muted">
                {["Role", "Admins", "Permissions", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left">
                    <Skeleton className="h-3 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border-muted">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className={`h-4 ${j === 2 ? "w-32" : j === 0 ? "w-28" : "w-12"}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

export function RolesTab() {
  const queryClient = useQueryClient();
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showDelete, setShowDelete] = useState<AdminRole | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPerms, setEditPerms] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => api.get("/admin/roles").then((r) => r.data?.data || []),
  });

  const { data: permsData, isLoading: permsLoading } = useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: () => api.get("/admin/roles/permissions").then((r) => r.data?.data?.permissions || []),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string; permissionIds: string[] }) =>
      api.post("/admin/roles", data),
    onSuccess: () => {
      toast.success("Role created");
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      closeEditor();
    },
    onError: (err: Error) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to create role"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; name: string; description: string; permissionIds: string[] }) =>
      api.put(`/admin/roles/${data.id}`, data),
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      closeEditor();
    },
    onError: (err: Error) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to update role"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/roles/${id}`),
    onSuccess: () => {
      toast.success("Role deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      setShowDelete(null);
    },
    onError: (err: Error) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to delete role"),
  });

  function openEditor(role: AdminRole | null) {
    if (role) {
      setEditingRole(role);
      setEditName(role.name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()));
      setEditDesc(role.description || "");
      setEditPerms(new Set(role.permissions.map((p) => p.permission.id)));
    } else {
      setEditingRole(null);
      setEditName("");
      setEditDesc("");
      setEditPerms(new Set());
    }
    setShowEditor(true);
  }

  function closeEditor() {
    setShowEditor(false);
    setEditingRole(null);
  }

  function togglePerm(key: string) {
    setEditPerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function saveRole() {
    const name = editName.trim().toLowerCase().replace(/\s+/g, "_");
    if (!name) { toast.error("Role name is required"); return; }
    const payload = { name, description: editDesc.trim(), permissionIds: Array.from(editPerms) };
    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const groupedPerms: PermissionGroup = {};
  if (permsData) {
    for (const p of permsData as AdminPermission[]) {
      if (!groupedPerms[p.category]) groupedPerms[p.category] = [];
      groupedPerms[p.category].push(p);
    }
  }

  const roles: AdminRole[] = rolesData || [];
  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (rolesLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search roles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>
        <Button onClick={() => openEditor(null)}>
          <Plus className="mr-2 h-4 w-4" /> Create Role
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-muted">
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Role</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Admins</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Permissions</th>
                <th className="px-4 py-3 text-right font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoles.map((role) => (
                <tr key={role.id} className="border-b border-border-muted last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-text-primary">
                        {role.name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                      {role.isSystem && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">System</Badge>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-xs text-text-secondary mt-0.5">{role.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {role._count?.users || 0}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 4).map((rp) => (
                        <Badge key={rp.permission.id} variant="outline" className="text-[10px] px-1.5 py-0">
                          {rp.permission.name}
                        </Badge>
                      ))}
                      {role.permissions.length > 4 && (
                        <span className="text-[10px] text-text-secondary">+{role.permissions.length - 4} more</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!role.isSystem && (
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditor(role)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setShowDelete(role)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRoles.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-text-secondary">No roles found</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={showEditor} onOpenChange={closeEditor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Create Role"}</DialogTitle>
            <DialogDescription>
              {editingRole ? "Update role name, description, and permissions" : "Define a new admin role with specific permissions"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="role-name">Role Name</Label>
              <Input id="role-name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. Finance Admin" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-desc">Description</Label>
              <Textarea id="role-desc" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="What this role can do..." rows={2} />
            </div>
            <div>
              <Label className="mb-2 block">Permissions</Label>
              {permsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-lg border border-border-muted p-3">
                      <Skeleton className="h-4 w-20 mb-3" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Array.from({ length: 4 }).map((_, j) => (
                          <div key={j} className="flex items-center gap-2">
                            <Skeleton className="h-4 w-4 rounded" />
                            <Skeleton className="h-3 w-28" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                Object.entries(groupedPerms).map(([category, perms]) => (
                  <div key={category} className="mb-3 rounded-lg border border-border-muted p-3">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      <span className={`inline-block rounded px-2 py-0.5 ${CATEGORY_COLORS[category] || "bg-gray-100 text-gray-700"}`}>
                        {category}
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {perms.map((perm) => (
                        <label key={perm.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={editPerms.has(perm.id)}
                            onChange={() => togglePerm(perm.id)}
                            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <div>
                            <span className="text-text-primary">{perm.name}</span>
                            {perm.description && (
                              <p className="text-[10px] text-text-secondary">{perm.description}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditor}>Cancel</Button>
            <Button onClick={saveRole} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingRole ? "Save Changes" : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{showDelete?.name?.replace(/_/g, " ")}"? This action cannot be undone.
              {showDelete?._count?.users ? (
                <p className="mt-2 text-red-600 font-medium">
                  {showDelete._count.users} admin(s) are assigned to this role. Reassign them first.
                </p>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => showDelete && deleteMutation.mutate(showDelete.id)}
              disabled={deleteMutation.isPending || (showDelete?._count?.users ?? 0) > 0}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
