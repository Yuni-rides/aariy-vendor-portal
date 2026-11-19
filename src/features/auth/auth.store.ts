import { create } from "zustand";
import { persist } from "zustand/middleware";
import Cookies from "js-cookie";
import { authApi } from "./auth.api";
import { AuthResult, AuthUser, OtpPurpose, RegisterDto, SetPasswordDto } from "./auth.types";
import { AUTH_BYPASS, MOCK_ACCESS_TOKEN, MOCK_OTP, buildMockUser } from "./auth.mock";
import { OTP_LENGTH, isValidEmailAddress, isValidPkMobile, toE164 } from "./auth.helpers";

/** A code request in progress: which number, why, and the sign-up details if any. */
type OtpSession = {
  phone: string;
  purpose: OtpPurpose;
  registration?: RegisterDto;
  sentAt: number;
};

type AuthStore = {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
  otp: OtpSession | null;

  requestLoginOtp: (phone: string) => Promise<AuthResult>;
  requestRegisterOtp: (dto: RegisterDto) => Promise<AuthResult>;
  resendOtp: () => Promise<AuthResult>;
  verifyOtp: (code: string) => Promise<AuthResult>;
  cancelOtp: () => void;
  /** Local update after a change the API confirmed (e.g. onboarding submitted). */
  patchUser: (patch: Partial<AuthUser>) => void;
  logout: (fcmToken: string) => Promise<void>;
  setPassword: (dto: SetPasswordDto) => Promise<AuthResult>;
};

const message = (e: any, fallback: string) => e?.response?.data?.message ?? fallback;

const startSession = (token: string, user: AuthUser) => {
  Cookies.set("token", token, { expires: 1, sameSite: "lax" });
  return { user, accessToken: token };
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => {
      const send = async (session: Omit<OtpSession, "sentAt">): Promise<AuthResult> => {
        set({ loading: true, error: null });
        try {
          if (!AUTH_BYPASS) {
            const res = await authApi.requestOtp(session);
            if (!res.status) {
              set({ loading: false, error: res.message });
              return { success: false, message: res.message };
            }
          }
          set({ otp: { ...session, sentAt: Date.now() }, loading: false });
          return { success: true, message: "We sent a 6-digit code by SMS." };
        } catch (e: any) {
          const msg = message(e, "Could not send the code. Try again.");
          set({ loading: false, error: msg });
          return { success: false, message: msg };
        }
      };

      return {
        user: null,
        accessToken: null,
        loading: false,
        error: null,
        otp: null,

        requestLoginOtp: async (rawPhone) => {
          if (!isValidPkMobile(rawPhone)) return { success: false, message: "Enter a mobile number like 0300 1234567." };
          return send({ phone: toE164(rawPhone), purpose: "LOGIN" });
        },

        requestRegisterOtp: async (dto) => {
          if (!dto.fullName.trim()) return { success: false, message: "Enter your full name." };
          if (!isValidPkMobile(dto.phone)) return { success: false, message: "Enter a mobile number like 0300 1234567." };
          if (!isValidEmailAddress(dto.email)) return { success: false, message: "Enter a valid email address." };
          if (!dto.brandName.trim()) return { success: false, message: "Enter your brand name." };
          if (!dto.consent) return { success: false, message: "Accept the terms and privacy policy to continue." };
          const registration = { ...dto, phone: toE164(dto.phone), email: dto.email.trim().toLowerCase() };
          return send({ phone: registration.phone, purpose: "REGISTER", registration });
        },

        resendOtp: async () => {
          const otp = get().otp;
          if (!otp) return { success: false, message: "Start again with your mobile number." };
          return send({ phone: otp.phone, purpose: otp.purpose, registration: otp.registration });
        },

        verifyOtp: async (code) => {
          const otp = get().otp;
          if (!otp) return { success: false, message: "Start again with your mobile number." };
          if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code)) return { success: false, message: "Enter the 6-digit code." };
          set({ loading: true, error: null });

          if (AUTH_BYPASS) {
            if (code !== MOCK_OTP) {
              set({ loading: false });
              return { success: false, message: "That code is not right. Check the SMS and try again." };
            }
            const user = buildMockUser(
              otp.purpose === "REGISTER"
                ? {
                    phone: otp.phone,
                    role: "OWNER",
                    accountStatus: "ONBOARDING",
                    fullName: otp.registration?.fullName,
                    email: otp.registration?.email,
                  }
                : { phone: otp.phone },
            );
            set({ ...startSession(MOCK_ACCESS_TOKEN, user), otp: null, loading: false });
            return { success: true, message: otp.purpose === "REGISTER" ? "Account created." : "Signed in." };
          }

          try {
            const res = await authApi.verifyOtp({ phone: otp.phone, code, purpose: otp.purpose });
            if (!res.status || !res.data) {
              set({ loading: false });
              return { success: false, message: res.message ?? "That code is not right." };
            }
            set({ ...startSession(res.data.accessToken, res.data.user), otp: null, loading: false });
            return { success: true, message: res.message };
          } catch (e: any) {
            const msg = message(e, "Could not check the code. Try again.");
            set({ loading: false, error: msg });
            return { success: false, message: msg };
          }
        },

        cancelOtp: () => set({ otp: null, error: null }),

        patchUser: (patch) => {
          const user = get().user;
          if (user) set({ user: { ...user, ...patch } });
        },

        logout: async (fcmToken: string) => {
          try {
            if (!AUTH_BYPASS) await authApi.logout({ fcmToken });
          } catch (error) {
            console.error("Logout API failed", error);
          } finally {
            Cookies.remove("token");
            localStorage.removeItem("auth-storage");
            set({ user: null, accessToken: null, otp: null });
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
      };
    },
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
    },
  ),
);
