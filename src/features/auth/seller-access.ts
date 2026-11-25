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

export const CHANGE_PASSWORD_PATH = "/change-password";
export const BRAND_PROFILE_PATH = "/brand-profile";

/** Sessions without the flag (older sessions, test mode) count as live. */
export const isLiveSeller = (u: AuthUser | null): boolean => u?.isLive !== false;

/** Screens a seller that is not live yet can open. */
export const NOT_LIVE_PATHS = [BRAND_PROFILE_PATH, CHANGE_PASSWORD_PATH];

/** Sign-in said mustChangePassword: true and the password is not changed yet. */
export const mustChangePassword = (u: AuthUser | null): boolean => !!u?.mustChangePassword;

/**
 * Where to send a signed-in user:
 * change password first if the sign-in asks for it, then brand profile while the seller
 * is not live (isLive false), otherwise the role's home screen.
 */
export const landingFor = (u: AuthUser | null): string => {
  if (mustChangePassword(u)) return CHANGE_PASSWORD_PATH;
  if (!isLiveSeller(u)) return BRAND_PROFILE_PATH;
  return homeFor(sellerRoleOf(u));
};

/** Whether this user may open this screen right now. */
export const mayOpen = (u: AuthUser | null, pathname: string): boolean => {
  if (mustChangePassword(u)) return pathname === CHANGE_PASSWORD_PATH;
  if (!isLiveSeller(u)) return NOT_LIVE_PATHS.includes(pathname);
  return canAccess(sellerRoleOf(u), pathname);
};
