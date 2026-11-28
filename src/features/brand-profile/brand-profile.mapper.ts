import type { DocKey } from "@/features/onboarding/onboarding.types";
import type { DocumentType, SellerProfileResponse } from "@/features/seller-profile/seller-profile.types";
import { DOCUMENT_LABELS, fileNameFromKey } from "@/features/seller-profile/seller-profile.helpers";
import { fileUrl } from "@/shared/lib/file-url";
import type { BankStatus, BrandProfile, BusinessType, KybDoc, KybDocStatus, OtherKybDoc } from "./brand-profile.types";

/**
 * Builds the Brand profile page from GET /seller/onboarding (the same data the onboarding form uses).
 * The API has no "pending review" values or extra pickup addresses yet, so:
 *   - pending is always null;
 *   - the business address and dispatch city are the one pickup address.
 */

/** API document type -> slot on the Brand profile page. Other types are listed under "Other documents". */
const SLOT_OF: Partial<Record<DocumentType, DocKey>> = {
  NATIONAL_ID_FRONT: "CNIC_FRONT",
  NATIONAL_ID_BACK: "CNIC_BACK",
  TAX_CERTIFICATE: "TAX_CERTIFICATE",
  SALES_TAX_CERTIFICATE: "SALES_TAX_CERTIFICATE",
  BANK_PROOF: "BANK_PROOF",
  BRAND_AUTHORISATION: "BRAND_AUTHORIZATION",
};

/** UPLOADED / PENDING and anything unknown count as "In review". */
const docStatus = (s?: string | null): KybDocStatus =>
  s === "APPROVED" || s === "VERIFIED" ? "APPROVED" : s === "REJECTED" ? "REJECTED" : "IN_REVIEW";

const bankStatus = (s?: string | null): BankStatus =>
  s === "VERIFIED" || s === "APPROVED" ? "VERIFIED" : s === "PENDING" ? "PENDING" : "NOT_VERIFIED";

const BUSINESS_TYPES: BusinessType[] = ["SOLE_PROPRIETOR", "AOP", "COMPANY"];

const mimeOf = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
};

/** "+923151175142" -> "+92 315 •••5142" */
const maskPhone = (phone: string | null) => {
  if (!phone) return "Not added";
  const d = phone.replace(/\D/g, "");
  if (d.length < 7) return phone;
  return `+${d.slice(0, 2)} ${d.slice(2, 5)} •••${d.slice(-4)}`;
};

export function brandProfileFromOnboarding(res: SellerProfileResponse): BrandProfile {
  const p = res.prefill;
  const b = p.business;
  const brand = p.brands[0];
  const rejected = new Map(res.rejectedDocuments.map((d) => [d.type, d.reason ?? null]));

  const documents: Partial<Record<DocKey, KybDoc>> = {};
  const others: OtherKybDoc[] = [];
  p.documents.forEach((d, i) => {
    const name = d.fileName || d.title || fileNameFromKey(d.key) || DOCUMENT_LABELS[d.type] || "File on record";
    const doc: KybDoc = {
      name,
      size: 0,
      type: mimeOf(name),
      // The API does not send an upload date.
      uploadedAt: "",
      status: rejected.has(d.type) ? "REJECTED" : docStatus(d.status),
      note: d.reason ?? rejected.get(d.type) ?? null,
      url: fileUrl(d.key) ?? d.url ?? null,
    };
    const slot = SLOT_OF[d.type];
    if (slot && !documents[slot]) documents[slot] = doc;
    else others.push({ ...doc, id: d.key || `doc-${i}`, label: d.title || DOCUMENT_LABELS[d.type] || "Other document" });
  });

  return {
    live: {
      brandName: brand?.name ?? b.tradingName ?? "",
      slug: brand?.slug ?? "",
      story: brand?.story ?? "",
      logoUrl: fileUrl(brand?.logoKey) ?? null,
      bannerUrl: fileUrl(brand?.bannerKey) ?? null,
    },
    pending: null,
    legal: {
      legalName: b.registeredName ?? b.tradingName ?? "",
      businessType: BUSINESS_TYPES.includes(p.businessTypeCode as BusinessType)
        ? (p.businessTypeCode as BusinessType)
        : "SOLE_PROPRIETOR",
      ntnMasked: p.onFile.ntn,
      // STRN is no longer collected.
      strnMasked: null,
      cnicMasked: p.onFile.cnic ?? "Not added",
      email: b.contactEmail ?? p.owner.email ?? "",
      phoneMasked: maskPhone(p.owner.phone),
    },
    addresses: b.address
      ? [
          {
            id: "business-address",
            label: "Business address",
            address: b.address,
            city: b.dispatchCityName ?? "",
            contactName: p.owner.fullName ?? undefined,
            phone: p.owner.phone ?? undefined,
            isDefault: true,
          },
        ]
      : [],
    bank: p.bankSaved
      ? {
          bankName: p.onFile.bankName ?? "",
          accountTitle: p.onFile.accountTitle ?? "",
          ibanLast4: (p.onFile.accountNumber ?? "").replace(/\D/g, "").slice(-4),
          accountNumberMasked: p.onFile.accountNumber,
          status: bankStatus(p.onFile.bankStatus),
        }
      : null,
    kyb: { documents, others },
  };
}
