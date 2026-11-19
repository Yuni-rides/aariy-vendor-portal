"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/useToast";
import { Btn, Field, fieldClass } from "@/shared/ui/seller";
import { useAuthStore } from "../auth.store";
import { RegisterDto } from "../auth.types";
import { isValidEmailAddress, isValidPkMobile, passwordProblem, toE164 } from "../auth.helpers";
import { useOnboardingStore } from "@/features/onboarding/onboarding.store";
import { AuthShell, PasswordInput } from "./AuthShell";

type Form = RegisterDto & { confirmPassword: string };
type Errors = Partial<Record<keyof Form, string>>;

function validate(f: Form): Errors {
  const e: Errors = {};
  if (!f.fullName.trim()) e.fullName = "Enter your full name.";
  if (!isValidEmailAddress(f.email)) e.email = "Enter a valid email address.";
  const pw = passwordProblem(f.password);
  if (pw) e.password = pw;
  else if (f.confirmPassword !== f.password) e.confirmPassword = "Passwords do not match.";
  if (!isValidPkMobile(f.phone)) e.phone = "Enter a mobile number like 0300 1234567.";
  if (!f.brandName.trim()) e.brandName = "Enter your brand name.";
  if (!f.consent) e.consent = "Accept the terms and privacy policy to continue.";
  return e;
}

export default function RegisterPage() {
  const router = useRouter();
  const { loading, register } = useAuthStore();
  const [form, setForm] = useState<Form>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    brandName: "",
    consent: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const patch = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const { confirmPassword: _, ...dto } = form;
    const res = await register(dto);
    if (!res.success) {
      toast({ title: res.message, variant: "destructive" });
      return;
    }
    // Start the onboarding draft with what they already told us.
    useOnboardingStore.getState().ensureFor({
      phone: toE164(form.phone),
      fullName: form.fullName,
      email: form.email.trim().toLowerCase(),
      brandName: form.brandName,
    });
    toast({ title: "Account created", description: "Next, complete your onboarding." });
    router.replace("/onboarding");
  };

  return (
    <AuthShell
      title="Create a seller account"
      subtitle="Sell your brand on Aariy. After this you complete onboarding and Aariy reviews it."
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        <Field label="Full name" htmlFor="rn" error={errors.fullName}>
          <input id="rn" autoComplete="name" className={fieldClass} value={form.fullName} onChange={(e) => patch({ fullName: e.target.value })} />
        </Field>
        <Field label="Email" htmlFor="re" error={errors.email}>
          <input id="re" type="email" autoComplete="email" className={fieldClass} value={form.email} onChange={(e) => patch({ email: e.target.value })} />
        </Field>
        <Field label="Password" htmlFor="rpw" error={errors.password}>
          <PasswordInput id="rpw" autoComplete="new-password" value={form.password} onChange={(v) => patch({ password: v })} />
        </Field>
        {!errors.password && <p className="-mt-2 mb-0 text-xs text-muted-foreground">At least 8 characters, with letters and a number.</p>}
        <Field label="Confirm password" htmlFor="rpw2" error={errors.confirmPassword}>
          <PasswordInput id="rpw2" autoComplete="new-password" value={form.confirmPassword} onChange={(v) => patch({ confirmPassword: v })} />
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
          {loading ? "Creating account..." : "Create account"}
        </Btn>
        <p className="m-0 text-center text-[13px] text-muted-foreground">
          Already selling on Aariy?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
