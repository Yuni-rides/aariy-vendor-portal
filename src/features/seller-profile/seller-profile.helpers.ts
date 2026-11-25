import { fileUrl } from "@/shared/lib/file-url";
import {
  TAX_STATUSES,
  asBusinessTypeCode,
  asTaxStatus,
  type TaxStatus,
} from "./seller-profile.types";
import type {
  BrandDraft,
  DocumentType,
  FormErrors,
  SellerProfileForm,
  SellerProfilePayload,
  SellerProfileResponse,
} from "./seller-profile.types";

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  NATIONAL_ID_FRONT: "CNIC front",
  NATIONAL_ID_BACK: "CNIC back",
  TAX_CERTIFICATE: "NTN / tax certificate",
  SALES_TAX_CERTIFICATE: "Sales tax certificate (STRN)",
  BANK_PROOF: "Bank proof (cheque or letter)",
  BRAND_AUTHORISATION: "Brand authorisation or trademark",
  COMPANY_REGISTRATION: "Company registration (SECP)",
  PARTNERSHIP_DEED: "Partnership deed",
  OTHER: "Other document",
};

export const DOCUMENT_HINTS: Partial<Record<DocumentType, string>> = {
  BANK_PROOF: "Cancelled cheque or bank letter showing the account title.",
  BRAND_AUTHORISATION:
    "Trademark certificate, or a letter from the brand owner.",
  TAX_CERTIFICATE: "NTN certificate from FBR.",
  SALES_TAX_CERTIFICATE:
    "STRN certificate, if you are registered for sales tax.",
  PARTNERSHIP_DEED: "Signed deed listing all partners.",
  COMPANY_REGISTRATION: "SECP certificate of incorporation.",
};

export const ALWAYS_OPTIONAL_DOCUMENTS: DocumentType[] = ["PARTNERSHIP_DEED"];
export const EXTRA_OPTIONAL_DOCUMENTS: DocumentType[] = [
  "TAX_CERTIFICATE",
  "SALES_TAX_CERTIFICATE",
];
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const FALLBACK_BUSINESS_TYPES: SellerProfileResponse["options"]["businessTypes"] =
  [
    {
      code: "SOLE_PROPRIETOR",
      label: "Sole proprietor",
      requiredDocuments: [
        "NATIONAL_ID_FRONT",
        "NATIONAL_ID_BACK",
        "BANK_PROOF",
        "BRAND_AUTHORISATION",
      ],
    },
    {
      code: "AOP",
      label: "Association of persons (partnership)",
      requiredDocuments: [
        "NATIONAL_ID_FRONT",
        "NATIONAL_ID_BACK",
        "BANK_PROOF",
        "BRAND_AUTHORISATION",
        "PARTNERSHIP_DEED",
      ],
    },
    {
      code: "COMPANY",
      label: "Company",
      requiredDocuments: [
        "NATIONAL_ID_FRONT",
        "NATIONAL_ID_BACK",
        "BANK_PROOF",
        "BRAND_AUTHORISATION",
      ],
    },
  ];

const arr = <T>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);

export function normalizeProfile(raw: any): SellerProfileResponse {
  const r = raw ?? {};
  const p = r.prefill ?? {};
  const o = r.options ?? {};
  const business = p.business ?? {};
  const tax = p.taxDetails ?? {};
  const bank = p.bankDetails ?? {};
  // GET /seller/onboarding sends businessTypes and agreement at the top level; older shapes had them under options.
  const agreement = r.agreement ?? o.agreement;
  const businessTypes = arr<any>(r.businessTypes ?? o.businessTypes).flatMap((b) => {
    const code = asBusinessTypeCode(b?.code);
    return code ? [{ ...b, code }] : [];
  });
  const taxStatuses = Array.from(
    new Set(
      arr(o.taxStatuses)
        .map(asTaxStatus)
        .filter((t): t is TaxStatus => !!t),
    ),
  );
  return {
    sellerId: r.sellerId ?? "",
    status: r.status ?? "ONBOARDING",
    editable: r.editable ?? true,
    deadline: r.deadline?.submitBy ? r.deadline : null,
    suspensionReason: r.suspensionReason ?? null,
    review: r.review ?? null,
    rejectedDocuments: arr(r.rejectedDocuments),
    requiredDocuments: arr(r.requiredDocuments),
    missingDocuments: arr(r.missingDocuments),
    prefill: {
      owner: {
        fullName: p.owner?.fullName ?? null,
        email: p.owner?.email ?? null,
        phone: p.owner?.phone ?? null,
      },
      country: p.country?.id ? p.country : null,
      businessTypeCode: asBusinessTypeCode(p.businessTypeCode),
      business: {
        countryId: business.countryId ?? p.country?.id ?? null,
        registeredName: business.registeredName ?? null,
        tradingName: business.tradingName ?? null,
        regionCode: business.regionCode ?? null,
        provinceId: business.provinceId ?? business.province?.id ?? null,
        provinceName: business.province?.name ?? null,
        dispatchCityId: business.dispatchCityId ?? business.cityId ?? null,
        dispatchCityName: business.dispatchCity?.name ?? business.city?.name ?? null,
        avgDispatchDays: business.avgDispatchDays ?? null,
        contactEmail: business.contactEmail ?? null,
        address: business.address ?? null,
      },
      taxSaved: !!p.taxSaved,
      taxStatus: asTaxStatus(p.taxStatus ?? tax.taxStatus) ?? "UNREGISTERED",
      bankSaved: !!p.bankSaved,
      onFile: {
        cnic: tax.cnic?.masked ?? null,
        ntn: tax.ntn?.masked ?? null,
        bankName: bank.bankName ?? null,
        accountTitle: bank.accountTitle ?? null,
        accountNumber: bank.accountNumberMasked ?? null,
        hasIban: !!bank.hasIban,
      },
      brands: arr(p.brands),
      documents: arr(p.documents),
      // Not in the response yet; read it when the backend adds it (prefill.declaration or data.declaration).
      declaration: (() => {
        const d = p.declaration ?? r.declaration;
        return d && typeof d === "object"
          ? { agreementRead: !!d.agreementRead, informationConfirmed: !!d.informationConfirmed }
          : null;
      })(),
    },
    options: {
      countries: arr(o.countries),
      businessTypes: businessTypes.length
        ? businessTypes
        : FALLBACK_BUSINESS_TYPES,
      taxStatuses: taxStatuses.length ? taxStatuses : [...TAX_STATUSES],
      documentTypes: arr(o.documentTypes),
      agreement: agreement?.policyDocumentId
        ? { policyDocumentId: agreement.policyDocumentId, version: agreement.version ?? "" }
        : null,
    },
  };
}

const cityNameFromOptions = (
  res: SellerProfileResponse,
  cityId: string | null,
) => {
  if (!cityId) return "";
  for (const c of res.options.countries) {
    for (const p of c.provinces) {
      const hit = p.cities.find((x) => x.id === cityId);
      if (hit) return hit.name;
    }
    const hit = c.cities.find((x) => x.id === cityId);
    if (hit) return hit.name;
  }
  return "";
};

const digits = (v: string) => v.replace(/\D/g, "");

export const formatCnic = (v: string) => {
  const d = digits(v).slice(0, 13);
  return [d.slice(0, 5), d.slice(5, 12), d.slice(12)].filter(Boolean).join("-");
};

export const formatNtn = (v: string) => {
  const d = digits(v).slice(0, 8);
  return d.length > 7 ? `${d.slice(0, 7)}-${d.slice(7)}` : d;
};

export const formatBytes = (n: number) =>
  n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))} KB`
    : `${(n / 1024 / 1024).toFixed(1)} MB`;

export const fileProblem = (f: File, imagesOnly = false) => {
  const types = imagesOnly
    ? FILE_TYPES.filter((t) => t.startsWith("image/"))
    : FILE_TYPES;
  if (!types.includes(f.type))
    return imagesOnly
      ? "Use a JPG, PNG or WEBP image."
      : "Use a JPG, PNG, WEBP or PDF file.";
  if (f.size > MAX_FILE_BYTES) return "The file must be 5 MB or smaller.";
  return undefined;
};

/** "sellers/x/kyb/<uuid>-<timestamp>-Aariy_MVP_SOW.pdf" -> "Aariy_MVP_SOW.pdf" */
export const fileNameFromKey = (key?: string | null) => {
  const last = key?.split("/").pop() ?? "";
  const m = last.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-\d+-(.+)$/i);
  return m ? m[1] : last;
};

const newId = () => Math.random().toString(36).slice(2, 10);

export const emptyBrand = (): BrandDraft => ({
  id: newId(),
  name: "",
  story: "",
  logoKey: null,
  logoPreview: null,
  bannerKey: null,
  bannerPreview: null,
});

export function formFromResponse(
  res: SellerProfileResponse,
): SellerProfileForm {
  const p = res.prefill;
  const countryId = p.business.countryId ?? p.country?.id ?? "";
  const countryName =
    p.country?.name ??
    res.options.countries.find((c) => c.id === countryId)?.name ??
    "";

  const documents: SellerProfileForm["documents"] = {};
  for (const d of p.documents ?? []) {
    if (!d?.type || d.type === "OTHER" || !d.key) continue;
    documents[d.type] = {
      key: d.key,
      name:
        d.fileName || d.title || fileNameFromKey(d.key) || DOCUMENT_LABELS[d.type] || "File on record",
      url: d.url ?? undefined,
    };
  }

  const saved = p.brands?.[0];
  const brands: BrandDraft[] = [
    saved
      ? {
          id: newId(),
          serverId: saved.id ?? undefined,
          slug: saved.slug ?? undefined,
          name: saved.name ?? "",
          story: saved.story ?? "",
          logoKey: saved.logoKey ?? null,
          // Image = NEXT_PUBLIC_S3_BASE_URL + "/" + key. The API url is only a fallback when there is no key.
          logoPreview: fileUrl(saved.logoKey) ?? (saved.logoUrl || null),
          bannerKey: saved.bannerKey ?? null,
          bannerPreview: fileUrl(saved.bannerKey) ?? (saved.bannerUrl || null),
        }
      : { ...emptyBrand(), name: p.business.tradingName ?? "" },
  ];

  return {
    fullName: p.owner.fullName ?? "",
    phone: p.owner.phone ?? "",
    email: p.owner.email ?? p.business.contactEmail ?? "",
    businessTypeCode: p.businessTypeCode ?? "",
    countryId,
    countryName,
    countryCode:
      p.country?.code ??
      res.options.countries.find((c) => c.id === countryId)?.code ??
      "",
    provinceId: p.business.provinceId ?? "",
    provinceName: p.business.provinceName ?? "",
    dispatchCityId: p.business.dispatchCityId ?? "",
    cityName:
      p.business.dispatchCityName ||
      cityNameFromOptions(res, p.business.dispatchCityId),
    registeredName: p.business.registeredName ?? "",
    tradingName: p.business.tradingName ?? "",
    // regionCode holds the postal code; older records may hold a province code (e.g. "KP"), which is not shown.
    postalCode: /^\d+$/.test(p.business.regionCode ?? "") ? (p.business.regionCode as string) : "",
    address: p.business.address ?? "",
    avgDispatchDays: p.business.avgDispatchDays
      ? String(p.business.avgDispatchDays)
      : "",
    taxStatus: p.taxStatus ?? "UNREGISTERED",
    cnic: "",
    ntn: "",
    // Bank name and title come back in full, so they are filled in. CNIC, NTN and account number
    // only come back masked (last 4 digits), so those fields start empty and show the masked value.
    bankName: p.bankSaved ? (p.onFile.bankName ?? "") : "",
    accountTitle: p.bankSaved ? (p.onFile.accountTitle ?? "") : "",
    accountNumber: "",
    iban: "",
    brands,
    documents,
    agreementRead: p.declaration?.agreementRead ?? false,
    informationConfirmed: p.declaration?.informationConfirmed ?? false,
  };
}

const taxTyped = (f: SellerProfileForm) => !!(f.cnic.trim() || f.ntn.trim());
/** True when the seller changed the bank details on file (or typed new ones). */
const bankTyped = (f: SellerProfileForm, p: SellerProfileResponse["prefill"]) =>
  !!f.accountNumber.trim() ||
  !!f.iban.trim() ||
  f.bankName.trim() !== (p.bankSaved ? (p.onFile.bankName ?? "") : "").trim() ||
  f.accountTitle.trim() !== (p.bankSaved ? (p.onFile.accountTitle ?? "") : "").trim();

export function docsFor(
  res: SellerProfileResponse | null,
  code: SellerProfileForm["businessTypeCode"],
) {
  const listed =
    res?.options.businessTypes.find((b) => b.code === code)
      ?.requiredDocuments ?? [];
  const required = listed.filter(
    (t) => t !== "OTHER" && !ALWAYS_OPTIONAL_DOCUMENTS.includes(t),
  );
  const optional = code
    ? [
        ...listed.filter((t) => ALWAYS_OPTIONAL_DOCUMENTS.includes(t)),
        ...EXTRA_OPTIONAL_DOCUMENTS.filter((t) => !required.includes(t)),
      ]
    : [];
  return { required, optional, all: [...required, ...optional] };
}

export function validate(
  f: SellerProfileForm,
  res: SellerProfileResponse,
): FormErrors {
  const e: FormErrors = {};
  const p = res.prefill;

  if (!f.fullName.trim()) e.fullName = "Enter the owner's full name.";
  if (digits(f.phone).length < 10)
    e.phone = "Enter a mobile number, e.g. +923001234567.";
  if (!f.businessTypeCode) e.businessTypeCode = "Choose your business type.";

  if (!f.countryId) e.countryId = "Choose a country.";
  if (!f.provinceId) e.provinceId = "Choose a province or state.";
  if (!f.postalCode.trim()) e.postalCode = "Enter the postal code.";
  if (!f.dispatchCityId)
    e.dispatchCityId = "Choose the city you dispatch from.";
  if (!f.registeredName.trim())
    e.registeredName = "Enter the registered business name.";
  if (!f.tradingName.trim()) e.tradingName = "Enter the name buyers will see.";
  if (!f.address.trim()) e.address = "Enter the business address.";
  const days = Number(f.avgDispatchDays);
  if (!Number.isInteger(days) || days < 1 || days > 30)
    e.avgDispatchDays = "Enter 1 to 30 days.";

  if (!p.taxSaved || taxTyped(f)) {
    if (digits(f.cnic).length !== 13)
      e.cnic = "Enter a 13-digit CNIC, e.g. 35202-1234567-1.";
    if (f.taxStatus === "REGISTERED" && digits(f.ntn).length !== 8)
      e.ntn = "Enter your NTN, e.g. 1234567-8.";
  }
  if (!p.bankSaved || bankTyped(f, p)) {
    if (!f.bankName.trim()) e.bankName = "Enter the bank name.";
    if (!f.accountTitle.trim()) e.accountTitle = "Enter the account title.";
    if (!f.accountNumber.trim())
      e.accountNumber = p.bankSaved
        ? "Enter the full account number to change the bank details."
        : "Enter the account number.";
  }
  // Format problems of typed fields; a "required" message already set for a field wins.
  for (const [k, v] of Object.entries(formatProblems(f))) if (!e[k]) e[k] = v;

  if (!f.brands.length) e.brands = "Add at least one brand.";
  f.brands.forEach((b, i) => {
    if (!b.name.trim()) e[`brand.${i}.name`] = "Enter the brand name.";
  });

  for (const t of docsFor(res, f.businessTypeCode).required) {
    if (!f.documents[t]) e[`doc.${t}`] = "Upload this document.";
  }

  if (!f.agreementRead)
    e.agreementRead = "Read and accept the seller agreement.";
  if (!f.informationConfirmed)
    e.informationConfirmed = "Confirm the information is correct.";
  return e;
}

/* ---------------- Formats (match the PUT /seller/onboarding schema) ---------------- */

const onlyDigits = (v: string) => v.replace(/\D/g, "");
export const cleanAccountNumber = (v: string) => onlyDigits(v);
export const cleanIban = (v: string) => v.replace(/[\s-]/g, "").toUpperCase();
export const cleanPostalCode = (v: string) => v.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

/** "Ali Fashion!" -> "ali-fashion" (a-z, 0-9 and single dashes, up to 100). */
export const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");

/**
 * Problems with what was typed (empty fields are fine here).
 * Used on its own for "Save", and together with the required checks for "Submit for approval".
 */
export function formatProblems(f: SellerProfileForm): FormErrors {
  const e: FormErrors = {};
  if (f.phone.trim() && digits(f.phone).length < 10) e.phone = "Enter a mobile number, e.g. +923001234567.";
  if (f.postalCode.trim() && !/^\d{4,10}$/.test(f.postalCode.trim())) e.postalCode = "Enter a postal code of 4 to 10 digits.";
  if (f.address.length > 300) e.address = "Keep the address to 300 characters.";
  if (f.avgDispatchDays.trim()) {
    const days = Number(f.avgDispatchDays);
    if (!Number.isInteger(days) || days < 1 || days > 30) e.avgDispatchDays = "Enter 1 to 30 days.";
  }
  if (f.cnic.trim() && digits(f.cnic).length !== 13) e.cnic = "Enter a 13-digit CNIC, e.g. 35202-1234567-1.";
  if (f.ntn.trim() && digits(f.ntn).length !== 8) e.ntn = "Enter your NTN, e.g. 1234567-8.";
  const acc = cleanAccountNumber(f.accountNumber);
  if (f.accountNumber.trim() && (acc.length < 8 || acc.length > 24)) e.accountNumber = "Enter an account number of 8 to 24 digits.";
  if (f.iban.trim() && !/^PK\d{2}[A-Z]{4}\d{16}$/.test(cleanIban(f.iban))) e.iban = "Enter a 24-character IBAN, e.g. PK36MEZN0001234567890123.";
  return e;
}

/** True when everything needed for "Submit for approval" is filled in and valid. */
export const isComplete = (f: SellerProfileForm, res: SellerProfileResponse) =>
  Object.keys(validate(f, res)).length === 0;

/** Drops empty strings, NaN and undefined, so a half-filled form can be saved. */
const compact = <T extends Record<string, unknown>>(o: T): T =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined && v !== "" && !(typeof v === "number" && Number.isNaN(v))),
  ) as T;

export function buildPayload(
  f: SellerProfileForm,
  res: SellerProfileResponse,
  opts: { submit?: boolean } = {},
): SellerProfilePayload {
  const p = res.prefill;
  const payload: SellerProfilePayload = {
    owner: compact({ fullName: f.fullName.trim(), phone: f.phone.trim() }),
    ...(f.businessTypeCode ? { businessTypeCode: f.businessTypeCode } : {}),
    business: compact({
      countryId: f.countryId,
      registeredName: f.registeredName.trim(),
      tradingName: f.tradingName.trim(),
      provinceId: f.provinceId,
      regionCode: cleanPostalCode(f.postalCode),
      dispatchCityId: f.dispatchCityId,
      avgDispatchDays: f.avgDispatchDays.trim() ? Number(f.avgDispatchDays) : undefined,
      contactEmail: (f.email || p.business.contactEmail || "").trim(),
      cityId: f.dispatchCityId,
      address: f.address.trim(),
    }),
    brands: f.brands
      .slice(0, 1)
      .filter((b) => b.name.trim())
      .map((b) =>
        compact({
          id: b.serverId,
          name: b.name.trim(),
          slug: b.slug || slugify(b.name),
          story: b.story.trim(),
          logoKey: b.logoKey ?? undefined,
          bannerKey: b.bannerKey ?? undefined,
        }),
      ),
    // Only the documents of the picked business type; empty optional slots are left out.
    documents: docsFor(res, f.businessTypeCode).all.flatMap((type) => {
      const key = f.documents[type]?.key;
      return key ? [{ type, key }] : [];
    }),
    declaration: {
      agreementRead: f.agreementRead,
      informationConfirmed: f.informationConfirmed,
    },
    ...(opts.submit ? { submit: true } : {}),
  };
  if (!p.taxSaved || taxTyped(f)) {
    payload.tax = compact({
      cnic: f.cnic.trim() ? formatCnic(f.cnic) : undefined,
      ntn: f.taxStatus === "REGISTERED" && f.ntn.trim() ? formatNtn(f.ntn) : undefined,
      taxStatus: f.taxStatus,
    });
  }
  if (!p.bankSaved || bankTyped(f, p)) {
    payload.bank = compact({
      bankName: f.bankName.trim(),
      accountTitle: f.accountTitle.trim(),
      accountNumber: cleanAccountNumber(f.accountNumber),
      iban: cleanIban(f.iban),
    });
  }
  // Nothing typed in the bank section yet: leave it out instead of sending {}.
  if (payload.bank && !Object.keys(payload.bank).length) delete payload.bank;
  return payload;
}

/** Field ids in page order, so the first error can be scrolled into view. */
export const firstErrorKey = (e: FormErrors) => Object.keys(e)[0];
