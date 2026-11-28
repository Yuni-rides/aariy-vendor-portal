import type { StatusTone } from "@/components/ui/StatusBadge";
import { CategoryField, LeafCategory, Product, ProductStatus, ProductTab, SaveMode, SaveProductPayload } from "./products.types";

export const productStatusLabelMap: Record<ProductStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const productStatusToneMap: Record<ProductStatus, StatusTone> = {
  DRAFT: "warning",
  SUBMITTED: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

export const PRODUCT_TABS: { value: ProductTab; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export const totalStock = (p: Product) => p.variants.reduce((sum, v) => sum + v.stock, 0);

/** Products the seller cannot change right now (in review, or listed by Aariy staff). */
export const isReadOnly = (p: Product) => p.status === "SUBMITTED" || p.addedBy === "STAFF";

/** Row action label in the products table, as in the design. */
export const rowActionLabel = (p: Product) => {
  if (isReadOnly(p)) return "View";
  if (p.status === "REJECTED") return "Fix";
  if (p.status === "DRAFT") return "Continue";
  return "Edit";
};

export const MIN_PHOTOS = 3;
export const MAX_PHOTOS = 12;
export const MAX_VARIANTS = 60;
export const MAX_DISPATCH_DAYS = 60;
export const META_TITLE_MAX = 70;
export const META_DESCRIPTION_MAX = 160;

/** Letters, digits, dot, dash and underscore; 1 to 64 characters (API rule). */
export const SKU_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

/** The category's variant column (e.g. size with fixed options), if it has one. */
export const variantFieldOf = (c?: LeafCategory | null): CategoryField | undefined => c?.fields.find((f) => f.isVariant);

/** Category fields shown as "Product details" (everything that is not a variant column). */
export const detailFieldsOf = (c?: LeafCategory | null): CategoryField[] => c?.fields.filter((f) => !f.isVariant) ?? [];

const isEmptyValue = (v: unknown) =>
  v === undefined || v === null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && v.length === 0);

/** "Rs 45,000" style number for inputs; empty for 0 / not set. */
export const formatRs = (n?: number) => (n ? n.toLocaleString("en-PK") : "");

/** Reads "45,000" or "45000" as 45000; empty or invalid as 0. */
export const parseRs = (s: string) => {
  const n = Number(s.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : 0;
};

export type ProductFormErrors = Partial<
  Record<
    | "name"
    | "categoryId"
    | "description"
    | "dispatch"
    | "attributes"
    | "variants"
    | "images"
    | "sizeChartId"
    | "hsCode"
    | "metaTitle"
    | "metaDescription",
    string
  >
> & {
  /** Per-field messages for category fields, keyed by field key. */
  attributeErrors?: Record<string, string>;
};

/** Checks that stop a save even for drafts (bad format), whatever the mode. */
function formatErrors(p: SaveProductPayload, e: ProductFormErrors) {
  if (p.dispatchMinDays < 0 || p.dispatchMaxDays > MAX_DISPATCH_DAYS || p.dispatchMinDays > MAX_DISPATCH_DAYS)
    e.dispatch = `Dispatch time must be 0 to ${MAX_DISPATCH_DAYS} days.`;
  else if (p.dispatchMaxDays < p.dispatchMinDays) e.dispatch = `"To" must not be less than "From".`;
  if (p.hsCode?.trim() && !/^\d{6,10}$/.test(p.hsCode.trim())) e.hsCode = "HS code is 6 to 10 digits.";
  if ((p.metaTitle ?? "").length > META_TITLE_MAX) e.metaTitle = `Keep the title to ${META_TITLE_MAX} characters.`;
  if ((p.metaDescription ?? "").length > META_DESCRIPTION_MAX)
    e.metaDescription = `Keep the description to ${META_DESCRIPTION_MAX} characters.`;
}

/** Drafts only need a name; submitting needs everything Aariy staff check. */
export function validateProduct(
  payload: SaveProductPayload,
  mode: SaveMode,
  category?: LeafCategory | null,
): ProductFormErrors {
  const errors: ProductFormErrors = {};
  if (!payload.name.trim()) errors.name = "Product name is required.";
  formatErrors(payload, errors);
  if (mode === "DRAFT") return errors;

  if (!payload.categoryId) errors.categoryId = "Pick a category.";
  if (!payload.description.trim()) errors.description = "Add a description.";

  const attributeErrors: Record<string, string> = {};
  for (const f of detailFieldsOf(category)) {
    if (f.required && isEmptyValue(payload.attributes[f.key])) attributeErrors[f.key] = `Fill in ${f.label.toLowerCase()}.`;
  }
  if (Object.keys(attributeErrors).length) {
    errors.attributeErrors = attributeErrors;
    errors.attributes = "Fill in the required product details.";
  }

  const v = payload.variants;
  if (v.length === 0) errors.variants = "Add at least one variant.";
  else if (v.length > MAX_VARIANTS) errors.variants = `Up to ${MAX_VARIANTS} variants.`;
  else if (v.some((x) => !x.size.trim())) errors.variants = "Every variant needs a size.";
  else if (v.some((x) => !SKU_PATTERN.test(x.sku.trim())))
    errors.variants = "Every variant needs a SKU: letters, digits, . - _ only.";
  else if (v.some((x) => !(x.price > 0))) errors.variants = "Every variant needs a price above 0.";
  else if (v.some((x) => x.compareAt && x.compareAt < x.price))
    errors.variants = "Original price must not be less than the price.";
  else if (v.some((x) => !Number.isInteger(x.stock) || x.stock < 0)) errors.variants = "Stock must be 0 or more.";
  else {
    const skus = v.map((x) => x.sku.trim().toLowerCase());
    if (new Set(skus).size !== skus.length) errors.variants = "SKUs must be unique.";
  }

  if (payload.images.length < MIN_PHOTOS) errors.images = `Add at least ${MIN_PHOTOS} photos.`;
  if (!payload.sizeChartId) errors.sizeChartId = "Choose a size chart.";

  return errors;
}

/** "Before submitting" list on the form. */
export function submitChecklist(payload: SaveProductPayload, category?: LeafCategory | null) {
  const e = validateProduct(payload, "SUBMIT", category);
  return [
    { label: `${MIN_PHOTOS} or more photos`, done: !e.images },
    { label: "Size chart chosen", done: !e.sizeChartId },
    { label: "A price on every variant", done: payload.variants.length > 0 && payload.variants.every((x) => x.price > 0) },
    {
      label: "Required details filled",
      done: !e.name && !e.categoryId && !e.description && !e.dispatch && !e.attributes && !e.variants,
    },
  ];
}
