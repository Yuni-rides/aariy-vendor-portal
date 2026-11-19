import { isValidEmailAddress, isValidPkMobile } from "@/features/auth/auth.helpers";
import { isValidNtn, isValidStrn, validateBank } from "@/features/brand-profile/brand-profile.helpers";
import { DocKey, OnboardingDraft, StepErrors, StepKey } from "./onboarding.types";

export const STEPS: { key: StepKey; title: string; hint: string }[] = [
  { key: "businessType", title: "Business type", hint: "How your business is registered" },
  { key: "about", title: "About you", hint: "The person responsible for the account" },
  { key: "business", title: "Business", hint: "Legal name and address" },
  { key: "brands", title: "Brands", hint: "The brands you will sell" },
  { key: "tax", title: "Tax", hint: "NTN, and STRN if registered" },
  { key: "payout", title: "Payouts", hint: "Where we send your money" },
  { key: "documents", title: "Documents", hint: "KYB documents for review" },
  { key: "declaration", title: "Declaration", hint: "Seller agreement" },
];

export const BUSINESS_TYPE_OPTIONS = [
  { value: "SOLE_PROPRIETOR", label: "Sole proprietor", hint: "You own the business yourself." },
  { value: "AOP", label: "AOP (partnership)", hint: "An association of persons or partnership firm." },
  { value: "COMPANY", label: "Company", hint: "Private or public limited company registered with SECP." },
] as const;

/** Order and labels match the admin "Add seller" form. */
export const DOCS: { key: DocKey; label: string; hint: string; when?: string }[] = [
  { key: "CNIC_FRONT", label: "CNIC / ID front", hint: "Of the account owner" },
  { key: "CNIC_BACK", label: "CNIC / ID back", hint: "Of the account owner" },
  { key: "TAX_CERTIFICATE", label: "Tax certificate", hint: "NTN certificate from FBR IRIS" },
  {
    key: "SALES_TAX_CERTIFICATE",
    label: "Sales tax certificate",
    hint: "STRN certificate",
    when: "Needed if you are registered for sales tax",
  },
  { key: "BANK_PROOF", label: "Bank proof", hint: "Cancelled cheque or bank letter showing the IBAN" },
  {
    key: "BRAND_AUTHORIZATION",
    label: "Brand authorization",
    hint: "Letter from the brand owner",
    when: "Needed if you sell a brand you do not own",
  },
];

export const MAX_DOC_BYTES = 5 * 1024 * 1024;
export const DOC_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const DOC_TYPES_LABEL = "JPG, PNG, WEBP or PDF, up to 5 MB";
export const MAX_OTHER_DOCS = 5;

/** Seller agreement shown at the declaration step. */
// TODO: replace with the counsel-approved seller agreement (SOW section 7) and link the full text.
export const SELLER_AGREEMENT = {
  version: "v1.0",
  effective: "1 November 2026",
  points: [
    "Aariy charges a commission on each delivered parcel at the rate agreed for your brand.",
    "You keep stock up to date and dispatch accepted orders by the date you set.",
    "Every item is checked at the Aariy hub; items that fail are returned to you.",
    "Payouts are monthly by bank transfer after the return window closes. Part may be held as a reserve for returns.",
    "Products must be authentic, match their photos and not be on the prohibited products list.",
    "Aariy may pause listings or payouts if these terms are broken.",
  ],
};

/** CNIC (13 digits) or US-style SSN (9 digits). Pakistan uses CNIC at launch. */
export const isValidIdNumber = (v: string) => {
  const s = v.trim();
  return /^\d{5}-?\d{7}-?\d$/.test(s) || /^\d{3}-?\d{2}-?\d{4}$/.test(s);
};

/** The four always-needed slots, plus the two that depend on earlier answers. */
export const docsRequired = (d: OnboardingDraft): DocKey[] => {
  const keys: DocKey[] = ["CNIC_FRONT", "CNIC_BACK", "TAX_CERTIFICATE", "BANK_PROOF"];
  if (d.tax.strn.trim()) keys.push("SALES_TAX_CERTIFICATE");
  if (d.brands.some((b) => b.relation === "AUTHORISED")) keys.push("BRAND_AUTHORIZATION");
  return keys;
};

export const emptyDraft = (): OnboardingDraft => ({
  businessType: null,
  about: { fullName: "", cnic: "", phone: "", email: "", designation: "" },
  business: { legalName: "", registrationNumber: "", address: "", city: "", website: "" },
  brands: [],
  tax: { ntn: "", strn: "" },
  payout: { bankName: "", accountTitle: "", iban: "" },
  documents: {},
  otherDocuments: [],
  declaration: { infoTrue: false, authenticProducts: false, agreementAccepted: false, signatureName: "" },
});

/** Errors for one step; an empty object means the step can be saved. */
export function validateStep(step: StepKey, d: OnboardingDraft): StepErrors {
  const e: StepErrors = {};
  switch (step) {
    case "businessType":
      if (!d.businessType) e.businessType = "Choose how your business is registered.";
      break;
    case "about":
      if (!d.about.fullName.trim()) e.fullName = "Enter your full name as on your CNIC.";
      if (!isValidIdNumber(d.about.cnic)) e.cnic = "Enter a 13-digit CNIC, e.g. 42101-1234567-1.";
      if (!isValidPkMobile(d.about.phone)) e.phone = "Enter a mobile number like 0300 1234567.";
      if (!isValidEmailAddress(d.about.email)) e.email = "Enter a valid email address.";
      break;
    case "business":
      if (!d.business.legalName.trim()) e.legalName = "Enter the registered or trading name.";
      if (d.businessType === "COMPANY" && !d.business.registrationNumber.trim())
        e.registrationNumber = "Enter the SECP incorporation number.";
      if (!d.business.address.trim()) e.address = "Enter the business address.";
      if (!d.business.city) e.city = "Pick a city.";
      break;
    case "brands": {
      const names = d.brands.map((b) => b.name.trim().toLowerCase());
      if (d.brands.length === 0) e.brands = "Add at least one brand.";
      else if (names.some((n) => !n)) e.brands = "Every brand needs a name.";
      else if (new Set(names).size !== names.length) e.brands = "Each brand can only be added once.";
      break;
    }
    case "tax":
      if (!isValidNtn(d.tax.ntn)) e.ntn = "Enter a valid NTN, e.g. 1234567-8.";
      if (d.tax.strn.trim() && !isValidStrn(d.tax.strn)) e.strn = "Enter a valid 13-digit STRN, or leave it empty.";
      break;
    case "payout":
      Object.assign(e, validateBank(d.payout));
      break;
    case "documents":
      docsRequired(d).forEach((k) => {
        if (!d.documents[k]) e[k] = "Upload this document.";
      });
      (d.otherDocuments ?? []).forEach((o) => {
        if (!o.label.trim()) e[`other-${o.id}-label`] = "Say what this document is.";
        if (!o.file) e[`other-${o.id}-file`] = "Upload the file, or remove this row.";
      });
      break;
    case "declaration":
      if (!d.declaration.infoTrue) e.infoTrue = "Confirm the information is correct.";
      if (!d.declaration.authenticProducts) e.authenticProducts = "Confirm your products are authentic.";
      if (!d.declaration.agreementAccepted) e.agreementAccepted = "Accept the seller agreement.";
      if (d.declaration.signatureName.trim().toLowerCase() !== d.about.fullName.trim().toLowerCase())
        e.signatureName = "Type your full name exactly as in About you.";
      break;
  }
  return e;
}

export const formatBytes = (n: number) =>
  n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / (1024 * 1024)).toFixed(1)} MB`;
