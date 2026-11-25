import { create } from "zustand";
import { AUTH_BYPASS } from "@/features/auth/auth.mock";
import { sellerProfileApi } from "./seller-profile.api";
import { SELLER_PROFILE_MOCK } from "./seller-profile.mock";
import { normalizeProfile } from "./seller-profile.helpers";
import type { SaveResult, SellerProfilePayload, SellerProfileResponse } from "./seller-profile.types";

type SellerProfileStore = {
  data: SellerProfileResponse | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  save: (payload: SellerProfilePayload) => Promise<SaveResult>;
};

const messageOf = (e: any, fallback: string) => e?.response?.data?.message ?? fallback;

export const useSellerProfileStore = create<SellerProfileStore>((set) => ({
  data: null,
  loading: false,
  saving: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      if (AUTH_BYPASS) {
        set({ data: SELLER_PROFILE_MOCK, loading: false });
        return;
      }
      const res = await sellerProfileApi.get();
      if (!res.status || !res.data) throw { response: { data: res } };
      set({ data: normalizeProfile(res.data), loading: false });
    } catch (e) {
      set({ error: messageOf(e, "Could not load your profile. Try again."), loading: false });
    }
  },

  save: async (payload) => {
    set({ saving: true });
    try {
      if (AUTH_BYPASS) {
        set({ saving: false });
        return { success: true, message: "Profile saved (test mode)." };
      }
      const res = await sellerProfileApi.save(payload);
      // Only replace the page data when the answer looks like a full profile.
      set({ saving: false, ...(res.status && res.data?.prefill ? { data: normalizeProfile(res.data) } : {}) });
      return { success: res.status, message: res.message ?? "Profile saved." };
    } catch (e) {
      set({ saving: false });
      return { success: false, message: messageOf(e, "Could not save your profile. Try again.") };
    }
  },
}));
