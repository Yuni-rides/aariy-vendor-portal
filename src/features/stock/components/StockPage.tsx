"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { useProductsStore } from "@/features/products/products.store";
import { Btn, DataTable, EmptyState, PageHeader, Panel, Td, Th, fieldClass } from "@/shared/ui/seller";
import { available, toStockRows } from "../stock.helpers";

/** Drafts are kept as strings so the seller can clear a box while typing. */
type Drafts = Record<string, string>;

const smallInput = cn(fieldClass, "w-20 min-h-10 px-2.5 py-2");

const parseCount = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : NaN);

export default function StockPage() {
  const { products, loading, saving, error, fetchProducts, updateStock } = useProductsStore();
  const rows = useMemo(() => toStockRows(products), [products]);

  // variantId -> stock, productId -> lead time
  const [stock, setStock] = useState<Drafts>({});
  const [lead, setLead] = useState<Drafts>({});

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const stockValue = (variantId: string, fallback: number) => stock[variantId] ?? String(fallback);
  const leadValue = (productId: string, fallback: number) => lead[productId] ?? String(fallback);

  const changedStock = rows.filter((r) => stock[r.variantId] !== undefined && parseCount(stock[r.variantId]) !== r.stock);
  const changedLead = Array.from(new Map(rows.map((r) => [r.productId, r])).values()).filter(
    (r) => lead[r.productId] !== undefined && parseCount(lead[r.productId]) !== r.leadTimeDays,
  );
  const invalid =
    Object.values(stock).some((v) => Number.isNaN(parseCount(v))) ||
    Object.values(lead).some((v) => Number.isNaN(parseCount(v)));
  const dirty = changedStock.length > 0 || changedLead.length > 0;

  const handleSave = async () => {
    if (invalid) {
      toast({ title: "Stock cannot go below zero. Use whole numbers only.", variant: "destructive" });
      return;
    }
    const res = await updateStock(
      changedStock.map((r) => ({ variantId: r.variantId, stock: parseCount(stock[r.variantId]) })),
      changedLead.map((r) => ({ productId: r.productId, days: parseCount(lead[r.productId]) })),
    );
    toast({ title: res.message, variant: res.success ? "default" : "destructive" });
    if (res.success) {
      setStock({});
      setLead({});
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Stock and lead time" />

      <Panel>
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        <DataTable>
          <thead>
            <tr>
              <Th>Product · variant</Th>
              <Th>SKU</Th>
              <Th>Your stock</Th>
              <Th>Reserved for Aariy orders</Th>
              <Th>Available</Th>
              <Th>Lead time (days)</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const s = stockValue(r.variantId, r.stock);
              const parsed = parseCount(s);
              const bad = Number.isNaN(parsed);
              const l = leadValue(r.productId, r.leadTimeDays);
              return (
                <tr key={r.variantId}>
                  <Td>{r.label}</Td>
                  <Td>{r.sku}</Td>
                  <Td className="py-2">
                    <input
                      aria-label={`Stock for ${r.label}`}
                      inputMode="numeric"
                      className={cn(smallInput, bad && "border-destructive")}
                      value={s}
                      onChange={(e) => setStock((d) => ({ ...d, [r.variantId]: e.target.value }))}
                    />
                  </Td>
                  <Td>{r.reserved}</Td>
                  <Td className={cn(!bad && available(parsed, r.reserved) === 0 && "text-destructive")}>
                    {bad ? "—" : available(parsed, r.reserved)}
                  </Td>
                  <Td className="py-2">
                    <input
                      aria-label={`Lead time for ${r.label}`}
                      inputMode="numeric"
                      className={cn(smallInput, Number.isNaN(parseCount(l)) && "border-destructive")}
                      value={l}
                      onChange={(e) => setLead((d) => ({ ...d, [r.productId]: e.target.value }))}
                    />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
        {loading && <EmptyState>Loading...</EmptyState>}
        {!loading && rows.length === 0 && <EmptyState>No approved or submitted products yet</EmptyState>}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Btn primary onClick={handleSave} disabled={!dirty || saving}>
            Save changes
          </Btn>
          <span className="text-[13px] text-muted-foreground">
            Stock cannot go below zero. Reserved stock is held for pending and confirmed Aariy orders. Lead time
            is set per product.
          </span>
        </div>
      </Panel>
    </div>
  );
}
