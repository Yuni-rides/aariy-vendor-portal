"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/hooks/useToast";
import { formatPKR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth.store";
import { formatLongDate } from "@/features/orders/orders.helpers";
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
} from "@/shared/ui/seller";
import { useStatementsStore } from "../statements.store";
import { Statement } from "../statements.types";
import {
  breakdownLines,
  missingText,
  monthLabel,
  monthName,
  nextUnpaid,
  statementStatusLabelMap,
  statementStatusToneMap,
} from "../statements.helpers";
import { downloadStatementPdf } from "../statements.pdf";

export default function StatementsPage() {
  const { statements, hold, loading, error, fetchStatements } = useStatementsStore();
  const user = useAuthStore((s) => s.user);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchStatements();
  }, [fetchStatements]);

  const selected = statements.find((s) => s.id === selectedId) ?? statements[0] ?? null;
  const unpaid = nextUnpaid(statements);

  const handlePdf = async (s: Statement) => {
    setDownloading(s.id);
    try {
      const sellerName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Seller";
      await downloadStatementPdf(s, sellerName);
    } catch {
      toast({ title: "Could not create the PDF", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Statements" />

      {hold?.onHold && (
        <Panel className="border-[#E8CC8A] bg-[#FFF1D6] text-sm">
          <b>Payouts are on hold.</b> Add {missingText(hold.missing)} to receive
          {unpaid ? ` your ${monthName(unpaid)} payout` : " your payouts"}.{" "}
          {/* TODO: link to /brand-profile once that module is built */}
          <span className="text-muted-foreground">Go to Brand profile (coming soon)</span>
        </Panel>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Panel>
        <DataTable>
          <thead>
            <tr>
              <Th>Month</Th>
              <Th>Gross sales</Th>
              <Th>Refunds</Th>
              <Th>Commission</Th>
              <Th>Tax</Th>
              <Th>Reserve</Th>
              <Th>Net payout</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {statements.map((s) => (
              <tr
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={cn("cursor-pointer hover:bg-muted/60", selected?.id === s.id && "bg-secondary/50")}
                aria-selected={selected?.id === s.id}
              >
                <Td className="whitespace-nowrap font-medium">{monthLabel(s)}</Td>
                <Td className="whitespace-nowrap">{formatPKR(s.grossSales)}</Td>
                <Td className="whitespace-nowrap">{formatPKR(s.refunds)}</Td>
                <Td className="whitespace-nowrap">{formatPKR(s.commission)}</Td>
                <Td className="whitespace-nowrap">{formatPKR(s.tax)}</Td>
                <Td className="whitespace-nowrap">{formatPKR(s.reserve)}</Td>
                <Td className="whitespace-nowrap font-semibold">{formatPKR(s.netPayout)}</Td>
                <Td>
                  <StatusBadge tone={statementStatusToneMap[s.status]}>
                    {statementStatusLabelMap[s.status]}
                  </StatusBadge>
                </Td>
                <Td className="text-right">
                  <Btn
                    disabled={downloading === s.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePdf(s);
                    }}
                  >
                    PDF
                  </Btn>
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        {loading && <EmptyState>Loading...</EmptyState>}
        {!loading && statements.length === 0 && <EmptyState>No statements yet</EmptyState>}
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {selected && (
          <Panel className="flex flex-col gap-3 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <PanelTitle className="mb-0">{monthName(selected)} breakdown</PanelTitle>
              <StatusBadge tone={statementStatusToneMap[selected.status]}>
                {statementStatusLabelMap[selected.status]}
              </StatusBadge>
            </div>
            {breakdownLines(selected).map((l) => (
              <div key={l.label} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <span>{l.label}</span>
                <b className="whitespace-nowrap">
                  {l.deduct ? "− " : ""}
                  {formatPKR(l.amount)}
                </b>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm">
              <span className="font-semibold">Net payout</span>
              <b className="whitespace-nowrap text-base">{formatPKR(selected.netPayout)}</b>
            </div>
            <Muted>
              {selected.parcelCount} parcels · issued {formatLongDate(selected.issuedAt)}
              {selected.status === "PAID" && selected.paidAt && (
                <>
                  {" "}
                  · paid {formatLongDate(selected.paidAt)}
                  {selected.paymentReference && <> · ref {selected.paymentReference}</>}
                </>
              )}
              {selected.status === "HELD" && " · released once payout details are complete"}
            </Muted>
          </Panel>
        )}

        <Panel>
          <PanelTitle>How payouts work</PanelTitle>
          <p className="m-0 text-[13px] text-muted-foreground">
            Statements are issued monthly after the return window closes. Paid by bank transfer. Each statement
            matches Aariy’s ledger.
          </p>
          <p className="mb-0 mt-3 text-[13px] text-muted-foreground">
            Reserve is held back for returns still in their window and is released in a later statement.
          </p>
        </Panel>
      </div>
    </div>
  );
}
