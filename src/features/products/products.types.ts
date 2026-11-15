export type ProductStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

/** Who created the listing: the seller itself or Aariy staff on its behalf. */
export type ProductAddedBy = "SELLER" | "STAFF";

export type ProductVariant = {
  id: string;
  size: string;
  colour: string;
  sku: string;
  barcode?: string;
  price: number;
  /** Units the seller has on hand. */
  stock: number;
  /** Units held for pending and confirmed Aariy orders (set by the backend). */
  reserved: number;
};

export type SizeChartRow = {
  size: string;
  chest: string;
  length: string;
};

export type Product = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  description: string;
  material?: string;
  dispatchLeadTimeDays: number;
  variants: ProductVariant[];
  images: string[];
  sizeChart: SizeChartRow[];
  addedBy: ProductAddedBy;
  status: ProductStatus;
  rejectionReason?: string | null;
  updatedAt: string;
};

/** Leaf category (sellers may only list in the last level). */
export type LeafCategory = {
  id: string;
  /** Short name, e.g. "Kurta set". */
  name: string;
  /** Full path, e.g. "Women › Clothing › Eastern Ready to wear › Kurta set". */
  path: string;
};

export type ProductTab = "ALL" | ProductStatus;

export type ProductsFilter = {
  tab?: ProductTab;
  categoryId?: string;
  search?: string;
};

export type SaveProductPayload = Omit<
  Product,
  "id" | "status" | "addedBy" | "rejectionReason" | "updatedAt" | "categoryName"
>;

export type SaveMode = "DRAFT" | "SUBMIT";

export type ProductResult = { success: boolean; message: string; product?: Product };
