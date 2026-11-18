import type { StatusTone } from "@/components/ui/StatusBadge";
import type { PayoutRequirement } from "@/features/statements/statements.types";
import {
  AddressInput,
  BankInput,
  BankStatus,
  BrandProfile,
  BusinessType,
  PublicField,
  PublicProfile,
} from "./brand-profile.types";

export const STOREFRONT_BRAND_URL = "aariy.pk/brands/";

export const businessTypeLabelMap: Record<BusinessType, string> = {
  COMPANY: "Company",
  SOLE_PROPRIETOR: "Sole proprietor",
  PARTNERSHIP: "Partnership",
};

export const publicFieldLabelMap: Record<PublicField, string> = {
  brandName: "Brand name",
  slug: "Page URL",
  story: "Brand story",
  logoUrl: "Logo",
  bannerUrl: "Banner",
};

export const bankStatusLabelMap: Record<BankStatus, string> = {
  NOT_VERIFIED: "Not verified",
  PENDING: "Verification pending",
  VERIFIED: "Verified",
};

export const bankStatusToneMap: Record<BankStatus, StatusTone> = {
  NOT_VERIFIED: "warning",
  PENDING: "info",
  VERIFIED: "success",
};

export const PK_BANKS = [
  "Allied Bank",
  "Askari Bank",
  "Bank Alfalah",
  "Bank AL Habib",
  "Faysal Bank",
  "Habib Bank (HBL)",
  "JS Bank",
  "MCB Bank",
  "Meezan Bank",
  "Standard Chartered",
  "United Bank (UBL)",
];

export const PK_CITIES = [
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Hyderabad",
  "Peshawar",
  "Quetta",
  "Sialkot",
  "Gujranwala",
];

/** What the seller last asked for: live values with the pending ones on top. */
export const withPending = (p: BrandProfile): PublicProfile => ({ ...p.live, ...(p.pending?.values ?? {}) });

/** Fields in `draft` that differ from `base`. */
export const diffPublic = (base: PublicProfile, draft: PublicProfile): Partial<PublicProfile> => {
  const out: Partial<PublicProfile> = {};
  (Object.keys(draft) as PublicField[]).forEach((k) => {
    if ((draft[k] ?? null) !== (base[k] ?? null)) (out as Record<string, unknown>)[k] = draft[k];
  });
  return out;
};

export type PublicErrors = Partial<Record<"brandName" | "slug" | "story", string>>;

export function validatePublic(p: PublicProfile): PublicErrors {
  const e: PublicErrors = {};
  if (!p.brandName.trim()) e.brandName = "Brand name is required.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)) e.slug = "Use lowercase letters, numbers and single hyphens.";
  else if (p.slug.length < 3 || p.slug.length > 40) e.slug = "Use 3 to 40 characters.";
  if (p.story.length > 1000) e.story = "Keep the story under 1000 characters.";
  return e;
}

/** Pakistani NTN: 7 digits and a check digit, e.g. 1234567-8. */
export const normaliseNtn = (v: string) => v.replace(/\s/g, "");
export const isValidNtn = (v: string) => /^\d{7}-?\d$/.test(normaliseNtn(v));
/** "1234567-8" -> "•••••67-8" */
export const maskNtn = (v: string) => {
  const d = normaliseNtn(v).replace("-", "");
  return `•••••${d.slice(5, 7)}-${d.slice(7)}`;
};

/** Pakistani IBAN: PK + 2 check digits + 4-letter bank code + 16 digits. */
export const normaliseIban = (v: string) => v.replace(/\s/g, "").toUpperCase();
export const isValidIban = (v: string) => /^PK\d{2}[A-Z]{4}\d{16}$/.test(normaliseIban(v));

export const maskedIban = (last4: string) => `PK•• •••• •••• ${last4}`;

export type BankErrors = Partial<Record<keyof BankInput, string>>;

export function validateBank(b: BankInput): BankErrors {
  const e: BankErrors = {};
  if (!b.bankName) e.bankName = "Pick your bank.";
  if (!b.accountTitle.trim()) e.accountTitle = "Account title is required.";
  if (!isValidIban(b.iban)) e.iban = "Enter a valid IBAN, e.g. PK36 MEZN 0001 2345 6789 0123.";
  return e;
}

export type AddressErrors = Partial<Record<keyof AddressInput, string>>;

export const isValidPkMobile = (v: string) => /^03\d{2}[\s-]?\d{7}$/.test(v.trim());

export function validateAddress(a: AddressInput): AddressErrors {
  const e: AddressErrors = {};
  if (!a.label.trim()) e.label = "Give it a name, e.g. Main store.";
  if (!a.address.trim()) e.address = "Address is required.";
  if (!a.city) e.city = "Pick a city.";
  if (!a.contactName?.trim()) e.contactName = "Who should the courier ask for?";
  if (!a.phone || !isValidPkMobile(a.phone)) e.phone = "Use a mobile number like 0300 1234567.";
  return e;
}

/** What still blocks payouts. */
export function payoutRequirements(p: BrandProfile | null): PayoutRequirement[] {
  if (!p) return [];
  const missing: PayoutRequirement[] = [];
  if (!p.legal.ntnMasked) missing.push("NTN");
  if (p.bank?.status !== "VERIFIED") missing.push("VERIFIED_BANK_ACCOUNT");
  return missing;
}
