"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/hooks/useToast";
import { Btn, Field, fieldClass } from "@/shared/ui/seller";
import { useAuthStore } from "../auth.store";
import { AUTH_BYPASS } from "../auth.mock";
import { canAccess, landingFor, sellerRoleOf, accountStatusOf } from "../seller-access";
import { AuthShell, PasswordInput } from "./AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const redirect = useSearchParams().get("redirect");
  const { loading, login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    const res = await login({ email, password });
    if (!res.success) {
      setError(res.message);
      return;
    }
    const user = useAuthStore.getState().user;
    toast({ title: "Signed in" });
    const safeRedirect =
      redirect && redirect.startsWith("/") && accountStatusOf(user) === "APPROVED" && canAccess(sellerRoleOf(user), redirect)
        ? redirect
        : null;
    router.replace(safeRedirect ?? landingFor(user));
  };

  return (
    <AuthShell title="Sign in" subtitle="Brand owners and team members sign in with their email and password.">
      <form onSubmit={handleLogin} noValidate className="flex flex-col gap-4">
        <Field label="Email" htmlFor="email">
          <input
            id="email"
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
        <Field label="Password" htmlFor="password" error={error}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(v) => {
              setPassword(v);
              setError(undefined);
            }}
          />
        </Field>
        {AUTH_BYPASS && (
          <p className="m-0 rounded-[10px] bg-secondary px-3 py-2 text-xs text-muted-foreground">
            Test mode: any email and password signs in as the brand owner. manager@aariy.test, catalogue@aariy.test
            and orders@aariy.test sign in as Manager, Catalogue or Orders.
          </p>
        )}
        <Btn primary type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Btn>
        <p className="m-0 text-center text-[13px] text-muted-foreground">
          New to Aariy?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Create a seller account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
