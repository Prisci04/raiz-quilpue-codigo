"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { mountDialog } from "@/lib/ui/dialog.mjs";

export default function AdminDialog({ onClose, busy = false, children, className = "", ...props }) {
  const ref = useRef(null);
  const dismiss = useEffectEvent(() => {
    if (!busy) onClose();
  });

  useEffect(() => mountDialog(ref.current, dismiss), []);

  return (
    <dialog ref={ref} className={`admin-dialog ${className}`} aria-modal="true" aria-busy={busy || undefined} {...props}>
      {children}
    </dialog>
  );
}
