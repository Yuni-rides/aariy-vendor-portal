import axios from "axios";
import { env } from "@/core/env/env";
import { http } from "@/shared/api/http";
import { AuthUser, ChangePasswordDto, RegisterDto, ResetPasswordDto, SellerLoginPayload, SellerSession, SetPasswordDto, SetPasswordResponse } from "./auth.types";

type ApiResult<T = undefined> = { status: boolean; message: string; data?: T };
type Session = { accessToken: string; user: AuthUser };
export type RefreshedTokens = { accessToken: string; refreshToken?: string | null; sessionExpiresAt?: string | null };

/** No token interceptor and no refresh retry, so a failed refresh cannot loop. */
const bare = axios.create({ baseURL: env.NEXT_PUBLIC_API_BASE_URL, withCredentials: true, timeout: 15000 });

// TODO(api): confirm paths and payloads with the backend (SOW 6.1 /v1/seller).
export const authApi = {
  login: async (payload: SellerLoginPayload) => {
    const res = await http.post<ApiResult<SellerSession>>("/seller/auth/login", payload);
    return res.data;
  },

  /** Swaps the refresh token for a new access token. TODO(api): confirm the body is { refreshToken }. */
  refresh: async (refreshToken: string) => {
    const res = await bare.post<ApiResult<RefreshedTokens>>("/seller/auth/refresh", { refreshToken });
    return res.data;
  },

  /** Creates the owner account. New accounts come back with accountStatus ONBOARDING. */
  register: async (payload: RegisterDto) => {
    const res = await http.post<ApiResult<Session>>("/seller/auth/register", payload);
    return res.data;
  },

  /** Sends a reset code to the account's mobile number. Answers the same way whether or not the account exists. */
  forgotPassword: async (payload: { login: string }) => {
    const res = await http.post<ApiResult<{ sentTo: string | null }>>("/seller/auth/password/forgot", payload);
    return res.data;
  },

  /** Sets a new password with the code from forgotPassword. */
  resetPassword: async (payload: ResetPasswordDto) => {
    const res = await http.post<ApiResult>("/seller/auth/password/reset", payload);
    return res.data;
  },

  /** Signed-in user changes their own password. */
  changePassword: async (payload: ChangePasswordDto) => {
    const res = await http.post<ApiResult>("/seller/auth/password/change", payload);
    return res.data;
  },

  logout: async (): Promise<{ status: boolean; message: string }> => {
    const res = await http.post("/seller/auth/logout");
    return res.data;
  },

  setPassword: async (payload: SetPasswordDto): Promise<SetPasswordResponse> => {
    const res = await http.post<SetPasswordResponse>("/user/set-password", payload);
    return res.data;
  },
};
