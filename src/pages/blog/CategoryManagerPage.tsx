import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, ChevronRight, ChevronDown, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/services/blogService";
import type { ArticleCategory } from "@/types/blog";
import { CategoryDialog } from "./components/CategoryDialog";

export default function CategoryManagerPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ArticleCategory | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  const categories: ArticleCategory[] = categoriesData?.data?.categories || [];

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editingCategory
        ? updateCategory(editingCategory.id, data)
        : createCategory(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const rootCategories = categories?.filter((c: any) => !c.parentId) || [];
  const childCategories = (parentId: string) => categories?.filter((c: any) => c.parentId === parentId) || [];

  const renderCategory = (cat: any, depth = 0) => (
    <div key={cat.id}>
      <div
        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 rounded-lg group"
        style={{ paddingLeft: `${16 + depth * 24}px` }}
      >
        <div className="flex items-center gap-2">
          {childCategories(cat.id).length > 0 && (
            <button onClick={() => setExpanded((prev) => { const next = new Set(prev); next.has(cat.id) ? next.delete(cat.id) : next.add(cat.id); return next; })}>
              {expanded.has(cat.id) ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
            </button>
          )}
          <span className="text-sm font-medium text-gray-900">{cat.name}</span>
          <span className="text-xs text-gray-400 ml-2">({cat.articleCount || 0})</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCategory(cat); setDialogOpen(true); }}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => { if (window.confirm("Delete this category?")) deleteMutation.mutate(cat.id); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {expanded.has(cat.id) && childCategories(cat.id).map((child: any) => renderCategory(child, depth + 1))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Categories</h1>
          <p className="mt-1 text-sm text-gray-500">Organize your articles into categories</p>
        </div>
        <Button onClick={() => { setEditingCategory(null); setDialogOpen(true); }} className="bg-[#5645d4] hover:bg-[#4534b3]">
          <Plus className="mr-2 h-4 w-4" /> New Category
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : rootCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-gray-100 p-4 mb-4">
            <FolderTree className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No categories yet</h3>
          <p className="mt-1 text-sm text-gray-500">Create your first category to organize articles.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-white divide-y">
          {rootCategories.map((cat: any) => renderCategory(cat))}
        </div>
      )}

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editingCategory}
        categories={categories || []}
        onSave={async (data) => {
          await saveMutation.mutateAsync(data);
        }}
      />
    </div>
  );
}
