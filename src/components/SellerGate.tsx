"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/auth.store";
import { accountStatusOf, canAccess, homeFor, sellerRoleOf } from "@/features/auth/seller-access";

/**
 * Client-side guard for the seller portal:
 * - accounts that are not approved yet go to onboarding;
 * - each team role only sees its own screens (SOW 4.5).
 * TODO(api): the API must enforce the same rules on every endpoint; this only hides screens.
 */
export function SellerGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  // The auth store rehydrates from localStorage after the first render.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const role = sellerRoleOf(user);
  const approved = accountStatusOf(user) === "APPROVED";
  const allowed = approved && canAccess(role, pathname);

  useEffect(() => {
    if (!hydrated) return;
    if (!approved) router.replace("/onboarding");
    else if (!canAccess(role, pathname)) router.replace(homeFor(role));
  }, [hydrated, approved, role, pathname, router]);

  if (!hydrated || !allowed) return null;
  return <>{children}</>;
}
