import { format, parseISO } from "date-fns";
import { formatPKR } from "@/lib/format";
import { Statement } from "./statements.types";
import { breakdownLines, monthLabel, statementStatusLabelMap } from "./statements.helpers";

/**
 * Builds the statement PDF in the browser.
 * TODO(api): replace with the ledger PDF from GET /seller/statements/:id/pdf
 */
export async function downloadStatementPdf(s: Statement, sellerName: string) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const date = (iso: string) => format(parseISO(iso), "dd MMM yyyy");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Aariy", 14, 20);
  doc.setFontSize(13);
  doc.text(`Statement · ${monthLabel(s)}`, 14, 30);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const meta = [
    `Seller: ${sellerName}`,
    `Issued: ${date(s.issuedAt)}`,
    `Parcels: ${s.parcelCount}`,
    `Status: ${statementStatusLabelMap[s.status]}${s.paidAt ? ` on ${date(s.paidAt)}` : ""}`,
    ...(s.paymentReference ? [`Bank reference: ${s.paymentReference}`] : []),
  ];
  doc.text(meta, 14, 40);

  autoTable(doc, {
    startY: 40 + meta.length * 5 + 6,
    head: [["Line", "Amount"]],
    body: [
      ...breakdownLines(s).map((l) => [l.label, `${l.deduct ? "- " : ""}${formatPKR(l.amount)}`]),
      ["Net payout", formatPKR(s.netPayout)],
    ],
    theme: "grid",
    headStyles: { fillColor: [184, 83, 47] },
    columnStyles: { 1: { halign: "right" } },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === 5) data.cell.styles.fontStyle = "bold";
    },
  });

  doc.setFontSize(9);
  doc.setTextColor(107, 98, 91);
  doc.text(
    "Issued after the 7-day return window closes. Paid by bank transfer. Amounts match Aariy's ledger.",
    14,
    285,
  );

  doc.save(`aariy-statement-${s.month.slice(0, 7)}.pdf`);
}
