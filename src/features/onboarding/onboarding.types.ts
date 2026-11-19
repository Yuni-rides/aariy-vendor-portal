import type { BusinessType } from "@/features/brand-profile/brand-profile.types";
import type { SellerAccountStatus } from "@/features/auth/auth.types";

export type StepKey =
  | "businessType"
  | "about"
  | "business"
  | "brands"
  | "tax"
  | "payout"
  | "documents"
  | "declaration";

export type AboutYou = {
  fullName: string;
  /** CNIC (13 digits, e.g. 42101-1234567-1) or SSN for future markets. */
  cnic: string;
  phone: string;
  email: string;
  designation: string;
};

export type BusinessInfo = {
  /** Registered or trading name. Becomes the legal name on statements. */
  legalName: string;
  /** SECP incorporation number (company) or firm registration number (AOP). */
  registrationNumber: string;
  address: string;
  city: string;
  website: string;
};

/** OWNER = the seller owns the brand; AUTHORISED = sells it with the owner's permission. */
export type BrandRelation = "OWNER" | "AUTHORISED";

export type BrandEntry = { id: string; name: string; relation: BrandRelation };

export type TaxInfo = { ntn: string; strn: string };

export type PayoutInfo = { bankName: string; accountTitle: string; iban: string };

/** Same six KYB slots as the admin "Add seller" form, so both portals send the same document types. */
export type DocKey =
  | "CNIC_FRONT"
  | "CNIC_BACK"
  | "TAX_CERTIFICATE"
  | "SALES_TAX_CERTIFICATE"
  | "BANK_PROOF"
  | "BRAND_AUTHORIZATION";

/** Metadata only: the file itself goes to private storage (admin roles only). */
export type UploadedDoc = {
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
};

/** Anything else that supports the application, e.g. a trademark certificate. */
export type OtherDoc = { id: string; label: string; file: UploadedDoc | null };

export type Declaration = {
  infoTrue: boolean;
  authenticProducts: boolean;
  agreementAccepted: boolean;
  /** Typed full name, used as the signature. */
  signatureName: string;
};

export type OnboardingDraft = {
  businessType: BusinessType | null;
  about: AboutYou;
  business: BusinessInfo;
  brands: BrandEntry[];
  tax: TaxInfo;
  payout: PayoutInfo;
  documents: Partial<Record<DocKey, UploadedDoc>>;
  otherDocuments: OtherDoc[];
  declaration: Declaration;
};

export type ContractAcceptance = { version: string; acceptedAt: string; signatureName: string };

export type OnboardingState = {
  /** Phone of the account this draft belongs to, so drafts never leak between accounts. */
  ownerPhone: string | null;
  draft: OnboardingDraft;
  completed: StepKey[];
  status: SellerAccountStatus;
  submittedAt: string | null;
  contract: ContractAcceptance | null;
  /** Message from the Aariy reviewer when changes are requested or the application is rejected. */
  reviewNote: string | null;
};

export type StepErrors = Record<string, string>;

export type OnboardingResult = { success: boolean; message: string };
