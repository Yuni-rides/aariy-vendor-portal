import { formatPKR } from "@/lib/format";
import { Parcel, PickupAddress } from "./orders.types";
import { formatLongDate } from "./orders.helpers";

/**
 * Builds a simple shipping label PDF in the browser.
 * TODO(api): replace with the courier label from GET /seller/parcels/:id/label
 */
export async function downloadParcelLabel(parcel: Parcel, address?: PickupAddress) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: [100, 150] });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Aariy", 8, 14);
  doc.setFontSize(14);
  doc.text(parcel.parcelNumber, 8, 26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const lines = [
    `Ship to: ${parcel.buyerFirstName}, ${parcel.buyerCity}`,
    `Pickup from: ${address ? `${address.label}, ${address.address}, ${address.city}` : "-"}`,
    `Dispatch by: ${formatLongDate(parcel.dispatchBy)}`,
    "",
    "Items:",
    ...parcel.items.map((i) => `  ${i.name} (${i.size}) x ${i.qty}  ·  ${i.sku}`),
    "",
  ];
  doc.text(doc.splitTextToSize(lines.join("\n"), 84), 8, 36);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`COD: ${formatPKR(parcel.codAmount)}`, 8, 138);

  doc.save(`label-${parcel.parcelNumber}.pdf`);
}
