import { create } from "zustand";
import { LEAF_CATEGORIES_MOCK, PRODUCTS_MOCK } from "./products.mock";
import {
  LeafCategory,
  Product,
  ProductResult,
  SaveMode,
  SaveProductPayload,
} from "./products.types";

type StockUpdate = { variantId: string; stock: number };
type LeadTimeUpdate = { productId: string; days: number };

type ProductsStore = {
  loading: boolean;
  saving: boolean;
  error: string | null;
  loaded: boolean;
  products: Product[];
  categories: LeafCategory[];

  fetchProducts: () => Promise<void>;
  saveProduct: (id: string | null, payload: SaveProductPayload, mode: SaveMode) => Promise<ProductResult>;
  updateStock: (stock: StockUpdate[], leadTimes: LeadTimeUpdate[]) => Promise<ProductResult>;
};

const nowIso = () => new Date().toISOString();

export const useProductsStore = create<ProductsStore>((set, get) => ({
  loading: false,
  saving: false,
  error: null,
  loaded: false,
  products: [],
  categories: [],

  fetchProducts: async () => {
    // Keep local edits for the session (mock data has no server to re-read from).
    if (get().loaded) return;
    set({ loading: true, error: null });
    try {
      // TODO(api): const [products, categories] = await Promise.all([productsApi.list(), productsApi.leafCategories()]);
      set({
        products: PRODUCTS_MOCK,
        categories: LEAF_CATEGORIES_MOCK,
        loading: false,
        loaded: true,
      });
    } catch (e: any) {
      set({ error: e?.response?.data?.message ?? "Something went wrong", loading: false });
    }
  },

  saveProduct: async (id, payload, mode) => {
    set({ saving: true });
    try {
      // TODO(api): id ? productsApi.update(id, payload, mode) : productsApi.create(payload, mode)
      const categoryName = get().categories.find((c) => c.id === payload.categoryId)?.name ?? "";
      const existing = id ? get().products.find((p) => p.id === id) : undefined;
      const reservedById = new Map(existing?.variants.map((v) => [v.id, v.reserved]) ?? []);

      const product: Product = {
        ...payload,
        // Reserved stock is owned by the backend; keep what it last told us.
        variants: payload.variants.map((v) => ({ ...v, reserved: reservedById.get(v.id) ?? 0 })),
        id: existing?.id ?? `p-${Date.now()}`,
        categoryName,
        addedBy: existing?.addedBy ?? "SELLER",
        // Approved products go back to review when edited and submitted.
        status: mode === "SUBMIT" ? "SUBMITTED" : existing?.status === "APPROVED" ? "APPROVED" : "DRAFT",
        rejectionReason: mode === "SUBMIT" ? null : existing?.rejectionReason ?? null,
        updatedAt: nowIso(),
      };

      set({
        products: existing
          ? get().products.map((p) => (p.id === product.id ? product : p))
          : [product, ...get().products],
        saving: false,
      });
      return {
        success: true,
        message: mode === "SUBMIT" ? "Submitted for approval. You'll get an email after review." : "Draft saved.",
        product,
      };
    } catch (e: any) {
      set({ saving: false });
      return { success: false, message: e?.response?.data?.message ?? "Could not save product" };
    }
  },

  updateStock: async (stock, leadTimes) => {
    if (stock.some((s) => !Number.isInteger(s.stock) || s.stock < 0)) {
      return { success: false, message: "Stock cannot go below zero." };
    }
    if (leadTimes.some((l) => !Number.isInteger(l.days) || l.days < 0)) {
      return { success: false, message: "Lead time must be 0 days or more." };
    }
    set({ saving: true });
    try {
      // TODO(api): await stockApi.update({ stock, leadTimes });
      const stockById = new Map(stock.map((s) => [s.variantId, s.stock]));
      const leadById = new Map(leadTimes.map((l) => [l.productId, l.days]));
      set({
        products: get().products.map((p) => ({
          ...p,
          dispatchLeadTimeDays: leadById.get(p.id) ?? p.dispatchLeadTimeDays,
          variants: p.variants.map((v) =>
            stockById.has(v.id) ? { ...v, stock: stockById.get(v.id)! } : v,
          ),
        })),
        saving: false,
      });
      return { success: true, message: "Stock updated." };
    } catch (e: any) {
      set({ saving: false });
      return { success: false, message: e?.response?.data?.message ?? "Could not update stock" };
    }
  },
}));
