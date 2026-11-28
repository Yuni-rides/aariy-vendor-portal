import { CategoryField, LeafCategory, Product, SizeChart } from "./products.types";

const SIZE: CategoryField = { key: "size", label: "Size", type: "DROPDOWN", required: true, isVariant: true, options: ["XS", "S", "M", "L", "XL"] };
const FABRIC = (options: string[]): CategoryField => ({ key: "fabric", label: "Fabric", type: "DROPDOWN", required: true, options });
const PIECES: CategoryField = { key: "no_of_pieces", label: "No of pieces", type: "NUMBER", required: true };
const EMBROIDERY: CategoryField = { key: "embroidery", label: "Embroidery details", type: "TEXT" };
const STITCHED: CategoryField = { key: "stitched", label: "Stitched", type: "YES_NO" };
const WORK: CategoryField = { key: "work_type", label: "Work type (choose any)", type: "MULTI_SELECT", options: ["Zari", "Mirror", "Sequins", "Gota", "Thread"] };

// TODO(api): replace with GET /seller/categories (leaf only) and GET /seller/categories/:id/fields
export const LEAF_CATEGORIES_MOCK: LeafCategory[] = [
  { id: "cat-kurta-set", name: "Kurta set", path: "Women › Clothing › Eastern Ready to wear › Kurta set", fields: [SIZE, FABRIC(["Lawn", "Cotton", "Khaddar", "Linen"]), PIECES, EMBROIDERY, STITCHED, WORK] },
  { id: "cat-maxi", name: "Maxi", path: "Women › Clothing › Eastern Ready to wear › Maxi", fields: [SIZE, FABRIC(["Chiffon", "Silk", "Net", "Organza"]), EMBROIDERY, WORK] },
  { id: "cat-pishwas", name: "Pishwas", path: "Women › Clothing › Eastern Ready to wear › Pishwas", fields: [SIZE, FABRIC(["Cotton", "Silk", "Chiffon"]), EMBROIDERY] },
  { id: "cat-sharara", name: "Sharara", path: "Women › Clothing › Eastern Ready to wear › Sharara", fields: [SIZE, FABRIC(["Cotton", "Silk", "Net"]), PIECES, WORK] },
  { id: "cat-kaftan", name: "Kaftan", path: "Women › Clothing › Eastern Ready to wear › Kaftan", fields: [SIZE, FABRIC(["Silk", "Chiffon", "Georgette"])] },
  // No variant field: the variants table shows plain Size and Colour text boxes.
  { id: "cat-unstitched", name: "Unstitched 3pc", path: "Women › Clothing › Unstitched › Unstitched 3pc", fields: [FABRIC(["Lawn", "Khaddar", "Karandi"]), PIECES, EMBROIDERY] },
];

// TODO(api): replace with GET /seller/size-charts
export const SIZE_CHARTS_MOCK: SizeChart[] = [
  { id: "sc-kurta", name: "Kurta regular", unit: "CM", columns: ["Size", "Chest", "Length"], rows: [["S", "92", "112"], ["M", "97", "114"], ["L", "102", "116"]] },
  { id: "sc-maxi", name: "Maxi regular", unit: "CM", columns: ["Size", "Chest", "Length"], rows: [["XS", "86", "140"], ["S", "92", "142"], ["M", "97", "144"], ["L", "102", "146"]] },
  { id: "sc-pishwas", name: "Pishwas regular", unit: "CM", columns: ["Size", "Chest", "Length"], rows: [["S", "92", "130"], ["M", "97", "132"]] },
];

// TODO(api): replace with GET /seller/products
export const PRODUCTS_MOCK: Product[] = [
  {
    id: "p-lawn-3pc",
    name: "Embroidered lawn 3-piece",
    categoryId: "cat-kurta-set",
    categoryName: "Kurta set",
    description: "Three-piece lawn suit with embroidered neckline.",
    material: "Lawn",
    care: "Hand wash cold separately. Do not bleach. Iron on reverse.",
    dispatchMinDays: 2,
    dispatchMaxDays: 2,
    attributes: {},
    variants: [
      { id: "v-l3-s", size: "S", colour: "Teal", sku: "MB-L3-S-TL", barcode: "8961234500011", price: 5000, stock: 4, reserved: 0 },
      { id: "v-l3-m", size: "M", colour: "Teal", sku: "MB-L3-M-TL", barcode: "8961234500028", price: 5000, stock: 1, reserved: 1 },
      { id: "v-l3-l", size: "L", colour: "Teal", sku: "MB-L3-L-TL", barcode: "8961234500035", price: 5000, stock: 6, reserved: 0 },
    ],
    images: [],
    sizeChartId: "sc-kurta",
    addedBy: "SELLER",
    status: "APPROVED",
    updatedAt: "2026-11-02T10:00:00Z",
  },
  {
    id: "p-chiffon-maxi",
    name: "Chiffon maxi",
    categoryId: "cat-maxi",
    categoryName: "Maxi",
    description: "Flowing chiffon maxi with hand-finished sleeves.",
    material: "Chiffon",
    care: "Dry clean only.",
    dispatchMinDays: 3,
    dispatchMaxDays: 3,
    attributes: {},
    variants: [
      { id: "v-cm-xs", size: "XS", colour: "Rose", sku: "MB-CM-XS", price: 5700, stock: 4, reserved: 0 },
      { id: "v-cm-s", size: "S", colour: "Rose", sku: "MB-CM-S", price: 5700, stock: 3, reserved: 2 },
      { id: "v-cm-m", size: "M", colour: "Rose", sku: "MB-CM-M", price: 5700, stock: 5, reserved: 0 },
      { id: "v-cm-l", size: "L", colour: "Rose", sku: "MB-CM-L", price: 5700, stock: 4, reserved: 0 },
    ],
    images: [],
    sizeChartId: "sc-maxi",
    addedBy: "SELLER",
    status: "SUBMITTED",
    updatedAt: "2026-11-08T09:00:00Z",
  },
  {
    id: "p-pishwas",
    name: "Printed pishwas",
    categoryId: "cat-pishwas",
    categoryName: "Pishwas",
    description: "Printed pishwas with flared panels.",
    material: "Cotton",
    care: "Machine wash cold, gentle cycle. Dry in shade.",
    dispatchMinDays: 2,
    dispatchMaxDays: 2,
    attributes: {},
    variants: [
      { id: "v-pw-s", size: "S", colour: "Mustard", sku: "MB-PW-S", price: 6400, stock: 5, reserved: 0 },
      { id: "v-pw-m", size: "M", colour: "Mustard", sku: "MB-PW-M", price: 6400, stock: 4, reserved: 0 },
    ],
    images: [],
    sizeChartId: "sc-pishwas",
    addedBy: "STAFF",
    status: "APPROVED",
    updatedAt: "2026-10-28T09:00:00Z",
  },
  {
    id: "p-kurta-set",
    name: "Kurta set",
    categoryId: "cat-kurta-set",
    categoryName: "Kurta set",
    description: "Two-piece cotton kurta set.",
    material: "Cotton",
    care: "Machine wash cold, gentle cycle. Dry in shade.",
    dispatchMinDays: 2,
    dispatchMaxDays: 2,
    attributes: {},
    variants: [
      { id: "v-ks-m", size: "M", colour: "White", sku: "MB-KS-M", price: 4200, stock: 5, reserved: 1 },
      { id: "v-ks-l", size: "L", colour: "White", sku: "MB-KS-L", price: 4200, stock: 3, reserved: 0 },
    ],
    images: [],
    sizeChartId: "sc-kurta",
    addedBy: "SELLER",
    status: "APPROVED",
    updatedAt: "2026-10-20T09:00:00Z",
  },
  {
    id: "p-sharara",
    name: "Cotton sharara",
    categoryId: "cat-sharara",
    categoryName: "Sharara",
    description: "Cotton sharara set with dupatta.",
    material: "Cotton",
    care: "Machine wash cold, gentle cycle. Dry in shade.",
    dispatchMinDays: 3,
    dispatchMaxDays: 3,
    attributes: {},
    variants: [
      { id: "v-sh-s", size: "S", colour: "Peach", sku: "MB-SH-S", price: 6900, stock: 0, reserved: 0 },
      { id: "v-sh-m", size: "M", colour: "Peach", sku: "MB-SH-M", price: 6900, stock: 0, reserved: 0 },
      { id: "v-sh-l", size: "L", colour: "Peach", sku: "MB-SH-L", price: 6900, stock: 0, reserved: 0 },
    ],
    images: [],
    addedBy: "SELLER",
    status: "REJECTED",
    rejectionReason: "Size chart missing.",
    updatedAt: "2026-11-05T09:00:00Z",
  },
  {
    id: "p-silk-kaftan",
    name: "Silk kaftan",
    categoryId: "cat-kaftan",
    categoryName: "Kaftan",
    description: "",
    material: "Silk",
    dispatchMinDays: 2,
    dispatchMaxDays: 2,
    attributes: {},
    variants: [],
    images: [],
    addedBy: "SELLER",
    status: "DRAFT",
    updatedAt: "2026-11-10T09:00:00Z",
  },
];
