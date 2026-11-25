// TEMPORARY: test sign-in until the Aariy seller auth API is ready.
// Turn on with NEXT_PUBLIC_AUTH_BYPASS=true in .env.local.
// Delete this file (and the AUTH_BYPASS branches in auth.store.ts and the auth pages)
// once the real email + password API is wired.
import { AuthUser, PermissionMap, SellerAccountStatus, SellerRole } from "./auth.types";

export const AUTH_BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS === "true";

export const MOCK_ACCESS_TOKEN = "dev-bypass-token";

/** In test mode this reset code is treated as wrong or expired, to try the error. Any other code works. */
export const MOCK_WRONG_CODE = "000000";

/** In test mode this current password is treated as wrong, to try the error. */
export const MOCK_WRONG_PASSWORD = "wrong-password";

/**
 * Test emails that sign in as a team member with a narrower role.
 * Any other email (with any password) signs in as the owner of the approved test brand.
 */
export const MOCK_ROLE_EMAILS: Record<string, SellerRole> = {
  "manager@aariy.test": "MANAGER",
  "catalogue@aariy.test": "CATALOGUE",
  "orders@aariy.test": "ORDERS",
};

const ROLE_NAMES: Record<SellerRole, [string, string]> = {
  OWNER: ["Maria", "B"],
  MANAGER: ["Hamza", "Ali"],
  CATALOGUE: ["Sara", "Khan"],
  ORDERS: ["Usman", "Tariq"],
};

export const buildMockUser = (opts: {
  email: string;
  role?: SellerRole;
  accountStatus?: SellerAccountStatus;
  fullName?: string;
  phone?: string;
}): AuthUser => {
  const email = opts.email.trim().toLowerCase();
  const role = opts.role ?? MOCK_ROLE_EMAILS[email] ?? "OWNER";
  const [first, ...rest] = (opts.fullName?.trim() || ROLE_NAMES[role].join(" ")).split(/\s+/);
  return {
    id: `dev-seller-${role.toLowerCase()}`,
    email,
    firstName: first,
    lastName: rest.join(" "),
    phone: opts.phone ?? null,
    role: "SELLER",
    sellerRole: role,
    accountStatus: opts.accountStatus ?? "APPROVED",
    permissions: {} as PermissionMap,
    company: null,
  };
};
