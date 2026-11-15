import { format, parseISO } from "date-fns";
import type { StatusTone } from "@/components/ui/StatusBadge";
import { PayoutRequirement, Statement, StatementStatus } from "./statements.types";

export const statementStatusLabelMap: Record<StatementStatus, string> = {
  PENDING: "Pending",
  HELD: "Held",
  PAID: "Paid",
};

export const statementStatusToneMap: Record<StatementStatus, StatusTone> = {
  PENDING: "info",
  HELD: "warning",
  PAID: "success",
};

const requirementLabelMap: Record<PayoutRequirement, string> = {
  NTN: "your NTN",
  VERIFIED_BANK_ACCOUNT: "a verified bank account",
};

/** "your NTN and a verified bank account" */
export const missingText = (missing: PayoutRequirement[]) => {
  const parts = missing.map((m) => requirementLabelMap[m]);
  return parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
};

/** "October 2026" */
export const monthLabel = (s: Statement) => format(parseISO(s.month), "MMMM yyyy");
/** "October" */
export const monthName = (s: Statement) => format(parseISO(s.month), "MMMM");

/** The statement waiting to be paid (newest first), if any. */
export const nextUnpaid = (statements: Statement[]) =>
  [...statements].sort((a, b) => b.month.localeCompare(a.month)).find((s) => s.status !== "PAID");

/** Breakdown lines in the order they appear on the statement. */
export const breakdownLines = (s: Statement) => [
  { label: "Gross sales", amount: s.grossSales, deduct: false },
  { label: "Refunds", amount: s.refunds, deduct: true },
  { label: `Aariy commission (${s.commissionRate}% per parcel)`, amount: s.commission, deduct: true },
  { label: "Tax", amount: s.tax, deduct: true },
  { label: "Held in reserve (return window)", amount: s.reserve, deduct: true },
];
