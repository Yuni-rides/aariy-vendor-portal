"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/useToast";
import { Btn, Field, Muted, fieldClass } from "@/shared/ui/seller";
import { useAuthStore } from "../auth.store";
import { AUTH_BYPASS, MOCK_WRONG_CODE } from "../auth.mock";
import { passwordProblem } from "../auth.helpers";
import { AuthShell, PasswordInput } from "./AuthShell";

type Form = { login: string; code: string; password: string; confirm: string };

/** Sets a new password with the code sent by /forgot-password. */
export default function ResetPasswordPage() {
  const router = useRouter();
  const { loading, resetPassword, forgotPassword, resetLogin, resetSentTo } = useAuthStore();
  const [form, setForm] = useState<Form>({ login: resetLogin ?? "", code: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Partial<Form>>({});
  const patch = (p: Partial<Form>) => {
    setForm((f) => ({ ...f, ...p }));
    setErrors((e) => ({ ...e, ...Object.fromEntries(Object.keys(p).map((k) => [k, undefined])) }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Partial<Form> = {};
    if (!form.login.trim()) errs.login = "Enter your email.";
    if (!form.code.trim()) errs.code = "Enter the code we sent you.";
    const pw = passwordProblem(form.password);
    if (pw) errs.password = pw;
    else if (form.confirm !== form.password) errs.confirm = "Passwords do not match.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const res = await resetPassword({ login: form.login, code: form.code, newPassword: form.password });
    if (res.success) {
      toast({ title: "Password updated", description: "Sign in with your new password." });
      router.replace("/login");
    } else if (/code/i.test(res.message)) {
      setErrors({ code: res.message });
    } else if (/email/i.test(res.message)) {
      setErrors({ login: res.message });
    } else {
      toast({ title: res.message, variant: "destructive" });
    }
  };

  const resend = async () => {
    if (!form.login.trim()) {
      setErrors({ login: "Enter your email first." });
      return;
    }
    const res = await forgotPassword(form.login);
    if (res.success) {
      patch({ code: "" });
      toast({ title: "New code sent", description: res.message });
    } else {
      setErrors({ login: res.message });
    }
  };

  return (
    <AuthShell title="Set a new password" subtitle="Enter the code we sent to the mobile number on your account.">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {resetSentTo && (
          <Muted>
            Code sent to <b className="text-foreground">{resetSentTo}</b>.
          </Muted>
        )}
        <Field label="Email" htmlFor="rs-login" error={errors.login}>
          <input
            id="rs-login"
            type="email"
            autoComplete="email"
            className={fieldClass}
            placeholder="you@brand.pk"
            value={form.login}
            onChange={(e) => patch({ login: e.target.value })}
          />
        </Field>
        <Field label="Code" htmlFor="rs-code" error={errors.code}>
          <input
            id="rs-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            className={fieldClass}
            value={form.code}
            onChange={(e) => patch({ code: e.target.value.replace(/\s/g, "") })}
          />
        </Field>
        <Field label="New password" htmlFor="rs-pw" error={errors.password}>
          <PasswordInput id="rs-pw" autoComplete="new-password" value={form.password} onChange={(v) => patch({ password: v })} />
        </Field>
        {!errors.password && (
          <p className="-mt-3 mb-0 text-xs text-muted-foreground">At least 8 characters, with letters and a number.</p>
        )}
        <Field label="Confirm new password" htmlFor="rs-pw2" error={errors.confirm}>
          <PasswordInput id="rs-pw2" autoComplete="new-password" value={form.confirm} onChange={(v) => patch({ confirm: v })} />
        </Field>
        {AUTH_BYPASS && (
          <p className="m-0 rounded-[10px] bg-secondary px-3 py-2 text-xs text-muted-foreground">
            Test mode: no code is sent. Any code works except &quot;{MOCK_WRONG_CODE}&quot;.
          </p>
        )}
        <Btn primary type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save new password"}
        </Btn>
        <div className="flex flex-wrap justify-between gap-2 text-[13px]">
          <button type="button" className="cursor-pointer text-primary hover:underline disabled:opacity-50" onClick={resend} disabled={loading}>
            Send a new code
          </button>
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
