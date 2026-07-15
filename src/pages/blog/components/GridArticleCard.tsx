import { useState } from "react"
import { MoreVertical, Edit, Trash2, ArrowUpDown, ArrowUpRight, BookOpen } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Article, ArticleStatus } from "@/types/blog"

interface GridArticleCardProps {
  article: Article
  onPreview: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleStatus: () => void
}

const statusConfig: Record<ArticleStatus, { label: string; dot: string }> = {
  DRAFT: { label: "Draft", dot: "bg-amber-400" },
  PUBLISHED: { label: "Published", dot: "bg-emerald-400" },
  ARCHIVED: { label: "Archived", dot: "bg-gray-300" },
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function GridArticleCard({ article, onPreview, onEdit, onDelete, onToggleStatus }: GridArticleCardProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const status = statusConfig[article.status]
  const hasImage = !!article.featuredImage

  return (
    <div className="group relative rounded-sm bg-white shadow-lg ring-1 ring-black/5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer">
      <div className="relative h-60 overflow-hidden bg-gray-100" onClick={onPreview}>
        {hasImage ? (
          <img
            src={article.featuredImage!}
            alt={article.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-xl bg-purple-50 p-3">
                <BookOpen className="h-6 w-6 text-purple-300" />
              </div>
              <span className="text-xs font-medium text-purple-300 uppercase tracking-wider">No image</span>
            </div>
          </div>
        )}

        <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm ring-1 ring-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white">
                <MoreVertical className="h-4 w-4 text-gray-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleStatus}>
                <ArrowUpDown className="h-4 w-4" />
                {article.status === "PUBLISHED" ? "Unpublish" : "Publish"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="absolute top-3 left-3" onClick={(e) => e.stopPropagation()}>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium bg-white/90 backdrop-blur-sm shadow-sm ring-1 ring-black/5`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>
      </div>

      <div className="p-6 pt-5" onClick={onPreview}>
        {article.category && (
          <span className="inline-block text-sm font-semibold text-purple-700 mb-2">
            {article.category.name}
          </span>
        )}

        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-xl font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-purple-700 transition-colors duration-200">
            {article.title}
          </h3>
          <ArrowUpRight className="h-5 w-5 min-w-5 text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>

        {article.excerpt && (
          <p className="text-base text-gray-500 leading-relaxed line-clamp-2 mb-6">
            {article.excerpt}
          </p>
        )}

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 ring-2 ring-white shrink-0">
            {article.author?.photoURL ? (
              <img src={article.author.photoURL} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-purple-100 to-purple-200" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {article.author?.name || "Anonymous"}
            </p>
            <p className="text-sm text-gray-500">
              {article.publishedAt ? formatDate(article.publishedAt) : formatDate(article.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
