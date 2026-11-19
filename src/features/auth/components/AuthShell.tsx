"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { fieldClass } from "@/shared/ui/seller";

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

/** Password field with a show/hide toggle. */
export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: "current-password" | "new-password";
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        className={`${fieldClass} pr-11`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        aria-label={shown ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => setShown((s) => !s)}
      >
        {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
