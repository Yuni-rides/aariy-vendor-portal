"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/hooks/useToast";
import { formatPKR } from "@/lib/format";
import {
  Btn,
  ChipTabs,
  DataTable,
  EmptyState,
  Field,
  ListItem,
  Muted,
  PageHeader,
  Panel,
  PanelTitle,
  SummaryRow,
  Td,
  Th,
  fieldClass,
} from "@/shared/ui/seller";
import { useOrdersStore } from "../orders.store";
import { OrderResult, OrderTab, Parcel } from "../orders.types";
import {
  ORDER_TABS,
  commissionAmount,
  formatLongDate,
  formatShortDate,
  matchesTab,
  parcelStatusLabelMap,
  parcelStatusToneMap,
  tabForStatus,
} from "../orders.helpers";
import { downloadParcelLabel } from "../orders.label";

export default function OrdersPage() {
  const router = useRouter();
  const { parcels, loading, error, fetchParcels } = useOrdersStore();

  // Deep link from the dashboard: /orders?parcel=ARY-1042-A
  const linked = useSearchParams().get("parcel");

  const [tab, setTab] = useState<OrderTab>("NEW");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchParcels();
  }, [fetchParcels]);

  // Open the linked parcel once data is in.
  useEffect(() => {
    if (!linked || !parcels.length) return;
    const p = parcels.find((x) => x.parcelNumber === linked);
    if (p) {
      setTab(tabForStatus(p.status));
      setSelectedId(p.id);
    }
  }, [linked, parcels]);

  const counts = useMemo(() => {
    const c = {} as Record<OrderTab, number>;
    ORDER_TABS.forEach((t) => (c[t.value] = parcels.filter((p) => matchesTab(p, t.value)).length));
    return c;
  }, [parcels]);

  const list = useMemo(
    () =>
      parcels
        .filter((p) => matchesTab(p, tab))
        .sort((a, b) => a.dispatchBy.localeCompare(b.dispatchBy)),
    [parcels, tab],
  );

  // Keep a valid selection: the chosen parcel if it's in this tab, else the first one.
  const selected = list.find((p) => p.id === selectedId) ?? list[0] ?? null;

  const changeTab = (t: OrderTab) => {
    setTab(t);
    setSelectedId(null);
    if (linked) router.replace("/orders");
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Orders" />

      <ChipTabs
        value={tab}
        onChange={changeTab}
        options={ORDER_TABS.map((t) => ({
          value: t.value,
          label: t.label,
          count: t.showCount ? counts[t.value] : undefined,
        }))}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="flex flex-col gap-3 self-start">
          <PanelTitle className="mb-0">{ORDER_TABS.find((t) => t.value === tab)?.label}</PanelTitle>
          {loading && <EmptyState>Loading...</EmptyState>}
          {!loading && list.length === 0 && <EmptyState>No parcels here</EmptyState>}
          {list.map((p) => (
            <ListItem key={p.id} active={selected?.id === p.id} onClick={() => setSelectedId(p.id)}>
              <div className="flex items-center justify-between gap-3">
                <span>{p.parcelNumber}</span>
                <StatusBadge tone={parcelStatusToneMap[p.status]}>
                  {parcelStatusLabelMap[p.status]}
                </StatusBadge>
              </div>
              <div className="text-[13px] font-normal text-muted-foreground">
                {formatPKR(p.codAmount)} · dispatch by {formatShortDate(p.dispatchBy)}
              </div>
            </ListItem>
          ))}
        </Panel>

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          {selected ? <ParcelDetail key={selected.id} parcel={selected} /> : !loading && (
            <Panel>
              <EmptyState>Select a parcel to see its details</EmptyState>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Detail ---------------- */

function ParcelDetail({ parcel }: { parcel: Parcel }) {
  const { pickupAddresses, saving, acceptParcel, rejectParcel, markReady } = useOrdersStore();
  const defaultAddress = pickupAddresses.find((a) => a.isDefault) ?? pickupAddresses[0];
  const [addressId, setAddressId] = useState(parcel.pickupAddressId ?? defaultAddress?.id ?? "");
  const [confirmReject, setConfirmReject] = useState(false);
  const address = pickupAddresses.find((a) => a.id === (parcel.pickupAddressId ?? addressId));

  const notify = (res: OrderResult) =>
    toast({ title: res.message, variant: res.success ? "default" : "destructive" });

  const handleLabel = async () => {
    try {
      await downloadParcelLabel(parcel, address);
    } catch {
      toast({ title: "Could not create the label", variant: "destructive" });
    }
  };

  return (
    <>
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <PanelTitle className="mb-0">{parcel.parcelNumber} · your parcel</PanelTitle>
            <Muted>
              Buyer: {parcel.buyerFirstName}, {parcel.buyerCity} · Order confirmed by Aariy on{" "}
              {formatShortDate(parcel.confirmedAt)}
            </Muted>
          </div>
          <StatusBadge tone={parcelStatusToneMap[parcel.status]}>
            {parcelStatusLabelMap[parcel.status]}
          </StatusBadge>
        </div>
      </Panel>

      <Panel>
        <PanelTitle>Items</PanelTitle>
        <DataTable>
          <thead>
            <tr>
              <Th>Item</Th>
              <Th>Size</Th>
              <Th>SKU</Th>
              <Th>Qty</Th>
              <Th>Price</Th>
            </tr>
          </thead>
          <tbody>
            {parcel.items.map((i) => (
              <tr key={i.id}>
                <Td>{i.name}</Td>
                <Td>{i.size}</Td>
                <Td>{i.sku}</Td>
                <Td>{i.qty}</Td>
                <Td className="whitespace-nowrap">{formatPKR(i.price)}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        <SummaryRow label="COD amount the courier collects for this parcel" className="mt-3">
          <b>{formatPKR(parcel.codAmount)}</b>
        </SummaryRow>
        <SummaryRow label="Aariy commission">
          <span>
            {parcel.commissionRate}% · {formatPKR(commissionAmount(parcel))}
          </span>
        </SummaryRow>
      </Panel>

      <Panel className="flex flex-col gap-3">
        <PanelTitle className="mb-0">Dispatch</PanelTitle>
        <div className="flex flex-wrap gap-3">
          <Field label="Dispatch by" htmlFor="d" className="min-w-[180px] flex-1">
            <input id="d" className={fieldClass} value={formatLongDate(parcel.dispatchBy)} readOnly />
          </Field>
          <Field label="Courier picks up from" htmlFor="pa" className="min-w-[180px] flex-1">
            <select
              id="pa"
              className={fieldClass}
              value={parcel.pickupAddressId ?? addressId}
              disabled={parcel.status !== "NEW"}
              onChange={(e) => setAddressId(e.target.value)}
            >
              {pickupAddresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}, {a.address}, {a.city}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {parcel.status === "NEW" && (
          <>
            <div className="flex flex-wrap gap-3">
              <Btn primary disabled={saving} onClick={async () => notify(await acceptParcel(parcel.id, addressId))}>
                Accept order
              </Btn>
              <Btn disabled={saving} onClick={() => setConfirmReject(true)}>
                Reject, out of stock
              </Btn>
            </div>
            <Muted>
              After accepting: mark ready for pickup, download the label. Courier collects the parcel, you do
              not ship it yourself.
            </Muted>
          </>
        )}

        {parcel.status === "ACCEPTED" && (
          <>
            <div className="flex flex-wrap gap-3">
              <Btn primary disabled={saving} onClick={async () => notify(await markReady(parcel.id))}>
                Mark ready for pickup
              </Btn>
              <Btn onClick={handleLabel}>Download label</Btn>
            </div>
            <Muted>Pack the parcel and stick the label on it, then mark it ready so the courier is booked.</Muted>
          </>
        )}

        {parcel.status === "READY_FOR_PICKUP" && (
          <>
            <div className="flex flex-wrap gap-3">
              <Btn primary onClick={handleLabel}>
                Print label
              </Btn>
            </div>
            <Muted>The courier will collect the parcel from {address?.label ?? "your pickup address"}.</Muted>
          </>
        )}

        {(parcel.status === "PICKED_UP" || parcel.status === "DELIVERED") && (
          <Muted>
            {parcel.status === "PICKED_UP" ? "Picked up by the courier." : "Delivered to the buyer."}
            {parcel.trackingNumber && <> Tracking number: <b className="text-foreground">{parcel.trackingNumber}</b></>}
          </Muted>
        )}

        {parcel.status === "CANCELLED" && <Muted>{parcel.cancelReason ?? "This parcel was cancelled."}</Muted>}
      </Panel>

      <ConfirmDialog
        open={confirmReject}
        title={`Reject ${parcel.parcelNumber}?`}
        description="The order is cancelled because the item is out of stock. Aariy will let the buyer know. This cannot be undone."
        confirmLabel="Reject order"
        destructive
        loading={saving}
        onClose={() => setConfirmReject(false)}
        onConfirm={async () => {
          const res = await rejectParcel(parcel.id);
          setConfirmReject(false);
          notify(res);
        }}
      />
    </>
  );
}
