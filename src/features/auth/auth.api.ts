import { http } from "@/shared/api/http";
import { AuthUser, ChangePasswordDto, LoginDto, RegisterDto, SetPasswordDto, SetPasswordResponse } from "./auth.types";

type ApiResult<T = undefined> = { status: boolean; message: string; data?: T };
type Session = { accessToken: string; user: AuthUser };

// TODO(api): confirm paths and payloads with the backend (SOW 6.1 /v1/seller).
export const authApi = {
  login: async (payload: LoginDto) => {
    const res = await http.post<ApiResult<Session>>("/v1/seller/auth/login", payload);
    return res.data;
  },

  /** Creates the owner account. New accounts come back with accountStatus ONBOARDING. */
  register: async (payload: RegisterDto) => {
    const res = await http.post<ApiResult<Session>>("/v1/seller/auth/register", payload);
    return res.data;
  },

  /** Emails a reset link. The API answers the same way whether or not the email has an account. */
  forgotPassword: async (payload: { email: string }) => {
    const res = await http.post<ApiResult>("/v1/seller/auth/forgot-password", payload);
    return res.data;
  },

  /** Sets a new password from the emailed link. */
  resetPassword: async (payload: SetPasswordDto) => {
    const res = await http.post<ApiResult>("/v1/seller/auth/reset-password", payload);
    return res.data;
  },

  /** Signed-in user changes their own password. */
  changePassword: async (payload: ChangePasswordDto) => {
    const res = await http.post<ApiResult>("/v1/seller/auth/change-password", payload);
    return res.data;
  },

  logout: async (): Promise<{ status: boolean; message: string }> => {
    const res = await http.post("/v1/seller/auth/logout");
    return res.data;
  },

  setPassword: async (payload: SetPasswordDto): Promise<SetPasswordResponse> => {
    const res = await http.post<SetPasswordResponse>("/user/set-password", payload);
    return res.data;
  },
};
