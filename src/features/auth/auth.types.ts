export type PermissionCode =
  | "CREATE_USER"
  | "UPDATE_USER"
  | "DELETE_USER"
  | "CREATE_COMPANY"
  | "UPDATE_COMPANY"
  | "UPDATE_COMPANY_STATUS"
  | "DELETE_COMPANY"
  | "GET_COMPANIES"
  | "CREATE_DRIVERS"
  | "UPDATE_DRIVERS"
  | "DELETE_DRIVERS"
  | "GET_DRIVERS"
  | "CREATE_TRIPS"
  | "UPDATE_TRIPS"
  | "GET_TRIPS"
  | "DELETE_TRIPS"
  | "GET_DISTRICTS"
  | "GET_PEOPLE"
  | "GET_CHAT"
  | "GET_TRAINING_MODULE"
  | "UPDATE_INCIDENT"
  | "ASSIGN_VENDOR"
  | "ASSIGN_DRIVER"
  | "CREATE_INVENTORY"
  | "UPDATE_INVENTORY"
  | "DELETE_INVENTORY"
  | "RETURN_ITEM"
  | "ASSIGNED_VENDORS"
  | "CONFIRM_VENDOR_RETURN"
  | "CONFIRM_DRIVER_RETURN";

export type PermissionMap = Record<PermissionCode, boolean>;

export type SellerRole = "OWNER" | "MANAGER" | "CATALOGUE" | "ORDERS";

export type SellerAccountStatus =
  | "ONBOARDING"
  | "SUBMITTED"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED";

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: string;
  /** Role inside the seller's team (SOW 4.5). */
  sellerRole?: SellerRole;
  /** Where the seller account is in onboarding / KYB review. */
  accountStatus?: SellerAccountStatus;
  /** Seller is live on Aariy. Until then the seller only works on the brand profile. */
  isLive?: boolean;
  /** Sign-in said mustChangePassword: true. Only the change password screen opens until it is changed. */
  mustChangePassword?: boolean;
  /** Seller account this session is working in. */
  seller?: {
    id: string;
    tradingName: string;
    onboardingStep?: string;
    permissions: string[];
    deadline?: { submitBy: string; daysLeft: number; message: string } | null;
  } | null;
  permissions: PermissionMap;
  company: {
    id: string;
    name: string;
    status: string;
  } | null;
};

export type LoginDto = {
  email: string;
  password: string;
};

/** POST /v1/seller/auth/login body. "login" is the email. */
export type SellerLoginPayload = {
  login: string;
  password: string;
};

/** data of a successful seller sign-in. */
export type SellerSession = {
  accessToken: string;
  refreshToken: string;
  sessionExpiresAt: string;
  isLive: boolean;
  status: SellerAccountStatus;
  isPasswordChanged: boolean;
  mustChangePassword: boolean;
  user: { id: string; fullName: string; email: string; phone?: string | null };
  seller: {
    id: string;
    tradingName: string;
    status: SellerAccountStatus;
    onboardingStep?: string;
    showOnboardingForm?: boolean;
    deadline?: { submitBy: string; daysLeft: number; message: string } | null;
    role: SellerRole;
    permissions: string[];
  };
  sellers: { id: string; tradingName: string; role: SellerRole }[];
};

export type LoginResponse = {
  status: boolean;
  code: string;
  message: string;
  data?: {
    status: boolean;
    accessToken: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: {
        code: string;
        permissions: {
          allowed: boolean;
          feature: { code: string };
        }[];
      };
      company: {
        id: string;
        name: string;
        status: string;
      } | null;
    };
  };
};

export type SetPasswordDto = {
  token: string;
  password: string;
};

/** POST /v1/seller/auth/password/reset body. The code is sent to the account's mobile number. */
export type ResetPasswordDto = {
  login: string;
  code: string;
  newPassword: string;
};

export type ChangePasswordDto = {
  currentPassword: string;
  newPassword: string;
};

export type SetPasswordResponse = {
  status: boolean;
  message: string;
};

/* ---------------- Seller sign-up (email + password) ---------------- */

export type RegisterDto = {
  fullName: string;
  email: string;
  password: string;
  /** Business contact number in E.164, e.g. +923001234567. Not used to sign in. */
  phone: string;
  brandName: string;
  /** Accepted seller terms and privacy policy. Recorded with the time by the API. */
  consent: boolean;
};

export type AuthResult = { success: boolean; message: string };
