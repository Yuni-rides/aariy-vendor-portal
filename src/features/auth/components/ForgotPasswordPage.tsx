"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { toast } from "@/hooks/useToast";
import { Btn, Field, Muted, fieldClass } from "@/shared/ui/seller";
import { useAuthStore } from "../auth.store";
import { AUTH_BYPASS, MOCK_RESET_TOKEN } from "../auth.mock";
import { AuthShell } from "./AuthShell";

export default function ForgotPasswordPage() {
  const { loading, forgotPassword } = useAuthStore();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const res = await forgotPassword(email);
    if (!res.success) {
      setError(res.message);
      return;
    }
    if (sentTo) toast({ title: "Link sent again" });
    setSentTo(email.trim().toLowerCase());
  };

  if (sentTo) {
    return (
      <AuthShell title="Check your email">
        <div className="flex flex-col gap-4">
          <Muted>
            If <b className="text-foreground">{sentTo}</b> has an Aariy seller account, we sent a link to reset the
            password. The link works for 60 minutes.
          </Muted>
          {AUTH_BYPASS && (
            <p className="m-0 rounded-[10px] bg-secondary px-3 py-2 text-xs text-muted-foreground">
              Test mode: no email is sent.{" "}
              <Link href={`/reset-password?token=${MOCK_RESET_TOKEN}`} className="text-primary hover:underline">
                Open the reset link
              </Link>
            </p>
          )}
          <Btn onClick={() => send()} disabled={loading}>
            {loading ? "Sending..." : "Send the link again"}
          </Btn>
          <div className="flex flex-wrap justify-between gap-2 text-[13px]">
            <button type="button" className="cursor-pointer text-primary hover:underline" onClick={() => setSentTo(null)}>
              Use a different email
            </button>
            <Link href="/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot password" subtitle="Enter the email you sign in with and we will send you a reset link.">
      <form onSubmit={send} noValidate className="flex flex-col gap-4">
        <Field label="Email" htmlFor="fp-email" error={error}>
          <input
            id="fp-email"
            type="email"
            autoComplete="email"
            className={fieldClass}
            placeholder="you@brand.pk"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(undefined);
            }}
          />
        </Field>
        <Btn primary type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send reset link"}
        </Btn>
        <p className="m-0 text-center text-[13px] text-muted-foreground">
          Remembered it?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
