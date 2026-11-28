export type ProductStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

/** Who created the listing: the seller itself or Aariy staff on its behalf. */
export type ProductAddedBy = "SELLER" | "STAFF";

export type ProductVariant = {
  id: string;
  size: string;
  colour: string;
  sku: string;
  barcode?: string;
  /** Selling price in rupees (sent as priceMinor = Rs × 100). */
  price: number;
  /** Price before discount in rupees, shown crossed out (sent as compareAtMinor). */
  compareAt?: number;
  /** Units the seller has on hand (stockOnHand). */
  stock: number;
  /** Units held for pending and confirmed Aariy orders (set by the backend). */
  reserved: number;
};

/** Value of one category field: text, number, yes/no, or several picked options. */
export type AttributeValue = string | number | boolean | string[];

export type CategoryFieldType = "TEXT" | "NUMBER" | "DROPDOWN" | "YES_NO" | "MULTI_SELECT";

/** One field from GET /seller/categories/:id/fields. */
export type CategoryField = {
  key: string;
  label: string;
  type: CategoryFieldType;
  required?: boolean;
  options?: string[];
  /** true: the field is a variant column (e.g. size), not a product detail. */
  isVariant?: boolean;
};

/** Brand size chart (GET/POST /seller/size-charts). Shared by the brand's products. */
export type SizeChart = {
  id: string;
  name: string;
  unit: "CM" | "IN";
  /** First column is the size, e.g. ["Size", "Chest", "Waist", "Length"]. */
  columns: string[];
  rows: string[][];
};

export type Product = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  description: string;
  material?: string;
  /** Washing and care instructions shown on the product page. */
  care?: string;
  /** Days from order to dispatch: from / to (0 to 60). */
  dispatchMinDays: number;
  dispatchMaxDays: number;
  /** Category fields that are not variant columns. */
  attributes: Record<string, AttributeValue>;
  variants: ProductVariant[];
  images: string[];
  sizeChartId?: string;
  /** Customs, only needed to ship abroad. */
  hsCode?: string;
  fibreContent?: string;
  countryOfOrigin?: string;
  /** Declared value in rupees (sent as declaredValueMinor). */
  declaredValue?: number;
  /** Search engine listing. Empty means name and description are used. */
  metaTitle?: string;
  metaDescription?: string;
  /** Made by the server from the brand and product name. */
  slug?: string;
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
  /** Fields of this category (GET /seller/categories/:id/fields). */
  fields: CategoryField[];
};

export type ProductTab = "ALL" | ProductStatus;

export type ProductsFilter = {
  tab?: ProductTab;
  categoryId?: string;
  search?: string;
};

export type SaveProductPayload = Omit<
  Product,
  "id" | "status" | "addedBy" | "rejectionReason" | "updatedAt" | "categoryName" | "slug"
>;

export type SaveMode = "DRAFT" | "SUBMIT";

export type ProductResult = { success: boolean; message: string; product?: Product };

export type SizeChartResult = { success: boolean; message: string; chart?: SizeChart };
