import { create } from "zustand";
import { RETURNS_MOCK } from "./returns.mock";
import { ReturnRequest, ReturnResult } from "./returns.types";

type ReturnsStore = {
  loading: boolean;
  saving: boolean;
  error: string | null;
  loaded: boolean;
  returns: ReturnRequest[];

  fetchReturns: () => Promise<void>;
  respond: (id: string, notes: string, evidence: string[]) => Promise<ReturnResult>;
};

export const useReturnsStore = create<ReturnsStore>((set, get) => ({
  loading: false,
  saving: false,
  error: null,
  loaded: false,
  returns: [],

  fetchReturns: async () => {
    if (get().loaded) return;
    set({ loading: true, error: null });
    try {
      // TODO(api): const res = await returnsApi.list();
      set({ returns: RETURNS_MOCK, loading: false, loaded: true });
    } catch (e: any) {
      set({ error: e?.response?.data?.message ?? "Something went wrong", loading: false });
    }
  },

  respond: async (id, notes, evidence) => {
    const ret = get().returns.find((r) => r.id === id);
    if (!ret) return { success: false, message: "Return not found" };
    if (ret.status !== "NEEDS_RESPONSE") return { success: false, message: "You already responded to this return." };
    if (!notes.trim()) return { success: false, message: "Add a note for Aariy operations." };

    set({ saving: true });
    try {
      // TODO(api): upload evidence, then POST /seller/returns/:id/response { notes, evidence }
      set({
        returns: get().returns.map((r) =>
          r.id === id
            ? {
                ...r,
                status: "RESPONDED",
                response: { notes: notes.trim(), evidence, respondedAt: new Date().toISOString() },
              }
            : r,
        ),
        saving: false,
      });
      return { success: true, message: "Response sent. Aariy operations will decide next." };
    } catch (e: any) {
      set({ saving: false });
      return { success: false, message: e?.response?.data?.message ?? "Could not send response" };
    }
  },
}));
