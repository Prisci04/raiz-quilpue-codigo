"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import Image from "@tiptap/extension-image";
import ContenidoToolbar from "@/components/admin/contenidos/ContenidoToolbar";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

export default function ContenidoEditor({ initialContent, onChange }) {
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
        class: "px-4 py-3 text-[15px] leading-relaxed text-[#2c1810]",
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
