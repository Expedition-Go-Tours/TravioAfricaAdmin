import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTags, createTag, deleteTag } from "@/services/blogService";
import { TagDialog } from "./components/TagDialog";

export default function TagManagerPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: tagsData, isLoading } = useQuery({
    queryKey: ["tags"],
    queryFn: () => getTags(),
  });

  const tags = tagsData?.data?.tags || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTag(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] }),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => createTag(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tags</h1>
          <p className="mt-1 text-sm text-gray-500">Manage article tags</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-[#5645d4] hover:bg-[#4534b3]">
          <Plus className="mr-2 h-4 w-4" /> New Tag
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : tags?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-gray-100 p-4 mb-4">
            <Tags className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No tags yet</h3>
          <p className="mt-1 text-sm text-gray-500">Create your first tag to label articles.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags?.map((tag: any) => (
            <div key={tag.id} className="group inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm hover:border-gray-300 transition-colors">
              <span>{tag.name}</span>
              <span className="text-xs text-gray-400">({tag._count?.articles || 0})</span>
              <button
                className="ml-1 text-gray-300 hover:text-red-500 transition-colors"
                onClick={() => { if (window.confirm(`Delete tag "${tag.name}"?`)) deleteMutation.mutate(tag.id); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <TagDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={async (data) => {
          await saveMutation.mutateAsync(data);
        }}
      />
    </div>
  );
}
