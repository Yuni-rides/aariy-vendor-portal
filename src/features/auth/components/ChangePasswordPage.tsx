"use client";

import { FormEvent, useState } from "react";
import { toast } from "@/hooks/useToast";
import { Btn, Field, Muted, PageHeader, Panel, PanelTitle } from "@/shared/ui/seller";
import { useAuthStore } from "../auth.store";
import { AUTH_BYPASS, MOCK_WRONG_PASSWORD } from "../auth.mock";
import { passwordProblem } from "../auth.helpers";
import { PasswordInput } from "./AuthShell";

type Form = { current: string; next: string; confirm: string };
const EMPTY: Form = { current: "", next: "", confirm: "" };

/** Signed-in user changes their own password. Every team role can open it. */
export default function ChangePasswordPage() {
  const { loading, changePassword, user } = useAuthStore();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Form>>({});
  const patch = (p: Partial<Form>) => {
    setForm((f) => ({ ...f, ...p }));
    setErrors((e) => ({ ...e, ...Object.fromEntries(Object.keys(p).map((k) => [k, undefined])) }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Partial<Form> = {};
    if (!form.current) errs.current = "Enter your current password.";
    const pw = passwordProblem(form.next);
    if (pw) errs.next = pw;
    else if (form.next === form.current) errs.next = "Pick a password you are not using now.";
    else if (form.confirm !== form.next) errs.confirm = "Passwords do not match.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const res = await changePassword({ currentPassword: form.current, newPassword: form.next });
    if (res.success) {
      setForm(EMPTY);
      toast({ title: "Password changed", description: "Use the new password next time you sign in." });
    } else if (/current/i.test(res.message)) {
      setErrors({ current: res.message });
    } else {
      toast({ title: res.message, variant: "destructive" });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <PageHeader title="Change password" />
      <Panel>
        <PanelTitle>Your password</PanelTitle>
        <Muted>
          This changes the password for <b className="text-foreground">{user?.email || "your account"}</b> only. Team
          members change their own.
        </Muted>
        <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-4">
          <Field label="Current password" htmlFor="cp-current" error={errors.current}>
            <PasswordInput id="cp-current" autoComplete="current-password" value={form.current} onChange={(v) => patch({ current: v })} />
          </Field>
          <Field label="New password" htmlFor="cp-new" error={errors.next}>
            <PasswordInput id="cp-new" autoComplete="new-password" value={form.next} onChange={(v) => patch({ next: v })} />
          </Field>
          {!errors.next && (
            <p className="-mt-3 mb-0 text-xs text-muted-foreground">At least 8 characters, with letters and a number.</p>
          )}
          <Field label="Confirm new password" htmlFor="cp-confirm" error={errors.confirm}>
            <PasswordInput id="cp-confirm" autoComplete="new-password" value={form.confirm} onChange={(v) => patch({ confirm: v })} />
          </Field>
          {AUTH_BYPASS && (
            <p className="m-0 rounded-[10px] bg-secondary px-3 py-2 text-xs text-muted-foreground">
              Test mode: any current password works except &quot;{MOCK_WRONG_PASSWORD}&quot;.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Btn primary type="submit" disabled={loading}>
              {loading ? "Saving..." : "Change password"}
            </Btn>
            <Btn type="button" onClick={() => { setForm(EMPTY); setErrors({}); }} disabled={loading}>
              Clear
            </Btn>
          </div>
        </form>
      </Panel>
    </div>
  );
}
