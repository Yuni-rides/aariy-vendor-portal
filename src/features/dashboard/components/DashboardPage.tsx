"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/hooks/useToast";
import { formatPKR } from "@/lib/format";
import { useOrdersStore } from "@/features/orders/orders.store";
import { Parcel } from "@/features/orders/orders.types";
import {
  formatShortDate,
  itemsSummary,
  parcelStatusLabelMap,
  parcelStatusToneMap,
} from "@/features/orders/orders.helpers";
import { downloadParcelLabel } from "@/features/orders/orders.label";
import { useProductsStore } from "@/features/products/products.store";
import { useBrandProfileStore } from "@/features/brand-profile/brand-profile.store";
import { alertText, lowStockAlerts } from "@/features/stock/stock.helpers";
import { useStatementsStore } from "@/features/statements/statements.store";
import { monthName, nextUnpaid } from "@/features/statements/statements.helpers";
import {
  Btn,
  DataTable,
  EmptyState,
  Muted,
  PageHeader,
  Panel,
  PanelTitle,
  Td,
  Th,
  btnClass,
} from "@/shared/ui/seller";
import { useDashboardStore } from "../dashboard.store";

const INBOX_LIMIT = 5;

const accountBadge = {
  APPROVED: { label: "Approved seller", tone: "success" },
  PENDING: { label: "Approval pending", tone: "warning" },
  SUSPENDED: { label: "Suspended", tone: "danger" },
} as const;

export default function DashboardPage() {
  const { data, loading, error, fetchDashboard } = useDashboardStore();
  const { parcels, loading: ordersLoading, saving, fetchParcels, acceptParcel } = useOrdersStore();
  const brandProfile = useBrandProfileStore((s) => s.profile);
  const pickupAddresses = brandProfile?.addresses ?? [];
  const fetchProfile = useBrandProfileStore((s) => s.fetchProfile);
  const { products, loading: productsLoading, fetchProducts } = useProductsStore();
  const { statements, loaded: statementsLoaded, fetchStatements } = useStatementsStore();

  useEffect(() => {
    fetchDashboard();
    fetchParcels();
    fetchProducts();
    fetchStatements();
    fetchProfile();
  }, [fetchDashboard, fetchParcels, fetchProducts, fetchStatements, fetchProfile]);

  const upcoming = nextUnpaid(statements);

  const newCount = parcels.filter((p) => p.status === "NEW").length;
  const toDispatch = parcels.filter((p) => p.status === "ACCEPTED" || p.status === "READY_FOR_PICKUP").length;
  const alerts = useMemo(() => lowStockAlerts(products), [products]);

  const inbox = useMemo(
    () =>
      parcels
        .filter((p) => p.status !== "DELIVERED" && p.status !== "CANCELLED")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.dispatchBy.localeCompare(b.dispatchBy))
        .slice(0, INBOX_LIMIT),
    [parcels],
  );

  const defaultAddress = pickupAddresses.find((a) => a.isDefault) ?? pickupAddresses[0];

  const handleAccept = async (p: Parcel) => {
    const res = await acceptParcel(p.id, defaultAddress?.id ?? "");
    toast({ title: res.message, variant: res.success ? "default" : "destructive" });
  };

  const handleLabel = async (p: Parcel) => {
    try {
      await downloadParcelLabel(p, pickupAddresses.find((a) => a.id === p.pickupAddressId));
    } catch {
      toast({ title: "Could not create the label", variant: "destructive" });
    }
  };

  const rowAction = (p: Parcel) => {
    switch (p.status) {
      case "NEW":
        return (
          <Btn primary disabled={saving} onClick={() => handleAccept(p)}>
            Accept
          </Btn>
        );
      case "READY_FOR_PICKUP":
        return <Btn onClick={() => handleLabel(p)}>Print label</Btn>;
      case "PICKED_UP":
        return (
          <Link href={`/orders?parcel=${p.parcelNumber}`} className={btnClass()}>
            Track
          </Link>
        );
      default:
        return (
          <Link href={`/orders?parcel=${p.parcelNumber}`} className={btnClass()}>
            Open
          </Link>
        );
    }
  };

  const stats = [
    { label: "New orders", value: newCount, busy: ordersLoading },
    { label: "Awaiting dispatch", value: toDispatch, busy: ordersLoading },
    { label: "Low stock variants", value: alerts.length, busy: productsLoading },
    { label: "Net payout this month", value: data ? formatPKR(data.payout.netPayoutThisMonth) : "", busy: loading || !data },
  ];

  const badge = data ? accountBadge[data.accountStatus] : null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Dashboard">
        {badge && <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>}
        <Link href="/products/new" className={btnClass(true)}>
          Add product
        </Link>
      </PageHeader>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {stats.map((s) => (
          <Panel key={s.label}>
            <Muted>{s.label}</Muted>
            {s.busy ? <Skeleton className="mt-2 h-8 w-20" /> : <div className="text-[28px] font-semibold">{s.value}</div>}
          </Panel>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <PanelTitle className="mb-0">Order inbox</PanelTitle>
            <Muted>Confirmed by Aariy CSR before they appear here</Muted>
          </div>
          <DataTable>
            <thead>
              <tr>
                <Th>Parcel</Th>
                <Th>Items</Th>
                <Th>Dispatch by</Th>
                <Th>Amount (COD)</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {inbox.map((p) => (
                <tr key={p.id}>
                  <Td className="whitespace-nowrap">
                    <Link href={`/orders?parcel=${p.parcelNumber}`} className="hover:text-primary">
                      {p.parcelNumber}
                    </Link>
                  </Td>
                  <Td>{itemsSummary(p)}</Td>
                  <Td className="whitespace-nowrap">{formatShortDate(p.dispatchBy)}</Td>
                  <Td className="whitespace-nowrap">{formatPKR(p.codAmount)}</Td>
                  <Td>
                    <StatusBadge tone={parcelStatusToneMap[p.status]}>{parcelStatusLabelMap[p.status]}</StatusBadge>
                  </Td>
                  <Td className="text-right">{rowAction(p)}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          {ordersLoading && <EmptyState>Loading...</EmptyState>}
          {!ordersLoading && inbox.length === 0 && <EmptyState>No open orders</EmptyState>}
          {inbox.length > 0 && (
            <Link href="/orders" className="mt-3 inline-block text-[13px] text-primary hover:underline">
              View all orders
            </Link>
          )}
        </Panel>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel>
            <PanelTitle>Stock alerts</PanelTitle>
            <div className="flex flex-col gap-3">
              {alerts.map((a) => (
                <div key={a.variantId} className="flex items-center justify-between gap-3 text-sm">
                  <span>{a.label}</span>
                  <StatusBadge tone={a.tone}>{alertText(a.available)}</StatusBadge>
                </div>
              ))}
              {!productsLoading && alerts.length === 0 && <Muted>All variants are well stocked.</Muted>}
              {alerts.length > 0 && (
                <Link href="/stock" className="text-[13px] text-primary hover:underline">
                  Update stock
                </Link>
              )}
            </div>
          </Panel>

          <Panel>
            <PanelTitle>Next payout</PanelTitle>
            {!statementsLoaded ? (
              <Skeleton className="my-2 h-16 w-full" />
            ) : upcoming ? (
              <>
                <Muted>Statement for {monthName(upcoming)}, after 7-day return window closes</Muted>
                <div className="my-2 text-[28px] font-semibold">{formatPKR(upcoming.netPayout)}</div>
              </>
            ) : (
              <Muted className="mb-3">All statements are paid.</Muted>
            )}
            <Link href="/statements" className={btnClass()}>
              View statement
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}
