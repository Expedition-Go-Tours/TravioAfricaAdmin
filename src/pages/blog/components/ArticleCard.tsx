import { Edit, Trash2, FileText, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Article, ArticleStatus } from "@/types/blog";

interface ArticleCardProps {
  article: Article;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}

const statusColors: Record<ArticleStatus, string> = {
  DRAFT: "bg-yellow-100 text-yellow-800",
  PUBLISHED: "bg-green-100 text-green-800",
  ARCHIVED: "bg-gray-100 text-gray-600",
};

const statusLabels: Record<ArticleStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export function ArticleCard({ article, onEdit, onDelete, onToggleStatus }: ArticleCardProps) {
  return (
    <div className="group flex items-center justify-between rounded-xl border bg-white px-5 py-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#5645d4]/10">
          <FileText className="h-5 w-5 text-[#5645d4]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-gray-900 truncate">{article.title}</h3>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[article.status]}`}>
              {statusLabels[article.status]}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
            {article.category && <span>{article.category.name}</span>}
            {article.author && <span>by {article.author.name}</span>}
            {article.readTime && <span>{article.readTime} min read</span>}
            <span>{new Date(article.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {article.status === "PUBLISHED" ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500" onClick={onToggleStatus} title="Unpublish">
            <XCircle className="h-4 w-4" />
          </Button>
        ) : article.status === "DRAFT" ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500" onClick={onToggleStatus} title="Publish">
            <CheckCircle className="h-4 w-4" />
          </Button>
        ) : null}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
