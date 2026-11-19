import { format, parseISO } from "date-fns";
import type { StatusTone } from "@/components/ui/StatusBadge";
import { DispatchInput, OrderTab, Parcel, ParcelStatus } from "./orders.types";

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

/** The date the seller is working to: what they set, else the promise. */
export const effectiveDispatchDate = (p: Parcel) => p.plannedDispatchDate ?? p.dispatchBy;

/** Seller may pick any day from order confirmation up to the promised dispatch date. */
export function validateDispatchDate(p: Parcel, date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Pick a dispatch date.";
  if (date > p.dispatchBy) return `Dispatch date cannot be after the promised date (${formatLongDate(p.dispatchBy)}).`;
  if (date < p.confirmedAt.slice(0, 10)) return "Dispatch date cannot be before the order was confirmed.";
  return null;
}

export type DispatchErrors = Partial<Record<"trackingNumber" | "dispatchedAt", string>>;

export function validateDispatch(input: DispatchInput): DispatchErrors {
  const e: DispatchErrors = {};
  if (!/^[A-Za-z0-9-]{6,30}$/.test(input.trackingNumber.trim()))
    e.trackingNumber = "Enter the courier tracking number (6 to 30 letters, numbers or dashes).";
  const t = Date.parse(input.dispatchedAt);
  if (Number.isNaN(t)) e.dispatchedAt = "Enter the dispatch date and time.";
  else if (t > Date.now() + 5 * 60 * 1000) e.dispatchedAt = "Dispatch time cannot be in the future.";
  return e;
}

/** Value for <input type="datetime-local"> in the browser's time zone. */
export const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** "12 Nov 2026, 3:40 pm" */
export const formatDateTime = (iso: string) => format(parseISO(iso), "dd MMM yyyy, h:mm a");
