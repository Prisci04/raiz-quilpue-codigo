"use client";

import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Underline,
} from "lucide-react";
import { TEXT_COLORS } from "@/lib/contenidos/documento.mjs";

function ToolButton({ active, label, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-sm px-2 text-[12px] font-medium ${
        active ? "bg-[#2c1810] text-white" : "text-[#4d4036] hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

export default function ContenidoToolbar({ editor }) {
  function setLink() {
    const previous = editor.getAttributes("link").href ?? "";
    const href = window.prompt("Enlace (https://…)", previous);

    if (href === null) return;

    if (!href.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-[#f0e8e0] bg-[#faf7f4] px-2 py-2">
      <ToolButton
        label="Párrafo"
        active={editor.isActive("paragraph")}
        onClick={() => editor.chain().focus().setParagraph().run()}
      >
        <Pilcrow size={15} strokeWidth={1.8} aria-hidden="true" />
      </ToolButton>
      <ToolButton
        label="Subtítulo"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={15} strokeWidth={1.8} aria-hidden="true" />
      </ToolButton>
      <ToolButton
        label="Subtítulo menor"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 size={15} strokeWidth={1.8} aria-hidden="true" />
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-[#e6ddd4]" aria-hidden="true" />
      <ToolButton
        label="Negrita"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={15} strokeWidth={1.8} aria-hidden="true" />
      </ToolButton>
      <ToolButton
        label="Cursiva"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={15} strokeWidth={1.8} aria-hidden="true" />
      </ToolButton>
      <ToolButton
        label="Subrayado"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline size={15} strokeWidth={1.8} aria-hidden="true" />
      </ToolButton>
      <ToolButton
        label="Lista con viñetas"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={15} strokeWidth={1.8} aria-hidden="true" />
      </ToolButton>
      <ToolButton
        label="Lista numerada"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={15} strokeWidth={1.8} aria-hidden="true" />
      </ToolButton>
      <ToolButton
        label="Cita"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote size={15} strokeWidth={1.8} aria-hidden="true" />
      </ToolButton>
      <ToolButton label="Enlace" active={editor.isActive("link")} onClick={setLink}>
        <Link2 size={15} strokeWidth={1.8} aria-hidden="true" />
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-[#e6ddd4]" aria-hidden="true" />
      <div className="flex items-center gap-1" aria-label="Color de texto">
        {TEXT_COLORS.map((color) => {
          const active = color.value
            ? editor.isActive("textStyle", { color: color.value })
            : !editor.isActive("textStyle");

          return (
            <button
              key={color.id}
              type="button"
              title={color.label}
              aria-label={color.label}
              aria-pressed={active}
              onClick={() => {
                if (!color.value) {
                  editor.chain().focus().unsetColor().run();
                  return;
                }

                editor.chain().focus().setColor(color.value).run();
              }}
              className={`h-5 w-5 rounded-full border ${
                active ? "border-[#2c1810]" : "border-[#e6ddd4]"
              }`}
              style={{ background: color.value ?? "#2c1810" }}
            />
          );
        })}
      </div>
    </div>
  );
}
