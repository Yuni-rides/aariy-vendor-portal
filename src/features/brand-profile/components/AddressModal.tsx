"use client";

import { FormEvent, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/hooks/useToast";
import { Btn, Field, fieldClass } from "@/shared/ui/seller";
import { useBrandProfileStore } from "../brand-profile.store";
import { AddressInput, PickupAddress } from "../brand-profile.types";
import { AddressErrors, PK_CITIES, validateAddress } from "../brand-profile.helpers";

type Props = {
  open: boolean;
  /** Address being edited, or null to add a new one. */
  address: PickupAddress | null;
  onClose: () => void;
};

export function AddressModal({ open, address, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} className="h-auto max-h-[90vh] max-w-lg overflow-y-auto">
      {/* Remount the form for each address so it starts from that address. */}
      {open && <AddressForm key={address?.id ?? "new"} address={address} onClose={onClose} />}
    </Modal>
  );
}

function AddressForm({ address, onClose }: { address: PickupAddress | null; onClose: () => void }) {
  const { saving, saveAddress } = useBrandProfileStore();
  const [form, setForm] = useState<AddressInput>({
    label: address?.label ?? "",
    address: address?.address ?? "",
    city: address?.city ?? "",
    contactName: address?.contactName ?? "",
    phone: address?.phone ?? "",
  });
  const [errors, setErrors] = useState<AddressErrors>({});
  const patch = (p: Partial<AddressInput>) => setForm((f) => ({ ...f, ...p }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateAddress(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const res = await saveAddress(address?.id ?? null, form);
    toast({ title: res.message, variant: res.success ? "default" : "destructive" });
    if (res.success) onClose();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 rounded-2xl bg-white p-6 shadow-lg">
      <h2 className="m-0 text-lg font-semibold">{address ? "Edit pickup address" : "Add pickup address"}</h2>
      <Field label="Name" htmlFor="al" error={errors.label}>
        <input id="al" className={fieldClass} placeholder="Main store" value={form.label} onChange={(e) => patch({ label: e.target.value })} />
      </Field>
      <Field label="Address" htmlFor="aa" error={errors.address}>
        <input id="aa" className={fieldClass} value={form.address} onChange={(e) => patch({ address: e.target.value })} />
      </Field>
      <Field label="City" htmlFor="ac" error={errors.city}>
        <select id="ac" className={fieldClass} value={form.city} onChange={(e) => patch({ city: e.target.value })}>
          <option value="">Select a city</option>
          {PK_CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <div className="flex flex-wrap gap-3">
        <Field label="Contact person" htmlFor="an" error={errors.contactName} className="min-w-[160px] flex-1">
          <input id="an" className={fieldClass} value={form.contactName} onChange={(e) => patch({ contactName: e.target.value })} />
        </Field>
        <Field label="Contact phone" htmlFor="ap" error={errors.phone} className="min-w-[160px] flex-1">
          <input
            id="ap"
            inputMode="tel"
            className={fieldClass}
            placeholder="0300 1234567"
            value={form.phone}
            onChange={(e) => patch({ phone: e.target.value })}
          />
        </Field>
      </div>
      <div className="mt-2 flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn primary type="submit" disabled={saving}>
          {address ? "Save address" : "Add address"}
        </Btn>
      </div>
    </form>
  );
}
