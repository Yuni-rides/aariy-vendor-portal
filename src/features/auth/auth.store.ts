import { create } from "zustand";
import { persist } from "zustand/middleware";
import Cookies from "js-cookie";
import { authApi } from "./auth.api";
import { AuthResult, AuthUser, ChangePasswordDto, LoginDto, RegisterDto, SetPasswordDto } from "./auth.types";
import {
  AUTH_BYPASS,
  MOCK_ACCESS_TOKEN,
  MOCK_EXPIRED_TOKEN,
  MOCK_WRONG_PASSWORD,
  buildMockUser,
} from "./auth.mock";
import { isValidEmailAddress, isValidPkMobile, passwordProblem, toE164 } from "./auth.helpers";

type AuthStore = {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;

  login: (dto: LoginDto) => Promise<AuthResult>;
  register: (dto: RegisterDto) => Promise<AuthResult>;
  /** Local update after a change the API confirmed (e.g. onboarding submitted). */
  patchUser: (patch: Partial<AuthUser>) => void;
  logout: () => Promise<void>;
  setPassword: (dto: SetPasswordDto) => Promise<AuthResult>;
  forgotPassword: (email: string) => Promise<AuthResult>;
  resetPassword: (dto: SetPasswordDto) => Promise<AuthResult>;
  changePassword: (dto: ChangePasswordDto) => Promise<AuthResult>;
};

const message = (e: any, fallback: string) => e?.response?.data?.message ?? fallback;

/** Runs an API call with the loading flag and turns errors into a result. */
const call = async (
  set: (s: Partial<AuthStore>) => void,
  fn: () => Promise<{ status: boolean; message: string }>,
  fallback: string,
): Promise<AuthResult> => {
  set({ loading: true, error: null });
  try {
    const res = await fn();
    set({ loading: false });
    return { success: res.status, message: res.message ?? fallback };
  } catch (e: any) {
    const msg = message(e, fallback);
    set({ loading: false, error: msg });
    return { success: false, message: msg };
  }
};

const startSession = (token: string, user: AuthUser) => {
  Cookies.set("token", token, { expires: 1, sameSite: "lax" });
  return { user, accessToken: token };
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      loading: false,
      error: null,

      login: async (dto) => {
        const email = dto.email.trim().toLowerCase();
        if (!isValidEmailAddress(email)) return { success: false, message: "Enter a valid email address." };
        if (!dto.password) return { success: false, message: "Enter your password." };
        set({ loading: true, error: null });

        // TEMPORARY: any email + password signs in until the auth API is ready.
        if (AUTH_BYPASS) {
          set({ ...startSession(MOCK_ACCESS_TOKEN, buildMockUser({ email })), loading: false });
          return { success: true, message: "Signed in (test mode)." };
        }

        try {
          const res = await authApi.login({ ...dto, email });
          if (!res.status || !res.data) {
            const msg = res.message ?? "Wrong email or password.";
            set({ loading: false, error: msg });
            return { success: false, message: msg };
          }
          set({ ...startSession(res.data.accessToken, res.data.user), loading: false });
          return { success: true, message: res.message };
        } catch (e: any) {
          const msg = message(e, "Wrong email or password.");
          set({ loading: false, error: msg });
          return { success: false, message: msg };
        }
      },

      register: async (dto) => {
        if (!dto.fullName.trim()) return { success: false, message: "Enter your full name." };
        if (!isValidEmailAddress(dto.email)) return { success: false, message: "Enter a valid email address." };
        const pw = passwordProblem(dto.password);
        if (pw) return { success: false, message: pw };
        if (!isValidPkMobile(dto.phone)) return { success: false, message: "Enter a mobile number like 0300 1234567." };
        if (!dto.brandName.trim()) return { success: false, message: "Enter your brand name." };
        if (!dto.consent) return { success: false, message: "Accept the terms and privacy policy to continue." };

        const payload: RegisterDto = {
          ...dto,
          fullName: dto.fullName.trim(),
          email: dto.email.trim().toLowerCase(),
          phone: toE164(dto.phone),
          brandName: dto.brandName.trim(),
        };
        set({ loading: true, error: null });

        if (AUTH_BYPASS) {
          const user = buildMockUser({
            email: payload.email,
            role: "OWNER",
            accountStatus: "ONBOARDING",
            fullName: payload.fullName,
            phone: payload.phone,
          });
          set({ ...startSession(MOCK_ACCESS_TOKEN, user), loading: false });
          return { success: true, message: "Account created." };
        }

        try {
          const res = await authApi.register(payload);
          if (!res.status || !res.data) {
            set({ loading: false, error: res.message });
            return { success: false, message: res.message ?? "Could not create the account." };
          }
          set({ ...startSession(res.data.accessToken, res.data.user), loading: false });
          return { success: true, message: res.message };
        } catch (e: any) {
          const msg = message(e, "Could not create the account. Try again.");
          set({ loading: false, error: msg });
          return { success: false, message: msg };
        }
      },

      patchUser: (patch) => {
        const user = get().user;
        if (user) set({ user: { ...user, ...patch } });
      },

      logout: async () => {
        try {
          if (!AUTH_BYPASS) await authApi.logout();
        } catch (error) {
          console.error("Logout API failed", error);
        } finally {
          Cookies.remove("token");
          localStorage.removeItem("auth-storage");
          set({ user: null, accessToken: null });
          window.location.href = "/login";
        }
      },

      setPassword: async (dto) => {
        set({ loading: true, error: null });
        try {
          const res = await authApi.setPassword(dto);
          set({ loading: false });
          return { success: res.status, message: res.message };
        } catch (e: any) {
          const msg = message(e, "Failed to set password");
          set({ loading: false, error: msg });
          return { success: false, message: msg };
        }
      },

      forgotPassword: async (raw) => {
        const email = raw.trim().toLowerCase();
        if (!isValidEmailAddress(email)) return { success: false, message: "Enter a valid email address." };
        if (AUTH_BYPASS) return { success: true, message: "Reset link sent." };
        return call(set, () => authApi.forgotPassword({ email }), "Could not send the link. Try again.");
      },

      resetPassword: async ({ token, password }) => {
        if (!token) return { success: false, message: "This reset link is not valid." };
        const pw = passwordProblem(password);
        if (pw) return { success: false, message: pw };
        if (AUTH_BYPASS) {
          return token === MOCK_EXPIRED_TOKEN
            ? { success: false, message: "This reset link has expired. Ask for a new one." }
            : { success: true, message: "Password updated." };
        }
        return call(set, () => authApi.resetPassword({ token, password }), "Could not update the password. Try again.");
      },

      changePassword: async ({ currentPassword, newPassword }) => {
        if (!currentPassword) return { success: false, message: "Enter your current password." };
        const pw = passwordProblem(newPassword);
        if (pw) return { success: false, message: pw };
        if (newPassword === currentPassword) return { success: false, message: "Pick a password you are not using now." };
        if (AUTH_BYPASS) {
          return currentPassword === MOCK_WRONG_PASSWORD
            ? { success: false, message: "Your current password is not right." }
            : { success: true, message: "Password changed." };
        }
        return call(set, () => authApi.changePassword({ currentPassword, newPassword }), "Could not change the password. Try again.");
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
    },
  ),
);
