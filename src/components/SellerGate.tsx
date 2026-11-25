"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/auth.store";
import { landingFor, mayOpen } from "@/features/auth/seller-access";

/**
 * Client-side guard for the seller portal:
 * - a seller that is not live yet only sees the brand profile;
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

  const allowed = mayOpen(user, pathname);

  useEffect(() => {
    if (hydrated && !allowed) router.replace(landingFor(user));
  }, [hydrated, allowed, user, router]);

  if (!hydrated || !allowed) return null;
  return <>{children}</>;
}
