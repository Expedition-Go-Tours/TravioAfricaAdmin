import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, ArrowUpDown, LayoutList, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getArticles, deleteArticle, updateArticle } from "@/services/blogService";
import type { Article, ArticleStatus } from "@/types/blog";
import { ArticleCard } from "./components/ArticleCard";
import { ArticlePreviewDialog } from "./components/ArticlePreviewDialog";

type SortOption = "newest" | "oldest" | "popular";

export default function BlogListPage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const limit = 20;
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["articles", search, statusFilter, sortBy, page],
    queryFn: () => getArticles({
      search,
      status: statusFilter !== "all" ? statusFilter as ArticleStatus : undefined,
      sortBy,
      page,
      limit,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteArticle(id),
    onSuccess: () => {
      toast.success("Article deleted");
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
  });

  const handleStatusToggle = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ArticleStatus }) =>
      updateArticle(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
  });

  const articles = data?.data?.articles || [];
  const total = data?.pagination?.totalCount || 0;
  const totalPages = data?.pagination?.totalPages || 1;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-[#5645d4]/6 px-3 py-1 text-[10px] font-semibold text-[#5645d4] uppercase tracking-[0.2em] mb-3">
            Content
          </span>
          <h1 className="text-2xl font-semibold text-gray-900">Articles</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your blog content</p>
        </div>
        <Button onClick={() => navigate("/admin/blog/new")} className="bg-[#5645d4] hover:bg-[#4534b3] rounded-full px-5">
          <Plus className="mr-2 h-4 w-4" /> New Article
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search articles..."
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); }}
            className="pl-10 pr-10 rounded-xl"
          />
          {isFetching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 rounded-full border-2 border-gray-200 border-t-[#5645d4] animate-spin" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[130px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v: SortOption) => { setSortBy(v); setPage(1); }}>
            <SelectTrigger className="w-[130px] rounded-xl">
              <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="popular">Most viewed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {total > 0 && !isLoading && (
        <p className="text-xs text-gray-400">
          Showing {articles.length} of {total} article{total !== 1 ? "s" : ""}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-gray-50 p-4 mb-4 ring-1 ring-gray-100">
            <LayoutList className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            {search || statusFilter !== "all" ? "No articles found" : "No articles yet"}
          </h3>
          <p className="mt-1 text-sm text-gray-500 max-w-sm">
            {search || statusFilter !== "all"
              ? "Try adjusting your search or filter to find what you're looking for."
              : "Create your first article to start building your blog content."}
          </p>
          {!search && statusFilter === "all" && (
            <Button onClick={() => navigate("/admin/blog/new")} className="mt-4 bg-[#5645d4] hover:bg-[#4534b3] rounded-full px-5">
              <Plus className="mr-2 h-4 w-4" /> New Article
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((article: Article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onPreview={() => setPreviewId(article.id)}
              onEdit={() => navigate(`/admin/blog/${article.id}`)}
              onDelete={() => setDeleteConfirm(article.id)}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-8 rounded-xl"
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = page <= 3
                ? i + 1
                : page >= totalPages - 2
                  ? totalPages - 4 + i
                  : page - 2 + i;
              if (pageNum < 1 || pageNum > totalPages) return null;
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "default" : "outline"}
                  size="sm"
                  className={`h-8 w-8 p-0 rounded-xl ${pageNum === page ? "bg-[#5645d4] hover:bg-[#4534b3]" : ""}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 rounded-xl"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) deleteMutation.mutate(deleteConfirm);
          setDeleteConfirm(null);
        }}
        title="Delete article"
        description="Are you sure you want to delete this article? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="destructive"
        loading={deleteMutation.isPending}
      />

      <ArticlePreviewDialog
        articleId={previewId}
        onClose={() => setPreviewId(null)}
        onEdit={(id) => navigate(`/admin/blog/${id}`)}
      />
    </div>
  );
}
