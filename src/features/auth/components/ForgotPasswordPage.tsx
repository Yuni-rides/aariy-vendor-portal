"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/useToast";
import { Btn, Field, fieldClass } from "@/shared/ui/seller";
import { useAuthStore } from "../auth.store";
import { AuthShell } from "./AuthShell";

/** Asks the API for a reset code (sent to the account's mobile number), then opens /reset-password. */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const { loading, forgotPassword, resetLogin } = useAuthStore();
  const [email, setEmail] = useState(resetLogin ?? "");
  const [error, setError] = useState<string>();

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const res = await forgotPassword(email);
    if (!res.success) {
      setError(res.message);
      return;
    }
    toast({ title: "Code sent", description: res.message });
    router.push("/reset-password");
  };

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter the email you sign in with. We will send a code to the mobile number on your account."
    >
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
          {loading ? "Sending..." : "Send code"}
        </Btn>
        <p className="m-0 text-center text-[13px] text-muted-foreground">
          Already have a code?{" "}
          <Link href="/reset-password" className="text-primary hover:underline">
            Enter it
          </Link>
          {" · "}
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
