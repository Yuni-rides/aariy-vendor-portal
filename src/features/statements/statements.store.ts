import { create } from "zustand";
import { STATEMENTS_MOCK } from "./statements.mock";
import { PayoutHold, Statement } from "./statements.types";

type StatementsStore = {
  loading: boolean;
  error: string | null;
  loaded: boolean;
  statements: Statement[];
  hold: PayoutHold | null;

  fetchStatements: () => Promise<void>;
};

export const useStatementsStore = create<StatementsStore>((set, get) => ({
  loading: false,
  error: null,
  loaded: false,
  statements: [],
  hold: null,

  fetchStatements: async () => {
    if (get().loaded) return;
    set({ loading: true, error: null });
    try {
      // TODO(api): const [list, hold] = await Promise.all([statementsApi.list(), statementsApi.payoutStatus()]);
      const { statements, hold } = STATEMENTS_MOCK;
      set({
        statements: [...statements].sort((a, b) => b.month.localeCompare(a.month)),
        hold,
        loading: false,
        loaded: true,
      });
    } catch (e: any) {
      set({ error: e?.response?.data?.message ?? "Something went wrong", loading: false });
    }
  },
}));
