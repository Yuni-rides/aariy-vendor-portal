import { create } from "zustand";
import { BRAND_PROFILE_MOCK } from "./brand-profile.mock";
import {
  AddressInput,
  BankInput,
  BrandProfile,
  PickupAddress,
  ProfileResult,
  PublicProfile,
} from "./brand-profile.types";
import {
  diffPublic,
  isValidNtn,
  maskNtn,
  normaliseIban,
  normaliseNtn,
  validateAddress,
  validateBank,
  validatePublic,
  withPending,
} from "./brand-profile.helpers";

type BrandProfileStore = {
  loading: boolean;
  saving: boolean;
  error: string | null;
  loaded: boolean;
  profile: BrandProfile | null;

  fetchProfile: () => Promise<void>;
  submitPublic: (draft: PublicProfile) => Promise<ProfileResult>;
  addNtn: (ntn: string) => Promise<ProfileResult>;
  saveAddress: (id: string | null, input: AddressInput) => Promise<ProfileResult>;
  setDefaultAddress: (id: string) => Promise<ProfileResult>;
  removeAddress: (id: string, inUse: boolean) => Promise<ProfileResult>;
  changeBank: (input: BankInput) => Promise<ProfileResult>;
};

const ok = (message: string): ProfileResult => ({ success: true, message });
const no = (message: string): ProfileResult => ({ success: false, message });

export const useBrandProfileStore = create<BrandProfileStore>((set, get) => {
  /** Runs a local update with the saving flag; `fn` returns the result. */
  const run = async (fn: (p: BrandProfile) => ProfileResult): Promise<ProfileResult> => {
    const p = get().profile;
    if (!p) return no("Profile is still loading");
    set({ saving: true });
    try {
      return fn(p);
    } catch (e: any) {
      return no(e?.response?.data?.message ?? "Something went wrong");
    } finally {
      set({ saving: false });
    }
  };
  const update = (patch: Partial<BrandProfile>) => set({ profile: { ...get().profile!, ...patch } });

  return {
    loading: false,
    saving: false,
    error: null,
    loaded: false,
    profile: null,

    fetchProfile: async () => {
      if (get().loaded) return;
      set({ loading: true, error: null });
      try {
        // TODO(api): const res = await profileApi.get();
        set({ profile: BRAND_PROFILE_MOCK, loading: false, loaded: true });
      } catch (e: any) {
        set({ error: e?.response?.data?.message ?? "Something went wrong", loading: false });
      }
    },

    // TODO(api): POST /seller/profile/public-changes { ...changedFields }
    submitPublic: (draft) =>
      run((p) => {
        if (Object.keys(validatePublic(draft)).length) return no("Please fix the highlighted fields.");
        const newChanges = diffPublic(withPending(p), draft);
        if (!Object.keys(newChanges).length) return no("No new changes to submit.");
        // Keep only fields that really differ from what is live now.
        const values = diffPublic(p.live, draft);
        update({
          pending: Object.keys(values).length ? { submittedAt: new Date().toISOString(), values } : null,
        });
        return ok("Changes sent to Aariy staff for review.");
      }),

    // TODO(api): POST /seller/profile/ntn { ntn }  (allowed once, then locked)
    addNtn: (ntn) =>
      run((p) => {
        if (p.legal.ntnMasked) return no("NTN is already on file. Contact Aariy to change it.");
        if (!isValidNtn(ntn)) return no("Enter a valid NTN, e.g. 1234567-8.");
        update({ legal: { ...p.legal, ntnMasked: maskNtn(normaliseNtn(ntn)) } });
        return ok("NTN saved.");
      }),

    // TODO(api): POST /seller/pickup-addresses or PATCH /seller/pickup-addresses/:id
    saveAddress: (id, input) =>
      run((p) => {
        if (Object.keys(validateAddress(input)).length) return no("Please fix the highlighted fields.");
        const clean: AddressInput = {
          ...input,
          label: input.label.trim(),
          address: input.address.trim(),
          contactName: input.contactName?.trim(),
          phone: input.phone?.trim(),
        };
        if (id) {
          update({ addresses: p.addresses.map((a) => (a.id === id ? { ...a, ...clean } : a)) });
          return ok("Address updated.");
        }
        const next: PickupAddress = { ...clean, id: `addr-${Date.now()}`, isDefault: p.addresses.length === 0 };
        update({ addresses: [...p.addresses, next] });
        return ok("Address added.");
      }),

    // TODO(api): POST /seller/pickup-addresses/:id/default
    setDefaultAddress: (id) =>
      run((p) => {
        update({ addresses: p.addresses.map((a) => ({ ...a, isDefault: a.id === id })) });
        return ok("Default pickup address updated.");
      }),

    // TODO(api): DELETE /seller/pickup-addresses/:id (backend should also refuse if parcels use it)
    removeAddress: (id, inUse) =>
      run((p) => {
        const a = p.addresses.find((x) => x.id === id);
        if (!a) return no("Address not found");
        if (a.isDefault) return no("Make another address the default first.");
        if (inUse) return no("Parcels waiting for pickup use this address. Remove it after they are collected.");
        update({ addresses: p.addresses.filter((x) => x.id !== id) });
        return ok("Address removed.");
      }),

    // TODO(api): PUT /seller/bank-account { bankName, accountTitle, iban }
    changeBank: (input) =>
      run(() => {
        if (Object.keys(validateBank(input)).length) return no("Please fix the highlighted fields.");
        const iban = normaliseIban(input.iban);
        update({
          bank: {
            bankName: input.bankName,
            accountTitle: input.accountTitle.trim(),
            ibanLast4: iban.slice(-4),
            status: "PENDING",
          },
        });
        return ok("Bank account saved. Aariy will verify it before the next payout.");
      }),
  };
});
