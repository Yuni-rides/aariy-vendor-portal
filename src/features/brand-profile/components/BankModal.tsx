"use client";

import { FormEvent, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/hooks/useToast";
import { Btn, Field, Muted, fieldClass } from "@/shared/ui/seller";
import { useBrandProfileStore } from "../brand-profile.store";
import { BankInput } from "../brand-profile.types";
import { BankErrors, PK_BANKS, validateBank } from "../brand-profile.helpers";

export function BankModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} className="h-auto max-h-[90vh] max-w-lg overflow-y-auto">
      {open && <BankForm onClose={onClose} />}
    </Modal>
  );
}

function BankForm({ onClose }: { onClose: () => void }) {
  const { saving, changeBank } = useBrandProfileStore();
  const [form, setForm] = useState<BankInput>({ bankName: "", accountTitle: "", iban: "" });
  const [errors, setErrors] = useState<BankErrors>({});
  const patch = (p: Partial<BankInput>) => setForm((f) => ({ ...f, ...p }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateBank(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const res = await changeBank(form);
    toast({ title: res.message, variant: res.success ? "default" : "destructive" });
    if (res.success) onClose();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 rounded-2xl bg-white p-6 shadow-lg">
      <h2 className="m-0 text-lg font-semibold">Change bank account</h2>
      <Field label="Bank" htmlFor="bb" error={errors.bankName}>
        <select id="bb" className={fieldClass} value={form.bankName} onChange={(e) => patch({ bankName: e.target.value })}>
          <option value="">Select your bank</option>
          {PK_BANKS.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </Field>
      <Field label="Account title" htmlFor="bt" error={errors.accountTitle}>
        <input id="bt" className={fieldClass} value={form.accountTitle} onChange={(e) => patch({ accountTitle: e.target.value })} />
      </Field>
      <Field label="IBAN" htmlFor="bi" error={errors.iban}>
        <input
          id="bi"
          autoComplete="off"
          className={fieldClass}
          placeholder="PK36 MEZN 0001 2345 6789 0123"
          value={form.iban}
          onChange={(e) => patch({ iban: e.target.value.toUpperCase() })}
        />
      </Field>
      <Muted>
        The account title should match your legal name. Changes are re-verified before payouts, so the next payout
        waits until Aariy confirms the account.
      </Muted>
      <div className="mt-2 flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn primary type="submit" disabled={saving}>
          Save account
        </Btn>
      </div>
    </form>
  );
}
