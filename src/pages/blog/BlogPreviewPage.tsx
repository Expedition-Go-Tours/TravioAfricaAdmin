import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Edit3, Clock, Calendar, Eye, BookOpen } from "lucide-react";
import { getArticleById } from "@/services/blogService";
import { renderTipTap } from "@/lib/renderTipTap";
import type { Article } from "@/types/blog";

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const statusConfig = {
  DRAFT: { label: "Draft", dot: "bg-amber-400" },
  PUBLISHED: { label: "Published", dot: "bg-emerald-400" },
  ARCHIVED: { label: "Archived", dot: "bg-gray-300" },
} as const;

export default function BlogPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["article-preview", id],
    queryFn: () => getArticleById(id!),
    enabled: !!id,
  });

  const article = data?.data?.article as Article | undefined;

  return (
    <div className="min-h-screen bg-[#EDE9E3]">
      <style>{`
        @keyframes previewReveal {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes noiseFade {
          from { opacity: 0; }
          to { opacity: 0.025; }
        }
        .preview-noise {
          opacity: 0;
          animation: noiseFade 1.2s ease 0.3s forwards;
        }
        .preview-reveal {
          animation: previewReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>

      <div className="preview-noise fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "256px 256px",
      }} />

      {isLoading ? (
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="h-10 w-10 rounded-full border-2 border-[#5645d4]/30 border-t-[#5645d4] animate-spin" />
        </div>
      ) : !article ? (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4">
          <div className="rounded-full bg-white/80 p-5 mb-5 ring-1 ring-[#5645d4]/10">
            <BookOpen className="h-8 w-8 text-[#5645d4]/40" />
          </div>
          <h2 className="text-xl font-semibold text-[#1A1A1A]">Article not found</h2>
          <p className="mt-2 text-sm text-[#8B8580] max-w-xs">This article may have been removed or the link is invalid.</p>
          <button
            onClick={() => navigate("/admin/blog")}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#5645d4] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#4534b3] transition-all duration-300"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to articles
          </button>
        </div>
      ) : (
        <>
          <div className="relative z-10 mx-auto max-w-[1200px] px-4 pt-6 pb-24">
            <div className="preview-reveal sticky top-6 z-20 mx-auto mb-10 w-max rounded-full bg-white/95 backdrop-blur-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] ring-1 ring-black/5 px-1.5 py-1 flex items-center gap-0.5">
              <button
                onClick={() => navigate("/admin/blog")}
                className="group flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-[#8B8580] hover:text-[#1A1A1A] hover:bg-[#EDE9E3]/60 transition-all duration-300 active:scale-[0.97]"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <span className="h-4 w-px bg-[#E5DDD3]" />
              <button
                onClick={() => navigate(`/admin/blog/${article.id}`)}
                className="group flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-[#8B8580] hover:text-[#1A1A1A] hover:bg-[#EDE9E3]/60 transition-all duration-300 active:scale-[0.97]"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit
              </button>
              <span className="h-4 w-px bg-[#E5DDD3]" />
              <span className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-medium text-[#8B8580]">
                <span className={`h-1.5 w-1.5 rounded-full ${statusConfig[article.status].dot}`} />
                {statusConfig[article.status].label}
              </span>
            </div>

            <div
              className="rounded-[2rem] p-[2px] bg-gradient-to-b from-white/50 to-white/5 shadow-[0_8px_40px_rgba(0,0,0,0.06)] mx-auto max-w-[840px]"
              style={{ animation: "previewReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both" }}
            >
              <div className="rounded-[calc(2rem-2px)] overflow-hidden bg-[#F7F5F0]">
                {article.featuredImage && (
                  <div className="relative overflow-hidden">
                    <img
                      src={article.featuredImage}
                      alt={article.title}
                      className="w-full h-56 md:h-72 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#F7F5F0] via-[#F7F5F0]/5 to-transparent" />
                  </div>
                )}

                <article className="px-6 md:px-12 lg:px-16 py-10 md:py-14">
                  <div
                    className="flex flex-wrap items-center gap-2 mb-6"
                    style={{ animation: "previewReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both" }}
                  >
                    {article.category && (
                      <span className="inline-flex items-center rounded-full bg-[#5645d4]/6 px-3.5 py-1 text-[10px] font-semibold text-[#5645d4] uppercase tracking-[0.2em]">
                        {article.category.name}
                      </span>
                    )}
                    {article.tags?.map((tag: any, i: number) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center rounded-full bg-[#E5DDD3]/50 px-2.5 py-1 text-[10px] font-medium text-[#8B8580]"
                        style={{ animation: `previewReveal 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${0.25 + i * 0.05}s both` }}
                      >
                        #{tag.name}
                      </span>
                    ))}
                  </div>

                  <h1
                    className="font-serif text-3xl md:text-4xl lg:text-[2.5rem] tracking-tight leading-[1.12] text-[#1A1A1A] mb-6 text-balance"
                    style={{ animation: "previewReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both" }}
                  >
                    {article.title}
                  </h1>

                  <div
                    className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] font-medium text-[#8B8580] uppercase tracking-[0.12em] mb-8 pb-8"
                    style={{
                      borderBottom: "2px solid #E5DDD3",
                      boxShadow: "inset 0 -1px 0 #E5DDD3",
                      animation: "previewReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both",
                    }}
                  >
                    {article.author && (
                      <span className="flex items-center gap-2 normal-case tracking-normal">
                        {article.author.photoURL ? (
                          <img src={article.author.photoURL} alt="" className="h-6 w-6 rounded-full ring-2 ring-white" />
                        ) : (
                          <span className="h-6 w-6 rounded-full bg-gradient-to-br from-[#E5DDD3] to-[#D5CDC3] ring-2 ring-white" />
                        )}
                        <span className="font-semibold text-[#1A1A1A]">{article.author.name}</span>
                      </span>
                    )}
                    {article.publishedAt && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {formatDate(article.publishedAt)}
                      </span>
                    )}
                    {article.readTime && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {article.readTime} min read
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Eye className="h-3 w-3" />
                      {article.viewCount || 0} views
                    </span>
                  </div>

                  {article.excerpt && (
                    <div
                      className="text-base md:text-lg text-[#6B6560] leading-relaxed mb-10 pl-5 border-l-[3px] border-[#5645d4]/10 font-medium"
                      style={{ animation: "previewReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.35s both" }}
                    >
                      {article.excerpt}
                    </div>
                  )}

                  <div
                    className="text-[15px] md:text-base leading-[1.85] text-[#3A3A3A] space-y-5 [&_h1]:font-serif [&_h1]:text-2xl [&_h1]:tracking-tight [&_h1]:text-[#1A1A1A] [&_h1]:mt-12 [&_h1]:mb-4 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:tracking-tight [&_h2]:text-[#1A1A1A] [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-[#1A1A1A] [&_h3]:mt-8 [&_h3]:mb-2 [&_p]:leading-[1.85] [&_p]:text-[#3A3A3A] [&_p]:mb-5 [&_blockquote]:border-l-[3px] [&_blockquote]:border-[#5645d4]/10 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-[#6B6560] [&_blockquote]:text-base [&_blockquote]:my-8 [&_blockquote]:font-serif [&_img]:rounded-xl [&_img]:shadow-[0_4px_16px_rgba(0,0,0,0.06)] [&_img]:my-10 [&_img]:w-full [&_pre]:rounded-xl [&_pre]:bg-[#1A1A1A] [&_pre]:p-5 [&_pre]:text-sm [&_pre]:leading-relaxed [&_pre]:my-8 [&_pre]:overflow-x-auto [&_code]:rounded [&_code]:bg-[#E5DDD3]/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_code]:font-mono [&_code]:text-[#5645d4] [&_pre_code]:bg-transparent [&_pre_code]:text-[#E5DDD3] [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_hr]:border-[#E5DDD3] [&_hr]:my-10 [&_a]:text-[#5645d4] [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-[#5645d4]/20 [&_a:hover]:decoration-[#5645d4] [&_a]:transition-all [&_a]:duration-300"
                    style={{ animation: "previewReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.4s both" }}
                  >
                    {renderTipTap(article.body)}
                  </div>

                  {(article.metaTitle || article.metaDescription) && (
                    <div
                      className="mt-12 rounded-xl bg-white/70 p-5 ring-1 ring-[#E5DDD3]/60 shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
                      style={{ animation: "previewReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.5s both" }}
                    >
                      <p className="text-[10px] font-semibold text-[#8B8580] uppercase tracking-[0.2em] mb-2.5">
                        Search Preview
                      </p>
                      {article.metaTitle && (
                        <p className="text-sm font-medium text-[#1a0dab] truncate hover:underline cursor-pointer">
                          {article.metaTitle}
                        </p>
                      )}
                      {article.metaDescription && (
                        <p className="text-xs text-[#6B6560] mt-1 line-clamp-2 leading-relaxed">
                          {article.metaDescription}
                        </p>
                      )}
                    </div>
                  )}

                  <div
                    className="mt-16 pt-8 flex items-center justify-between text-[10px] font-medium text-[#8B8580] uppercase tracking-[0.15em]"
                    style={{
                      borderTop: "2px solid #E5DDD3",
                      boxShadow: "inset 0 1px 0 #E5DDD3",
                      animation: "previewReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.55s both",
                    }}
                  >
                    <span>{article.id?.slice(0, 8) || ""}</span>
                    <span>TravioAfrica — Editorial</span>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
