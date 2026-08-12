import { Eye, Clock, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Article, ArticleStatus } from "@/types/blog";
import OptimizedImage from "@/components/shared/OptimizedImage";

interface ArticleCardProps {
  article: Article;
  onPreview: () => void;
}

const statusConfig: Record<ArticleStatus, { label: string; dot: string; bg: string }> = {
  DRAFT: { label: "Draft", dot: "bg-amber-400", bg: "bg-amber-50 border-amber-200" },
  PUBLISHED: { label: "Published", dot: "bg-emerald-400", bg: "bg-emerald-50 border-emerald-200" },
  ARCHIVED: { label: "Archived", dot: "bg-gray-300", bg: "bg-gray-50 border-gray-200" },
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

function truncate(text: string, max: number) {
  if (!text || text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "...";
}

export function ArticleCard({ article, onPreview }: ArticleCardProps) {
  const status = statusConfig[article.status];
  const hasImage = !!article.featuredImage;

  return (
    <div
      className="group relative rounded-[1.25rem] p-1 bg-gradient-to-b from-gray-100/60 to-gray-50/30 ring-1 ring-gray-100/80 transition-all duration-500 ease-spring hover:shadow-soft-lg hover:from-gray-100/80 hover:to-gray-50/50 cursor-pointer"
      onClick={onPreview}
    >
      <div className="rounded-[calc(1.25rem-0.25rem)] overflow-hidden bg-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
        <div className="flex flex-1 flex-col sm:flex-row">
          <div className={`relative sm:w-48 h-36 sm:h-auto shrink-0 overflow-hidden ${!hasImage ? "bg-gradient-to-br from-[#5645d4]/4 to-[#5645d4]/8" : ""}`}>
            {hasImage ? (
              <OptimizedImage src={article.featuredImage!} alt={article.title} width={800} className="h-full w-full object-cover transition-transform duration-700 ease-spring group-hover:scale-105" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <div className="flex flex-col items-center gap-1">
                  <div className="rounded-xl bg-[#5645d4]/6 p-2.5">
                    <BookOpen className="h-5 w-5 text-[#5645d4]/30" />
                  </div>
                  <span className="text-[10px] font-medium text-[#5645d4]/25 uppercase tracking-[0.15em]">No image</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col justify-between p-4 md:p-5 min-w-0">
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${status.bg}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 leading-snug group-hover:text-[#5645d4] transition-colors duration-300 line-clamp-1">
                    {article.title}
                  </h3>
                  {article.excerpt && (
                    <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{truncate(article.excerpt, 150)}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                {article.category && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                    {article.category.name}
                  </Badge>
                )}
                {article.author && (
                  <span className="flex items-center gap-1">
                    {article.author.photoURL ? (
                      <OptimizedImage src={article.author.photoURL} alt="" width={16} className="h-4 w-4 rounded-full" />
                    ) : (
                      <span className="h-4 w-4 rounded-full bg-gray-100 inline-block" />
                    )}
                    {article.author.name}
                  </span>
                )}
                {article.readTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {article.readTime} min
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {article.viewCount || 0}
                </span>
                <span>{formatDate(article.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
