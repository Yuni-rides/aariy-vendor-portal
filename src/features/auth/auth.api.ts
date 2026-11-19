import { http } from "@/shared/api/http";
import {
  AuthUser,
  OtpPurpose,
  RegisterDto,
  SetPasswordDto,
  SetPasswordResponse,
} from "./auth.types";

type ApiResult<T = undefined> = { status: boolean; message: string; data?: T };

// TODO(api): confirm paths and payloads with the backend (SOW 4.1, 6.1 /v1/seller).
export const authApi = {
  /** Sends a one-time code by SMS. For REGISTER the account details go with it. */
  requestOtp: async (payload: { phone: string; purpose: OtpPurpose; registration?: RegisterDto }) => {
    const res = await http.post<ApiResult>("/v1/seller/auth/otp", payload);
    return res.data;
  },

  /** Checks the code and returns a session. New accounts come back with accountStatus ONBOARDING. */
  verifyOtp: async (payload: { phone: string; code: string; purpose: OtpPurpose }) => {
    const res = await http.post<ApiResult<{ accessToken: string; user: AuthUser }>>(
      "/v1/seller/auth/verify",
      payload,
    );
    return res.data;
  },

  logout: async (payload: { fcmToken: string }): Promise<{ status: boolean; message: string }> => {
    const res = await http.post("/v1/seller/auth/logout", payload);
    return res.data;
  },

  setPassword: async (payload: SetPasswordDto): Promise<SetPasswordResponse> => {
    const res = await http.post<SetPasswordResponse>("/user/set-password", payload);
    return res.data;
  },
};
