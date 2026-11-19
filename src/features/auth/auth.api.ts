import { http } from "@/shared/api/http";
import { AuthUser, LoginDto, RegisterDto, SetPasswordDto, SetPasswordResponse } from "./auth.types";

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

  logout: async (payload: { fcmToken: string }): Promise<{ status: boolean; message: string }> => {
    const res = await http.post("/v1/seller/auth/logout", payload);
    return res.data;
  },

  setPassword: async (payload: SetPasswordDto): Promise<SetPasswordResponse> => {
    const res = await http.post<SetPasswordResponse>("/user/set-password", payload);
    return res.data;
  },
};
