"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { formatLongDate } from "@/features/orders/orders.helpers";
import { useOrdersStore } from "@/features/orders/orders.store";
import {
  Btn,
  EmptyState,
  Field,
  Muted,
  PageHeader,
  Panel,
  PanelTitle,
  Thumb,
  fieldClass,
} from "@/shared/ui/seller";
import { useBrandProfileStore } from "../brand-profile.store";
import { PickupAddress, ProfileResult, PublicField, PublicProfile } from "../brand-profile.types";
import {
  PublicErrors,
  STOREFRONT_BRAND_URL,
  bankStatusLabelMap,
  bankStatusToneMap,
  businessTypeLabelMap,
  diffPublic,
  isValidNtn,
  isValidStrn,
  maskedIban,
  publicFieldLabelMap,
  validatePublic,
  withPending,
} from "../brand-profile.helpers";
import { AddressModal } from "./AddressModal";
import { BankModal } from "./BankModal";
import { KybDocumentsCard, KybDraft, emptyKybDraft, kybDraftCount } from "./KybDocumentsCard";

const notify = (res: ProfileResult) => toast({ title: res.message, variant: res.success ? "default" : "destructive" });

export default function BrandProfilePage() {
  const { profile, loading, saving, error, fetchProfile, submitPublic, submitKyb } = useBrandProfileStore();
  const [draft, setDraft] = useState<PublicProfile | null>(null);
  const [errors, setErrors] = useState<PublicErrors>({});
  const [kybDraft, setKybDraft] = useState<KybDraft>(emptyKybDraft);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Start the form from what the seller last asked for (live + pending).
  useEffect(() => {
    if (profile && !draft) setDraft(withPending(profile));
  }, [profile, draft]);

  // Number of public fields edited on this page, not yet sent.
  const publicChanges = useMemo(
    () => (profile && draft ? Object.keys(diffPublic(withPending(profile), draft)).length : 0),
    [profile, draft],
  );
  const docChanges = kybDraftCount(kybDraft);
  const unsaved = publicChanges + docChanges;

  // Warn before leaving with changes that were never submitted.
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  if (!profile || !draft) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Brand profile" />
        {error ? <p className="text-sm text-destructive">{error}</p> : loading && <Skeleton className="h-64 w-full rounded-2xl" />}
      </div>
    );
  }

  const pendingFields = Object.keys(profile.pending?.values ?? {}) as PublicField[];
  const patch = (p: Partial<PublicProfile>) => setDraft((d) => (d ? { ...d, ...p } : d));

  /** One button sends everything changed on this page: public brand page edits and documents. */
  const handleSubmit = async () => {
    if (publicChanges) {
      const errs = validatePublic(draft);
      setErrors(errs);
      if (Object.keys(errs).length) {
        toast({ title: "Please fix the highlighted fields.", variant: "destructive" });
        return;
      }
      const res = await submitPublic(draft);
      if (!res.success) {
        notify(res);
        return;
      }
    }
    if (docChanges) {
      const res = await submitKyb(kybDraft);
      if (!res.success) {
        notify(res);
        return;
      }
      setKybDraft(emptyKybDraft());
    }
    toast({
      title: `${unsaved} change${unsaved > 1 ? "s" : ""} sent to Aariy for review`,
      description: "You will get an email once they are checked.",
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Brand profile">
        <span className={cn("text-[13px]", unsaved ? "text-[#8A5A00]" : "text-muted-foreground")}>
          {unsaved ? `${unsaved} unsaved change${unsaved > 1 ? "s" : ""}` : "No unsaved changes"}
        </span>
        <Btn
          primary
          onClick={handleSubmit}
          disabled={saving || !unsaved}
          title={unsaved ? undefined : "Edit your brand page or documents first"}
        >
          {saving ? "Submitting..." : "Submit changes"}
        </Btn>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PublicCard draft={draft} errors={errors} pendingFields={pendingFields} submittedAt={profile.pending?.submittedAt} onChange={patch} />
        <LegalCard />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AddressesCard addresses={profile.addresses} />
        <BankCard />
      </div>

      <KybDocumentsCard draft={kybDraft} onChange={setKybDraft} />
    </div>
  );
}

/* ---------------- Public brand page ---------------- */

function PublicCard({
  draft,
  errors,
  pendingFields,
  submittedAt,
  onChange,
}: {
  draft: PublicProfile;
  errors: PublicErrors;
  pendingFields: PublicField[];
  submittedAt?: string;
  onChange: (p: Partial<PublicProfile>) => void;
}) {
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  // TODO(api): upload to storage and keep the returned URL instead of a local preview.
  const pickImage = (files: FileList | null, field: "logoUrl" | "bannerUrl") => {
    const f = files?.[0];
    if (f && f.type.startsWith("image/")) onChange({ [field]: URL.createObjectURL(f) });
  };

  const n = pendingFields.length;

  return (
    <Panel className="flex flex-col gap-3 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PanelTitle className="mb-0">Public brand page</PanelTitle>
        {n > 0 ? (
          <StatusBadge tone="warning">
            {n} change{n > 1 ? "s" : ""} under review
          </StatusBadge>
        ) : (
          <StatusBadge tone="success">Live</StatusBadge>
        )}
      </div>

      {draft.bannerUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={draft.bannerUrl} alt="Banner preview" className="h-28 w-full rounded-xl object-cover" />
      )}

      <div className="flex flex-wrap gap-3">
        <Field label="Brand name" htmlFor="bn" error={errors.brandName} className="min-w-[180px] flex-1">
          <input id="bn" className={fieldClass} value={draft.brandName} onChange={(e) => onChange({ brandName: e.target.value })} />
        </Field>
        <Field label="Page URL" htmlFor="sl" error={errors.slug} className="min-w-[180px] flex-1">
          <input
            id="sl"
            className={fieldClass}
            value={draft.slug}
            onChange={(e) => onChange({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
          />
          {!errors.slug && <p className="mb-0 mt-1 text-xs text-muted-foreground">{STOREFRONT_BRAND_URL + draft.slug}</p>}
        </Field>
      </div>
      <Field label="Brand story" htmlFor="st" error={errors.story}>
        <textarea id="st" rows={3} className={fieldClass} value={draft.story} onChange={(e) => onChange({ story: e.target.value })} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Thumb src={draft.logoUrl ?? undefined} className="rounded-full" />
        <Btn onClick={() => logoRef.current?.click()}>Upload logo</Btn>
        <Btn onClick={() => bannerRef.current?.click()}>Upload banner</Btn>
        <input ref={logoRef} type="file" accept="image/*" hidden onChange={(e) => { pickImage(e.target.files, "logoUrl"); e.target.value = ""; }} />
        <input ref={bannerRef} type="file" accept="image/*" hidden onChange={(e) => { pickImage(e.target.files, "bannerUrl"); e.target.value = ""; }} />
      </div>
      <Muted>
        Public changes are checked by Aariy staff before they show.
        {n > 0 && submittedAt && (
          <>
            {" "}
            Under review since {formatLongDate(submittedAt)}: {pendingFields.map((f) => publicFieldLabelMap[f]).join(", ")}.
          </>
        )}
      </Muted>
    </Panel>
  );
}

/* ---------------- Legal details ---------------- */

function LegalCard() {
  const { profile, saving, addNtn } = useBrandProfileStore();
  const [ntn, setNtn] = useState("");
  const [ntnError, setNtnError] = useState<string>();
  if (!profile) return null;
  const { legal } = profile;

  const handleNtn = async () => {
    if (!isValidNtn(ntn)) {
      setNtnError("Enter a valid NTN, e.g. 1234567-8.");
      return;
    }
    setNtnError(undefined);
    const res = await addNtn(ntn);
    notify(res);
    if (res.success) setNtn("");
  };

  return (
    <Panel className="flex flex-col gap-3">
      <PanelTitle className="mb-0">Legal details</PanelTitle>
      <div>
        <StatusBadge tone="info">Locked after approval</StatusBadge>
      </div>
      <div className="text-[13px] leading-6 text-muted-foreground">
        Legal name: {legal.legalName}
        <br />
        Business type: {businessTypeLabelMap[legal.businessType]}
        <br />
        Email: {legal.email}
        <br />
        Phone: {legal.phoneMasked}
        <br />
        NTN: {legal.ntnMasked ?? <span className="text-[#8A5A00]">Not added</span>}
        <br />
        STRN: {legal.strnMasked ?? "Not registered for sales tax"}
        <br />
        CNIC / SSN: {legal.cnicMasked}
      </div>
      {!legal.ntnMasked && (
        <div className="flex flex-col gap-2">
          <Field label="Add your NTN to receive payouts" htmlFor="ntn" error={ntnError}>
            <input
              id="ntn"
              inputMode="numeric"
              autoComplete="off"
              className={fieldClass}
              placeholder="1234567-8"
              value={ntn}
              onChange={(e) => setNtn(e.target.value)}
            />
          </Field>
          <div>
            <Btn onClick={handleNtn} disabled={saving || !ntn.trim()}>
              Save NTN
            </Btn>
          </div>
          <Muted>Once saved, the NTN is locked. Contact Aariy to change it.</Muted>
        </div>
      )}
      {!legal.strnMasked && <StrnForm />}
    </Panel>
  );
}

/** STRN is optional: only sellers registered for sales tax add it. */
function StrnForm() {
  const { saving, addStrn } = useBrandProfileStore();
  const [open, setOpen] = useState(false);
  const [strn, setStrn] = useState("");
  const [err, setErr] = useState<string>();

  if (!open) {
    return (
      <button type="button" className="cursor-pointer self-start text-[13px] text-primary hover:underline" onClick={() => setOpen(true)}>
        Registered for sales tax? Add STRN
      </button>
    );
  }

  const handleSave = async () => {
    if (!isValidStrn(strn)) {
      setErr("Enter a valid 13-digit STRN.");
      return;
    }
    setErr(undefined);
    const res = await addStrn(strn);
    notify(res);
    if (res.success) setOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <Field label="STRN (sales tax registration number)" htmlFor="strn" error={err}>
        <input
          id="strn"
          inputMode="numeric"
          autoComplete="off"
          className={fieldClass}
          placeholder="17-00-1234-567-89"
          value={strn}
          onChange={(e) => setStrn(e.target.value)}
        />
      </Field>
      <div className="flex gap-2">
        <Btn onClick={handleSave} disabled={saving || !strn.trim()}>
          Save STRN
        </Btn>
        <Btn onClick={() => setOpen(false)}>Cancel</Btn>
      </div>
    </div>
  );
}

/* ---------------- Pickup addresses ---------------- */

function AddressesCard({ addresses }: { addresses: PickupAddress[] }) {
  const { saving, setDefaultAddress, removeAddress } = useBrandProfileStore();
  const parcels = useOrdersStore((s) => s.parcels);
  const fetchParcels = useOrdersStore((s) => s.fetchParcels);
  const [modal, setModal] = useState<{ open: boolean; address: PickupAddress | null }>({ open: false, address: null });
  const [toRemove, setToRemove] = useState<PickupAddress | null>(null);

  // Needed to know whether an address is still used by parcels waiting for pickup.
  useEffect(() => {
    fetchParcels();
  }, [fetchParcels]);

  const inUse = (id: string) =>
    parcels.some((p) => p.pickupAddressId === id && (p.status === "ACCEPTED" || p.status === "READY_FOR_PICKUP"));

  return (
    <Panel className="flex flex-col gap-3 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PanelTitle className="mb-0">Pickup addresses</PanelTitle>
        <Btn onClick={() => setModal({ open: true, address: null })}>Add address</Btn>
      </div>
      {addresses.length === 0 && <EmptyState>Add an address so the courier knows where to collect parcels.</EmptyState>}
      {addresses.map((a) => (
        <div key={a.id} className={cn("rounded-[10px] px-3 py-2.5", a.isDefault && "bg-muted/60")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-medium">{a.label}</span>
            <StatusBadge tone={a.isDefault ? "success" : "info"}>{a.isDefault ? "Default" : "Active"}</StatusBadge>
          </div>
          <Muted>
            {a.address}, {a.city}
            {a.contactName && <> · {a.contactName}</>}
            {a.phone && <> · {a.phone}</>}
          </Muted>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            <button type="button" className="cursor-pointer text-primary hover:underline" onClick={() => setModal({ open: true, address: a })}>
              Edit
            </button>
            {!a.isDefault && (
              <>
                <button
                  type="button"
                  disabled={saving}
                  className="cursor-pointer text-primary hover:underline disabled:opacity-50"
                  onClick={async () => notify(await setDefaultAddress(a.id))}
                >
                  Make default
                </button>
                <button
                  type="button"
                  disabled={saving}
                  className="cursor-pointer text-destructive hover:underline disabled:opacity-50"
                  onClick={() => setToRemove(a)}
                >
                  Remove
                </button>
              </>
            )}
          </div>
        </div>
      ))}

      <AddressModal open={modal.open} address={modal.address} onClose={() => setModal({ open: false, address: null })} />
      <ConfirmDialog
        open={!!toRemove}
        title={`Remove ${toRemove?.label}?`}
        description="The courier will no longer collect parcels from this address."
        confirmLabel="Remove"
        destructive
        loading={saving}
        onClose={() => setToRemove(null)}
        onConfirm={async () => {
          if (!toRemove) return;
          const res = await removeAddress(toRemove.id, inUse(toRemove.id));
          setToRemove(null);
          notify(res);
        }}
      />
    </Panel>
  );
}

/* ---------------- Bank account ---------------- */

function BankCard() {
  const bank = useBrandProfileStore((s) => s.profile?.bank ?? null);
  const [open, setOpen] = useState(false);

  return (
    <Panel className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PanelTitle className="mb-0">Bank account</PanelTitle>
        {bank ? (
          <StatusBadge tone={bankStatusToneMap[bank.status]}>{bankStatusLabelMap[bank.status]}</StatusBadge>
        ) : (
          <StatusBadge tone="danger">Not added</StatusBadge>
        )}
      </div>
      {bank ? (
        <Muted>
          {bank.bankName} · {bank.accountNumberMasked ? `Account ${bank.accountNumberMasked}` : maskedIban(bank.ibanLast4)}
          <br />
          {bank.accountTitle}
        </Muted>
      ) : (
        <Muted>Add a bank account to receive payouts.</Muted>
      )}
      <div>
        <Btn onClick={() => setOpen(true)}>{bank ? "Change account" : "Add account"}</Btn>
      </div>
      <Muted>Changes are re-verified before payouts.</Muted>
      <BankModal open={open} onClose={() => setOpen(false)} />
    </Panel>
  );
}
