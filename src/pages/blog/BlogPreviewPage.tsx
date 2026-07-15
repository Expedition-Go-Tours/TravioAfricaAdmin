import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, Edit3 } from "lucide-react"
import { getArticleById } from "@/services/blogService"
import { renderTipTap } from "@/lib/renderTipTap"
import type { Article } from "@/types/blog"

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

const statusConfig = {
  DRAFT: { label: "Draft", dot: "bg-amber-400" },
  PUBLISHED: { label: "Published", dot: "bg-emerald-400" },
  ARCHIVED: { label: "Archived", dot: "bg-gray-300" },
} as const

export default function BlogPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ["article-preview", id],
    queryFn: () => getArticleById(id!),
    enabled: !!id,
  })

  const article = data?.data?.article as Article | undefined

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-[#262D4D]/20 border-t-[#262D4D] animate-spin" />
      </div>
    )
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-xl font-semibold text-[#10152E]">Article not found</h2>
        <p className="mt-2 text-sm text-[#4E5265]">
          This article may have been removed or the link is invalid.
        </p>
        <button
          onClick={() => navigate("/admin/blog")}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#262D4D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#10152E] transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to articles
        </button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[#FAFAFA]">
      <AdminBar article={article} navigate={navigate} />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[768px] px-6 pt-6 pb-16 bg-[#f8fafc] border border-[#E5E6EA]">
          {article.category && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold text-[#4E5265] uppercase tracking-wider">
                {article.category.name}
              </span>
            </div>
          )}

          <h1 className="text-4xl md:text-[48px] font-bold leading-[1.1] text-[#05091C] tracking-tight text-balance mb-8">
            {article.title}
          </h1>

          {article.featuredImage && (
            <div className="w-full aspect-[3/1] overflow-hidden bg-[#E5E6EA] mb-8">
              <img
                src={article.featuredImage}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex items-center gap-3 pb-6 border-b border-[#E5E6EA] mb-8">
            {article.author?.photoURL ? (
              <img
                src={article.author.photoURL}
                alt=""
                className="h-10 w-10 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-[#E5E6EA] shrink-0" />
            )}
            <div className="text-sm text-[#10152E]">
              <span className="font-semibold">{article.author?.name || "Anonymous"}</span>
              <span className="text-[#4E5265] mx-1.5">•</span>
              <span className="text-[#4E5265]">
                {article.publishedAt ? formatDate(article.publishedAt) : "Not published"}
              </span>
            </div>
          </div>

          {article.excerpt && (
            <p className="text-base leading-[1.8] text-[#10152E] mb-8">
              {article.excerpt}
            </p>
          )}

          <div
            className="text-base leading-[1.8] text-[#10152E] space-y-6
            [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-[#05091C] [&_h1]:tracking-tight [&_h1]:mt-12 [&_h1]:mb-4
            [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-[#05091C] [&_h2]:tracking-tight [&_h2]:mt-10 [&_h2]:mb-3
            [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-[#05091C] [&_h3]:mt-8 [&_h3]:mb-2
            [&_p]:leading-[1.8] [&_p]:mb-5
            [&_blockquote]:border-t [&_blockquote]:border-b [&_blockquote]:border-[#E5E6EA] [&_blockquote]:py-6 [&_blockquote]:my-10 [&_blockquote]:px-0 [&_blockquote]:italic [&_blockquote]:text-[#4E5265] [&_blockquote]:w-full
            [&_img]:max-w-full [&_img]:h-auto [&_img]:my-8 [&_img]:mx-auto [&_img]:rounded-sm
            [&_pre]:bg-[#05091C] [&_pre]:p-5 [&_pre]:text-sm [&_pre]:leading-relaxed [&_pre]:my-8 [&_pre]:overflow-x-auto
            [&_code]:bg-[#E5E6EA] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_code]:font-mono [&_code]:text-[#262D4D]
            [&_pre_code]:bg-transparent [&_pre_code]:text-[#FAFAFA]
            [&_ul]:space-y-2 [&_ul]:pl-5 [&_ol]:space-y-2 [&_ol]:pl-5
            [&_hr]:border-[#E5E6EA] [&_hr]:my-10
            [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-[#E5E6EA] [&_a:hover]:decoration-[#262D4D] [&_a]:transition-all [&_a]:duration-300"
          >
            {renderTipTap(article.body)}
          </div>
        </div>
      </main>
    </div>
  )
}

function AdminBar({
  article,
  navigate,
}: {
  article: Article
  navigate: ReturnType<typeof useNavigate>
}) {
  const status = statusConfig[article.status] ?? statusConfig.DRAFT
  return (
    <div className="bg-white border-b border-[#E5E6EA] shrink-0">
      <div className="mx-auto max-w-[1400px] px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/admin/blog")}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold text-[#4E5265] hover:text-[#10152E] hover:bg-black/5 transition-all"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <span className="h-4 w-px bg-[#E5E6EA]" />
          <button
            onClick={() => navigate(`/admin/blog/${article.id}`)}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold text-[#4E5265] hover:text-[#10152E] hover:bg-black/5 transition-all"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
        <span className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold bg-black/5 text-[#4E5265]">
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>
    </div>
  )
}
