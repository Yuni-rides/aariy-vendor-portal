"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { formatLongDate } from "@/features/orders/orders.helpers";
import { Btn, Field, Muted, PageHeader, Panel, PanelTitle, Thumb, fieldClass } from "@/shared/ui/seller";

/** A saved, masked value (e.g. "On file ••••5674") reads like a filled field, not a grey hint. */
const onFileClass = "placeholder:text-foreground";
import { SearchSelect, type SearchPage } from "@/shared/ui/SearchSelect";
import { locationsApi } from "@/features/locations/locations.api";
import { useSellerProfileStore } from "../seller-profile.store";
import { uploadPendingFiles } from "../seller-profile.uploads";
import { uploadErrorMessage } from "@/shared/api/media.api";
import {
  DOCUMENT_HINTS,
  DOCUMENT_LABELS,
  docsFor,
  buildPayload,
  fileProblem,
  firstErrorKey,
  formFromResponse,
  formatCnic,
  formatNtn,
  formatProblems,
  isComplete,
  slugify,
  validate,
} from "../seller-profile.helpers";
import type { BrandDraft, DocSlot, DocumentType, FormErrors, SellerProfileForm } from "../seller-profile.types";
import { DocTile } from "./DocTile";

const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  ONBOARDING: { label: "Not submitted", tone: "warning" },
  SUBMITTED: { label: "Under review", tone: "info" },
  CHANGES_REQUESTED: { label: "Changes requested", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  SUSPENDED: { label: "Suspended", tone: "danger" },
};

const slotFrom = (f: File): DocSlot => ({ key: null, name: f.name, size: f.size, file: f });

/** Seller details for a seller that is not live yet: GET and PUT /v1/seller/onboarding. */
export default function SellerProfilePage() {
  const { data, loading, saving, error, fetch, save } = useSellerProfileStore();
  const [form, setForm] = useState<SellerProfileForm | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  /** Upload progress (0 to 100) while picked files are sent; null when not uploading. */
  const [uploading, setUploading] = useState<number | null>(null);
  const busy = saving || uploading !== null;
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    if (data) setForm(formFromResponse(data));
  }, [data]);

  // Country and city lists come from GET /countries and GET /cities, with search.
  const loadCountries = useCallback(async (search: string, page: number): Promise<SearchPage> => {
    const res = await locationsApi.countries({ search, page, limit: 20 });
    return { hasMore: res.hasMore, items: res.items.map((c) => ({ id: c.id, label: c.name, code: c.code })) };
  }, []);
  const countryId = form?.countryId;
  const countryCode = form?.countryCode;
  const provinceId = form?.provinceId;
  const loadProvinces = useCallback(
    async (search: string, page: number): Promise<SearchPage> => {
      const res = await locationsApi.provinces({ search, page, limit: 20, countryCode });
      return { hasMore: res.hasMore, items: res.items.map((p) => ({ id: p.id, label: p.name })) };
    },
    [countryCode],
  );
  const loadCities = useCallback(
    async (search: string, page: number): Promise<SearchPage> => {
      const res = await locationsApi.cities({ search, page, limit: 10, countryId, provinceId });
      return { hasMore: res.hasMore, items: res.items.map((c) => ({ id: c.id, label: c.name, sub: c.regionName })) };
    },
    [countryId, provinceId],
  );

  if (!data || !form) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <PageHeader title="Brand profile" />
        {error ? (
          <Panel className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-destructive">{error}</span>
            <Btn onClick={() => fetch()}>Try again</Btn>
          </Panel>
        ) : (
          (loading || !data) && <Skeleton className="h-96 w-full rounded-2xl" />
        )}
      </div>
    );
  }

  const readOnly = !data.editable;
  const status = STATUS[data.status] ?? { label: data.status, tone: "neutral" as StatusTone };
  // Documents follow the picked business type; partnership deed is always optional.
  const { required, optional } = docsFor(data, form.businessTypeCode);
  const rejected = new Map(data.rejectedDocuments.map((d) => [d.type, d.reason]));

  const patch = (p: Partial<SellerProfileForm>) => {
    setForm((f) => (f ? { ...f, ...p } : f));
    setErrors((e) => {
      const next = { ...e };
      Object.keys(p).forEach((k) => delete next[k]);
      return next;
    });
  };
  const clearError = (key: string) => setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));

  const setBrand = (i: number, p: Partial<BrandDraft>) => {
    setForm((f) => (f ? { ...f, brands: f.brands.map((b, j) => (j === i ? { ...b, ...p } : b)) } : f));
    Object.keys(p).forEach((k) => clearError(`brand.${i}.${k}`));
  };

  const pickDoc = (type: DocumentType, file: File) => {
    const problem = fileProblem(file);
    if (problem) {
      setErrors((e) => ({ ...e, [`doc.${type}`]: problem }));
      return;
    }
    setForm((f) => (f ? { ...f, documents: { ...f.documents, [type]: slotFrom(file) } } : f));
    clearError(`doc.${type}`);
  };

  const removeDoc = (type: DocumentType) =>
    setForm((f) => {
      if (!f) return f;
      const documents = { ...f.documents };
      delete documents[type];
      return { ...f, documents };
    });

  /**
   * "Save" keeps a half-filled form (only typed fields are checked).
   * "Submit for approval" needs every required field and sends submit: true.
   */
  const handleSave = async (mode: "save" | "submit") => {
    const errs = mode === "submit" ? validate(form, data) : formatProblems(form);
    setErrors(errs);
    const first = firstErrorKey(errs);
    if (first) {
      toast({ title: "Please fix the highlighted fields.", variant: "destructive" });
      formRef.current?.querySelector<HTMLElement>(`[data-err="${first}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // 1. Upload picked files (POST /media/upload) and put their keys in the form.
    let ready = form;
    setUploading(0);
    try {
      ready = await uploadPendingFiles(form, setUploading);
      setForm(ready); // keep the keys, so a failed save does not upload the same files again
    } catch (err) {
      setUploading(null);
      toast({ title: uploadErrorMessage(err), variant: "destructive" });
      return;
    }
    setUploading(null);

    // 2. Save the form with the keys (PUT /seller/onboarding).
    const res = await save(buildPayload(ready, data, { submit: mode === "submit" }));
    toast({ title: res.message, variant: res.success ? "default" : "destructive" });
  };

  // The submit button only shows once every required field is filled in.
  const complete = isComplete(form, data);
  const busyLabel = uploading !== null ? `Uploading files... ${uploading}%` : saving ? "Saving..." : null;
  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <Btn type="button" disabled={busy} onClick={() => handleSave("save")}>
        {busyLabel ?? "Save"}
      </Btn>
      {complete && (
        <Btn primary type="button" disabled={busy} onClick={() => handleSave("submit")}>
          Submit for approval
        </Btn>
      )}
    </div>
  );

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} noValidate className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <PageHeader title="Brand profile">
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        {!readOnly && actions}
      </PageHeader>

      {/* ---------- Notices ---------- */}
      {data.suspensionReason && (
        <Panel className="border-[#F1B5B5] bg-[#FDE5E5] text-sm text-[#A12A2A]">
          <b>Account suspended.</b> {data.suspensionReason}
        </Panel>
      )}
      {data.deadline && !readOnly && (
        <Panel className="border-[#E8CC8A] bg-[#FFF1D6] text-sm">
          <b>
            {data.deadline.daysLeft} day{data.deadline.daysLeft === 1 ? "" : "s"} left.
          </b>{" "}
          Submit this form by {formatLongDate(data.deadline.submitBy)} or the account is suspended.
        </Panel>
      )}
      {typeof data.review?.note === "string" && data.review.note && (
        <Panel className="border-[#E8CC8A] bg-[#FFF1D6] text-sm">
          <b>Aariy asked for changes:</b> {data.review.note}
        </Panel>
      )}
      {readOnly && (
        <Panel className="text-sm">
          <Muted>Your details are with Aariy for review, so they cannot be changed right now.</Muted>
        </Panel>
      )}

      <fieldset disabled={readOnly || busy} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
        {/* ---------- 1. Owner ---------- */}
        <Section n={1} title="Owner">
          <Grid>
            <F label="Full name" id="fullName" errors={errors}>
              <input id="fullName" className={fieldClass} autoComplete="name" value={form.fullName} onChange={(e) => patch({ fullName: e.target.value })} />
            </F>
            <F label="Mobile number" id="phone" errors={errors}>
              <input id="phone" className={fieldClass} type="tel" autoComplete="tel" placeholder="+923001234567" value={form.phone} onChange={(e) => patch({ phone: e.target.value })} />
            </F>
            <F label="Email" id="email" errors={errors} hint="This is your sign-in email. Contact Aariy to change it.">
              <input id="email" className={fieldClass} value={form.email} readOnly />
            </F>
          </Grid>
        </Section>

        {/* ---------- 2. Business ---------- */}
        <Section n={2} title="Business">
          <div data-err="businessTypeCode">
            <div className="mb-1.5 text-[13px] text-muted-foreground">Business type</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Business type">
              {data.options.businessTypes.map((b) => (
                <label
                  key={b.code}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-[10px] border px-3 py-2.5 text-sm",
                    form.businessTypeCode === b.code ? "border-primary bg-secondary" : "border-input bg-white hover:bg-muted",
                    errors.businessTypeCode && "border-destructive",
                  )}
                >
                  <input
                    type="radio"
                    name="businessType"
                    className="mt-0.5 accent-[var(--primary,#B5532E)]"
                    checked={form.businessTypeCode === b.code}
                    onChange={() => patch({ businessTypeCode: b.code })}
                  />
                  <span>
                    <span className="block font-medium">{b.label}</span>
                  </span>
                </label>
              ))}
            </div>
            {errors.businessTypeCode && <p className="mt-1 text-xs text-destructive">{errors.businessTypeCode}</p>}
          </div>

          <Grid>
            <F label="Registered business name" id="registeredName" errors={errors} hint="As on your CNIC, NTN or registration.">
              <input id="registeredName" className={fieldClass} value={form.registeredName} onChange={(e) => patch({ registeredName: e.target.value })} />
            </F>
            <F label="Trading name" id="tradingName" errors={errors} hint="The name buyers see on Aariy.">
              <input id="tradingName" className={fieldClass} value={form.tradingName} onChange={(e) => patch({ tradingName: e.target.value })} />
            </F>
            <F label="Country" id="countryId" errors={errors}>
              <SearchSelect
                id="countryId"
                value={form.countryId}
                valueLabel={form.countryName}
                placeholder="Choose a country"
                searchPlaceholder="Search countries"
                invalid={!!errors.countryId}
                disabled={readOnly}
                load={loadCountries}
                onChange={(o) =>
                  o?.id !== form.countryId &&
                  patch({
                    countryId: o?.id ?? "",
                    countryName: o?.label ?? "",
                    countryCode: o?.code ?? "",
                    provinceId: "",
                    provinceName: "",
                    dispatchCityId: "",
                    cityName: "",
                  })
                }
              />
            </F>
            <F label="Province / state" id="provinceId" errors={errors}>
              <SearchSelect
                // Start a fresh list when the country changes.
                key={"province-" + form.countryId}
                id="provinceId"
                value={form.provinceId}
                valueLabel={form.provinceName}
                placeholder={form.countryId ? "Choose a province or state" : "Choose a country first"}
                searchPlaceholder="Search provinces"
                emptyText="No province found."
                invalid={!!errors.provinceId}
                disabled={readOnly || !form.countryCode}
                load={loadProvinces}
                onChange={(o) =>
                  o?.id !== form.provinceId &&
                  patch({ provinceId: o?.id ?? "", provinceName: o?.label ?? "", dispatchCityId: "", cityName: "" })
                }
              />
            </F>
            <F label="Dispatch city" id="dispatchCityId" errors={errors} hint="Where parcels are collected from.">
              <SearchSelect
                // Start a fresh list when the country changes.
                key={"city-" + form.countryId + "-" + form.provinceId}
                id="dispatchCityId"
                value={form.dispatchCityId}
                valueLabel={form.cityName}
                placeholder={form.provinceId ? "Choose a city" : "Choose a province first"}
                searchPlaceholder="Search cities"
                emptyText="No city found. Try another spelling."
                invalid={!!errors.dispatchCityId}
                disabled={readOnly || !form.provinceId}
                load={loadCities}
                onChange={(o) => patch({ dispatchCityId: o?.id ?? "", cityName: o?.label ?? "" })}
              />
            </F>
            <F label="Days to dispatch an order" id="avgDispatchDays" errors={errors} hint="On average, from order to handing over.">
              <input
                id="avgDispatchDays"
                className={fieldClass}
                inputMode="numeric"
                placeholder="e.g. 3"
                value={form.avgDispatchDays}
                onChange={(e) => patch({ avgDispatchDays: e.target.value.replace(/\D/g, "").slice(0, 2) })}
              />
            </F>
            <F label="Postal code" id="postalCode" errors={errors}>
              <input
                id="postalCode"
                className={fieldClass}
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="e.g. 54000"
                value={form.postalCode}
                onChange={(e) => patch({ postalCode: e.target.value.replace(/\D/g, "").slice(0, 10) })}
              />
            </F>
            <F label="Business address" id="address" errors={errors} className="sm:col-span-2" hint="Shop or office address, with area and city.">
              <input
                id="address"
                className={fieldClass}
                autoComplete="street-address"
                maxLength={300}
                placeholder="e.g. Shop 12, Liberty Market, Gulberg, Lahore"
                value={form.address}
                onChange={(e) => patch({ address: e.target.value })}
              />
            </F>
          </Grid>
        </Section>

        {/* ---------- 3. Tax ---------- */}
        <Section n={3} title="Tax" note={data.prefill.taxSaved ? "Saved. For your safety only the last 4 digits are shown. Type a new number to change it." : undefined}>
          <div>
            <div className="mb-1.5 text-[13px] text-muted-foreground">Tax status</div>
            <div className="flex flex-wrap gap-2">
              {data.options.taxStatuses.map((t) => (
                <label
                  key={t}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2 text-sm",
                    form.taxStatus === t ? "border-primary bg-secondary" : "border-input bg-white hover:bg-muted",
                  )}
                >
                  <input type="radio" name="taxStatus" checked={form.taxStatus === t} onChange={() => patch({ taxStatus: t, ...(t === "UNREGISTERED" ? { ntn: "" } : {}) })} />
                  {t === "REGISTERED" ? "Registered (I have an NTN)" : "Not registered"}
                </label>
              ))}
            </div>
          </div>
          <Grid>
            <F label="CNIC" id="cnic" errors={errors}>
              <input
                id="cnic"
                className={cn(fieldClass, data.prefill.taxSaved && onFileClass)}
                inputMode="numeric"
                autoComplete="off"
                placeholder={data.prefill.taxSaved ? `On file ${data.prefill.onFile.cnic ?? ""}`.trim() : "35202-1234567-1"}
                value={form.cnic}
                onChange={(e) => patch({ cnic: formatCnic(e.target.value) })}
              />
            </F>
            {form.taxStatus === "REGISTERED" && (
              <F label="NTN" id="ntn" errors={errors}>
                <input
                  id="ntn"
                  className={cn(fieldClass, data.prefill.taxSaved && onFileClass)}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder={data.prefill.taxSaved ? `On file ${data.prefill.onFile.ntn ?? ""}`.trim() : "1234567-8"}
                  value={form.ntn}
                  onChange={(e) => patch({ ntn: formatNtn(e.target.value) })}
                />
              </F>
            )}
          </Grid>
        </Section>

        {/* ---------- 4. Bank ---------- */}
        <Section n={4} title="Bank account for payouts" note={data.prefill.bankSaved ? "Saved. Only the last 4 digits of the account are shown. Type the full number to change it." : undefined}>
          <Grid>
            <F label="Bank name" id="bankName" errors={errors}>
              <input id="bankName" className={fieldClass} placeholder={data.prefill.bankSaved ? data.prefill.onFile.bankName ?? "On file" : "e.g. HBL"} value={form.bankName} onChange={(e) => patch({ bankName: e.target.value })} />
            </F>
            <F label="Account title" id="accountTitle" errors={errors} hint="Should match your registered business name.">
              <input id="accountTitle" className={fieldClass} placeholder={data.prefill.bankSaved ? data.prefill.onFile.accountTitle ?? "On file" : ""} value={form.accountTitle} onChange={(e) => patch({ accountTitle: e.target.value })} />
            </F>
            <F label="Account number" id="accountNumber" errors={errors}>
              <input
                id="accountNumber"
                className={cn(fieldClass, data.prefill.bankSaved && onFileClass)}
                inputMode="numeric"
                autoComplete="off"
                placeholder={data.prefill.bankSaved ? `On file ${data.prefill.onFile.accountNumber ?? ""}`.trim() : "01234567890123"}
                value={form.accountNumber}
                onChange={(e) => patch({ accountNumber: e.target.value.replace(/\D/g, "").slice(0, 24) })}
              />
            </F>
            <F label="IBAN (optional)" id="iban" errors={errors}>
              <input
                id="iban"
                className={cn(fieldClass, data.prefill.onFile.hasIban && onFileClass)}
                autoComplete="off"
                placeholder={data.prefill.onFile.hasIban ? "On file" : "PK36MEZN0001234567890123"}
                value={form.iban}
                onChange={(e) => patch({ iban: e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 24) })}
              />
            </F>
          </Grid>
        </Section>

        {/* ---------- 5. Brands ---------- */}
        <Section n={5} title="Brand" note="JPG, PNG or WEBP images, up to 5 MB.">
          {form.brands.slice(0, 1).map((b, i) => (
            <div key={b.id} className="flex flex-col gap-4">
              <BrandBanner
                brand={b}
                disabled={readOnly}
                onPick={(file) => {
                  const problem = fileProblem(file, true);
                  if (problem) return toast({ title: problem, variant: "destructive" });
                  setBrand(i, { bannerFile: file, bannerKey: null, bannerPreview: URL.createObjectURL(file) });
                }}
                onRemove={() => setBrand(i, { bannerFile: undefined, bannerKey: null, bannerPreview: null })}
              />
              <div className="flex flex-col gap-4 sm:flex-row">
                <BrandLogo
                  brand={b}
                  onPick={(file) => {
                    const problem = fileProblem(file, true);
                    if (problem) return toast({ title: problem, variant: "destructive" });
                    setBrand(i, { logoFile: file, logoKey: null, logoPreview: URL.createObjectURL(file) });
                  }}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <F label="Brand name" id={`brand.${i}.name`} errors={errors}>
                    <input
                      id={`brand.${i}.name`}
                      className={fieldClass}
                      value={b.name}
                      // The slug follows the name; a saved slug stays until the name is edited.
                      onChange={(e) => setBrand(i, { name: e.target.value, slug: slugify(e.target.value) })}
                    />
                  </F>
                  <F label="Slug" id={`brand.${i}.slug`} errors={errors} hint="Made from the brand name. Used in your brand's web address.">
                    <input
                      id={`brand.${i}.slug`}
                      className={cn(fieldClass, "bg-muted text-muted-foreground")}
                      value={b.slug || slugify(b.name)}
                      placeholder="Type a brand name"
                      readOnly
                      tabIndex={-1}
                    />
                  </F>
                  <F label="Brand story (optional)" id={`brand.${i}.story`} errors={errors}>
                    <textarea
                      id={`brand.${i}.story`}
                      rows={3}
                      maxLength={500}
                      className={fieldClass}
                      placeholder="e.g. Handmade lawn from Lahore."
                      value={b.story}
                      onChange={(e) => setBrand(i, { story: e.target.value })}
                    />
                  </F>
                </div>
              </div>
            </div>
          ))}
          {errors.brands && <p className="m-0 text-xs text-destructive">{errors.brands}</p>}
        </Section>

        {/* ---------- 6. Documents ---------- */}
        <Section n={6} title="Documents" note="JPG, PNG, WEBP or PDF, up to 5 MB each.">
          {!form.businessTypeCode ? (
            <Muted>Choose your business type above to see which documents you need.</Muted>
          ) : (
          <Grid>
              {[...required, ...optional].map((t) => (
                <F
                  key={t}
                  id={`doc.${t}`}
                  label={`${DOCUMENT_LABELS[t]}${required.includes(t) ? "" : " (optional)"}`}
                  errors={{ ...errors, [`doc.${t}`]: errors[`doc.${t}`] ?? (rejected.has(t) ? `Rejected: ${rejected.get(t) ?? "upload a new file"}` : undefined) }}
                  hint={DOCUMENT_HINTS[t]}
                >
                  <DocTile
                    id={`doc.${t}`}
                    slot={form.documents[t]}
                    invalid={!!errors[`doc.${t}`] || rejected.has(t)}
                    disabled={readOnly}
                    onPick={(f) => pickDoc(t, f)}
                    onRemove={required.includes(t) ? undefined : () => removeDoc(t)}
                  />
                </F>
              ))}
          </Grid>
          )}

        </Section>

        {/* ---------- 7. Declaration ---------- */}
        <Section n={7} title="Declaration">
          <Check
            id="agreementRead"
            checked={form.agreementRead}
            error={errors.agreementRead}
            onChange={(v) => patch({ agreementRead: v })}
          >
            I have read and accept the Aariy seller agreement
            {data.options.agreement?.version ? ` (version ${data.options.agreement.version})` : ""}.
          </Check>
          <Check
            id="informationConfirmed"
            checked={form.informationConfirmed}
            error={errors.informationConfirmed}
            onChange={(v) => patch({ informationConfirmed: v })}
          >
            The information and documents I have given are true and correct.
          </Check>
        </Section>
      </fieldset>

      {!readOnly && (
        <div className="flex flex-wrap items-center justify-end gap-3 pb-4">
          <Muted>
            {complete
              ? "Aariy reviews your details after you submit, usually in 2 to 3 business days."
              : "Fill in every required field to submit for approval. You can save and come back any time."}
          </Muted>
          {actions}
        </div>
      )}
    </form>
  );
}

/* ---------------- Small layout pieces ---------------- */

function Section({ n, title, note, children }: { n: number; title: string; note?: string; children: React.ReactNode }) {
  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <PanelTitle className="mb-0 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary">{n}</span>
          {title}
        </PanelTitle>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </div>
      {children}
    </Panel>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

/** Field with its error looked up by id, plus an optional hint under it. */
function F({
  label,
  id,
  errors,
  hint,
  className,
  children,
}: {
  label: string;
  id: string;
  errors: FormErrors;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div data-err={id} className={className}>
      <Field label={label} htmlFor={id} error={errors[id]}>
        {children}
        {hint && !errors[id] && <p className="mb-0 mt-1 text-xs text-muted-foreground">{hint}</p>}
      </Field>
    </div>
  );
}

function Check({
  id,
  checked,
  error,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  error?: string;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div data-err={id}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-sm">
        <input id={id} type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span>{children}</span>
      </label>
      {error && <p className="mb-0 ml-6 mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** Wide image at the top of the brand page. Recommended 1600 x 400. */
function BrandBanner({
  brand,
  disabled,
  onPick,
  onRemove,
}: {
  brand: BrandDraft;
  disabled?: boolean;
  onPick: (f: File) => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="mb-1.5 text-[13px] text-muted-foreground">Banner image (optional)</div>
      {brand.bannerPreview ? (
        <div className="relative overflow-hidden rounded-xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brand.bannerPreview} alt="Banner preview" className="aspect-[4/1] w-full object-cover" />
          {!disabled && (
            <div className="absolute bottom-2 right-2 flex gap-2">
              <Btn type="button" className="bg-white/95" onClick={() => ref.current?.click()}>
                Change
              </Btn>
              <Btn type="button" className="bg-white/95" onClick={onRemove}>
                Remove
              </Btn>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => ref.current?.click()}
          className="flex aspect-[4/1] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#D9805B] bg-[#FFF6F2] text-sm hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ImagePlus className="h-5 w-5 text-primary" />
          <span>Upload banner</span>
          <span className="text-xs text-muted-foreground">Wide image, 1600 × 400 works best</span>
        </button>
      )}
      {brand.bannerFile && !brand.bannerKey && <p className="mb-0 mt-1 text-xs text-muted-foreground">Uploads when you save</p>}
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function BrandLogo({ brand, onPick }: { brand: BrandDraft; onPick: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:items-start">
      <Thumb src={brand.logoPreview ?? undefined} className="rounded-full" />
      <button type="button" className="cursor-pointer text-[13px] text-primary hover:underline disabled:opacity-50" onClick={() => ref.current?.click()}>
        {brand.logoPreview ? "Change logo" : "Add logo"}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
