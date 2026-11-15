"use client";

import { ArrowUp } from "lucide-react";

export default function BackToTop() {
  return <button type="button" className="rev1-footer-top" onClick={() => {
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    document.querySelector("header a")?.focus({ preventScroll: true });
  }}>Volver arriba<ArrowUp size={16} aria-hidden="true" /></button>;
}
