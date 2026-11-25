import { http } from "@/shared/api/http";
import type { SellerProfilePayload, SellerProfileResponse } from "./seller-profile.types";

type ApiResult<T = undefined> = { status: boolean; code?: string; message: string; data?: T };

export const sellerProfileApi = {
  /** Seller's saved details plus the options for the form (countries, business types, agreement). */
  get: async () => {
    const res = await http.get<ApiResult<SellerProfileResponse>>("/seller/onboarding");
    return res.data;
  },

  save: async (payload: SellerProfilePayload) => {
    const res = await http.put<ApiResult<SellerProfileResponse>>("/seller/onboarding", payload);
    return res.data;
  },

  // Files are uploaded first with mediaApi.upload (POST /media/upload); the returned keys go into
  // documents[].key, brands[].logoKey and brands[].bannerKey. See seller-profile.uploads.ts.
};
