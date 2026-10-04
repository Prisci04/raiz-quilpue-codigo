import { TIPO_LABELS_PUBLICO } from "@/lib/contenidos/documento.mjs";

const TIPO_LABELS = TIPO_LABELS_PUBLICO;

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeHref(value) {
  if (typeof value !== "string") return null;

  const href = value.trim();

  if (!href || href.startsWith("//")) return null;

  if (href.startsWith("/")) return href;

  try {
    const url = new URL(href);

    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch {
    return null;
  }

  return null;
}

function safeColor(value) {
  if (typeof value !== "string") return null;

  const color = value.trim().toLowerCase();
  const allowed = ["#704a31", "#c45a3a", "#687a42", "#7c5c47"];

  return allowed.includes(color) ? color : null;
}

function applyMarks(text, marks, key) {
  const list = Array.isArray(marks) ? marks : [];

  return list.reduce((child, mark, index) => {
    const markKey = `${key}-mark-${index}`;

    if (!isRecord(mark)) return child;

    if (mark.type === "bold") {
      return <strong key={markKey}>{child}</strong>;
    }

    if (mark.type === "italic") {
      return <em key={markKey}>{child}</em>;
    }

    if (mark.type === "underline") {
      return <u key={markKey}>{child}</u>;
    }

    if (mark.type === "link") {
      const href = safeHref(mark.attrs?.href);

      if (!href) return child;

      const external = href.startsWith("http");

      return (
        <a
          key={markKey}
          href={href}
          className="text-[#db700f] underline"
          {...(external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
        >
          {child}
        </a>
      );
    }

    if (mark.type === "textStyle") {
      const color = safeColor(mark.attrs?.color);

      if (!color) return child;

      return (
        <span key={markKey} style={{ color }}>
          {child}
        </span>
      );
    }

    return child;
  }, text);
}

function renderImage(node, key) {
  const src = safeHref(node.attrs?.src);

  if (!src) return null;

  const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";

  return (
    // El cuerpo acepta imágenes http(s) ya saneadas; no todas entran en next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={key}
      src={src}
      alt={alt}
      className="my-6 h-auto w-full object-cover"
    />
  );
}

function renderNode(node, key) {
  if (!isRecord(node) || typeof node.type !== "string") return null;

  if (node.type === "text") {
    return applyMarks(typeof node.text === "string" ? node.text : "", node.marks, key);
  }

  if (node.type === "hardBreak") {
    return <br key={key} />;
  }

  if (node.type === "image") {
    return renderImage(node, key);
  }

  const children = Array.isArray(node.content)
    ? node.content.map((child, index) => renderNode(child, `${key}-${index}`))
    : null;

  if (node.type === "doc") {
    return <div key={key}>{children}</div>;
  }

  if (node.type === "paragraph") {
    return (
      <p key={key} className="text-base leading-relaxed">
        {children}
      </p>
    );
  }

  if (node.type === "heading") {
    const level = Number(node.attrs?.level);
    const Tag = level > 2 ? "h3" : "h2";
    const className =
      Tag === "h2"
        ? "mt-8 font-serif text-2xl font-semibold text-[#5c331c]"
        : "mt-6 font-serif text-xl font-semibold text-[#5c331c]";

    return (
      <Tag key={key} className={className}>
        {children}
      </Tag>
    );
  }

  if (node.type === "bulletList") {
    return (
      <ul key={key} className="list-disc space-y-2 pl-5">
        {children}
      </ul>
    );
  }

  if (node.type === "orderedList") {
    return (
      <ol key={key} className="list-decimal space-y-2 pl-5">
        {children}
      </ol>
    );
  }

  if (node.type === "listItem") {
    return <li key={key}>{children}</li>;
  }

  if (node.type === "blockquote") {
    return (
      <blockquote
        key={key}
        className="border-l-2 border-[#c4a04a] pl-4 font-serif italic"
      >
        {children}
      </blockquote>
    );
  }

  return null;
}

export default function ContenidoDocumento({ documento }) {
  if (!isRecord(documento) || documento.type !== "doc") {
    return null;
  }

  return (
    <div className="mt-8 space-y-4 text-[#704a31]">
      {renderNode(documento, "doc")}
    </div>
  );
}

export { TIPO_LABELS };
