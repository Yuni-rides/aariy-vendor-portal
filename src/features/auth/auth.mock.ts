// TEMPORARY: test sign-in until the Aariy seller auth API is ready.
// Turn on with NEXT_PUBLIC_AUTH_BYPASS=true in .env.local.
// Delete this file (and the AUTH_BYPASS branches in auth.store.ts and the auth pages)
// once the real one-time code API is wired.
import { AuthUser, PermissionMap, SellerAccountStatus, SellerRole } from "./auth.types";

export const AUTH_BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS === "true";

export const MOCK_ACCESS_TOKEN = "dev-bypass-token";

/** Every test sign-in accepts this one-time code. */
export const MOCK_OTP = "123456";

/**
 * Test numbers that sign in as a team member with a narrower role.
 * Any other number signs in as the owner of the approved test brand.
 */
export const MOCK_ROLE_PHONES: Record<string, SellerRole> = {
  "+923000000001": "MANAGER",
  "+923000000002": "CATALOGUE",
  "+923000000003": "ORDERS",
};

const ROLE_NAMES: Record<SellerRole, [string, string]> = {
  OWNER: ["Maria", "B"],
  MANAGER: ["Hamza", "Ali"],
  CATALOGUE: ["Sara", "Khan"],
  ORDERS: ["Usman", "Tariq"],
};

export const buildMockUser = (opts: {
  phone: string;
  role?: SellerRole;
  accountStatus?: SellerAccountStatus;
  fullName?: string;
  email?: string;
}): AuthUser => {
  const role = opts.role ?? MOCK_ROLE_PHONES[opts.phone] ?? "OWNER";
  const [first, ...rest] = (opts.fullName?.trim() || ROLE_NAMES[role].join(" ")).split(/\s+/);
  return {
    id: `dev-seller-${role.toLowerCase()}`,
    email: opts.email ?? "",
    firstName: first,
    lastName: rest.join(" "),
    phone: opts.phone,
    role: "SELLER",
    sellerRole: role,
    accountStatus: opts.accountStatus ?? "APPROVED",
    permissions: {} as PermissionMap,
    company: null,
  };
};
