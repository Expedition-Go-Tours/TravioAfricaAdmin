import { useRef, useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo2,
  Redo2,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Link,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface RichTextEditorProps {
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
  disabled?: boolean;
}

function Tooltip({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="group relative flex">
      {children}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg">
          {label}
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        className={`flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors ${
          active
            ? "bg-purple-100 text-purple-700"
            : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        }`}
      >
        <Icon className="h-4 w-4" />
      </button>
    </Tooltip>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-6 w-px bg-gray-200" />;
}

export function RichTextEditor({ value, onChange, placeholder, disabled }: RichTextEditorProps) {
  const initialRender = useRef(true);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      ImageExtension.configure({ inline: true }),
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder || "Start writing..." }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onChange(json);
    },
    editable: !disabled,
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && value && initialRender.current) {
      const currentJSON = editor.getJSON();
      if (JSON.stringify(currentJSON) !== JSON.stringify(value)) {
        editor.commands.setContent(value);
      }
      initialRender.current = false;
    }
  }, [value, editor]);

  useEffect(() => {
    return () => { editor?.destroy(); };
  }, [editor]);

  if (!editor) return null;

  const openLinkDialog = () => {
    setLinkUrl(editor.getAttributes('link').href || "");
    setLinkDialogOpen(true);
  };

  const applyLink = () => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    setLinkDialogOpen(false);
  };

  const openImageDialog = () => {
    setImageUrl("");
    setImageDialogOpen(true);
  };

  const applyImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
    }
    setImageDialogOpen(false);
  };

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 px-2 py-2">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} icon={Bold} label="Bold" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} icon={Italic} label="Italic" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} icon={UnderlineIcon} label="Underline" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} icon={Strikethrough} label="Strikethrough" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} icon={Code} label="Code" />

        <ToolbarDivider />

        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} icon={Heading1} label="Heading 1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} icon={Heading2} label="Heading 2" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} icon={Heading3} label="Heading 3" />

        <ToolbarDivider />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} icon={List} label="Bullet list" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} icon={ListOrdered} label="Ordered list" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} icon={Quote} label="Blockquote" />
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={Minus} label="Horizontal rule" />

        <ToolbarDivider />

        <ToolbarButton onClick={openLinkDialog} active={editor.isActive('link')} icon={Link} label="Add link" />
        {editor.isActive('link') && (
          <ToolbarButton onClick={() => editor.chain().focus().unsetLink().run()} icon={Unlink} label="Remove link" />
        )}
        <ToolbarButton onClick={openImageDialog} icon={ImageIcon} label="Add image" />

        <ToolbarDivider />

        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} icon={Undo2} label="Undo" />
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} icon={Redo2} label="Redo" />
      </div>

      <div className="mx-auto w-full max-w-4xl p-4">
        <EditorContent editor={editor} className="prose prose-sm max-w-none focus:outline-none" style={{ minHeight: "400px" }} />
      </div>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input id="link-url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            <Button onClick={applyLink} className="bg-[#5645d4] hover:bg-[#4534b3]">{linkUrl ? "Apply" : "Remove"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Add Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="image-url">Image URL</Label>
              <Input id="image-url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageDialogOpen(false)}>Cancel</Button>
            <Button onClick={applyImage} disabled={!imageUrl} className="bg-[#5645d4] hover:bg-[#4534b3]">Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
