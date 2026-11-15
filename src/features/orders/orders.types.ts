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

export type PickupAddress = {
  id: string;
  label: string;
  address: string;
  city: string;
  isDefault?: boolean;
};

export type Parcel = {
  id: string;
  parcelNumber: string;
  buyerFirstName: string;
  buyerCity: string;
  /** When the Aariy CSR confirmed the order with the buyer. */
  confirmedAt: string;
  /** Date the parcel must be ready for the courier (ISO date). */
  dispatchBy: string;
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
