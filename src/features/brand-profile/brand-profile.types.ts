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

export type BusinessType = "COMPANY" | "SOLE_PROPRIETOR" | "PARTNERSHIP";

/** Locked after approval; the backend only returns masked numbers. */
export type LegalDetails = {
  legalName: string;
  businessType: BusinessType;
  /** Masked NTN, or null when the seller has not added it yet. */
  ntnMasked: string | null;
  cnicMasked: string;
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
};

export type ProfileResult = { success: boolean; message: string };
