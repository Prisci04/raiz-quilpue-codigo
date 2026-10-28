"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import Image from "@tiptap/extension-image";
import { Fragment, Slice } from "@tiptap/pm/model";
import ContenidoToolbar from "@/components/admin/contenidos/ContenidoToolbar";
import { stripPastedTextColors } from "@/lib/contenidos/documento.mjs";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

function stripColorMarks(node) {
  if (node.isText) {
    return node.mark(node.marks.filter((mark) => mark.type.name !== "textStyle"));
  }

  if (node.content?.size) {
    const children = [];
    node.content.forEach((child) => children.push(stripColorMarks(child)));
    return node.copy(Fragment.from(children));
  }

  return node;
}

export default function ContenidoEditor({ initialContent, onChange, label = "Contenido del documento" }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        strike: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          autolink: false,
          defaultProtocol: "https",
        },
      }),
      TextStyle,
      Color,
      Image.configure({
        allowBase64: false,
      }),
    ],
    content: initialContent ?? EMPTY_DOC,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": label,
        "aria-multiline": "true",
        class: "px-4 py-3 text-[15px] leading-relaxed text-[#704a31]",
      },
      transformPastedHTML(html) {
        return stripPastedTextColors(html);
      },
      transformPasted(slice) {
        const children = [];
        slice.content.forEach((node) => children.push(stripColorMarks(node)));
        return new Slice(Fragment.from(children), slice.openStart, slice.openEnd);
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getJSON());
    },
  });

  return (
    <div className="contenido-editor overflow-hidden rounded-sm border border-[#e6ddd4] bg-white">
      {editor ? <ContenidoToolbar editor={editor} /> : <div className="h-12 bg-[#faf7f4]" />}
      <EditorContent editor={editor} />
    </div>
  );
}
