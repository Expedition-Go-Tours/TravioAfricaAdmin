import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Eye, Clock, Calendar, Edit3, ChevronLeft, BookOpen } from "lucide-react";
import { getArticleById } from "@/services/blogService";
import { renderTipTap } from "@/lib/renderTipTap";
import type { Article } from "@/types/blog";

interface ArticlePreviewDialogProps {
  articleId: string | null;
  onClose: () => void;
  onEdit: (id: string) => void;
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const stagger = (delay: number) => ({
  animation: `previewReveal 0.8s cubic-bezier(0.32,0.72,0,1) ${delay}ms both`,
});

export function ArticlePreviewDialog({ articleId, onClose, onEdit }: ArticlePreviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (articleId) {
      setOpen(true);
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
      setTimeout(() => setOpen(false), 400);
    }
  }, [articleId]);

  const handleClose = useCallback(() => {
    setMounted(false);
    setTimeout(() => onClose(), 400);
  }, [onClose]);

  const { data, isLoading } = useQuery({
    queryKey: ["article-preview", articleId],
    queryFn: () => getArticleById(articleId!),
    enabled: !!articleId,
  });

  const article = data?.data?.article as Article | undefined;

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-800 ease-spring ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="absolute inset-0 bg-[#0a0a0a]/60 backdrop-blur-sm" onClick={handleClose} />

      <div
        className={`absolute inset-0 overflow-y-auto transition-all duration-800 ease-spring ${
          mounted ? "translate-y-0" : "translate-y-12"
        }`}
      >
        <div className="min-h-full flex flex-col">
          <div className="flex-1" />

          <style>{`
            @keyframes previewReveal {
              from { opacity: 0; transform: translateY(24px) scale(0.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes noiseFade {
              from { opacity: 0; }
              to { opacity: 0.035; }
            }
            .preview-noise {
              opacity: 0;
              animation: noiseFade 1.2s ease 0.3s forwards;
            }
          `}</style>

          <div className="preview-noise fixed inset-0 pointer-events-none z-[1]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "256px 256px",
          }} />

          {isLoading ? (
            <div className="flex items-center justify-center py-40">
              <div className="h-10 w-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            </div>
          ) : !article ? (
            <div className="flex items-center justify-center py-40 text-white/60 text-lg">
              Article not found
            </div>
          ) : (
            <div className="w-full max-w-3xl mx-auto px-4 pb-8" style={stagger(0)}>
              <div
                className="sticky top-4 z-20 mx-auto mb-8 w-max rounded-full backdrop-blur-2xl bg-white/95 border border-white/30 shadow-soft-lg px-1.5 py-1 flex items-center gap-0.5"
                style={stagger(100)}
              >
                <button
                  onClick={handleClose}
                  className="group flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all duration-300 active:scale-[0.97]"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <span className="h-4 w-px bg-gray-200/70" />
                <button
                  onClick={() => { onEdit(article.id); handleClose(); }}
                  className="group flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all duration-300 active:scale-[0.97]"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </button>
              </div>

              <div
                className="rounded-[2rem] p-1.5 bg-gradient-to-b from-white/60 to-white/10 shadow-2xl ring-1 ring-white/30"
                style={stagger(200)}
              >
                <div className="rounded-[calc(2rem-0.375rem)] overflow-hidden bg-[#FDFBF7] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                  {article.featuredImage && (
                    <div className="relative overflow-hidden">
                      <img
                        src={article.featuredImage}
                        alt={article.title}
                        className="w-full h-48 md:h-64 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#FDFBF7] via-[#FDFBF7]/5 to-transparent" />
                    </div>
                  )}

                  <article className="px-6 md:px-10 py-8 md:py-10">
                    <div
                      className="flex flex-wrap items-center gap-2 mb-5"
                      style={stagger(300)}
                    >
                      {article.category && (
                        <span className="inline-flex items-center rounded-full bg-[#5645d4]/6 px-3.5 py-1 text-[10px] font-semibold text-[#5645d4] uppercase tracking-[0.2em]">
                          {article.category.name}
                        </span>
                      )}
                      {article.tags?.map((tag: any, i: number) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center rounded-full bg-gray-100/80 px-2.5 py-1 text-[10px] text-gray-500 font-medium"
                          style={{ animationDelay: `${350 + i * 50}ms`, animation: "previewReveal 0.5s cubic-bezier(0.32,0.72,0,1) both" }}
                        >
                          #{tag.name}
                        </span>
                      ))}
                    </div>

                    <h1
                      className="text-3xl md:text-4xl font-serif tracking-tight leading-[1.15] text-gray-900 mb-5 text-balance"
                      style={stagger(350)}
                    >
                      {article.title}
                    </h1>

                    <div
                      className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-gray-400 mb-6 pb-6 border-b border-[#5645d4]/8"
                      style={stagger(400)}
                    >
                      {article.author && (
                        <span className="flex items-center gap-2">
                          {article.author.photoURL ? (
                            <img src={article.author.photoURL} alt="" className="h-6 w-6 rounded-full ring-2 ring-white" />
                          ) : (
                            <span className="h-6 w-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 ring-2 ring-white" />
                          )}
                          <span className="font-medium text-gray-700">{article.author.name}</span>
                        </span>
                      )}
                      {article.publishedAt && (
                        <span className="flex items-center gap-1.5 text-gray-400">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(article.publishedAt)}
                        </span>
                      )}
                      {article.readTime && (
                        <span className="flex items-center gap-1.5 text-gray-400">
                          <Clock className="h-3.5 w-3.5" />
                          {article.readTime} min read
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-gray-400">
                        <Eye className="h-3.5 w-3.5" />
                        {article.viewCount || 0} views
                      </span>
                    </div>

                    {article.excerpt && (
                      <div
                        className="text-base md:text-lg text-gray-500 leading-relaxed mb-8 pl-5 border-l-[3px] border-[#5645d4]/12 font-medium"
                        style={stagger(450)}
                      >
                        {article.excerpt}
                      </div>
                    )}

                    <div
                      className="text-[15px] md:text-base leading-[1.85] text-gray-700 space-y-5 [&_h1]:text-2xl [&_h1]:font-serif [&_h1]:tracking-tight [&_h1]:text-gray-900 [&_h1]:mt-10 [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-serif [&_h2]:tracking-tight [&_h2]:text-gray-900 [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:leading-[1.85] [&_p]:text-gray-700 [&_p]:mb-4 [&_blockquote]:border-l-[3px] [&_blockquote]:border-[#5645d4]/12 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-gray-500 [&_blockquote]:text-base [&_blockquote]:my-6 [&_img]:rounded-xl [&_img]:shadow-soft-lg [&_img]:my-8 [&_pre]:rounded-xl [&_pre]:bg-gray-950 [&_pre]:p-5 [&_pre]:text-sm [&_pre]:leading-relaxed [&_pre]:my-6 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_code]:font-mono [&_code]:text-pink-600 [&_pre_code]:bg-transparent [&_pre_code]:text-gray-100 [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_hr]:border-gray-200 [&_hr]:my-8 [&_a]:text-[#5645d4] [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-[#5645d4]/20 [&_a:hover]:decoration-[#5645d4]"
                      style={stagger(500)}
                    >
                      {renderTipTap(article.body)}
                    </div>

                    {(article.metaTitle || article.metaDescription) && (
                      <div
                        className="mt-10 rounded-xl bg-white/80 p-5 ring-1 ring-gray-100 shadow-soft"
                        style={stagger(600)}
                      >
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em] mb-2.5">
                          Search Preview
                        </p>
                        {article.metaTitle && (
                          <p className="text-sm font-medium text-[#1a0dab] truncate hover:underline cursor-pointer">
                            {article.metaTitle}
                          </p>
                        )}
                        {article.metaDescription && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                            {article.metaDescription}
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 min-h-[5vh]" />
        </div>
      </div>
    </div>
  );
}
