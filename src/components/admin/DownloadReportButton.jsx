"use client";

import { Download } from "lucide-react";

export default function DownloadReportButton() {
  function handleDownload() {
    window.print();
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md bg-[#2c1810] px-4 text-[13px] font-medium text-[#f4ebe3] transition-colors hover:bg-[#3d2418] print:hidden"
    >
      <Download size={15} strokeWidth={1.8} aria-hidden="true" />
      Descargar PDF
    </button>
  );
}
