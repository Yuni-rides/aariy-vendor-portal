/**
 * A parcel is the seller's part of an Aariy order. Orders are confirmed by an
 * Aariy CSR before the parcel appears in the seller portal.
 */
export type ParcelStatus =
  | "NEW"
  | "ACCEPTED"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "DELIVERED"
  | "CANCELLED";

export type ParcelItem = {
  id: string;
  name: string;
  size: string;
  sku: string;
  qty: number;
  /** Line total in PKR. */
  price: number;
};

/** Pickup addresses are managed on the Brand profile page. */
export type { PickupAddress } from "@/features/brand-profile/brand-profile.types";

export type Parcel = {
  id: string;
  parcelNumber: string;
  buyerFirstName: string;
  buyerCity: string;
  /** When the Aariy CSR confirmed the order with the buyer. */
  confirmedAt: string;
  /** Latest dispatch date promised to the buyer (ISO date). */
  dispatchBy: string;
  /** Dispatch date the seller set when accepting (ISO date), on or before dispatchBy. */
  plannedDispatchDate?: string | null;
  /** When the parcel actually left (ISO date-time), recorded by the seller. */
  dispatchedAt?: string | null;
  /** Courier label the seller uploaded, if any. */
  labelFileName?: string | null;
  items: ParcelItem[];
  /** Amount the courier collects for this parcel (cash on delivery). */
  codAmount: number;
  /** Aariy commission in percent. */
  commissionRate: number;
  pickupAddressId: string | null;
  status: ParcelStatus;
  trackingNumber?: string | null;
  cancelReason?: string | null;
  updatedAt: string;
};

export type OrderTab = "NEW" | "TO_PACK" | "PICKED_UP" | "DELIVERED" | "CANCELLED";

export type OrderResult = { success: boolean; message: string };

export type DispatchInput = {
  trackingNumber: string;
  /** ISO date-time. */
  dispatchedAt: string;
  labelFileName?: string | null;
};
