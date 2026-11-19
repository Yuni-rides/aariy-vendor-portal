import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "@/features/auth/auth.store";
import { formatPkMobile } from "@/features/auth/auth.helpers";
import { OnboardingDraft, OnboardingResult, OnboardingState, StepKey } from "./onboarding.types";
import { SELLER_AGREEMENT, STEPS, emptyDraft, validateStep } from "./onboarding.helpers";

type Prefill = { fullName?: string; phone: string; email?: string; brandName?: string };

type OnboardingStore = OnboardingState & {
  saving: boolean;
  /** Makes sure the stored draft belongs to this account; starts a new one if not. */
  ensureFor: (prefill: Prefill) => void;
  /** Saves one step. Only valid steps are marked complete (SOW 4.2: each step saves). */
  saveStep: (step: StepKey, draft: OnboardingDraft) => Promise<OnboardingResult>;
  submit: () => Promise<OnboardingResult>;
  /** TEST MODE ONLY: stands in for the Aariy reviewer approving the application. */
  approveForTesting: () => void;
};

const initial = (): OnboardingState => ({
  ownerPhone: null,
  draft: emptyDraft(),
  completed: [],
  status: "ONBOARDING",
  submittedAt: null,
  contract: null,
  reviewNote: null,
});

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      ...initial(),
      saving: false,

      ensureFor: (p) => {
        if (get().ownerPhone === p.phone) return;
        const draft = emptyDraft();
        draft.about = {
          ...draft.about,
          fullName: p.fullName ?? "",
          phone: p.phone.startsWith("+92") ? formatPkMobile(p.phone) : p.phone,
          email: p.email ?? "",
        };
        if (p.brandName?.trim()) draft.brands = [{ id: `b-${Date.now()}`, name: p.brandName.trim(), relation: "OWNER" }];
        set({ ...initial(), ownerPhone: p.phone, draft });
      },

      saveStep: async (step, draft) => {
        const errors = validateStep(step, draft);
        if (Object.keys(errors).length) return { success: false, message: "Please fix the highlighted fields." };
        set({ saving: true });
        try {
          // TODO(api): PATCH /v1/seller/onboarding/:step with this step's data.
          const completed = Array.from(new Set([...get().completed, step]));
          set({ draft, completed, saving: false });
          return { success: true, message: "Saved." };
        } catch (e: any) {
          set({ saving: false });
          return { success: false, message: e?.response?.data?.message ?? "Could not save this step." };
        }
      },

      submit: async () => {
        const { draft } = get();
        const missing = STEPS.find((s) => Object.keys(validateStep(s.key, draft)).length);
        if (missing) return { success: false, message: `Finish the "${missing.title}" step first.` };
        set({ saving: true });
        try {
          // TODO(api): POST /v1/seller/onboarding/submit; the API stores the contract version and time.
          const now = new Date().toISOString();
          set({
            status: "SUBMITTED",
            submittedAt: now,
            reviewNote: null,
            contract: { version: SELLER_AGREEMENT.version, acceptedAt: now, signatureName: draft.declaration.signatureName.trim() },
            saving: false,
          });
          useAuthStore.getState().patchUser({ accountStatus: "SUBMITTED" });
          return { success: true, message: "Sent for review. Aariy will email you about the next steps." };
        } catch (e: any) {
          set({ saving: false });
          return { success: false, message: e?.response?.data?.message ?? "Could not submit." };
        }
      },

      approveForTesting: () => {
        set({ status: "APPROVED" });
        useAuthStore.getState().patchUser({ accountStatus: "APPROVED" });
      },
    }),
    {
      // TODO(api): drop local persistence once each step saves to the API.
      name: "onboarding-draft",
      version: 1,
      // v0 drafts used NTN_CERTIFICATE / BRAND_AUTHORISATION and had no other documents.
      migrate: (persisted: any) => {
        const docs = persisted?.draft?.documents ?? {};
        const { NTN_CERTIFICATE, BRAND_AUTHORISATION, ...rest } = docs;
        if (persisted?.draft) {
          persisted.draft.documents = {
            ...rest,
            ...(NTN_CERTIFICATE ? { TAX_CERTIFICATE: NTN_CERTIFICATE } : {}),
            ...(BRAND_AUTHORISATION ? { BRAND_AUTHORIZATION: BRAND_AUTHORISATION } : {}),
          };
          persisted.draft.otherDocuments = persisted.draft.otherDocuments ?? [];
        }
        return persisted;
      },
      partialize: ({ saving, ...rest }) => rest,
    },
  ),
);
