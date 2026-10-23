"use client";

import { useState } from "react";
import { Download } from "lucide-react";

const COLORS = {
  brown: [44, 24, 16],
  text: [64, 56, 49],
  muted: [124, 92, 71],
  gold: [196, 160, 74],
  terracotta: [196, 90, 58],
  forest: [104, 122, 66],
  paper: [241, 234, 226],
  white: [255, 253, 249],
  line: [220, 207, 194],
};

function drawMetric(pdf, { x, y, width, label, value, hint, color }) {
  pdf.setFillColor(...COLORS.white);
  pdf.setDrawColor(...COLORS.line);
  pdf.roundedRect(x, y, width, 25, 1.5, 1.5, "FD");
  pdf.setFillColor(...color);
  pdf.rect(x, y, 1.5, 25, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(...color);
  pdf.text(String(value), x + 5, y + 11);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...COLORS.text);
  pdf.text(label, x + 5, y + 17);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(...COLORS.muted);
  pdf.text(hint, x + 5, y + 22);
}

function drawBarChart(pdf, { x, y, width, height, title, series, color }) {
  pdf.setFillColor(...COLORS.white);
  pdf.setDrawColor(...COLORS.line);
  pdf.roundedRect(x, y, width, height, 1.5, 1.5, "FD");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.brown);
  pdf.text(title, x + 4, y + 7);

  if (!series.length) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...COLORS.muted);
    pdf.text("Sin datos disponibles.", x + 4, y + 19);
    return;
  }

  const rows = series.slice(0, 6);
  const maxValue = Math.max(1, ...rows.map((item) => item.value));
  const labelX = x + 4;
  const barX = x + width * 0.45;
  const barWidth = width * 0.36;
  const valueX = x + width - 4;
  const rowHeight = Math.min(7, (height - 12) / rows.length);

  rows.forEach((item, index) => {
    const rowY = y + 12 + index * rowHeight;
    const label = item.label.length > 19 ? `${item.label.slice(0, 18)}…` : item.label;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...COLORS.text);
    pdf.text(label, labelX, rowY + 2.6);
    pdf.setFillColor(...COLORS.paper);
    pdf.roundedRect(barX, rowY, barWidth, 2.8, 1, 1, "F");
    if (item.value > 0) {
      pdf.setFillColor(...color);
      pdf.roundedRect(
        barX,
        rowY,
        Math.max(1, (item.value / maxValue) * barWidth),
        2.8,
        1,
        1,
        "F",
      );
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...COLORS.muted);
    pdf.text(String(item.value), valueX, rowY + 2.6, { align: "right" });
  });
}

export default function DownloadReportButton({
  dateLabel,
  publishedContents,
  totalContents,
  publishedActivities,
  totalEnrollments,
  publishedMuseumPieces,
  contentSlices,
  museumSlices,
  enrollmentsByActivity,
  monthlyEnrollments,
}) {
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setError("");
    setDownloading(true);

    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 14;
      const gap = 5;
      const metricWidth = (pageWidth - margin * 2 - gap * 3) / 4;

      pdf.setFillColor(...COLORS.paper);
      pdf.rect(0, 0, pageWidth, 34, "F");
      pdf.setFont("times", "bold");
      pdf.setFontSize(19);
      pdf.setTextColor(...COLORS.brown);
      pdf.text("Raíz Quilpué · Dashboard", margin, 15);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(...COLORS.muted);
      pdf.text(dateLabel, margin, 23);
      pdf.setFillColor(...COLORS.gold);
      pdf.rect(margin, 30, pageWidth - margin * 2, 1, "F");

      [
        {
          label: "Contenidos publicados",
          value: publishedContents,
          hint: `De ${totalContents} contenidos`,
          color: COLORS.gold,
        },
        {
          label: "Actividades publicadas",
          value: publishedActivities,
          hint: "Visibles en el sitio",
          color: COLORS.brown,
        },
        {
          label: "Inscripciones",
          value: totalEnrollments,
          hint: "Total histórico",
          color: COLORS.terracotta,
        },
        {
          label: "Piezas del museo",
          value: publishedMuseumPieces,
          hint: "Publicadas",
          color: COLORS.forest,
        },
      ].forEach((metric, index) =>
        drawMetric(pdf, {
          ...metric,
          x: margin + index * (metricWidth + gap),
          y: 39,
          width: metricWidth,
        }),
      );

      const chartGap = 7;
      const chartWidth = (pageWidth - margin * 2 - chartGap) / 2;
      const chartHeight = 61;
      const rows = [
        [
          {
            title: "Inscritos por actividad",
            series: enrollmentsByActivity,
            color: COLORS.terracotta,
          },
          {
            title: "Inscripciones por mes",
            series: monthlyEnrollments,
            color: COLORS.gold,
          },
        ],
        [
          {
            title: "Contenidos por categoría",
            series: contentSlices,
            color: COLORS.forest,
          },
          {
            title: "Piezas del museo por categoría",
            series: museumSlices,
            color: COLORS.brown,
          },
        ],
      ];

      rows.forEach((row, rowIndex) => {
        row.forEach((chart, columnIndex) =>
          drawBarChart(pdf, {
            ...chart,
            x: margin + columnIndex * (chartWidth + chartGap),
            y: 70 + rowIndex * (chartHeight + 5),
            width: chartWidth,
            height: chartHeight,
          }),
        );
      });

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(...COLORS.muted);
      pdf.text("Raíz Quilpué · Reporte de administración", margin, 203);
      pdf.save("dashboard-raiz-quilpue.pdf");
    } catch (downloadError) {
      console.error("[DownloadReportButton] No fue posible generar el PDF:", downloadError);
      setError("No fue posible generar el PDF. Inténtalo nuevamente.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md bg-[#2c1810] px-4 text-[13px] font-medium text-[#f4ebe3] transition-colors hover:bg-[#3d2418] disabled:cursor-wait disabled:opacity-60"
      >
        <Download size={15} strokeWidth={1.8} aria-hidden="true" />
        {downloading ? "Generando PDF…" : "Descargar PDF"}
      </button>
      {error ? (
        <p role="alert" className="text-xs text-[#a5452d]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
