import { format, parseISO } from "date-fns";
import type { StatusTone } from "@/components/ui/StatusBadge";
import { OrderTab, Parcel, ParcelStatus } from "./orders.types";

export const parcelStatusLabelMap: Record<ParcelStatus, string> = {
  NEW: "New",
  ACCEPTED: "To pack",
  READY_FOR_PICKUP: "Ready for pickup",
  PICKED_UP: "Picked up",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const parcelStatusToneMap: Record<ParcelStatus, StatusTone> = {
  NEW: "info",
  ACCEPTED: "warning",
  READY_FOR_PICKUP: "warning",
  PICKED_UP: "success",
  DELIVERED: "success",
  CANCELLED: "danger",
};

const TAB_STATUSES: Record<OrderTab, ParcelStatus[]> = {
  NEW: ["NEW"],
  TO_PACK: ["ACCEPTED", "READY_FOR_PICKUP"],
  PICKED_UP: ["PICKED_UP"],
  DELIVERED: ["DELIVERED"],
  CANCELLED: ["CANCELLED"],
};

export const ORDER_TABS: { value: OrderTab; label: string; showCount?: boolean }[] = [
  { value: "NEW", label: "New", showCount: true },
  { value: "TO_PACK", label: "To pack", showCount: true },
  { value: "PICKED_UP", label: "Picked up" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const matchesTab = (p: Parcel, tab: OrderTab) => TAB_STATUSES[tab].includes(p.status);

export const tabForStatus = (status: ParcelStatus): OrderTab =>
  (Object.keys(TAB_STATUSES) as OrderTab[]).find((t) => TAB_STATUSES[t].includes(status)) ?? "NEW";

/** "12 Nov" */
export const formatShortDate = (iso: string) => format(parseISO(iso), "dd MMM");
/** "12 Nov 2026" */
export const formatLongDate = (iso: string) => format(parseISO(iso), "dd MMM yyyy");

export const itemsSummary = (p: Parcel) =>
  p.items.map((i) => `${i.name} × ${i.qty}`).join(", ");

export const commissionAmount = (p: Parcel) => Math.round((p.codAmount * p.commissionRate) / 100);
