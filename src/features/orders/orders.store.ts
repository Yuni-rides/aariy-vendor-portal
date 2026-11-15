import { create } from "zustand";
import { PARCELS_MOCK, PICKUP_ADDRESSES_MOCK } from "./orders.mock";
import { OrderResult, Parcel, ParcelStatus, PickupAddress } from "./orders.types";

type OrdersStore = {
  loading: boolean;
  saving: boolean;
  error: string | null;
  loaded: boolean;
  parcels: Parcel[];
  pickupAddresses: PickupAddress[];

  fetchParcels: () => Promise<void>;
  acceptParcel: (id: string, pickupAddressId: string) => Promise<OrderResult>;
  rejectParcel: (id: string) => Promise<OrderResult>;
  markReady: (id: string) => Promise<OrderResult>;
};

export const useOrdersStore = create<OrdersStore>((set, get) => {
  const transition = (
    id: string,
    from: ParcelStatus[],
    patch: Partial<Parcel>,
    message: string,
  ): OrderResult => {
    const parcel = get().parcels.find((p) => p.id === id);
    if (!parcel) return { success: false, message: "Parcel not found" };
    if (!from.includes(parcel.status)) {
      return { success: false, message: "This parcel has already moved on. Refresh and try again." };
    }
    set({
      parcels: get().parcels.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p,
      ),
    });
    return { success: true, message };
  };

  const run = async (fn: () => OrderResult): Promise<OrderResult> => {
    set({ saving: true });
    try {
      return fn();
    } catch (e: any) {
      return { success: false, message: e?.response?.data?.message ?? "Something went wrong" };
    } finally {
      set({ saving: false });
    }
  };

  return {
    loading: false,
    saving: false,
    error: null,
    loaded: false,
    parcels: [],
    pickupAddresses: [],

    fetchParcels: async () => {
      if (get().loaded) return;
      set({ loading: true, error: null });
      try {
        // TODO(api): const [parcels, addresses] = await Promise.all([ordersApi.list(), ordersApi.pickupAddresses()]);
        set({
          parcels: PARCELS_MOCK,
          pickupAddresses: PICKUP_ADDRESSES_MOCK,
          loading: false,
          loaded: true,
        });
      } catch (e: any) {
        set({ error: e?.response?.data?.message ?? "Something went wrong", loading: false });
      }
    },

    // TODO(api): POST /seller/parcels/:id/accept { pickupAddressId }
    acceptParcel: (id, pickupAddressId) =>
      run(() => {
        if (!pickupAddressId) return { success: false, message: "Choose a pickup address." };
        return transition(id, ["NEW"], { status: "ACCEPTED", pickupAddressId }, "Order accepted. Pack it and mark it ready for pickup.");
      }),

    // TODO(api): POST /seller/parcels/:id/reject { reason: "OUT_OF_STOCK" }
    rejectParcel: (id) =>
      run(() =>
        transition(
          id,
          ["NEW"],
          { status: "CANCELLED", cancelReason: "Rejected by seller: out of stock" },
          "Order rejected. Aariy will let the buyer know.",
        ),
      ),

    // TODO(api): POST /seller/parcels/:id/ready  (books the courier pickup)
    markReady: (id) =>
      run(() =>
        transition(id, ["ACCEPTED"], { status: "READY_FOR_PICKUP" }, "Marked ready. The courier will collect the parcel."),
      ),
  };
});
