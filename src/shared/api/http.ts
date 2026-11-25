import axios from "axios";
import { env } from "@/core/env/env";
import { useAuthStore } from "@/features/auth/auth.store";
import { AUTH_BYPASS } from "@/features/auth/auth.mock";

export const http = axios.create({
  baseURL: env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

export const httpUpload = axios.create({
  baseURL: env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
  timeout: 0,
});

const addTokenInterceptor = (config: any) => {
  if (typeof window !== "undefined") {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
};

http.interceptors.request.use(addTokenInterceptor);
httpUpload.interceptors.request.use(addTokenInterceptor);

/* ---------------- Access token refresh ----------------
 * The access token lasts about 15 minutes. When a request comes back 401,
 * swap the refresh token for a new access token (POST /seller/auth/refresh)
 * and send the request again once. Requests that fail while a refresh is
 * running wait for that same refresh. If the refresh fails, sign out.
 */

const NO_REFRESH = ["/seller/auth/login", "/seller/auth/refresh", "/seller/auth/logout", "/seller/auth/password/forgot", "/seller/auth/password/reset"];

let refreshing: Promise<string | null> | null = null;

const refreshAccessToken = (): Promise<string | null> => {
  if (!refreshing) {
    refreshing = (async () => {
      const store = useAuthStore.getState();
      if (!store.refreshToken) return null;
      try {
        const { authApi } = await import("@/features/auth/auth.api");
        const res = await authApi.refresh(store.refreshToken);
        const token = res?.data?.accessToken;
        if (!res?.status || !token) return null;
        useAuthStore.getState().setTokens(token, res.data?.refreshToken);
        return token;
      } catch {
        return null;
      }
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
};

const retryOn401 = (client: typeof http) => async (error: any) => {
  const original = error?.config;
  const url: string = original?.url ?? "";
  if (
    typeof window === "undefined" ||
    AUTH_BYPASS ||
    error?.response?.status !== 401 ||
    !original ||
    original._retried ||
    NO_REFRESH.some((p) => url.includes(p))
  ) {
    return Promise.reject(error);
  }
  original._retried = true;
  const token = await refreshAccessToken();
  if (!token) {
    useAuthStore.getState().endSession();
    return Promise.reject(error);
  }
  original.headers = { ...(original.headers ?? {}), Authorization: `Bearer ${token}` };
  return client(original);
};

http.interceptors.response.use((r) => r, retryOn401(http));
httpUpload.interceptors.response.use((r) => r, retryOn401(httpUpload));
