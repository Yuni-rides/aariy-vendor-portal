"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleDashed, Clock } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth.store";
import { AUTH_BYPASS } from "@/features/auth/auth.mock";
import { accountStatusOf, landingFor } from "@/features/auth/seller-access";
import { formatLongDate } from "@/features/orders/orders.helpers";
import { Btn, Muted, Panel, PanelTitle } from "@/shared/ui/seller";
import { useOnboardingStore } from "../onboarding.store";
import { OnboardingDraft, StepErrors } from "../onboarding.types";
import { STEPS, validateStep } from "../onboarding.helpers";
import { StepForm } from "./OnboardingSteps";

export default function OnboardingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const store = useOnboardingStore();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const approved = accountStatusOf(user) === "APPROVED";

  useEffect(() => {
    if (!hydrated || !user) return;
    if (approved) {
      router.replace(landingFor(user));
      return;
    }
    store.ensureFor({
      phone: user.phone ?? user.id,
      fullName: [user.firstName, user.lastName].filter(Boolean).join(" "),
      email: user.email,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user, approved]);

  if (!hydrated || !user || approved) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-white px-4 py-3 sm:px-8">
        <div>
          <div className="text-lg font-semibold leading-tight">Aariy</div>
          <div className="text-xs text-muted-foreground">Seller onboarding</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-[13px] text-muted-foreground sm:inline">
            {[user.firstName, user.lastName].filter(Boolean).join(" ")}
          </span>
          <Btn onClick={() => logout("")}>Sign out</Btn>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 sm:p-8">
        {store.status === "SUBMITTED" || store.status === "REJECTED" ? <StatusView /> : <Wizard />}
      </main>
    </div>
  );
}

/* ---------------- Wizard ---------------- */

function Wizard() {
  const { draft: saved, completed, status, reviewNote, saving, saveStep, submit } = useOnboardingStore();
  const firstOpen = STEPS.findIndex((s) => !completed.includes(s.key));
  const [index, setIndex] = useState(firstOpen === -1 ? STEPS.length - 1 : firstOpen);
  const [draft, setDraft] = useState<OnboardingDraft>(saved);
  const [errors, setErrors] = useState<StepErrors>({});

  // Pick up the saved draft once it loads from storage.
  useEffect(() => setDraft(saved), [saved]);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;
  const done = completed.length;

  const go = (i: number) => {
    setErrors({});
    setIndex(i);
    window.scrollTo(0, 0);
  };

  const handleNext = async () => {
    const errs = validateStep(step.key, draft);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const res = await saveStep(step.key, draft);
    if (!res.success) {
      toast({ title: res.message, variant: "destructive" });
      return;
    }
    if (!isLast) {
      go(index + 1);
      return;
    }
    const sub = await submit();
    toast({ title: sub.message, variant: sub.success ? "default" : "destructive" });
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="m-0 text-2xl font-semibold">Set up your seller account</h1>
        <Muted>
          {done} of {STEPS.length} steps done. Your progress is saved after each step.
        </Muted>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(done / STEPS.length) * 100}%` }} />
        </div>
      </div>

      {status === "CHANGES_REQUESTED" && reviewNote && (
        <Panel className="border-[#E8CC8A] bg-[#FFF1D6] text-sm">
          <b>Aariy asked for changes:</b> {reviewNote}
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="flex flex-col gap-1 self-start p-3">
          {STEPS.map((s, i) => {
            const isDone = completed.includes(s.key);
            // Steps open in order: any saved step, or the first one not yet saved.
            const reachable = isDone || i <= firstOpen || firstOpen === -1;
            return (
              <button
                key={s.key}
                type="button"
                disabled={!reachable}
                onClick={() => go(i)}
                aria-current={i === index ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm",
                  i === index ? "bg-secondary font-semibold" : "hover:bg-muted",
                  reachable ? "cursor-pointer" : "cursor-not-allowed opacity-50",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs",
                    isDone ? "bg-primary text-white" : "border border-input text-muted-foreground",
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block">{s.title}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">{s.hint}</span>
                </span>
              </button>
            );
          })}
        </Panel>

        <Panel className="flex flex-col gap-4 lg:col-span-2">
          <div>
            <div className="text-[13px] text-muted-foreground">
              Step {index + 1} of {STEPS.length}
            </div>
            <PanelTitle className="mb-0 text-lg">{step.title}</PanelTitle>
          </div>
          <StepForm step={step.key} draft={draft} errors={errors} onChange={setDraft} />
          <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-4">
            <Btn onClick={() => go(index - 1)} disabled={index === 0 || saving}>
              Back
            </Btn>
            <Btn primary onClick={handleNext} disabled={saving}>
              {isLast ? "Submit for review" : "Save and continue"}
            </Btn>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- After submit ---------------- */

function StatusView() {
  const router = useRouter();
  const { status, submittedAt, contract, reviewNote, draft, approveForTesting } = useOnboardingStore();
  const user = useAuthStore((s) => s.user);

  if (status === "REJECTED") {
    return (
      <Panel className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <PanelTitle className="mb-0">Application not approved</PanelTitle>
          <StatusBadge tone="danger">Rejected</StatusBadge>
        </div>
        <Muted>{reviewNote ?? "Aariy could not approve this application."} Contact Aariy support if you have questions.</Muted>
      </Panel>
    );
  }

  const checklist = [
    { done: true, label: "Application and KYB documents sent" },
    { done: !!contract, label: contract ? `Seller agreement ${contract.version} accepted` : "Seller agreement" },
    { done: false, label: "Aariy reviews your documents (usually 2 to 3 business days)" },
    { done: false, label: "Complete seller training. Aariy will invite you to a session." },
    { done: false, label: "Approval email, then you can list products" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Panel className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PanelTitle className="mb-0">Your application is under review</PanelTitle>
          <StatusBadge tone="info">Under review</StatusBadge>
        </div>
        <Muted>
          Sent {submittedAt ? formatLongDate(submittedAt) : ""} for {draft.business.legalName || draft.brands[0]?.name}. We will
          email {user?.email || draft.about.email} when it is reviewed. Listing products and payouts open after approval.
        </Muted>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {checklist.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-sm">
              {c.done ? (
                <Check className="h-4 w-4 text-[#1D6B3A]" />
              ) : c.label.startsWith("Aariy reviews") ? (
                <Clock className="h-4 w-4 text-[#8A5A00]" />
              ) : (
                <CircleDashed className="h-4 w-4 text-muted-foreground" />
              )}
              {c.label}
            </li>
          ))}
        </ul>
      </Panel>

      {AUTH_BYPASS && (
        <Panel className="flex flex-wrap items-center justify-between gap-3 border-dashed">
          <Muted>Test mode: stand in for the Aariy reviewer.</Muted>
          <Btn
            onClick={() => {
              approveForTesting();
              router.replace("/dashboard");
            }}
          >
            Mark as approved
          </Btn>
        </Panel>
      )}
    </div>
  );
}
