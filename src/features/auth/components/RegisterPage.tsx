"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/useToast";
import { Btn, Field, fieldClass } from "@/shared/ui/seller";
import { useAuthStore } from "../auth.store";
import { RegisterDto } from "../auth.types";
import { isValidEmailAddress, isValidPkMobile, toE164 } from "../auth.helpers";
import { useOnboardingStore } from "@/features/onboarding/onboarding.store";
import { AuthShell, OtpStep } from "./AuthShell";

type Errors = Partial<Record<keyof RegisterDto, string>>;

function validate(f: RegisterDto): Errors {
  const e: Errors = {};
  if (!f.fullName.trim()) e.fullName = "Enter your full name.";
  if (!isValidPkMobile(f.phone)) e.phone = "Enter a mobile number like 0300 1234567.";
  if (!isValidEmailAddress(f.email)) e.email = "Enter a valid email address.";
  if (!f.brandName.trim()) e.brandName = "Enter your brand name.";
  if (!f.consent) e.consent = "Accept the terms and privacy policy to continue.";
  return e;
}

export default function RegisterPage() {
  const router = useRouter();
  const { otp, loading, requestRegisterOtp, cancelOtp } = useAuthStore();
  const [form, setForm] = useState<RegisterDto>({ fullName: "", phone: "", email: "", brandName: "", consent: false });
  const [errors, setErrors] = useState<Errors>({});
  const patch = (p: Partial<RegisterDto>) => setForm((f) => ({ ...f, ...p }));

  useEffect(() => {
    if (useAuthStore.getState().otp?.purpose !== "REGISTER") cancelOtp();
  }, [cancelOtp]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const res = await requestRegisterOtp(form);
    if (!res.success) toast({ title: res.message, variant: "destructive" });
  };

  return (
    <AuthShell
      title={otp ? "Verify your number" : "Create a seller account"}
      subtitle={otp ? undefined : "Sell your brand on Aariy. After this you complete onboarding and Aariy reviews it."}
    >
      {otp ? (
        <OtpStep
          onVerified={() => {
            // Start the onboarding draft with what they already told us.
            useOnboardingStore.getState().ensureFor({
              phone: toE164(form.phone),
              fullName: form.fullName,
              email: form.email.trim().toLowerCase(),
              brandName: form.brandName,
            });
            toast({ title: "Account created", description: "Next, complete your onboarding." });
            router.replace("/onboarding");
          }}
        />
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
          <Field label="Full name" htmlFor="rn" error={errors.fullName}>
            <input id="rn" autoComplete="name" className={fieldClass} value={form.fullName} onChange={(e) => patch({ fullName: e.target.value })} />
          </Field>
          <Field label="Mobile number" htmlFor="rp" error={errors.phone}>
            <input
              id="rp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0300 1234567"
              className={fieldClass}
              value={form.phone}
              onChange={(e) => patch({ phone: e.target.value })}
            />
          </Field>
          <Field label="Email" htmlFor="re" error={errors.email}>
            <input id="re" type="email" autoComplete="email" className={fieldClass} value={form.email} onChange={(e) => patch({ email: e.target.value })} />
          </Field>
          <Field label="Brand name" htmlFor="rb" error={errors.brandName}>
            <input id="rb" className={fieldClass} value={form.brandName} onChange={(e) => patch({ brandName: e.target.value })} />
          </Field>
          <label className="flex cursor-pointer items-start gap-2 text-[13px] text-muted-foreground">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#B8532F]"
              checked={form.consent}
              onChange={(e) => patch({ consent: e.target.checked })}
            />
            {/* TODO: link to the counsel-approved terms and privacy policy pages (SOW 3.10). */}
            <span>I agree to the Aariy terms of use and privacy policy, and to receive SMS and email about my account.</span>
          </label>
          {errors.consent && <p className="m-0 text-xs text-destructive">{errors.consent}</p>}
          <Btn primary type="submit" disabled={loading} className="mt-1">
            {loading ? "Sending..." : "Send code"}
          </Btn>
          <p className="m-0 text-center text-[13px] text-muted-foreground">
            Already selling on Aariy?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
