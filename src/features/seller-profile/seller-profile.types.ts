import type { SellerAccountStatus } from "@/features/auth/auth.types";

/* ---------------- GET /v1/seller/onboarding ---------------- */

/** The only values the backend accepts. */
export const BUSINESS_TYPE_CODES = ["AOP", "COMPANY", "SOLE_PROPRIETOR"] as const;
export const TAX_STATUSES = ["REGISTERED", "UNREGISTERED"] as const;
export type BusinessTypeCode = (typeof BUSINESS_TYPE_CODES)[number];
export type TaxStatus = (typeof TAX_STATUSES)[number];

export const asBusinessTypeCode = (x: unknown): BusinessTypeCode | null => {
  const v = String(x ?? "").trim().toUpperCase();
  return (BUSINESS_TYPE_CODES as readonly string[]).includes(v) ? (v as BusinessTypeCode) : null;
};
export const asTaxStatus = (x: unknown): TaxStatus | null => {
  const v = String(x ?? "").trim().toUpperCase();
  return (TAX_STATUSES as readonly string[]).includes(v) ? (v as TaxStatus) : null;
};
export type DocumentType =
  | "NATIONAL_ID_FRONT"
  | "NATIONAL_ID_BACK"
  | "TAX_CERTIFICATE"
  | "SALES_TAX_CERTIFICATE"
  | "BANK_PROOF"
  | "BRAND_AUTHORISATION"
  | "COMPANY_REGISTRATION"
  | "PARTNERSHIP_DEED"
  | "OTHER";

export type CityOption = { id: string; name: string; isActive?: boolean; regionId?: string };

export type ProvinceOption = {
  id: string;
  code: string;
  name: string;
  regionType?: string;
  sortOrder?: number;
  cities: CityOption[];
};

export type CountryOption = {
  id: string;
  code: string;
  name: string;
  currency?: string;
  isActive: boolean;
  isAcceptingOrders: boolean;
  provinces: ProvinceOption[];
  cities: CityOption[];
};

export type BusinessTypeOption = {
  code: BusinessTypeCode;
  label: string;
  requiredDocuments: DocumentType[];
};

/** Document already on file. The API may add more fields (status, file name, URL). */
export type SavedDocument = {
  type: DocumentType;
  key: string;
  title?: string | null;
  fileName?: string | null;
  url?: string | null;
  status?: string | null;
  reason?: string | null;
};

export type SavedBrand = {
  id?: string | null;
  name: string;
  slug?: string | null;
  story?: string | null;
  logoKey?: string | null;
  logoUrl?: string | null;
  bannerKey?: string | null;
  bannerUrl?: string | null;
};

export type SellerProfileResponse = {
  sellerId: string;
  status: SellerAccountStatus | "SUSPENDED" | string;
  /** False while Aariy reviews, or after approval: the form is read-only. */
  editable: boolean;
  deadline: { submitBy: string; daysLeft: number; message: string } | null;
  suspensionReason: string | null;
  review: { note?: string | null; reviewedAt?: string | null; [k: string]: unknown } | null;
  rejectedDocuments: { type: DocumentType; reason?: string | null; title?: string | null }[];
  requiredDocuments: DocumentType[];
  missingDocuments: DocumentType[];
  prefill: {
    owner: { fullName: string | null; email: string | null; phone: string | null };
    country: { id: string; code: string; name: string } | null;
    businessTypeCode: BusinessTypeCode | null;
    business: {
      countryId: string | null;
      registeredName: string | null;
      tradingName: string | null;
      regionCode: string | null;
      provinceId: string | null;
      provinceName: string | null;
      dispatchCityId: string | null;
      /** City name sent with the response (business.dispatchCity.name). */
      dispatchCityName: string | null;
      avgDispatchDays: number | null;
      contactEmail: string | null;
      address: string | null;
    };
    /** Tax and bank numbers are never sent back, only whether they are saved. */
    taxSaved: boolean;
    taxStatus: TaxStatus | null;
    bankSaved: boolean;
    /** Masked values on file, e.g. "••••5674", shown as placeholders. */
    onFile: {
      cnic: string | null;
      ntn: string | null;
      bankName: string | null;
      accountTitle: string | null;
      accountNumber: string | null;
      hasIban: boolean;
    };
    brands: SavedBrand[];
    documents: SavedDocument[];
    /** Ticks saved with the last submit, if the API sends them back. */
    declaration: { agreementRead: boolean; informationConfirmed: boolean } | null;
  };
  options: {
    countries: CountryOption[];
    businessTypes: BusinessTypeOption[];
    taxStatuses: TaxStatus[];
    documentTypes: DocumentType[];
    agreement: { policyDocumentId: string; version: string } | null;
  };
};

/* ---------------- PUT /v1/seller/onboarding ---------------- */

/** Empty fields are left out, so "Save" can send a half-filled form. */
export type SellerProfilePayload = {
  owner: { fullName?: string; phone?: string };
  businessTypeCode?: BusinessTypeCode;
  business: {
    countryId?: string;
    registeredName?: string;
    tradingName?: string;
    /** Province / state picked from GET /provinces. */
    provinceId?: string;
    /** Postal code (the API field is regionCode, A-Z / 0-9, up to 16). */
    regionCode?: string;
    dispatchCityId?: string;
    avgDispatchDays?: number;
    contactEmail?: string;
    /** Same city as dispatchCityId. */
    cityId?: string;
    address?: string;
  };
  /** Left out when already saved and the seller did not type new numbers. */
  tax?: { cnic?: string; ntn?: string; taxStatus: TaxStatus };
  bank?: { bankName?: string; accountTitle?: string; accountNumber?: string; iban?: string };
  brands: { id?: string; name: string; slug?: string; story?: string; logoKey?: string; bannerKey?: string }[];
  documents: { type: DocumentType; key: string; title?: string }[];
  declaration: { agreementRead: boolean; informationConfirmed: boolean };
  /** true = "Submit for approval" (save + submit); left out = save only. */
  submit?: boolean;
};

/* ---------------- Form state ---------------- */

/** A file slot: an uploaded key from the API, or a file picked on this page. */
export type DocSlot = {
  key: string | null;
  /** Shown in the tile. */
  name: string;
  size?: number;
  /** Picked on this page and not uploaded yet. */
  file?: File;
  /** Signed link from GET /seller/onboarding; it expires after about 5 minutes. */
  url?: string;
};

export type BrandDraft = {
  id: string;
  /** Id of the brand on the server, when it is already saved. */
  serverId?: string;
  /** Saved slug; a new brand gets one from its name. */
  slug?: string;
  name: string;
  story: string;
  logoKey: string | null;
  /** Preview: the saved logo URL or a local preview of a picked file. */
  logoPreview: string | null;
  logoFile?: File;
  bannerKey: string | null;
  bannerPreview: string | null;
  bannerFile?: File;
};

export type SellerProfileForm = {
  fullName: string;
  phone: string;
  email: string;
  businessTypeCode: BusinessTypeCode | "";
  countryId: string;
  /** Labels for the pickers, so the saved choice shows before the lists load. */
  countryName: string;
  /** Country code (e.g. PK) for GET /provinces?countryCode=. */
  countryCode: string;
  provinceId: string;
  provinceName: string;
  dispatchCityId: string;
  cityName: string;
  registeredName: string;
  tradingName: string;
  /** Postal code, sent as business.regionCode. */
  postalCode: string;
  address: string;
  avgDispatchDays: string;
  taxStatus: TaxStatus;
  cnic: string;
  ntn: string;
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
  brands: BrandDraft[];
  /** The six seller documents, by type. */
  documents: Partial<Record<DocumentType, DocSlot>>;
  agreementRead: boolean;
  informationConfirmed: boolean;
};

export type FormErrors = Partial<Record<string, string>>;

export type SaveResult = { success: boolean; message: string };
