import type { AuthUser, SellerAccountStatus, SellerRole } from "./auth.types";

/**
 * Which portal sections each seller role can open (SOW 4.5).
 * Owner sees everything. Manager: everything except Team.
 * Catalogue: Products and Stock. Orders: Orders and Returns.
 */
export const ROLE_ACCESS: Record<SellerRole, string[] | "ALL"> = {
  OWNER: "ALL",
  MANAGER: [
    "/dashboard",
    "/orders",
    "/products",
    "/stock",
    "/returns",
    "/statements",
    "/brand-profile",
    "/api-keys",
  ],
  CATALOGUE: ["/products", "/stock"],
  ORDERS: ["/orders", "/returns"],
};

/** Sessions from before roles existed belong to the owner of an approved account. */
export const sellerRoleOf = (u: AuthUser | null): SellerRole => u?.sellerRole ?? "OWNER";
export const accountStatusOf = (u: AuthUser | null): SellerAccountStatus => u?.accountStatus ?? "APPROVED";

/** Account screens every role can open. */
const EVERY_ROLE = ["/change-password"];

export function canAccess(role: SellerRole, pathname: string): boolean {
  if (EVERY_ROLE.includes(pathname)) return true;
  const allowed = ROLE_ACCESS[role];
  if (allowed === "ALL") return true;
  return allowed.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Where a role lands after sign-in. */
export const homeFor = (role: SellerRole): string => {
  const allowed = ROLE_ACCESS[role];
  return allowed === "ALL" ? "/dashboard" : allowed[0];
};

/** Approved sellers use the portal; everyone else finishes or waits on onboarding. */
export const landingFor = (u: AuthUser | null): string =>
  accountStatusOf(u) === "APPROVED" ? homeFor(sellerRoleOf(u)) : "/onboarding";
