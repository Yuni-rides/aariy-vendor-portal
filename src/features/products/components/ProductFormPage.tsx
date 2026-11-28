"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Plus, Trash2, X } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth.store";
import { Btn, EmptyState, PageHeader, Panel, PanelTitle, fieldClass } from "@/shared/ui/seller";
import { slugify } from "@/features/seller-profile/seller-profile.helpers";
import { useProductsStore } from "../products.store";
import type { AttributeValue, CategoryField, ProductVariant, SaveMode, SaveProductPayload } from "../products.types";
import {
  MAX_DISPATCH_DAYS,
  MAX_PHOTOS,
  MAX_VARIANTS,
  META_DESCRIPTION_MAX,
  META_TITLE_MAX,
  MIN_PHOTOS,
  ProductFormErrors,
  detailFieldsOf,
  formatRs,
  isReadOnly,
  parseRs,
  productStatusLabelMap,
  productStatusToneMap,
  submitChecklist,
  validateProduct,
  variantFieldOf,
} from "../products.helpers";
import { SizeChartDialog } from "./SizeChartDialog";

type VariantDraft = Omit<ProductVariant, "reserved">;

const emptyForm = (): SaveProductPayload => ({
  name: "",
  categoryId: "",
  description: "",
  material: "",
  care: "",
  dispatchMinDays: 2,
  dispatchMaxDays: 5,
  attributes: {},
  variants: [],
  images: [],
  sizeChartId: "",
  hsCode: "",
  fibreContent: "",
  countryOfOrigin: "PK",
  declaredValue: undefined,
  metaTitle: "",
  metaDescription: "",
});

const newVariant = (copy?: VariantDraft): VariantDraft => ({
  id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  size: "",
  colour: copy?.colour ?? "",
  sku: "",
  barcode: "",
  price: copy?.price ?? 0,
  compareAt: copy?.compareAt,
  stock: 0,
});

/** Compact input used inside the variants table. */
const cellInput = cn(fieldClass, "min-h-10 px-2.5 py-2");

/** Label row with a red star for required fields and an optional right-side note (e.g. a character count). */
function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  aside,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-foreground">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p className="m-0 text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="m-0 text-xs leading-relaxed text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

/** Pill button used for yes/no and multi-select category fields. */
function Chip({ on, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { on: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-[34px] cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] disabled:cursor-not-allowed",
        on ? "border-[#E2B8A3] bg-[#FBEDE6] font-semibold text-[#7E3216]" : "border-input bg-white text-foreground hover:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

/** One input for a category field, by its type. */
function AttributeInput({
  field,
  value,
  error,
  onChange,
}: {
  field: CategoryField;
  value: AttributeValue | undefined;
  error?: string;
  onChange: (v: AttributeValue | undefined) => void;
}) {
  const id = `attr-${field.key}`;
  if (field.type === "YES_NO") {
    return (
      <FormField label={field.label} required={field.required} error={error}>
        <div role="radiogroup" aria-label={field.label} className="flex gap-2">
          {[true, false].map((v) => (
            <Chip key={String(v)} role="radio" aria-checked={value === v} on={value === v} onClick={() => onChange(v)}>
              {v ? "Yes" : "No"}
            </Chip>
          ))}
        </div>
      </FormField>
    );
  }
  if (field.type === "MULTI_SELECT") {
    const picked = Array.isArray(value) ? value : [];
    return (
      <FormField label={field.label} required={field.required} error={error} className="sm:col-span-2">
        <div className="flex flex-wrap gap-2">
          {(field.options ?? []).map((o) => {
            const on = picked.includes(o);
            return (
              <Chip
                key={o}
                aria-pressed={on}
                on={on}
                onClick={() => onChange(on ? picked.filter((x) => x !== o) : [...picked, o])}
              >
                {on && <Check className="h-3.5 w-3.5" />}
                {o}
              </Chip>
            );
          })}
        </div>
      </FormField>
    );
  }
  if (field.type === "DROPDOWN") {
    return (
      <FormField label={field.label} htmlFor={id} required={field.required} error={error}>
        <select id={id} className={fieldClass} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value || undefined)}>
          <option value="">Select</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </FormField>
    );
  }
  return (
    <FormField label={field.label} htmlFor={id} required={field.required} error={error}>
      <input
        id={id}
        className={fieldClass}
        inputMode={field.type === "NUMBER" ? "numeric" : undefined}
        value={value === undefined ? "" : String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          if (field.type !== "NUMBER") return onChange(raw || undefined);
          const digits = raw.replace(/\D/g, "").slice(0, 6);
          onChange(digits ? Number(digits) : undefined);
        }}
      />
    </FormField>
  );
}

export default function ProductFormPage({ productId }: { productId?: string }) {
  const router = useRouter();
  const { products, categories, sizeCharts, loaded, saving, fetchProducts, saveProduct } = useProductsStore();
  const shopName = useAuthStore((s) => s.user?.seller?.tradingName ?? "");
  const product = productId ? products.find((p) => p.id === productId) : undefined;

  const [form, setForm] = useState<SaveProductPayload>(emptyForm);
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [chartOpen, setChartOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Fill the form once the product is available.
  useEffect(() => {
    if (hydrated.current || !product) return;
    hydrated.current = true;
    // Keep only the fields the form edits; status, ids and server fields stay on the product.
    const base = emptyForm();
    const filled = Object.fromEntries(
      Object.keys(base).map((k) => [k, product[k as keyof SaveProductPayload] ?? base[k as keyof SaveProductPayload]]),
    ) as SaveProductPayload;
    setForm(filled);
  }, [product]);

  const category = useMemo(() => categories.find((c) => c.id === form.categoryId) ?? null, [categories, form.categoryId]);
  const variantField = variantFieldOf(category);
  const detailFields = detailFieldsOf(category);
  const chart = sizeCharts.find((c) => c.id === form.sizeChartId);
  const checklist = submitChecklist(form, category);

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
  const clearError = (...keys: (keyof ProductFormErrors)[]) =>
    setErrors((e) => {
      const next = { ...e };
      keys.forEach((k) => delete next[k]);
      return next;
    });

  /* ---- category & details ---- */
  const pickCategory = (categoryId: string) => {
    // Fields belong to the category, so its old answers are dropped.
    patch({ categoryId, attributes: {} });
    clearError("categoryId", "attributes", "attributeErrors");
  };
  const setAttribute = (key: string, v: AttributeValue | undefined) => {
    const attributes = { ...form.attributes };
    if (v === undefined) delete attributes[key];
    else attributes[key] = v;
    patch({ attributes });
    setErrors((e) => {
      if (!e.attributeErrors?.[key]) return e;
      const rest = { ...e.attributeErrors };
      delete rest[key];
      return { ...e, attributeErrors: rest, ...(Object.keys(rest).length ? {} : { attributes: undefined }) };
    });
  };

  /* ---- variants ---- */
  const setVariant = (id: string, p: Partial<VariantDraft>) => {
    patch({ variants: form.variants.map((v) => (v.id === id ? { ...v, ...p } : v)) });
    clearError("variants");
  };
  const addVariant = () => {
    if (form.variants.length >= MAX_VARIANTS) return;
    // A new row starts with the last row's colour and prices, since they are usually the same.
    patch({ variants: [...form.variants, { ...newVariant(form.variants.at(-1)), reserved: 0 }] });
  };
  const removeVariant = (id: string) => patch({ variants: form.variants.filter((v) => v.id !== id) });

  /* ---- photos ---- */
  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    // TODO(api): upload with POST /media/upload (purpose PRODUCT_IMAGE, up to 5 per call) and keep each key, in order.
    const urls = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => URL.createObjectURL(f));
    patch({ images: [...form.images, ...urls].slice(0, MAX_PHOTOS) });
    clearError("images");
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
      description: form.description.trim(),
      variants: form.variants.map((v) => ({ ...v, sku: v.sku.trim(), size: v.size.trim(), colour: v.colour.trim() })),
    };
    const errs = validateProduct(payload, mode, category);
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

  /* ---- search listing preview ---- */
  const previewSlug = product?.slug ?? [slugify(shopName), slugify(form.name)].filter(Boolean).join("-");
  const previewTitle = form.metaTitle?.trim() || [form.name.trim(), shopName].filter(Boolean).join(" | ") || "Product name";
  const previewDesc = form.metaDescription?.trim() || form.description.trim() || "Product description shows here.";

  const actions = !readOnly && (
    <>
      <Btn className="border border-input bg-white" onClick={() => handleSave("DRAFT")} disabled={saving}>
        Save draft
      </Btn>
      <Btn primary onClick={() => handleSave("SUBMIT")} disabled={saving}>
        {saving ? "Saving..." : "Submit for approval"}
      </Btn>
    </>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Link href="/products" className="text-[13px] text-primary hover:underline">
            ← Products
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-2xl font-semibold">{product ? "Edit product" : "Add product"}</h1>
            {product && <StatusBadge tone={productStatusToneMap[status]}>{productStatusLabelMap[status]}</StatusBadge>}
          </div>
          <p className="m-0 text-[13px] text-muted-foreground">
            Your product shows in your shop on Aariy after Aariy staff approve it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">{actions}</div>
      </div>

      {product?.status === "REJECTED" && product.rejectionReason && (
        <Panel className="border-[#F3C0C0] bg-[#FDE5E5] text-sm text-[#A12A2A]">
          <b>Rejected:</b> “{product.rejectionReason}” Fix it and submit again.
        </Panel>
      )}
      {readOnly && (
        <Panel className="bg-secondary text-sm text-muted-foreground">
          {status === "SUBMITTED"
            ? "Aariy staff are reviewing this product. You can change it after the review."
            : "This product was listed by Aariy staff. Contact Aariy to change it."}
        </Panel>
      )}

      <fieldset disabled={readOnly} className="m-0 min-w-0 border-0 p-0">
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-3">
          {/* ---------------- Left column ---------------- */}
          <div className="flex min-w-0 flex-col gap-5 xl:col-span-2">
            {/* Details */}
            <Panel className="flex flex-col gap-4 p-6">
              <PanelTitle className="mb-0 text-base">Details</PanelTitle>
              <FormField label="Product name" htmlFor="p-name" required error={errors.name}>
                <input
                  id="p-name"
                  className={fieldClass}
                  maxLength={160}
                  placeholder="e.g. Red bridal lehenga"
                  value={form.name}
                  onChange={(e) => {
                    patch({ name: e.target.value });
                    clearError("name");
                  }}
                />
              </FormField>
              <FormField
                label="Category (last level)"
                htmlFor="p-cat"
                required
                error={errors.categoryId}
                hint="Only categories without sub-categories can be picked. Picking one loads its fields below."
              >
                <select id="p-cat" className={fieldClass} value={form.categoryId} onChange={(e) => pickCategory(e.target.value)}>
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.path}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Description" htmlFor="p-desc" required error={errors.description}>
                <textarea
                  id="p-desc"
                  rows={4}
                  maxLength={5000}
                  className={cn(fieldClass, "resize-y")}
                  placeholder="Fabric, cut, what is included, fit."
                  value={form.description}
                  onChange={(e) => {
                    patch({ description: e.target.value });
                    clearError("description");
                  }}
                />
              </FormField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Material" htmlFor="p-mat">
                  <input
                    id="p-mat"
                    className={fieldClass}
                    maxLength={200}
                    placeholder="e.g. Silk"
                    value={form.material ?? ""}
                    onChange={(e) => patch({ material: e.target.value })}
                  />
                </FormField>
                <FormField label="Care instructions" htmlFor="p-care">
                  <input
                    id="p-care"
                    className={fieldClass}
                    maxLength={2000}
                    placeholder="e.g. Dry clean only"
                    value={form.care ?? ""}
                    onChange={(e) => patch({ care: e.target.value })}
                  />
                </FormField>
              </div>
              <FormField
                label="Dispatch time (days)"
                required
                error={errors.dispatch}
                hint={`0 to ${MAX_DISPATCH_DAYS} days. "To" must not be less than "From".`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  {(
                    [
                      ["dispatchMinDays", "From"],
                      ["dispatchMaxDays", "To"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <label htmlFor={`p-${key}`} className="text-[13px] text-muted-foreground">
                        {label}
                      </label>
                      <input
                        id={`p-${key}`}
                        className={cn(fieldClass, "w-24")}
                        inputMode="numeric"
                        value={String(form[key])}
                        onChange={(e) => {
                          patch({ [key]: Math.min(99, Number(e.target.value.replace(/\D/g, "") || 0)) });
                          clearError("dispatch");
                        }}
                      />
                    </div>
                  ))}
                </div>
              </FormField>
            </Panel>

            {/* Product details from the category */}
            <Panel className="flex flex-col gap-4 p-6">
              <div className="flex flex-col gap-1.5">
                <PanelTitle className="mb-0 text-base">Product details</PanelTitle>
                <p className="m-0 text-[13px] text-muted-foreground">
                  {category
                    ? `Details for ${category.name}. They change when you change the category.`
                    : "Pick a category above to see its details."}
                </p>
              </div>
              {category && detailFields.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {detailFields.map((f) => (
                    <AttributeInput
                      key={f.key}
                      field={f}
                      value={form.attributes[f.key]}
                      error={errors.attributeErrors?.[f.key]}
                      onChange={(v) => setAttribute(f.key, v)}
                    />
                  ))}
                </div>
              )}
              {category && detailFields.length === 0 && (
                <p className="m-0 text-[13px] text-muted-foreground">This category has no extra details.</p>
              )}
            </Panel>

            {/* Variants */}
            <Panel className="flex flex-col gap-4 p-6">
              <div className="flex flex-col gap-1.5">
                <PanelTitle className="mb-0 text-base">Variants</PanelTitle>
                <p className="m-0 text-[13px] text-muted-foreground">
                  One row for each size and colour you sell. Stock is what you have on hand.
                </p>
              </div>
              {/* relative: keeps the hidden "Remove" header label inside the scroll box. */}
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-muted-foreground">
                      <th className="whitespace-nowrap pb-2 pr-2">
                        {variantField?.label ?? "Size"} <span className="text-destructive">*</span>
                      </th>
                      <th className="whitespace-nowrap pb-2 pr-2">Colour</th>
                      <th className="whitespace-nowrap pb-2 pr-2">
                        SKU <span className="text-destructive">*</span>
                      </th>
                      <th className="whitespace-nowrap pb-2 pr-2">Barcode</th>
                      <th className="whitespace-nowrap pb-2 pr-2">
                        Price (Rs) <span className="text-destructive">*</span>
                      </th>
                      <th className="whitespace-nowrap pb-2 pr-2">Original price (Rs)</th>
                      <th className="whitespace-nowrap pb-2 pr-2">
                        Stock <span className="text-destructive">*</span>
                      </th>
                      {!readOnly && (
                        <th className="pb-2">
                          <span className="sr-only">Remove</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {form.variants.map((v, i) => (
                      <tr key={v.id}>
                        <td className="py-1.5 pr-2">
                          {variantField?.options?.length ? (
                            <select
                              aria-label={`Size, row ${i + 1}`}
                              className={cellInput}
                              value={v.size}
                              onChange={(e) => setVariant(v.id, { size: e.target.value })}
                            >
                              <option value="">Select</option>
                              {variantField.options.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              aria-label={`Size, row ${i + 1}`}
                              className={cellInput}
                              maxLength={60}
                              value={v.size}
                              onChange={(e) => setVariant(v.id, { size: e.target.value })}
                            />
                          )}
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            aria-label={`Colour, row ${i + 1}`}
                            className={cellInput}
                            maxLength={40}
                            value={v.colour}
                            onChange={(e) => setVariant(v.id, { colour: e.target.value })}
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            aria-label={`SKU, row ${i + 1}`}
                            className={cn(cellInput, "min-w-[120px]")}
                            maxLength={64}
                            value={v.sku}
                            onChange={(e) => setVariant(v.id, { sku: e.target.value.replace(/[^A-Za-z0-9._-]/g, "") })}
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            aria-label={`Barcode, row ${i + 1}`}
                            className={cn(cellInput, "min-w-[120px]")}
                            maxLength={64}
                            placeholder="Optional"
                            value={v.barcode ?? ""}
                            onChange={(e) => setVariant(v.id, { barcode: e.target.value })}
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            aria-label={`Price, row ${i + 1}`}
                            className={cellInput}
                            inputMode="numeric"
                            value={formatRs(v.price)}
                            onChange={(e) => setVariant(v.id, { price: parseRs(e.target.value) })}
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            aria-label={`Original price, row ${i + 1}`}
                            className={cellInput}
                            inputMode="numeric"
                            placeholder="Optional"
                            value={formatRs(v.compareAt)}
                            onChange={(e) => setVariant(v.id, { compareAt: parseRs(e.target.value) || undefined })}
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input
                            aria-label={`Stock, row ${i + 1}`}
                            className={cn(cellInput, "w-20")}
                            inputMode="numeric"
                            value={String(v.stock)}
                            onChange={(e) => setVariant(v.id, { stock: Math.min(100000, Number(e.target.value.replace(/\D/g, "") || 0)) })}
                          />
                        </td>
                        {!readOnly && (
                          <td className="py-1.5">
                            <button
                              type="button"
                              aria-label={`Remove row ${i + 1}`}
                              className="cursor-pointer rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                              onClick={() => removeVariant(v.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {form.variants.length === 0 && <EmptyState>No variants yet</EmptyState>}
              {errors.variants && <p className="m-0 text-xs text-destructive">{errors.variants}</p>}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {!readOnly && (
                  <Btn className="min-h-10 border border-[#F1D5C7] bg-[#FBEDE6] py-2 text-[#8A3716]" onClick={addVariant} disabled={form.variants.length >= MAX_VARIANTS}>
                    + Add variant
                  </Btn>
                )}
                <p className="m-0 text-xs text-muted-foreground">
                  SKU: letters, digits, . - _ only, different for every variant. 1 to {MAX_VARIANTS} variants.
                </p>
              </div>
            </Panel>

            {/* Customs */}
            <details className="group rounded-2xl border border-border bg-white p-6">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <span className="flex flex-col gap-1">
                  <span className="text-base font-semibold">
                    Customs, for selling abroad <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                  </span>
                  <span className="text-[13px] text-muted-foreground">Needed only before the product can ship to the US.</span>
                </span>
                <span className="flex items-center gap-1 text-[13px] font-semibold text-primary">
                  <span className="group-open:hidden">Show</span>
                  <span className="hidden group-open:inline">Hide</span>
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </span>
              </summary>
              <div className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-2">
                <FormField label="HS code" htmlFor="p-hs" error={errors.hsCode}>
                  <input
                    id="p-hs"
                    className={fieldClass}
                    inputMode="numeric"
                    placeholder="6 to 10 digits"
                    value={form.hsCode ?? ""}
                    onChange={(e) => {
                      patch({ hsCode: e.target.value.replace(/\D/g, "").slice(0, 10) });
                      clearError("hsCode");
                    }}
                  />
                </FormField>
                <FormField label="Fibre content" htmlFor="p-fib">
                  <input
                    id="p-fib"
                    className={fieldClass}
                    maxLength={200}
                    placeholder="e.g. 100% silk"
                    value={form.fibreContent ?? ""}
                    onChange={(e) => patch({ fibreContent: e.target.value })}
                  />
                </FormField>
                <FormField label="Country of origin" htmlFor="p-coo" hint="Two-letter code, e.g. PK.">
                  <input
                    id="p-coo"
                    className={fieldClass}
                    maxLength={2}
                    value={form.countryOfOrigin ?? ""}
                    onChange={(e) => patch({ countryOfOrigin: e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase() })}
                  />
                </FormField>
                <FormField label="Declared value (Rs)" htmlFor="p-dv">
                  <input
                    id="p-dv"
                    className={fieldClass}
                    inputMode="numeric"
                    placeholder="Value for customs"
                    value={formatRs(form.declaredValue)}
                    onChange={(e) => patch({ declaredValue: parseRs(e.target.value) || undefined })}
                  />
                </FormField>
              </div>
            </details>

            {/* Search engine listing */}
            <Panel className="flex flex-col gap-4 p-6">
              <div className="flex flex-col gap-1.5">
                <PanelTitle className="mb-0 text-base">
                  Search engine listing <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </PanelTitle>
                <p className="m-0 text-[13px] text-muted-foreground">
                  How the product looks on Google and when its link is shared. Leave empty to use the product name and description.
                </p>
              </div>
              <div className="flex flex-col gap-1 rounded-[10px] border border-border bg-white p-4">
                <span className="truncate text-xs text-[#4D5156]">aariee.com › products › {previewSlug || "your-product"}</span>
                <span className="text-lg leading-snug text-[#1A0DAB]">{previewTitle}</span>
                <span className="line-clamp-2 text-[13px] leading-relaxed text-[#4D5156]">{previewDesc}</span>
              </div>
              <FormField label="Product URL" hint="Made from your shop and product name when you save.">
                <div className="flex min-h-11 items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-[10px] border border-border bg-[#F7F1ED] px-3 text-sm text-muted-foreground">
                  aariee.com/products/{previewSlug || "…"}
                </div>
              </FormField>
              <FormField
                label="Meta title"
                htmlFor="p-mtitle"
                error={errors.metaTitle}
                aside={
                  <span className="text-xs text-muted-foreground">
                    {(form.metaTitle ?? "").length} / {META_TITLE_MAX}
                  </span>
                }
              >
                <input
                  id="p-mtitle"
                  className={fieldClass}
                  maxLength={META_TITLE_MAX}
                  placeholder={previewTitle}
                  value={form.metaTitle ?? ""}
                  onChange={(e) => patch({ metaTitle: e.target.value })}
                />
              </FormField>
              <FormField
                label="Meta description"
                htmlFor="p-mdesc"
                error={errors.metaDescription}
                hint={`Up to ${META_TITLE_MAX} characters for the title and ${META_DESCRIPTION_MAX} for the description; Google cuts longer text.`}
                aside={
                  <span className="text-xs text-muted-foreground">
                    {(form.metaDescription ?? "").length} / {META_DESCRIPTION_MAX}
                  </span>
                }
              >
                <textarea
                  id="p-mdesc"
                  rows={3}
                  maxLength={META_DESCRIPTION_MAX}
                  className={cn(fieldClass, "resize-y")}
                  value={form.metaDescription ?? ""}
                  onChange={(e) => patch({ metaDescription: e.target.value })}
                />
              </FormField>
            </Panel>
          </div>

          {/* ---------------- Right column ---------------- */}
          <div className="flex min-w-0 flex-col gap-5">
            {/* Photos */}
            <Panel className="flex flex-col gap-4 p-6">
              <div className="flex flex-col gap-1.5">
                <PanelTitle className="mb-0 text-base">Photos</PanelTitle>
                <p className="m-0 text-[13px] text-muted-foreground">
                  First photo is the cover. Drag to reorder. At least {MIN_PHOTOS} to submit, up to {MAX_PHOTOS}.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {form.images.map((src, i) => (
                  <div
                    key={src}
                    draggable={!readOnly}
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex !== null) moveImage(dragIndex, i);
                      setDragIndex(null);
                    }}
                    className={cn(
                      "relative aspect-[3/4] overflow-hidden rounded-lg bg-[#EFE3DB]",
                      !readOnly && "cursor-grab",
                      dragIndex === i && "opacity-50",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                    {i === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 rounded bg-foreground px-1.5 py-0.5 text-[11px] font-semibold text-white">
                        Cover
                      </span>
                    )}
                    {!readOnly && (
                      <button
                        type="button"
                        aria-label={`Remove photo ${i + 1}`}
                        onClick={() => removeImage(i)}
                        className="absolute right-1.5 top-1.5 cursor-pointer rounded-full bg-white/90 p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                {!readOnly && form.images.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    aria-label="Add photos"
                    onClick={() => fileRef.current?.click()}
                    className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-dashed border-[#D2A48E] bg-[#FFF8F4] text-xs font-semibold text-primary hover:bg-[#FBEDE6]"
                  >
                    <Plus className="h-5 w-5" />
                    Add
                  </button>
                )}
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
              {errors.images && <p className="m-0 text-xs text-destructive">{errors.images}</p>}
            </Panel>

            {/* Size chart */}
            <Panel className="flex flex-col gap-4 p-6">
              <div className="flex flex-col gap-1.5">
                <PanelTitle className="mb-0 text-base">Size chart</PanelTitle>
                <p className="m-0 text-[13px] text-muted-foreground">
                  Charts belong to your brand and are shared by its products. Needed to submit.
                </p>
              </div>
              <FormField label="Choose a chart" htmlFor="p-sc" error={errors.sizeChartId}>
                <select
                  id="p-sc"
                  className={fieldClass}
                  value={form.sizeChartId ?? ""}
                  onChange={(e) => {
                    patch({ sizeChartId: e.target.value });
                    clearError("sizeChartId");
                  }}
                >
                  <option value="">{sizeCharts.length ? "Select a chart" : "No charts yet"}</option>
                  {sizeCharts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.unit === "IN" ? "inch" : "cm"})
                    </option>
                  ))}
                </select>
              </FormField>
              {chart && (
                <div className="overflow-x-auto rounded-lg bg-[#FBF8F6]">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr>
                        {chart.columns.map((c) => (
                          <th key={c} className="px-2.5 pb-1.5 pt-2.5 text-left text-xs font-semibold text-muted-foreground">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {chart.rows.map((r, ri) => (
                        <tr key={ri}>
                          {r.map((x, ci) => (
                            <td key={ci} className={cn("px-2.5 py-1.5", ri === chart.rows.length - 1 && "pb-2.5")}>
                              {x}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!readOnly && (
                <Btn className="min-h-10 border border-[#F1D5C7] bg-[#FBEDE6] py-2 text-[#8A3716]" onClick={() => setChartOpen(true)}>
                  + New size chart
                </Btn>
              )}
            </Panel>

            {/* Before submitting */}
            <Panel className="flex flex-col gap-4 p-6">
              <PanelTitle className="mb-0 text-base">Before submitting</PanelTitle>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-sm">
                {checklist.map((c) => (
                  <li key={c.label} className={cn("flex items-center gap-2.5", !c.done && "text-[#8C2A1B]")}>
                    {c.done ? (
                      <Check className="h-[18px] w-[18px] text-[#2E7D4F]" strokeWidth={2.4} aria-label="Done" />
                    ) : (
                      <X className="h-[18px] w-[18px] text-destructive" strokeWidth={2.4} aria-label="Missing" />
                    )}
                    {c.label}
                  </li>
                ))}
              </ul>
              <p className="m-0 text-xs leading-relaxed text-muted-foreground">
                Save draft works any time. Submit for approval sends the product to Aariy staff; it goes live once they approve
                it, and you get an email.
              </p>
            </Panel>
          </div>
        </div>
      </fieldset>

      {!readOnly && <div className="flex flex-wrap justify-end gap-2.5 border-t border-border pt-4">{actions}</div>}

      <SizeChartDialog open={chartOpen} onOpenChange={setChartOpen} onSaved={(c) => patch({ sizeChartId: c.id })} />
    </div>
  );
}
