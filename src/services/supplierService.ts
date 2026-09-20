import api from "@/lib/axios";

export interface AdminSupplierSearchResult {
  id: string;
  name: string;
  email: string;
  photoURL: string | null;
}

/** Search suppliers by name/email (server-side, capped at 20). */
export const searchSuppliers = (q: string) =>
  api
    .get("/admin/users/search", { params: { q, role: "supplier" } })
    .then((r) => (r.data?.data?.users || []) as AdminSupplierSearchResult[]);
