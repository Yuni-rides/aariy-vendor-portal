import type { StatusTone } from "@/components/ui/StatusBadge";
import { Product } from "@/features/products/products.types";

/** At or below this many available units a variant counts as low stock. */
export const LOW_STOCK_THRESHOLD = 3;

export type StockRow = {
  productId: string;
  variantId: string;
  /** "Lawn 3pc · M · Teal" */
  label: string;
  sku: string;
  stock: number;
  reserved: number;
  leadTimeDays: number;
};

/** Products that are live or on their way (drafts and rejected listings are left out). */
const STOCKED_STATUSES: Product["status"][] = ["APPROVED", "SUBMITTED"];

export function toStockRows(products: Product[]): StockRow[] {
  return products
    .filter((p) => STOCKED_STATUSES.includes(p.status))
    .flatMap((p) =>
      p.variants.map((v) => ({
        productId: p.id,
        variantId: v.id,
        label: [p.name, v.size, v.colour].filter(Boolean).join(" · "),
        sku: v.sku,
        stock: v.stock,
        reserved: v.reserved,
        leadTimeDays: p.dispatchMaxDays,
      })),
    );
}

export const available = (stock: number, reserved: number) => Math.max(0, stock - reserved);

export type StockAlert = { variantId: string; label: string; available: number; tone: StatusTone };

export function lowStockAlerts(products: Product[]): StockAlert[] {
  return toStockRows(products)
    .map((r) => ({ ...r, available: available(r.stock, r.reserved) }))
    .filter((r) => r.available <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => a.available - b.available)
    .map((r) => ({
      variantId: r.variantId,
      label: r.label,
      available: r.available,
      tone: r.available <= 1 ? "danger" : "warning",
    }));
}

export const alertText = (n: number) => (n === 0 ? "Out of stock" : `${n} left`);
