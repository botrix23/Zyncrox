"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, FileText, Sheet, Loader2 } from "lucide-react";
import { format } from "date-fns";

import type { StaffPerformanceResult, StaffPerformanceRow } from "@/app/actions/analytics";
import type { RetentionResult } from "@/app/actions/analyticsRetention";
import type { BranchPerformanceResult } from "@/app/actions/analyticsBranch";

// ─── Helper ───────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(dateFrom: string, dateTo: string) {
  return `${dateFrom} — ${dateTo}`;
}

// ─── PDF export ───────────────────────────────────────────────────────────────

/** Loads an image URL and returns a base64 data URL for jsPDF, or null on failure. */
async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

type PdfTranslations = {
  colTotalAttended: string; colRevenue: string; colCancellationRate: string; colAvgRating: string;
  colSpecialist: string; colBranch: string; colAttended: string; colCancelled: string;
  colCancelPct: string; colNoShows: string; colRating: string; colProductiveHrs: string;
  colRetention30: string; colRetention60: string; colRetention90: string; colVisitFreq: string;
  colLtv: string; colNew: string; colRecurring: string;
  sectionPopularServices: string; colService: string; colBooked: string;
  sectionChurnRisk: string; colClient: string; colEmail: string; colDaysSince: string;
  colTotalBookings: string; colLastService: string; colTotalRevenue: string;
  colAvgCancelRate: string; colAvgOccupancy: string; colTopRevenue: string; colTopOccupancy: string;
  colStaff: string; colNewClients: string; colRecurringClients: string; colOccupancy: string;
};

async function exportPdf(
  tab: "staffPerformance" | "clientRetention" | "branchPerformance",
  staffData: StaffPerformanceResult | null,
  retentionData: RetentionResult | null,
  branchData: BranchPerformanceResult | null,
  dateFrom: string,
  dateTo: string,
  titleKey: string,
  periodLabel: string,
  generatedLabel: string,
  tr: PdfTranslations,
) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // ── Zyncrox logo (top-right corner) ──────────────────────────────────────
  const LOGO_SIZE = 12; // square logo, mm
  const logoDataUrl = await loadImageAsDataUrl("/icons/icon-192x192.png");
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", pageW - 14 - LOGO_SIZE, 6, LOGO_SIZE, LOGO_SIZE);
    } catch {
      // skip silently if image fails
    }
  }

  // ── Header text ───────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(titleKey, 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`${periodLabel}  ${fmtDate(dateFrom, dateTo)}`, 14, 25);
  doc.text(`${generatedLabel}  ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 30);
  doc.setTextColor(0);

  let startY = 38;

  if (tab === "staffPerformance" && staffData) {
    // Summary row
    const s = staffData.summary;
    autoTable(doc, {
      startY,
      head: [[tr.colTotalAttended, tr.colRevenue, tr.colCancellationRate, tr.colAvgRating]],
      body: [[
        s.totalAttended.toString(),
        fmtCurrency(s.totalRevenue),
        `${s.avgCancellationRate}%`,
        s.avgRating !== null ? s.avgRating.toFixed(1) : "—",
      ]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [147, 51, 234] },
      margin: { left: 14, right: 14 },
    });

    startY = (doc as any).lastAutoTable.finalY + 8;

    // Staff table
    autoTable(doc, {
      startY,
      head: [[tr.colSpecialist, tr.colBranch, tr.colAttended, tr.colCancelled, tr.colCancelPct, tr.colNoShows, tr.colRevenue, tr.colRating, tr.colProductiveHrs]],
      body: staffData.rows.map(r => [
        r.name, r.branchName,
        r.attended, r.cancelled, `${r.cancellationRate}%`, r.noShows,
        fmtCurrency(r.revenue),
        r.avgRating !== null ? r.avgRating.toFixed(1) : "—",
        r.productiveMinutes > 0 ? `${Math.floor(r.productiveMinutes / 60)}h ${r.productiveMinutes % 60}m` : "—",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [147, 51, 234] },
      alternateRowStyles: { fillColor: [248, 248, 252] },
      margin: { left: 14, right: 14 },
    });
  }

  if (tab === "clientRetention" && retentionData) {
    // Summary
    autoTable(doc, {
      startY,
      head: [[tr.colRetention30, tr.colRetention60, tr.colRetention90, tr.colVisitFreq, tr.colLtv, tr.colNew, tr.colRecurring]],
      body: [[
        `${retentionData.retention30d}%`,
        `${retentionData.retention60d}%`,
        `${retentionData.retention90d}%`,
        retentionData.avgFrequencyDays !== null ? `${retentionData.avgFrequencyDays} d` : "—",
        retentionData.ltv !== null ? fmtCurrency(retentionData.ltv) : "—",
        retentionData.newCount,
        retentionData.recurringCount,
      ]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [147, 51, 234] },
      margin: { left: 14, right: 14 },
    });

    startY = (doc as any).lastAutoTable.finalY + 8;

    // Popular services
    if (retentionData.popularServices.length > 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(tr.sectionPopularServices, 14, startY);
      startY += 4;

      autoTable(doc, {
        startY,
        head: [[tr.colService, tr.colBooked, tr.colRevenue, tr.colRating]],
        body: retentionData.popularServices.map(s => [
          s.name, s.bookingCount, fmtCurrency(s.revenue),
          s.avgRating !== null ? s.avgRating.toFixed(1) : "—",
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [147, 51, 234] },
        alternateRowStyles: { fillColor: [248, 248, 252] },
        margin: { left: 14, right: 14 },
      });

      startY = (doc as any).lastAutoTable.finalY + 8;
    }

    // Churn risk
    if (retentionData.churnRiskClients.length > 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(tr.sectionChurnRisk, 14, startY);
      startY += 4;

      autoTable(doc, {
        startY,
        head: [[tr.colClient, tr.colEmail, tr.colDaysSince, tr.colTotalBookings, tr.colLastService]],
        body: retentionData.churnRiskClients.map(c => [
          c.name, c.email, c.daysSince, c.totalBookings, c.lastService,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [239, 68, 68] },
        alternateRowStyles: { fillColor: [255, 248, 248] },
        margin: { left: 14, right: 14 },
      });
    }
  }

  if (tab === "branchPerformance" && branchData) {
    // Summary
    const s = branchData.summary;
    autoTable(doc, {
      startY,
      head: [[tr.colTotalAttended, tr.colTotalRevenue, tr.colAvgCancelRate, tr.colAvgOccupancy, tr.colTopRevenue, tr.colTopOccupancy]],
      body: [[
        s.totalAttended,
        fmtCurrency(s.totalRevenue),
        `${s.avgCancellationRate}%`,
        s.avgOccupancy !== null ? `${s.avgOccupancy}%` : "—",
        s.topByRevenue ? `${s.topByRevenue.name} (${fmtCurrency(s.topByRevenue.revenue)})` : "—",
        s.topByOccupancy ? `${s.topByOccupancy.name} (${s.topByOccupancy.rate}%)` : "—",
      ]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [147, 51, 234] },
      margin: { left: 14, right: 14 },
    });

    startY = (doc as any).lastAutoTable.finalY + 8;

    autoTable(doc, {
      startY,
      head: [[tr.colBranch, tr.colStaff, tr.colAttended, tr.colCancelled, tr.colCancelPct, tr.colRevenue, tr.colNewClients, tr.colRecurringClients, tr.colOccupancy, tr.colRating]],
      body: branchData.rows.map(r => [
        r.branchName, r.staffCount,
        r.attended, r.cancelled, `${r.cancellationRate}%`,
        fmtCurrency(r.revenue),
        r.newClients, r.recurringClients,
        r.occupancyRate !== null ? `${r.occupancyRate}%` : "—",
        r.avgRating !== null ? r.avgRating.toFixed(1) : "—",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [147, 51, 234] },
      alternateRowStyles: { fillColor: [248, 248, 252] },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `${i} / ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" },
    );
  }

  doc.save(`reporte_${tab}_${dateFrom}_${dateTo}.pdf`);
}

// ─── Excel export ─────────────────────────────────────────────────────────────

async function exportExcel(
  tab: "staffPerformance" | "clientRetention" | "branchPerformance",
  staffData: StaffPerformanceResult | null,
  retentionData: RetentionResult | null,
  branchData: BranchPerformanceResult | null,
  dateFrom: string,
  dateTo: string,
) {
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();

  if (tab === "staffPerformance" && staffData) {
    const rows = [
      ["Especialista", "Sucursal", "Atendidas", "Canceladas", "% Cancelación", "No-shows", "Ingresos", "Rating", "Hrs productivas"],
      ...staffData.rows.map(r => [
        r.name, r.branchName,
        r.attended, r.cancelled, r.cancellationRate / 100, r.noShows,
        r.revenue,
        r.avgRating ?? "",
        r.productiveMinutes > 0 ? r.productiveMinutes / 60 : 0,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    // Format columns
    ws["!cols"] = [{ wch: 24 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 8 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, "Staff");

    // Summary sheet
    const s = staffData.summary;
    const sumWs = XLSX.utils.aoa_to_sheet([
      ["Periodo", `${dateFrom} — ${dateTo}`],
      ["Total atendidas", s.totalAttended],
      ["Ingresos totales", s.totalRevenue],
      ["% Cancelación promedio", s.avgCancellationRate / 100],
      ["Rating promedio", s.avgRating ?? ""],
      ["Top por citas", s.topByBookings?.name ?? ""],
      ["Top por rating", s.topByRating?.name ?? ""],
    ]);
    XLSX.utils.book_append_sheet(wb, sumWs, "Resumen");
  }

  if (tab === "clientRetention" && retentionData) {
    // Summary
    const sumWs = XLSX.utils.aoa_to_sheet([
      ["Periodo", `${dateFrom} — ${dateTo}`],
      ["Retención 30d", retentionData.retention30d / 100],
      ["Retención 60d", retentionData.retention60d / 100],
      ["Retención 90d", retentionData.retention90d / 100],
      ["Frecuencia visita (días)", retentionData.avgFrequencyDays ?? ""],
      ["Ticket promedio por cliente", retentionData.ltv ?? ""],
      ["Clientes nuevos", retentionData.newCount],
      ["Clientes recurrentes", retentionData.recurringCount],
    ]);
    XLSX.utils.book_append_sheet(wb, sumWs, "Resumen");

    // Services
    if (retentionData.popularServices.length > 0) {
      const svcWs = XLSX.utils.aoa_to_sheet([
        ["Servicio", "Veces agendado", "Ingresos", "Rating promedio"],
        ...retentionData.popularServices.map(s => [s.name, s.bookingCount, s.revenue, s.avgRating ?? ""]),
      ]);
      svcWs["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, svcWs, "Servicios");
    }

    // Churn risk
    if (retentionData.churnRiskClients.length > 0) {
      const churnWs = XLSX.utils.aoa_to_sheet([
        ["Nombre", "Email", "Días sin visita", "Citas totales", "Último servicio"],
        ...retentionData.churnRiskClients.map(c => [c.name, c.email, c.daysSince, c.totalBookings, c.lastService]),
      ]);
      churnWs["!cols"] = [{ wch: 24 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 28 }];
      XLSX.utils.book_append_sheet(wb, churnWs, "Riesgo Churn");
    }
  }

  if (tab === "branchPerformance" && branchData) {
    const rows = [
      ["Sucursal", "Staff activo", "Atendidas", "Canceladas", "% Cancelación", "Ingresos", "Nuevos", "Recurrentes", "Ocupación %", "Rating"],
      ...branchData.rows.map(r => [
        r.branchName, r.staffCount,
        r.attended, r.cancelled, r.cancellationRate / 100,
        r.revenue,
        r.newClients, r.recurringClients,
        r.occupancyRate !== null ? r.occupancyRate / 100 : "",
        r.avgRating ?? "",
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, ws, "Sucursales");

    // Weekly trend
    if (branchData.weeklyTrend.length > 0) {
      const branchIds = branchData.rows.map(r => r.branchId);
      const header = ["Semana", ...branchIds.map(id => branchData.branchNames[id] ?? id)];
      const trendRows = branchData.weeklyTrend.map(w => [
        w.label,
        ...branchIds.map(id => w.branches[id] ?? 0),
      ]);
      const trendWs = XLSX.utils.aoa_to_sheet([header, ...trendRows]);
      XLSX.utils.book_append_sheet(wb, trendWs, "Tendencia semanal");
    }
  }

  XLSX.writeFile(wb, `reporte_${tab}_${dateFrom}_${dateTo}.xlsx`);
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface ExportButtonProps {
  tab: "staffPerformance" | "clientRetention" | "branchPerformance";
  staffData: StaffPerformanceResult | null;
  retentionData: RetentionResult | null;
  branchData: BranchPerformanceResult | null;
  dateFrom: string;
  dateTo: string;
}

export function ExportButton({ tab, staffData, retentionData, branchData, dateFrom, dateTo }: ExportButtonProps) {
  const t = useTranslations("Dashboard.analytics.exportReports");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [xlsxLoading, setXlsxLoading] = useState(false);

  const titleMap: Record<string, string> = {
    staffPerformance: t("pdfStaffTitle"),
    clientRetention: t("pdfRetentionTitle"),
    branchPerformance: t("pdfBranchTitle"),
  };

  const hasData =
    (tab === "staffPerformance" && staffData !== null) ||
    (tab === "clientRetention" && retentionData !== null) ||
    (tab === "branchPerformance" && branchData !== null);

  if (!hasData) return null;

  const handlePdf = async () => {
    setPdfLoading(true);
    try {
      await exportPdf(
        tab, staffData, retentionData, branchData,
        dateFrom, dateTo,
        titleMap[tab],
        t("pdfPeriod"),
        t("pdfGeneratedOn"),
        {
          colTotalAttended: t("colTotalAttended"), colRevenue: t("colRevenue"),
          colCancellationRate: t("colCancellationRate"), colAvgRating: t("colAvgRating"),
          colSpecialist: t("colSpecialist"), colBranch: t("colBranch"),
          colAttended: t("colAttended"), colCancelled: t("colCancelled"),
          colCancelPct: t("colCancelPct"), colNoShows: t("colNoShows"),
          colRating: t("colRating"), colProductiveHrs: t("colProductiveHrs"),
          colRetention30: t("colRetention30"), colRetention60: t("colRetention60"),
          colRetention90: t("colRetention90"), colVisitFreq: t("colVisitFreq"),
          colLtv: t("colLtv"), colNew: t("colNew"), colRecurring: t("colRecurring"),
          sectionPopularServices: t("sectionPopularServices"),
          colService: t("colService"), colBooked: t("colBooked"),
          sectionChurnRisk: t("sectionChurnRisk"), colClient: t("colClient"),
          colEmail: t("colEmail"), colDaysSince: t("colDaysSince"),
          colTotalBookings: t("colTotalBookings"), colLastService: t("colLastService"),
          colTotalRevenue: t("colTotalRevenue"), colAvgCancelRate: t("colAvgCancelRate"),
          colAvgOccupancy: t("colAvgOccupancy"), colTopRevenue: t("colTopRevenue"),
          colTopOccupancy: t("colTopOccupancy"), colStaff: t("colStaff"),
          colNewClients: t("colNewClients"), colRecurringClients: t("colRecurringClients"),
          colOccupancy: t("colOccupancy"),
        },
      );
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExcel = async () => {
    setXlsxLoading(true);
    try {
      await exportExcel(tab, staffData, retentionData, branchData, dateFrom, dateTo);
    } finally {
      setXlsxLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handlePdf}
        disabled={pdfLoading}
        className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-950/20 border border-slate-200 dark:border-white/10 hover:border-red-200 dark:hover:border-red-800/30 text-slate-600 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 text-xs font-semibold px-3 py-2 rounded-xl transition-all duration-150 disabled:opacity-50"
      >
        {pdfLoading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <FileText className="w-3.5 h-3.5" />}
        {pdfLoading ? t("generating") : t("exportPdf")}
      </button>

      <button
        onClick={handleExcel}
        disabled={xlsxLoading}
        className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-slate-200 dark:border-white/10 hover:border-emerald-200 dark:hover:border-emerald-800/30 text-slate-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-semibold px-3 py-2 rounded-xl transition-all duration-150 disabled:opacity-50"
      >
        {xlsxLoading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Download className="w-3.5 h-3.5" />}
        {xlsxLoading ? t("generating") : t("exportExcel")}
      </button>
    </div>
  );
}
