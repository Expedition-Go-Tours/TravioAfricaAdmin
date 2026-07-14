import type { ReactNode } from "react";

interface TipTapNode {
  type: string;
  content?: TipTapNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
  attrs?: Record<string, any>;
}

function renderMarks(text: string, marks?: Array<{ type: string; attrs?: Record<string, any> }>): ReactNode {
  if (!marks || marks.length === 0) return text;
  let node: ReactNode = text;
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        node = <strong key={Math.random()}>{node}</strong>;
        break;
      case "italic":
        node = <em key={Math.random()}>{node}</em>;
        break;
      case "underline":
        node = <u key={Math.random()}>{node}</u>;
        break;
      case "strike":
        node = <s key={Math.random()}>{node}</s>;
        break;
      case "code":
        node = <code key={Math.random()} className="rounded bg-gray-100 px-1 py-0.5 text-sm font-mono text-pink-600">{node}</code>;
        break;
      case "link":
        node = (
          <a key={Math.random()} href={mark.attrs?.href} target="_blank" rel="noopener noreferrer" className="text-[#5645d4] underline hover:text-[#4534b3]">
            {node}
          </a>
        );
        break;
    }
  }
  return node;
}

export function renderTipTapNode(node: TipTapNode, key?: number): ReactNode {
  const children = node.content?.map((child, i) => renderTipTapNode(child, i));

  switch (node.type) {
    case "doc":
      return <div key={key} className="space-y-4">{children}</div>;

    case "paragraph": {
      const hasText = node.content?.some((n) => n.text);
      if (!hasText) return <div key={key} className="h-4" />;
      return <p key={key} className="text-base leading-relaxed text-gray-800">{children}</p>;
    }

    case "heading": {
      const level = node.attrs?.level || 1;
      const styles = ["text-3xl font-bold", "text-2xl font-semibold", "text-xl font-semibold"];
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      return <Tag key={key} className={`${styles[Math.min(level - 1, 2)]} text-gray-900`}>{children}</Tag>;
    }

    case "bulletList":
      return <ul key={key} className="list-disc pl-6 space-y-1 text-gray-800">{children}</ul>;

    case "orderedList":
      return <ol key={key} className="list-decimal pl-6 space-y-1 text-gray-800">{children}</ol>;

    case "listItem":
      return <li key={key}>{children}</li>;

    case "blockquote":
      return (
        <blockquote key={key} className="border-l-4 border-[#5645d4]/30 pl-4 italic text-gray-600">
          {children}
        </blockquote>
      );

    case "codeBlock":
      return (
        <pre key={key} className="rounded-lg bg-gray-900 p-4 overflow-x-auto">
          <code className="text-sm text-gray-100 font-mono">{node.content?.[0]?.text || ""}</code>
        </pre>
      );

    case "horizontalRule":
      return <hr key={key} className="border-gray-200" />;

    case "image":
      return (
        <figure key={key} className="my-6">
          <img src={node.attrs?.src} alt={node.attrs?.alt || ""} className="rounded-lg w-full object-cover max-h-96" />
          {node.attrs?.title && <figcaption className="mt-2 text-center text-sm text-gray-500">{node.attrs.title}</figcaption>}
        </figure>
      );

    case "hardBreak":
      return <br key={key} />;

    case "text":
      return renderMarks(node.text || "", node.marks);

    default:
      return children || null;
  }
}

export function renderTipTap(json: any): ReactNode {
  if (!json) return null;
  return renderTipTapNode(json);
}