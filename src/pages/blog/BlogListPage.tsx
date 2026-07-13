import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Filter, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getArticles, deleteArticle, updateArticle } from "@/services/blogService";
import type { Article, ArticleStatus } from "@/types/blog";
import { ArticleCard } from "./components/ArticleCard";

export default function BlogListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["articles", search, statusFilter, page],
    queryFn: () => getArticles({ search, status: statusFilter !== "all" ? statusFilter as ArticleStatus : undefined, page, limit }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteArticle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["articles"] }),
  });

  const queryClient = useQueryClient();

  const handleDelete = useCallback((id: string) => {
    if (window.confirm("Delete this article? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  }, [deleteMutation]);

  const handleStatusToggle = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ArticleStatus }) =>
      updateArticle(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["articles"] }),
  });

  const articles = data?.data?.articles || [];
  const total = data?.pagination?.totalCount || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Articles</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your blog content</p>
        </div>
        <Button onClick={() => navigate("/admin/blog/new")} className="bg-[#5645d4] hover:bg-[#4534b3]">
          <Plus className="mr-2 h-4 w-4" /> New Article
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-gray-100 p-4 mb-4">
            <Edit className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No articles yet</h3>
          <p className="mt-1 text-sm text-gray-500">Create your first article to get started.</p>
          <Button onClick={() => navigate("/admin/blog/new")} className="mt-4 bg-[#5645d4] hover:bg-[#4534b3]">
            <Plus className="mr-2 h-4 w-4" /> New Article
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((article: Article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onEdit={() => navigate(`/admin/blog/${article.id}`)}
              onDelete={() => handleDelete(article.id)}
              onToggleStatus={() =>
                handleStatusToggle.mutate({
                  id: article.id,
                  status: article.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                })
              }
            />
          ))}
        </div>
      )}

      {total > limit && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
