"use client";

import { useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";

const VISIBLE_MS = 5000;
const FADE_MS = 350;

export default function AdminNotice({ tone = "success", children, onDismiss, sticky = true }) {
  if (children == null || children === "") return null;

  return (
    <AdminNoticeInner
      key={`${tone}:${String(children)}`}
      tone={tone}
      onDismiss={onDismiss}
      sticky={sticky}
    >
      {children}
    </AdminNoticeInner>
  );
}

function AdminNoticeInner({ tone, children, onDismiss, sticky }) {
  const ref = useRef(null);
  const onDismissRef = useRef(onDismiss);
  const closeTimer = useRef(null);
  const isError = tone === "error";
  const [open, setOpen] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });

    const fadeTimer = window.setTimeout(() => {
      setFading(true);
    }, VISIBLE_MS);
    const hideTimer = window.setTimeout(() => {
      setOpen(false);
      onDismissRef.current?.();
    }, VISIBLE_MS + FADE_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
      window.clearTimeout(closeTimer.current);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role={isError ? "alert" : "status"}
      className={`admin-notice mt-4 flex items-start gap-3 rounded-sm border px-4 py-3 text-sm leading-relaxed font-medium shadow-sm transition-opacity duration-[350ms] ease-out ${
        sticky ? "sticky top-[4.75rem] z-20" : ""
      } ${
        isError
          ? "border-[#e7b2a6] bg-[#fde8e2] text-[#8d3b28]"
          : "border-[#9dcea8] bg-[#e5f6e8] text-[#1b6b3a]"
      } ${fading ? "opacity-0" : "opacity-100"}`}
    >
      {isError ? (
        <CircleAlert size={20} strokeWidth={1.8} className="mt-0.5 shrink-0" aria-hidden="true" />
      ) : (
        <CircleCheck size={20} strokeWidth={1.8} className="mt-0.5 shrink-0" aria-hidden="true" />
      )}
      <span className="min-w-0 flex-1 break-words">{children}</span>
      <button
        type="button"
        aria-label="Cerrar aviso"
        onClick={() => {
          setFading(true);
          window.clearTimeout(closeTimer.current);
          closeTimer.current = window.setTimeout(() => {
            setOpen(false);
            onDismissRef.current?.();
          }, FADE_MS);
        }}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-current opacity-70 hover:bg-black/5 hover:opacity-100"
      >
        <X size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
