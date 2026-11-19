"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { PK_BANKS, PK_CITIES } from "@/features/brand-profile/brand-profile.helpers";
import { Btn, Field, Muted, fieldClass } from "@/shared/ui/seller";
import { DocKey, OnboardingDraft, OtherDoc, StepErrors, StepKey, UploadedDoc } from "../onboarding.types";
import { UploadTile } from "./UploadTile";
import {
  BUSINESS_TYPE_OPTIONS,
  DOCS,
  DOC_TYPES,
  DOC_TYPES_LABEL,
  MAX_OTHER_DOCS,
  MAX_DOC_BYTES,
  SELLER_AGREEMENT,
  docsRequired,
} from "../onboarding.helpers";

type StepProps = {
  draft: OnboardingDraft;
  errors: StepErrors;
  onChange: (next: OnboardingDraft) => void;
};

export function StepForm({ step, ...props }: StepProps & { step: StepKey }) {
  switch (step) {
    case "businessType":
      return <BusinessTypeStep {...props} />;
    case "about":
      return <AboutStep {...props} />;
    case "business":
      return <BusinessStep {...props} />;
    case "brands":
      return <BrandsStep {...props} />;
    case "tax":
      return <TaxStep {...props} />;
    case "payout":
      return <PayoutStep {...props} />;
    case "documents":
      return <DocumentsStep {...props} />;
    case "declaration":
      return <DeclarationStep {...props} />;
  }
}

/* ---------------- 1. Business type ---------------- */

function BusinessTypeStep({ draft, errors, onChange }: StepProps) {
  return (
    <div className="flex flex-col gap-3" role="radiogroup" aria-label="Business type">
      {BUSINESS_TYPE_OPTIONS.map((o) => {
        const on = draft.businessType === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange({ ...draft, businessType: o.value })}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-left",
              on ? "border-primary bg-secondary" : "border-input bg-white hover:bg-muted",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                on ? "border-primary bg-primary text-white" : "border-input",
              )}
            >
              {on && <Check className="h-3 w-3" />}
            </span>
            <span>
              <span className="block font-medium">{o.label}</span>
              <span className="block text-[13px] text-muted-foreground">{o.hint}</span>
            </span>
          </button>
        );
      })}
      {errors.businessType && <p className="m-0 text-xs text-destructive">{errors.businessType}</p>}
    </div>
  );
}

/* ---------------- 2. About you ---------------- */

function AboutStep({ draft, errors, onChange }: StepProps) {
  const set = (p: Partial<OnboardingDraft["about"]>) => onChange({ ...draft, about: { ...draft.about, ...p } });
  const a = draft.about;
  return (
    <div className="flex flex-col gap-3">
      <Field label="Full name (as on CNIC)" htmlFor="o-name" error={errors.fullName}>
        <input id="o-name" className={fieldClass} value={a.fullName} onChange={(e) => set({ fullName: e.target.value })} />
      </Field>
      <Field label="CNIC / SSN number" htmlFor="o-cnic" error={errors.cnic}>
        <input
          id="o-cnic"
          inputMode="numeric"
          autoComplete="off"
          placeholder="12345-1234567-1"
          className={fieldClass}
          value={a.cnic}
          onChange={(e) => set({ cnic: e.target.value })}
        />
      </Field>
      <div className="flex flex-wrap gap-3">
        <Field label="Mobile number" htmlFor="o-phone" error={errors.phone} className="min-w-[180px] flex-1">
          <input id="o-phone" type="tel" placeholder="+92 300 1234567" className={fieldClass} value={a.phone} onChange={(e) => set({ phone: e.target.value })} />
        </Field>
        <Field label="Email" htmlFor="o-email" error={errors.email} className="min-w-[180px] flex-1">
          <input id="o-email" type="email" className={fieldClass} value={a.email} onChange={(e) => set({ email: e.target.value })} />
        </Field>
      </div>
      <Field label="Your role in the business (optional)" htmlFor="o-role">
        <input
          id="o-role"
          placeholder="Owner, director, partner..."
          className={fieldClass}
          value={a.designation}
          onChange={(e) => set({ designation: e.target.value })}
        />
      </Field>
    </div>
  );
}

/* ---------------- 3. Business ---------------- */

function BusinessStep({ draft, errors, onChange }: StepProps) {
  const set = (p: Partial<OnboardingDraft["business"]>) => onChange({ ...draft, business: { ...draft.business, ...p } });
  const b = draft.business;
  const isCompany = draft.businessType === "COMPANY";
  return (
    <div className="flex flex-col gap-3">
      <Field
        label={draft.businessType === "SOLE_PROPRIETOR" ? "Business (trading) name" : "Registered business name"}
        htmlFor="o-legal"
        error={errors.legalName}
      >
        <input id="o-legal" className={fieldClass} value={b.legalName} onChange={(e) => set({ legalName: e.target.value })} />
      </Field>
      {draft.businessType !== "SOLE_PROPRIETOR" && (
        <Field
          label={isCompany ? "SECP incorporation number" : "Firm registration number (optional)"}
          htmlFor="o-reg"
          error={errors.registrationNumber}
        >
          <input id="o-reg" className={fieldClass} value={b.registrationNumber} onChange={(e) => set({ registrationNumber: e.target.value })} />
        </Field>
      )}
      <Field label="Business address" htmlFor="o-addr" error={errors.address}>
        <input id="o-addr" className={fieldClass} value={b.address} onChange={(e) => set({ address: e.target.value })} />
      </Field>
      <div className="flex flex-wrap gap-3">
        <Field label="City" htmlFor="o-city" error={errors.city} className="min-w-[180px] flex-1">
          <select id="o-city" className={fieldClass} value={b.city} onChange={(e) => set({ city: e.target.value })}>
            <option value="">Select a city</option>
            {PK_CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Website or Instagram (optional)" htmlFor="o-web" className="min-w-[180px] flex-1">
          <input id="o-web" className={fieldClass} value={b.website} onChange={(e) => set({ website: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

/* ---------------- 4. Brands ---------------- */

function BrandsStep({ draft, errors, onChange }: StepProps) {
  const setBrand = (id: string, p: Partial<OnboardingDraft["brands"][number]>) =>
    onChange({ ...draft, brands: draft.brands.map((b) => (b.id === id ? { ...b, ...p } : b)) });
  return (
    <div className="flex flex-col gap-3">
      <Muted>Aariy is launching with women’s ready-to-wear. Add every brand you plan to list.</Muted>
      {draft.brands.map((b, i) => (
        <div key={b.id} className="flex flex-wrap items-end gap-3 rounded-xl border border-border p-3">
          <Field label={`Brand ${i + 1}`} htmlFor={`o-b-${b.id}`} className="min-w-[160px] flex-1">
            <input id={`o-b-${b.id}`} className={fieldClass} value={b.name} onChange={(e) => setBrand(b.id, { name: e.target.value })} />
          </Field>
          <Field label="Your relation" htmlFor={`o-r-${b.id}`} className="min-w-[160px] flex-1">
            <select
              id={`o-r-${b.id}`}
              className={fieldClass}
              value={b.relation}
              onChange={(e) => setBrand(b.id, { relation: e.target.value as "OWNER" | "AUTHORISED" })}
            >
              <option value="OWNER">I own this brand</option>
              <option value="AUTHORISED">Authorised to sell it</option>
            </select>
          </Field>
          <button
            type="button"
            aria-label="Remove brand"
            className="mb-1 cursor-pointer rounded-lg p-2.5 text-muted-foreground hover:bg-muted hover:text-destructive"
            onClick={() => onChange({ ...draft, brands: draft.brands.filter((x) => x.id !== b.id) })}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      {errors.brands && <p className="m-0 text-xs text-destructive">{errors.brands}</p>}
      <div>
        <Btn
          onClick={() =>
            onChange({ ...draft, brands: [...draft.brands, { id: `b-${Date.now()}`, name: "", relation: "OWNER" }] })
          }
        >
          + Add brand
        </Btn>
      </div>
      {draft.brands.some((b) => b.relation === "AUTHORISED") && (
        <Muted>You will upload the brand owner’s authorisation letter in the Documents step.</Muted>
      )}
    </div>
  );
}

/* ---------------- 5. Tax ---------------- */

function TaxStep({ draft, errors, onChange }: StepProps) {
  const set = (p: Partial<OnboardingDraft["tax"]>) => onChange({ ...draft, tax: { ...draft.tax, ...p } });
  return (
    <div className="flex flex-col gap-3">
      <Field label="NTN (national tax number)" htmlFor="o-ntn" error={errors.ntn}>
        <input
          id="o-ntn"
          inputMode="numeric"
          autoComplete="off"
          placeholder="1234567-8"
          className={fieldClass}
          value={draft.tax.ntn}
          onChange={(e) => set({ ntn: e.target.value })}
        />
      </Field>
      <Field label="STRN (only if registered for sales tax)" htmlFor="o-strn" error={errors.strn}>
        <input
          id="o-strn"
          inputMode="numeric"
          autoComplete="off"
          placeholder="17-00-1234-567-89"
          className={fieldClass}
          value={draft.tax.strn}
          onChange={(e) => set({ strn: e.target.value })}
        />
      </Field>
      <Muted>Payouts need an NTN. Both numbers are encrypted and locked after approval.</Muted>
    </div>
  );
}

/* ---------------- 6. Payouts ---------------- */

function PayoutStep({ draft, errors, onChange }: StepProps) {
  const set = (p: Partial<OnboardingDraft["payout"]>) => onChange({ ...draft, payout: { ...draft.payout, ...p } });
  return (
    <div className="flex flex-col gap-3">
      <Field label="Bank" htmlFor="o-bank" error={errors.bankName}>
        <select id="o-bank" className={fieldClass} value={draft.payout.bankName} onChange={(e) => set({ bankName: e.target.value })}>
          <option value="">Select your bank</option>
          {PK_BANKS.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </Field>
      <Field label="Account title" htmlFor="o-title" error={errors.accountTitle}>
        <input id="o-title" className={fieldClass} value={draft.payout.accountTitle} onChange={(e) => set({ accountTitle: e.target.value })} />
      </Field>
      <Field label="IBAN" htmlFor="o-iban" error={errors.iban}>
        <input
          id="o-iban"
          autoComplete="off"
          placeholder="PK36 MEZN 0001 2345 6789 0123"
          className={fieldClass}
          value={draft.payout.iban}
          onChange={(e) => set({ iban: e.target.value.toUpperCase() })}
        />
      </Field>
      <Muted>The account title should match your business name. Aariy verifies the account before the first payout.</Muted>
    </div>
  );
}

/* ---------------- 7. Documents ---------------- */

function DocumentsStep({ draft, errors, onChange }: StepProps) {
  const required = docsRequired(draft);
  const others = draft.otherDocuments ?? [];
  const added = DOCS.filter((d) => draft.documents[d.key]).length;

  /** Checks type and size; returns the saved metadata or null. */
  const accept = (file: File | undefined): UploadedDoc | null => {
    if (!file) return null;
    if (!DOC_TYPES.includes(file.type)) {
      toast({ title: "Upload a JPG, PNG, WEBP or PDF file.", variant: "destructive" });
      return null;
    }
    if (file.size > MAX_DOC_BYTES) {
      toast({ title: "Files must be 5 MB or smaller.", variant: "destructive" });
      return null;
    }
    // TODO(api): upload to private storage (visible to Aariy admin roles only) and keep the returned id.
    return { name: file.name, size: file.size, type: file.type, uploadedAt: new Date().toISOString() };
  };

  const setDoc = (key: DocKey, doc: UploadedDoc | null) => {
    const documents = { ...draft.documents };
    if (doc) documents[key] = doc;
    else delete documents[key];
    onChange({ ...draft, documents });
  };

  const setOther = (id: string, p: Partial<OtherDoc>) =>
    onChange({ ...draft, otherDocuments: others.map((o) => (o.id === id ? { ...o, ...p } : o)) });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-sm font-semibold">KYB documents</div>
          <div className="text-xs text-muted-foreground">
            {added} of {DOCS.length} added · {DOC_TYPES_LABEL}
          </div>
        </div>
        <Muted>Only Aariy’s review team can see these files.</Muted>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          {DOCS.map((d) => {
            const isRequired = required.includes(d.key);
            return (
              <div key={d.key} className="min-w-0">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[13px] text-muted-foreground">
                  <span>{d.label}</span>
                  <span className="text-[11px]">{isRequired ? "Required" : "Optional"}</span>
                </div>
                <UploadTile
                  file={draft.documents[d.key] ?? null}
                  ariaLabel={`Upload ${d.label}`}
                  onPick={(f) => {
                    const doc = accept(f);
                    if (doc) setDoc(d.key, doc);
                  }}
                  onRemove={() => setDoc(d.key, null)}
                  invalid={!!errors[d.key]}
                />
                {errors[d.key] ? (
                  <p className="m-0 mt-1 text-xs text-destructive">{errors[d.key]}</p>
                ) : (
                  !isRequired && d.when && <p className="m-0 mt-1 text-xs text-muted-foreground">{d.when}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <div className="text-sm font-semibold">Other documents (optional)</div>
          <Muted>Anything else that supports the application, e.g. a trademark certificate.</Muted>
        </div>
        {others.map((o) => (
          <div key={o.id} className="grid grid-cols-1 items-start gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="Document name" htmlFor={`od-${o.id}`} error={errors[`other-${o.id}-label`]}>
              <input
                id={`od-${o.id}`}
                className={fieldClass}
                placeholder="Trademark certificate"
                value={o.label}
                onChange={(e) => setOther(o.id, { label: e.target.value })}
              />
            </Field>
            <div className="min-w-0">
              <div className="mb-1.5 text-[13px] text-muted-foreground">File</div>
              <UploadTile
                file={o.file}
                ariaLabel={`Upload ${o.label || "other document"}`}
                onPick={(f) => {
                  const doc = accept(f);
                  if (doc) setOther(o.id, { file: doc });
                }}
                onRemove={() => setOther(o.id, { file: null })}
                invalid={!!errors[`other-${o.id}-file`]}
              />
              {errors[`other-${o.id}-file`] && (
                <p className="m-0 mt-1 text-xs text-destructive">{errors[`other-${o.id}-file`]}</p>
              )}
            </div>
            <button
              type="button"
              aria-label="Remove document"
              className="cursor-pointer self-center rounded-lg p-2.5 text-muted-foreground hover:bg-muted hover:text-destructive sm:mt-6"
              onClick={() => onChange({ ...draft, otherDocuments: others.filter((x) => x.id !== o.id) })}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <div>
          <Btn
            disabled={others.length >= MAX_OTHER_DOCS}
            onClick={() =>
              onChange({ ...draft, otherDocuments: [...others, { id: `od-${Date.now()}`, label: "", file: null }] })
            }
          >
            <Plus className="h-4 w-4" /> Add other document
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 8. Declaration ---------------- */

function DeclarationStep({ draft, errors, onChange }: StepProps) {
  const set = (p: Partial<OnboardingDraft["declaration"]>) =>
    onChange({ ...draft, declaration: { ...draft.declaration, ...p } });
  const d = draft.declaration;

  const box = (key: "infoTrue" | "authenticProducts" | "agreementAccepted", label: React.ReactNode) => (
    <div>
      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#B8532F]"
          checked={d[key]}
          onChange={(e) => set({ [key]: e.target.checked })}
        />
        <span>{label}</span>
      </label>
      {errors[key] && <p className="m-0 ml-7 text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <div className="text-sm font-semibold">
          Aariy seller agreement {SELLER_AGREEMENT.version}
        </div>
        <div className="mb-2 text-xs text-muted-foreground">Effective {SELLER_AGREEMENT.effective}. Key points:</div>
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[13px] text-muted-foreground">
          {SELLER_AGREEMENT.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
      {box("infoTrue", "The information and documents I have given are true and complete.")}
      {box("authenticProducts", "My products are authentic and not on Aariy’s prohibited products list.")}
      {box("agreementAccepted", <>I have read and accept the Aariy seller agreement {SELLER_AGREEMENT.version}.</>)}
      <Field label="Type your full name to sign" htmlFor="o-sign" error={errors.signatureName}>
        <input id="o-sign" className={fieldClass} value={d.signatureName} onChange={(e) => set({ signatureName: e.target.value })} />
      </Field>
      <Muted>The agreement version and the time you accept it are saved with your account.</Muted>
    </div>
  );
}
