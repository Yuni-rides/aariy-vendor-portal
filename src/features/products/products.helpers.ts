import type { StatusTone } from "@/components/ui/StatusBadge";
import { Product, ProductStatus, ProductTab, SaveMode, SaveProductPayload } from "./products.types";

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

export type ProductFormErrors = Partial<Record<"name" | "categoryId" | "variants" | "sizeChart", string>>;

/** Drafts only need a name; submitting needs everything Aariy staff check. */
export function validateProduct(payload: SaveProductPayload, mode: SaveMode): ProductFormErrors {
  const errors: ProductFormErrors = {};
  if (!payload.name.trim()) errors.name = "Product name is required.";
  if (mode === "DRAFT") return errors;

  if (!payload.categoryId) errors.categoryId = "Pick a category.";

  if (payload.variants.length === 0) {
    errors.variants = "Add at least one variant.";
  } else if (
    payload.variants.some((v) => !v.size.trim() || !v.sku.trim() || !(v.price > 0) || v.stock < 0)
  ) {
    errors.variants = "Every variant needs a size, SKU, price above 0 and stock of 0 or more.";
  } else {
    const skus = payload.variants.map((v) => v.sku.trim().toLowerCase());
    if (new Set(skus).size !== skus.length) errors.variants = "SKUs must be unique.";
  }

  const filledRows = payload.sizeChart.filter((r) => r.size.trim());
  if (filledRows.length === 0) errors.sizeChart = "Size chart missing.";
  else if (filledRows.some((r) => !r.chest.trim() || !r.length.trim()))
    errors.sizeChart = "Fill chest and length for every size.";

  return errors;
}
