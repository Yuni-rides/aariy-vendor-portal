"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/hooks/useToast";
import { formatPKR } from "@/lib/format";
import { cn } from "@/lib/utils";
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
import { useBrandProfileStore } from "@/features/brand-profile/brand-profile.store";
import { useOrdersStore } from "../orders.store";
import { OrderResult, OrderTab, Parcel } from "../orders.types";
import {
  ORDER_TABS,
  DispatchErrors,
  commissionAmount,
  effectiveDispatchDate,
  formatDateTime,
  toLocalInput,
  validateDispatch,
  validateDispatchDate,
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
        .sort((a, b) => effectiveDispatchDate(a).localeCompare(effectiveDispatchDate(b))),
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
                {formatPKR(p.codAmount)} · dispatch by {formatShortDate(effectiveDispatchDate(p))}
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
  const { saving, acceptParcel, rejectParcel, markReady } = useOrdersStore();
  const brandProfile = useBrandProfileStore((s) => s.profile);
  const pickupAddresses = brandProfile?.addresses ?? [];
  const fetchProfile = useBrandProfileStore((s) => s.fetchProfile);
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);
  const defaultAddress = pickupAddresses.find((a) => a.isDefault) ?? pickupAddresses[0];
  const [chosenId, setAddressId] = useState<string | null>(parcel.pickupAddressId);
  // Fall back to the default address until the seller picks one (addresses may load after mount).
  const addressId = chosenId ?? defaultAddress?.id ?? "";
  const [confirmReject, setConfirmReject] = useState(false);
  const [dispatchDate, setDispatchDate] = useState(parcel.plannedDispatchDate ?? parcel.dispatchBy);
  const dateError = parcel.status === "NEW" ? validateDispatchDate(parcel, dispatchDate) : null;
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
          {parcel.status === "NEW" ? (
            <Field label="Dispatch date" htmlFor="d" error={dateError ?? undefined} className="min-w-[180px] flex-1">
              <input
                id="d"
                type="date"
                className={fieldClass}
                value={dispatchDate}
                max={parcel.dispatchBy}
                min={parcel.confirmedAt.slice(0, 10)}
                onChange={(e) => setDispatchDate(e.target.value)}
              />
              {!dateError && (
                <p className="mb-0 mt-1 text-xs text-muted-foreground">
                  Promised to the buyer: by {formatLongDate(parcel.dispatchBy)}. You can pick an earlier day.
                </p>
              )}
            </Field>
          ) : (
            <Field label="Dispatch date" htmlFor="d" className="min-w-[180px] flex-1">
              <input id="d" className={fieldClass} value={formatLongDate(effectiveDispatchDate(parcel))} readOnly />
            </Field>
          )}
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
              <Btn
                primary
                disabled={saving || !!dateError}
                onClick={async () => notify(await acceptParcel(parcel.id, addressId, dispatchDate))}
              >
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
              <Btn onClick={handleLabel}>Print label</Btn>
            </div>
            <Muted>
              The courier will collect the parcel from {address?.label ?? "your pickup address"}. When it leaves,
              record the dispatch below.
            </Muted>
            <DispatchForm parcel={parcel} onDone={notify} />
          </>
        )}

        {(parcel.status === "PICKED_UP" || parcel.status === "DELIVERED") && (
          <Muted>
            {parcel.status === "PICKED_UP" ? "Dispatched" : "Delivered to the buyer"}
            {parcel.dispatchedAt && <> on {formatDateTime(parcel.dispatchedAt)}</>}.
            {parcel.trackingNumber && <> Tracking number: <b className="text-foreground">{parcel.trackingNumber}</b>.</>}
            {parcel.labelFileName && <> Label: {parcel.labelFileName}.</>}
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

/* ---------------- Record dispatch ---------------- */

function DispatchForm({ parcel, onDone }: { parcel: Parcel; onDone: (res: OrderResult) => void }) {
  const { saving, recordDispatch } = useOrdersStore();
  const [tracking, setTracking] = useState("");
  const [when, setWhen] = useState(() => toLocalInput(new Date()));
  const [labelFile, setLabelFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<DispatchErrors>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // datetime-local has no zone; Date reads it as local time.
    const dispatchedAt = when ? new Date(when).toISOString() : "";
    const input = { trackingNumber: tracking, dispatchedAt, labelFileName: labelFile?.name ?? null };
    const errs = validateDispatch(input);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    // TODO(api): upload the label file to storage with the dispatch request.
    onDone(await recordDispatch(parcel.id, input));
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="text-sm font-semibold">Record dispatch</div>
      <div className="flex flex-wrap gap-3">
        <Field label="Tracking number" htmlFor="tn" error={errors.trackingNumber} className="min-w-[180px] flex-1">
          <input
            id="tn"
            autoComplete="off"
            className={fieldClass}
            placeholder="e.g. LEO-88231904"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
          />
        </Field>
        <Field label="Dispatched at" htmlFor="dt" error={errors.dispatchedAt} className="min-w-[180px] flex-1">
          <input
            id="dt"
            type="datetime-local"
            className={fieldClass}
            value={when}
            max={toLocalInput(new Date())}
            onChange={(e) => setWhen(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Courier label (optional, if the courier gave you one)" htmlFor="lf">
        <input
          id="lf"
          type="file"
          accept="application/pdf,image/*"
          className={cn(fieldClass, "py-2")}
          onChange={(e) => setLabelFile(e.target.files?.[0] ?? null)}
        />
      </Field>
      <div>
        <Btn primary type="submit" disabled={saving}>
          Save dispatch
        </Btn>
      </div>
    </form>
  );
}
