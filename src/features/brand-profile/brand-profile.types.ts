import type { DocKey, UploadedDoc } from "@/features/onboarding/onboarding.types";

/** What buyers see on the brand page. Changes are reviewed by Aariy staff. */
export type PublicProfile = {
  brandName: string;
  /** Page URL: aariy.pk/brands/<slug> */
  slug: string;
  story: string;
  logoUrl: string | null;
  bannerUrl: string | null;
};

export type PublicField = keyof PublicProfile;

export type PendingReview = {
  submittedAt: string;
  /** Only the fields that changed, with their new values. */
  values: Partial<PublicProfile>;
};

/** AOP = association of persons (partnership firm). */
export type BusinessType = "SOLE_PROPRIETOR" | "AOP" | "COMPANY";

/** Locked after approval; the backend only returns masked numbers. */
export type LegalDetails = {
  legalName: string;
  businessType: BusinessType;
  /** Masked NTN, or null when the seller has not added it yet. */
  ntnMasked: string | null;
  /** Sales tax registration number, only for sales-tax registered sellers. */
  strnMasked: string | null;
  cnicMasked: string;
  /** Contact on file for the business (admin "Add seller": email and phone number). */
  email: string;
  phoneMasked: string;
};

export type KybDocStatus = "APPROVED" | "IN_REVIEW" | "REJECTED";

/** A KYB file on record. New or replaced files go back to Aariy review. */
export type KybDoc = UploadedDoc & { status: KybDocStatus; note?: string | null };

export type OtherKybDoc = KybDoc & { id: string; label: string };

export type KybDocuments = {
  /** Same six slots as onboarding and the admin "Add seller" form. */
  documents: Partial<Record<DocKey, KybDoc>>;
  others: OtherKybDoc[];
};

export type PickupAddress = {
  id: string;
  label: string;
  address: string;
  city: string;
  contactName?: string;
  phone?: string;
  isDefault?: boolean;
};

export type AddressInput = Omit<PickupAddress, "id" | "isDefault">;

export type BankStatus = "NOT_VERIFIED" | "PENDING" | "VERIFIED";

export type BankAccount = {
  bankName: string;
  accountTitle: string;
  ibanLast4: string;
  status: BankStatus;
};

export type BankInput = { bankName: string; accountTitle: string; iban: string };

export type BrandProfile = {
  live: PublicProfile;
  pending: PendingReview | null;
  legal: LegalDetails;
  addresses: PickupAddress[];
  bank: BankAccount | null;
  kyb: KybDocuments;
};

export type ProfileResult = { success: boolean; message: string };
