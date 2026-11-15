"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import {
  Btn,
  DataTable,
  EmptyState,
  Field,
  Muted,
  PageHeader,
  Panel,
  PanelTitle,
  Td,
  Th,
  Thumb,
  fieldClass,
} from "@/shared/ui/seller";
import { useProductsStore } from "../products.store";
import { ProductVariant, SaveMode, SaveProductPayload, SizeChartRow } from "../products.types";
import {
  ProductFormErrors,
  isReadOnly,
  productStatusLabelMap,
  productStatusToneMap,
  validateProduct,
} from "../products.helpers";

const MAX_IMAGES = 8;
const IMAGE_SLOTS = 4;

type VariantDraft = Omit<ProductVariant, "reserved">;

const emptyForm = (): SaveProductPayload => ({
  name: "",
  categoryId: "",
  description: "",
  material: "",
  dispatchLeadTimeDays: 2,
  variants: [],
  images: [],
  sizeChart: [],
});

const newVariant = (): VariantDraft => ({
  id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  size: "",
  colour: "",
  sku: "",
  barcode: "",
  price: 0,
  stock: 0,
});

/** Compact input used inside the variants / size chart tables. */
const cellInput = cn(fieldClass, "min-h-10 min-w-[72px] px-2.5 py-2");

export default function ProductFormPage({ productId }: { productId?: string }) {
  const router = useRouter();
  const { products, categories, loaded, saving, fetchProducts, saveProduct } = useProductsStore();
  const product = productId ? products.find((p) => p.id === productId) : undefined;

  const [form, setForm] = useState<SaveProductPayload>(emptyForm);
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Fill the form once the product is available.
  useEffect(() => {
    if (hydrated.current || !product) return;
    hydrated.current = true;
    setForm({
      name: product.name,
      categoryId: product.categoryId,
      description: product.description,
      material: product.material ?? "",
      dispatchLeadTimeDays: product.dispatchLeadTimeDays,
      variants: product.variants,
      images: product.images,
      sizeChart: product.sizeChart,
    });
  }, [product]);

  if (productId && loaded && !product) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Product not found" crumb="Products" />
        <Panel>
          <EmptyState>
            This product does not exist.{" "}
            <Link href="/products" className="text-primary underline">
              Back to products
            </Link>
          </EmptyState>
        </Panel>
      </div>
    );
  }

  const readOnly = product ? isReadOnly(product) : false;
  const status = product?.status ?? "DRAFT";

  const patch = (p: Partial<SaveProductPayload>) => setForm((f) => ({ ...f, ...p }));

  /* ---- variants ---- */
  const setVariant = (id: string, p: Partial<VariantDraft>) =>
    patch({ variants: form.variants.map((v) => (v.id === id ? { ...v, ...p } : v)) });
  const addVariant = () => patch({ variants: [...form.variants, { ...newVariant(), reserved: 0 }] });
  const removeVariant = (id: string) => patch({ variants: form.variants.filter((v) => v.id !== id) });

  /* ---- size chart ---- */
  const setChartRow = (i: number, p: Partial<SizeChartRow>) =>
    patch({ sizeChart: form.sizeChart.map((r, idx) => (idx === i ? { ...r, ...p } : r)) });
  const addChartRow = () => patch({ sizeChart: [...form.sizeChart, { size: "", chest: "", length: "" }] });
  const removeChartRow = (i: number) => patch({ sizeChart: form.sizeChart.filter((_, idx) => idx !== i) });
  const chartFromVariants = () => {
    const sizes = Array.from(new Set(form.variants.map((v) => v.size.trim()).filter(Boolean)));
    const bySize = new Map(form.sizeChart.map((r) => [r.size, r]));
    patch({ sizeChart: sizes.map((s) => bySize.get(s) ?? { size: s, chest: "", length: "" }) });
  };

  /* ---- images ---- */
  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    // TODO(api): upload to storage and keep the returned URLs instead of local previews.
    const urls = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => URL.createObjectURL(f));
    patch({ images: [...form.images, ...urls].slice(0, MAX_IMAGES) });
  };
  const moveImage = (from: number, to: number) => {
    if (from === to) return;
    const next = [...form.images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    patch({ images: next });
  };
  const removeImage = (i: number) => patch({ images: form.images.filter((_, idx) => idx !== i) });

  /* ---- save ---- */
  const handleSave = async (mode: SaveMode) => {
    const payload: SaveProductPayload = {
      ...form,
      name: form.name.trim(),
      sizeChart: form.sizeChart.filter((r) => r.size.trim()),
    };
    const errs = validateProduct(payload, mode);
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast({ title: "Please fix the highlighted fields", variant: "destructive" });
      return;
    }
    const res = await saveProduct(product?.id ?? null, payload, mode);
    toast({ title: res.message, variant: res.success ? "default" : "destructive" });
    if (!res.success) return;
    if (mode === "SUBMIT") router.push("/products");
    else if (!product && res.product) router.replace(`/products/${res.product.id}/edit`);
  };

  const slots = Math.max(IMAGE_SLOTS, Math.min(form.images.length + (readOnly ? 0 : 1), MAX_IMAGES));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        crumb={
          <>
            <Link href="/products" className="hover:text-primary">
              Products
            </Link>{" "}
            / {product ? "Edit product" : "New product"}
          </>
        }
        title={form.name || "New product"}
      >
        <StatusBadge tone={productStatusToneMap[status]}>{productStatusLabelMap[status]}</StatusBadge>
        {!readOnly && (
          <>
            <Btn onClick={() => handleSave("DRAFT")} disabled={saving}>
              Save draft
            </Btn>
            <Btn primary onClick={() => handleSave("SUBMIT")} disabled={saving}>
              Submit for approval
            </Btn>
          </>
        )}
      </PageHeader>

      {product?.status === "REJECTED" && product.rejectionReason && (
        <Panel className="border-[#F3C0C0] bg-[#FDE5E5] text-sm text-[#A12A2A]">
          <b>Rejected:</b> “{product.rejectionReason}” Fix it and submit again.
        </Panel>
      )}

      <fieldset disabled={readOnly} className="m-0 min-w-0 border-0 p-0">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {/* Left: details + variants */}
          <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
            <Panel className="flex flex-col gap-3">
              <PanelTitle className="mb-0">Details</PanelTitle>
              <Field label="Product name" htmlFor="n" error={errors.name}>
                <input
                  id="n"
                  className={fieldClass}
                  value={form.name}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </Field>
              <Field label="Category (last level only)" htmlFor="c" error={errors.categoryId}>
                <select
                  id="c"
                  className={fieldClass}
                  value={form.categoryId}
                  onChange={(e) => patch({ categoryId: e.target.value })}
                >
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.path}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Description" htmlFor="d">
                <textarea
                  id="d"
                  rows={3}
                  className={fieldClass}
                  value={form.description}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </Field>
              <div className="flex flex-wrap gap-3">
                <Field label="Material" htmlFor="m" className="min-w-[180px] flex-1">
                  <input
                    id="m"
                    className={fieldClass}
                    value={form.material}
                    onChange={(e) => patch({ material: e.target.value })}
                  />
                </Field>
                <Field label="Dispatch lead time (days)" htmlFor="l" className="min-w-[180px] flex-1">
                  <input
                    id="l"
                    type="number"
                    min={0}
                    className={fieldClass}
                    value={form.dispatchLeadTimeDays}
                    onChange={(e) => patch({ dispatchLeadTimeDays: Math.max(0, Number(e.target.value) || 0) })}
                  />
                </Field>
              </div>
            </Panel>

            <Panel>
              <PanelTitle>Variants</PanelTitle>
              <DataTable>
                <thead>
                  <tr>
                    <Th>Size</Th>
                    <Th>Colour</Th>
                    <Th>SKU</Th>
                    <Th>Barcode</Th>
                    <Th>Price (PKR)</Th>
                    <Th>Stock</Th>
                    {!readOnly && <Th />}
                  </tr>
                </thead>
                <tbody>
                  {form.variants.map((v) => (
                    <tr key={v.id}>
                      <Td className="py-2">
                        <input aria-label="Size" className={cellInput} value={v.size} onChange={(e) => setVariant(v.id, { size: e.target.value })} />
                      </Td>
                      <Td className="py-2">
                        <input aria-label="Colour" className={cellInput} value={v.colour} onChange={(e) => setVariant(v.id, { colour: e.target.value })} />
                      </Td>
                      <Td className="py-2">
                        <input aria-label="SKU" className={cn(cellInput, "min-w-[120px]")} value={v.sku} onChange={(e) => setVariant(v.id, { sku: e.target.value })} />
                      </Td>
                      <Td className="py-2">
                        <input aria-label="Barcode" className={cn(cellInput, "min-w-[130px]")} value={v.barcode ?? ""} onChange={(e) => setVariant(v.id, { barcode: e.target.value })} />
                      </Td>
                      <Td className="py-2">
                        <input aria-label="Price" type="number" min={0} className={cellInput} value={v.price || ""} onChange={(e) => setVariant(v.id, { price: Number(e.target.value) || 0 })} />
                      </Td>
                      <Td className="py-2">
                        <input aria-label="Stock" type="number" min={0} className={cellInput} value={v.stock} onChange={(e) => setVariant(v.id, { stock: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />
                      </Td>
                      {!readOnly && (
                        <Td className="py-2">
                          <button
                            type="button"
                            aria-label="Remove variant"
                            className="cursor-pointer rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                            onClick={() => removeVariant(v.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </Td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </DataTable>
              {form.variants.length === 0 && <EmptyState>No variants yet</EmptyState>}
              {errors.variants && <p className="mt-2 text-xs text-destructive">{errors.variants}</p>}
              {!readOnly && (
                <Btn className="mt-3" onClick={addVariant}>
                  + Add variant
                </Btn>
              )}
            </Panel>
          </div>

          {/* Right: images, size chart, approval */}
          <div className="flex min-w-0 flex-col gap-4">
            <Panel>
              <PanelTitle>Images</PanelTitle>
              <div className="flex flex-wrap gap-3">
                {Array.from({ length: slots }).map((_, i) => {
                  const src = form.images[i];
                  if (src) {
                    return (
                      <Thumb
                        key={src}
                        src={src}
                        draggable={!readOnly}
                        onDragStart={() => setDragIndex(i)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (dragIndex !== null) moveImage(dragIndex, i);
                          setDragIndex(null);
                        }}
                        className={cn(!readOnly && "cursor-grab", dragIndex === i && "opacity-50")}
                      >
                        {i === 0 && (
                          <span className="absolute bottom-1 left-1 rounded bg-foreground/80 px-1.5 text-[10px] text-white">
                            Cover
                          </span>
                        )}
                        {!readOnly && (
                          <button
                            type="button"
                            aria-label="Remove image"
                            onClick={() => removeImage(i)}
                            className="absolute right-1 top-1 cursor-pointer rounded-full bg-white/90 p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Thumb>
                    );
                  }
                  const isNext = i === form.images.length && !readOnly;
                  return (
                    <Thumb
                      key={`empty-${i}`}
                      role={isNext ? "button" : undefined}
                      aria-label={isNext ? "Add image" : undefined}
                      onClick={isNext ? () => fileRef.current?.click() : undefined}
                      className={cn("flex items-center justify-center", isNext && "cursor-pointer hover:bg-[#F9DCCD]")}
                    >
                      {isNext && <Plus className="h-5 w-5 text-[#B8532F]" />}
                    </Thumb>
                  );
                })}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  onFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <p className="mb-0 mt-3 text-[13px] text-muted-foreground">
                First image is the cover. Drag to reorder.
              </p>
            </Panel>

            <Panel>
              <div className="mb-3 flex items-center justify-between gap-2">
                <PanelTitle className="mb-0">Size chart (cm)</PanelTitle>
                {!readOnly && form.variants.length > 0 && (
                  <button type="button" onClick={chartFromVariants} className="cursor-pointer text-[13px] text-primary hover:underline">
                    Use variant sizes
                  </button>
                )}
              </div>
              <DataTable>
                <thead>
                  <tr>
                    <Th>Size</Th>
                    <Th>Chest</Th>
                    <Th>Length</Th>
                    {!readOnly && <Th />}
                  </tr>
                </thead>
                <tbody>
                  {form.sizeChart.map((r, i) => (
                    <tr key={i}>
                      <Td className="py-2">
                        <input aria-label="Size" className={cn(cellInput, "min-w-[56px]")} value={r.size} onChange={(e) => setChartRow(i, { size: e.target.value })} />
                      </Td>
                      <Td className="py-2">
                        <input aria-label="Chest" inputMode="decimal" className={cn(cellInput, "min-w-[56px]")} value={r.chest} onChange={(e) => setChartRow(i, { chest: e.target.value })} />
                      </Td>
                      <Td className="py-2">
                        <input aria-label="Length" inputMode="decimal" className={cn(cellInput, "min-w-[56px]")} value={r.length} onChange={(e) => setChartRow(i, { length: e.target.value })} />
                      </Td>
                      {!readOnly && (
                        <Td className="py-2">
                          <button
                            type="button"
                            aria-label="Remove row"
                            className="cursor-pointer rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                            onClick={() => removeChartRow(i)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </Td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </DataTable>
              {form.sizeChart.length === 0 && <EmptyState>No size chart yet</EmptyState>}
              {errors.sizeChart && <p className="mt-2 text-xs text-destructive">{errors.sizeChart}</p>}
              {!readOnly && (
                <Btn className="mt-3" onClick={addChartRow}>
                  + Add row
                </Btn>
              )}
            </Panel>

            <Panel>
              <PanelTitle>Approval</PanelTitle>
              <Muted>
                Status: {productStatusLabelMap[status]}.{" "}
                {status === "SUBMITTED"
                  ? "Aariy staff are reviewing it. You'll get an email when it's done."
                  : product?.addedBy === "STAFF"
                    ? "This product was listed by Aariy staff. Contact Aariy to change it."
                    : status === "APPROVED"
                      ? "Changes you submit are reviewed again before they go live."
                      : "After submit, Aariy staff review it and you get an email."}
              </Muted>
            </Panel>
          </div>
        </div>
      </fieldset>
    </div>
  );
}
