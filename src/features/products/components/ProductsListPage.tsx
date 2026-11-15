"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  ChipTabs,
  DataTable,
  EmptyState,
  Field,
  PageHeader,
  Panel,
  Td,
  Th,
  btnClass,
  fieldClass,
} from "@/shared/ui/seller";
import { useProductsStore } from "../products.store";
import { ProductTab } from "../products.types";
import {
  PRODUCT_TABS,
  productStatusLabelMap,
  productStatusToneMap,
  rowActionLabel,
  totalStock,
} from "../products.helpers";

export default function ProductsListPage() {
  const { products, categories, loading, error, fetchProducts } = useProductsStore();
  const [tab, setTab] = useState<ProductTab>("ALL");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const counts = useMemo(() => {
    const c: Record<ProductTab, number> = { ALL: products.length, DRAFT: 0, SUBMITTED: 0, APPROVED: 0, REJECTED: 0 };
    products.forEach((p) => (c[p.status] += 1));
    return c;
  }, [products]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        (tab === "ALL" || p.status === tab) &&
        (!categoryId || p.categoryId === categoryId) &&
        (!q ||
          p.name.toLowerCase().includes(q) ||
          p.variants.some((v) => v.sku.toLowerCase().includes(q))),
    );
  }, [products, tab, search, categoryId]);

  const rejected = rows.filter((p) => p.status === "REJECTED" && p.rejectionReason);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Products">
        <Link href="/products/new" className={btnClass(true)}>
          Add product
        </Link>
      </PageHeader>

      <ChipTabs
        value={tab}
        onChange={setTab}
        options={PRODUCT_TABS.map((t) => ({ ...t, count: counts[t.value] }))}
      />

      <div className="flex flex-wrap gap-3">
        <Field label="Search" htmlFor="q" className="min-w-[180px] flex-1">
          <input
            id="q"
            className={fieldClass}
            placeholder="Product name or SKU"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
        <Field label="Category" htmlFor="c" className="min-w-[180px] flex-1">
          <select
            id="c"
            className={fieldClass}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Panel>
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        <DataTable>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th>Category</Th>
              <Th>Variants</Th>
              <Th>Stock</Th>
              <Th>Added by</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <Td className="font-medium">{p.name}</Td>
                <Td>{p.categoryName || "—"}</Td>
                <Td>{p.variants.length}</Td>
                <Td>{totalStock(p)}</Td>
                <Td>{p.addedBy === "SELLER" ? "You" : "Aariy staff"}</Td>
                <Td>
                  <StatusBadge tone={productStatusToneMap[p.status]}>
                    {productStatusLabelMap[p.status]}
                  </StatusBadge>
                </Td>
                <Td className="text-right">
                  <Link href={`/products/${p.id}/edit`} className={btnClass()}>
                    {rowActionLabel(p)}
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        {!loading && rows.length === 0 && <EmptyState>No products found</EmptyState>}
        {loading && <EmptyState>Loading...</EmptyState>}

        <p className="mb-0 mt-3 text-[13px] text-muted-foreground">
          {rejected.map((p) => (
            <span key={p.id} className="block">
              Rejected{rejected.length > 1 ? ` (${p.name})` : ""}: “{p.rejectionReason}” Fix it and
              submit again.
            </span>
          ))}
          Approved products can be edited, but public changes are reviewed again.
        </p>
      </Panel>
    </div>
  );
}
