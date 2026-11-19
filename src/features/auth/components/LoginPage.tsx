"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/hooks/useToast";
import { Btn, Field, fieldClass } from "@/shared/ui/seller";
import { useAuthStore } from "../auth.store";
import { AUTH_BYPASS } from "../auth.mock";
import { canAccess, landingFor, sellerRoleOf, accountStatusOf } from "../seller-access";
import { AuthShell, OtpStep } from "./AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const redirect = useSearchParams().get("redirect");
  const { otp, loading, requestLoginOtp, cancelOtp } = useAuthStore();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string>();

  // A code request from an earlier visit (e.g. the sign-up page) should not carry over.
  useEffect(() => {
    if (useAuthStore.getState().otp?.purpose !== "LOGIN") cancelOtp();
  }, [cancelOtp]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const res = await requestLoginOtp(phone);
    setError(res.success ? undefined : res.message);
  };

  const afterSignIn = () => {
    const user = useAuthStore.getState().user;
    toast({ title: "Signed in" });
    const safeRedirect =
      redirect && redirect.startsWith("/") && accountStatusOf(user) === "APPROVED" && canAccess(sellerRoleOf(user), redirect)
        ? redirect
        : null;
    router.replace(safeRedirect ?? landingFor(user));
  };

  return (
    <AuthShell
      title={otp ? "Check your phone" : "Sign in"}
      subtitle={otp ? undefined : "Brand owners and team members sign in with a one-time code."}
    >
      {otp ? (
        <OtpStep onVerified={afterSignIn} />
      ) : (
        <form onSubmit={handleSend} noValidate className="flex flex-col gap-4">
          <Field label="Mobile number" htmlFor="phone" error={error}>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className={fieldClass}
              placeholder="0300 1234567"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError(undefined);
              }}
            />
          </Field>
          {AUTH_BYPASS && (
            <p className="m-0 rounded-[10px] bg-secondary px-3 py-2 text-xs text-muted-foreground">
              Test mode: any number signs in as the brand owner. 0300 0000001 / 002 / 003 sign in as Manager,
              Catalogue or Orders.
            </p>
          )}
          <Btn primary type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send code"}
          </Btn>
          <p className="m-0 text-center text-[13px] text-muted-foreground">
            New to Aariy?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Create a seller account
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
