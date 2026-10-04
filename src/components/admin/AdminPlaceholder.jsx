import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function AdminPlaceholder({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
}) {
  return (
    <section className="admin-card max-w-2xl px-6 py-8 sm:px-8 sm:py-10">
      <p className="text-[11px] font-medium tracking-[0.18em] text-[#7c5c47] uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-[clamp(1.55rem,3vw,1.95rem)] font-semibold tracking-tight text-[#2c1810]">
        {title}
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#7c5c47] sm:text-[15px]">
        {description}
      </p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-7 inline-flex min-h-10 items-center gap-2 rounded-md bg-[#2c1810] px-4 text-[13px] font-medium text-[#f4ebe3] transition-colors hover:bg-[#3d2418]"
        >
          {actionLabel}
          <ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  );
}
