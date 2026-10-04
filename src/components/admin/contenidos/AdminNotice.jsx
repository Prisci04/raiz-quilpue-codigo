"use client";

import { useEffect, useRef } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

export default function AdminNotice({ tone = "success", children }) {
  const ref = useRef(null);
  const isError = tone === "error";

  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [children]);

  return (
    <p
      ref={ref}
      role={isError ? "alert" : "status"}
      className={`sticky top-[4.75rem] z-20 mt-4 flex items-center gap-3 border px-4 py-3 text-[15px] font-medium shadow-sm ${
        isError
          ? "border-[#e7b2a6] bg-[#fde8e2] text-[#8d3b28]"
          : "border-[#9dcea8] bg-[#e5f6e8] text-[#1b6b3a]"
      }`}
    >
      {isError ? (
        <CircleAlert size={20} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
      ) : (
        <CircleCheck size={20} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
      )}
      <span>{children}</span>
    </p>
  );
}
