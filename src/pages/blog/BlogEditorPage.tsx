import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useBlocker } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Send, Image, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getArticleById, createArticle, updateArticle, getCategories, getTags } from "@/services/blogService";
import { RichTextEditor } from "./components/RichTextEditor";
import type { ArticleStatus } from "@/types/blog";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export default function BlogEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState<any>(null);
  const [categoryId, setCategoryId] = useState<string>("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [slugError, setSlugError] = useState("");
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUploadUrl, setImageUploadUrl] = useState("");

  const hasUnsavedChanges = useMemo(() => {
    if (isNew) return !!title || !!slug || !!excerpt || !!content;
    return true;
  }, [isNew, title, slug, excerpt, content]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  const { data: articleData } = useQuery({
    queryKey: ["article", id],
    queryFn: () => getArticleById(id!),
    enabled: !isNew,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  const { data: tagsData } = useQuery({
    queryKey: ["tags"],
    queryFn: () => getTags(),
  });

  const article = articleData?.data;
  const categories = categoriesData?.data?.categories || [];
  const tags = tagsData?.data?.tags || [];

  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setSlug(article.slug);
      setExcerpt(article.excerpt || "");
      setContent(article.body);
      setCategoryId(article.category?.id || "");
      setTagIds(article.tags?.map((t: any) => t.id) || []);
      setMetaTitle(article.metaTitle || "");
      setMetaDescription(article.metaDescription || "");
      setFeaturedImage(article.featuredImage || "");
      setPublishDate(article.publishedAt ? article.publishedAt.slice(0, 10) : "");
    }
  }, [article]);

  const wordCount = useMemo(() => {
    if (!content) return 0;
    const text = JSON.stringify(content);
    const stripped = text.replace(/<[^>]*>/g, "").replace(/[{}[\]"]/g, " ");
    return stripped.split(/\s+/).filter(Boolean).length;
  }, [content]);

  const readTime = Math.max(1, Math.round(wordCount / 200));

  const handleTitleChange = useCallback((value: string) => {
    setTitle(value);
    if (isNew) {
      const generated = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      setSlug(generated);
    }
  }, [isNew]);

  const checkSlug = useCallback(async (value: string) => {
    if (!value) { setSlugError(""); return; }
    if (article?.slug === value) { setSlugError(""); return; }
  }, [article]);

  const handleSlugChange = useCallback((value: string) => {
    setSlug(value);
    checkSlug(value);
  }, [checkSlug]);

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      isNew ? createArticle(data) : updateArticle(id!, data),
    onSuccess: () => {
      toast.success(isNew ? "Article created" : "Article updated");
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      if (!isNew) queryClient.invalidateQueries({ queryKey: ["article", id] });
      navigate("/admin/blog");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to save article");
    },
  });

  const handleSave = useCallback(async (status: ArticleStatus) => {
    if (status === "PUBLISHED" && !title.trim()) {
      toast.error("Title is required to publish");
      return;
    }
    if (status === "PUBLISHED" && !slug.trim()) {
      toast.error("Slug is required to publish");
      return;
    }
    if (status === "PUBLISHED" && !content) {
      toast.error("Content is required to publish");
      return;
    }
    const payload: any = {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim() || undefined,
      body: content,
      categoryId: categoryId || undefined,
      tagIds: tagIds.length > 0 ? tagIds : undefined,
      metaTitle: metaTitle.trim() || undefined,
      metaDescription: metaDescription.trim() || undefined,
      featuredImage: featuredImage || undefined,
      status,
    };
    if (publishDate && status === "PUBLISHED") {
      payload.publishedAt = new Date(publishDate).toISOString();
    }
    saveMutation.mutate(payload);
  }, [title, slug, excerpt, content, categoryId, tagIds, metaTitle, metaDescription, featuredImage, publishDate, saveMutation]);

  const handleFeaturedImageUpload = () => {
    if (imageUploadUrl) {
      setFeaturedImage(imageUploadUrl);
      setImageDialogOpen(false);
      setImageUploadUrl("");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => {
            if (hasUnsavedChanges) {
              if (window.confirm("You have unsaved changes. Leave anyway?")) navigate("/admin/blog");
            } else {
              navigate("/admin/blog");
            }
          }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-[#1a1a1a]">{isNew ? "New Article" : "Edit Article"}</h1>
            <p className="text-sm text-[#5d5b54]">{isNew ? "Draft your article" : "Update your article"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 mr-2 text-xs text-[#5d5b54]">
            <Clock className="h-3.5 w-3.5" />
            <span>{wordCount} words · {readTime} min read</span>
          </div>
          <Button variant="outline" onClick={() => handleSave("DRAFT")} disabled={saveMutation.isPending}>
            <Save className="mr-2 h-4 w-4" /> {saveMutation.isPending ? "Saving..." : "Save Draft"}
          </Button>
          <Button onClick={() => handleSave("PUBLISHED")} disabled={saveMutation.isPending} className="bg-[#5645d4] hover:bg-[#4534b3]">
            <Send className="mr-2 h-4 w-4" /> {saveMutation.isPending ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-[#e5e3df] bg-white p-6 space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Article title..."
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-2xl font-semibold border-0 px-0 focus-visible:ring-0 placeholder:text-sm placeholder:text-[#bbb8b1] text-[#1a1a1a]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#37352f] text-sm font-medium">Slug</Label>
              <div className="relative">
                <Input
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="article-slug"
                  className={slugError ? "border-red-500" : ""}
                />
                {slugError && <p className="text-xs text-red-500 mt-1">{slugError}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[#37352f] text-sm font-medium">Excerpt</Label>
              <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Brief summary..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label className="text-[#37352f] text-sm font-medium">Content</Label>
              <RichTextEditor value={content} onChange={setContent} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-[#e5e3df] bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#37352f]">Publishing</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-[#5d5b54] text-xs">Category</Label>
                <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Uncategorized" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Uncategorized</SelectItem>
                    {categories?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[#5d5b54] text-xs">Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {tags?.length === 0 && <p className="text-xs text-[#bbb8b1]">No tags available</p>}
                  {tags?.map((tag: any) => (
                    <Badge
                      key={tag.id}
                      variant={tagIds.includes(tag.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() =>
                        setTagIds((prev) =>
                          prev.includes(tag.id) ? prev.filter((t) => t !== tag.id) : [...prev, tag.id]
                        )
                      }
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#5d5b54] text-xs">Publish date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a4a097]" />
                  <Input
                    type="date"
                    value={publishDate}
                    onChange={(e) => setPublishDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#e5e3df] bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#37352f]">Featured Image</h3>
            <div className="space-y-3">
              {featuredImage && (
                <div className="relative rounded-lg overflow-hidden border border-[#e5e3df]">
                  <img src={featuredImage} alt="Featured" className="w-full h-32 object-cover" />
                </div>
              )}
              <Button variant="outline" size="sm" className="w-full" onClick={() => setImageDialogOpen(true)}>
                <Image className="mr-2 h-4 w-4" />
                {featuredImage ? "Change Image" : "Add Image"}
              </Button>
              {featuredImage && (
                <Button variant="ghost" size="sm" className="w-full text-red-500" onClick={() => setFeaturedImage("")}>
                  Remove
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[#e5e3df] bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#37352f]">SEO</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-[#5d5b54] text-xs">Meta title</Label>
                <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="SEO title" />
                <p className="text-xs text-[#a4a097]">{metaTitle.length}/60 characters</p>
              </div>
              <div className="space-y-2">
                <Label className="text-[#5d5b54] text-xs">Meta description</Label>
                <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="SEO description" rows={2} />
                <p className="text-xs text-[#a4a097]">{metaDescription.length}/160 characters</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#e5e3df] bg-white p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[#37352f]">Stats</h3>
            <div className="flex justify-between text-xs">
              <span className="text-[#5d5b54]">Words</span>
              <span className="text-[#1a1a1a] font-medium">{wordCount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#5d5b54]">Read time</span>
              <span className="text-[#1a1a1a] font-medium">{readTime} min</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#5d5b54]">Content</span>
              <span className="text-[#1a1a1a] font-medium">{content ? "Ready" : "Empty"}</span>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Featured Image URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="featured-image-url">Image URL</Label>
              <Input
                id="featured-image-url"
                value={imageUploadUrl}
                onChange={(e) => setImageUploadUrl(e.target.value)}
                placeholder="https://..."
                autoFocus
              />
            </div>
            {imageUploadUrl && (
              <div className="rounded-lg overflow-hidden border border-[#e5e3df]">
                <img src={imageUploadUrl} alt="Preview" className="w-full h-32 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleFeaturedImageUpload} disabled={!imageUploadUrl} className="bg-[#5645d4] hover:bg-[#4534b3]">Set Image</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={blocker.state === "blocked"} onOpenChange={() => blocker.reset?.()}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#5d5b54] py-2">You have unsaved changes. Are you sure you want to leave?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => blocker.reset?.()}>Stay</Button>
            <Button variant="destructive" onClick={() => blocker.proceed?.()}>Leave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
