import { create } from "zustand";
import { STATEMENTS_MOCK } from "./statements.mock";
import { Statement } from "./statements.types";

type StatementsStore = {
  loading: boolean;
  error: string | null;
  loaded: boolean;
  statements: Statement[];

  fetchStatements: () => Promise<void>;
};

export const useStatementsStore = create<StatementsStore>((set, get) => ({
  loading: false,
  error: null,
  loaded: false,
  statements: [],

  fetchStatements: async () => {
    if (get().loaded) return;
    set({ loading: true, error: null });
    try {
      // TODO(api): const res = await statementsApi.list();
      const { statements } = STATEMENTS_MOCK;
      set({
        statements: [...statements].sort((a, b) => b.month.localeCompare(a.month)),
        loading: false,
        loaded: true,
      });
    } catch (e: any) {
      set({ error: e?.response?.data?.message ?? "Something went wrong", loading: false });
    }
  },
}));
