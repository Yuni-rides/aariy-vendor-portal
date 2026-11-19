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
  fcmToken?: string;
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

export type SetPasswordResponse = {
  status: boolean;
  message: string;
};

/* ---------------- Seller one-time code sign-in (SOW 4.1, 19.5) ---------------- */

export type RegisterDto = {
  fullName: string;
  /** Pakistani mobile in E.164, e.g. +923001234567. */
  phone: string;
  email: string;
  brandName: string;
  /** Accepted buyer/seller terms and privacy policy. Recorded with the time by the API. */
  consent: boolean;
};

export type OtpPurpose = "LOGIN" | "REGISTER";

export type AuthResult = { success: boolean; message: string };
