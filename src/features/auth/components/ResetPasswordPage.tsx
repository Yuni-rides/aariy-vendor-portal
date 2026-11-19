"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/hooks/useToast";
import { Btn, Field, Muted } from "@/shared/ui/seller";
import { useAuthStore } from "../auth.store";
import { passwordProblem } from "../auth.helpers";
import { AuthShell, PasswordInput } from "./AuthShell";

/** Opened from the emailed link: /reset-password?token=... */
export default function ResetPasswordPage() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const { loading, resetPassword } = useAuthStore();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [linkError, setLinkError] = useState<string | null>(token ? null : "This reset link is not valid.");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    const pw = passwordProblem(password);
    if (pw) errs.password = pw;
    else if (confirm !== password) errs.confirm = "Passwords do not match.";
    setErrors(errs);
    if (Object.keys(errs).length || !token) return;

    const res = await resetPassword({ token, password });
    if (res.success) {
      toast({ title: "Password updated", description: "Sign in with your new password." });
      router.replace("/login");
    } else if (/link/i.test(res.message)) {
      setLinkError(res.message);
    } else {
      toast({ title: res.message, variant: "destructive" });
    }
  };

  if (linkError) {
    return (
      <AuthShell title="Link not working">
        <div className="flex flex-col gap-4">
          <Muted>{linkError} Reset links work once and for 60 minutes.</Muted>
          <Btn primary onClick={() => router.push("/forgot-password")}>
            Get a new link
          </Btn>
          <p className="m-0 text-center text-[13px]">
            <Link href="/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password" subtitle="Pick a password you have not used on Aariy before.">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label="New password" htmlFor="rs-pw" error={errors.password}>
          <PasswordInput id="rs-pw" autoComplete="new-password" value={password} onChange={setPassword} />
        </Field>
        {!errors.password && (
          <p className="-mt-3 mb-0 text-xs text-muted-foreground">At least 8 characters, with letters and a number.</p>
        )}
        <Field label="Confirm new password" htmlFor="rs-pw2" error={errors.confirm}>
          <PasswordInput id="rs-pw2" autoComplete="new-password" value={confirm} onChange={setConfirm} />
        </Field>
        <Btn primary type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save new password"}
        </Btn>
      </form>
    </AuthShell>
  );
}
