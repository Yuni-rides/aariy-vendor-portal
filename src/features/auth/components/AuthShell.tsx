"use client";

import { useEffect, useState } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/InputOtp";
import { Btn, Muted } from "@/shared/ui/seller";
import { useAuthStore } from "../auth.store";
import { AUTH_BYPASS, MOCK_OTP } from "../auth.mock";
import { OTP_LENGTH, OTP_RESEND_SECONDS, formatPkMobile } from "../auth.helpers";
import { AuthResult } from "../auth.types";

/** Centered card used by sign-in and sign-up. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 sm:p-8">
        <div className="mb-6">
          <div className="text-[22px] font-semibold">Aariy</div>
          <div className="text-xs text-muted-foreground">Seller portal</div>
        </div>
        <h1 className="m-0 text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mb-0 mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

/** Second step of sign-in / sign-up: enter the SMS code. */
export function OtpStep({ onVerified }: { onVerified: (res: AuthResult) => void }) {
  const { otp, loading, verifyOtp, resendOtp, cancelOtp } = useAuthStore();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!otp) return null;
  const wait = Math.max(0, OTP_RESEND_SECONDS - Math.floor((now - otp.sentAt) / 1000));

  const submit = async (value = code) => {
    const res = await verifyOtp(value);
    if (res.success) onVerified(res);
    else {
      setError(res.message);
      setCode("");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Muted>
        Enter the 6-digit code we sent to <b className="text-foreground">{formatPkMobile(otp.phone)}</b>.
      </Muted>
      <InputOTP
        maxLength={OTP_LENGTH}
        value={code}
        autoFocus
        inputMode="numeric"
        onChange={(v) => {
          setCode(v.replace(/\D/g, ""));
          setError(undefined);
        }}
        onComplete={(v: string) => submit(v)}
        containerClassName="justify-center"
      >
        <InputOTPGroup>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => (
            <InputOTPSlot key={i} index={i} className="h-12 w-11 bg-white text-lg" />
          ))}
        </InputOTPGroup>
      </InputOTP>
      {error && <p className="m-0 text-center text-xs text-destructive">{error}</p>}
      {AUTH_BYPASS && (
        <p className="m-0 rounded-[10px] bg-secondary px-3 py-2 text-center text-xs text-muted-foreground">
          Test mode: the code is {MOCK_OTP}.
        </p>
      )}
      <Btn primary onClick={() => submit()} disabled={loading || code.length < OTP_LENGTH}>
        {loading ? "Checking..." : "Continue"}
      </Btn>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <button type="button" className="cursor-pointer text-primary hover:underline" onClick={cancelOtp}>
          Change number
        </button>
        <button
          type="button"
          disabled={wait > 0 || loading}
          className="cursor-pointer text-primary hover:underline disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
          onClick={async () => {
            const res = await resendOtp();
            setError(res.success ? undefined : res.message);
            setNow(Date.now());
          }}
        >
          {wait > 0 ? `Send code again in ${wait}s` : "Send code again"}
        </button>
      </div>
    </div>
  );
}
