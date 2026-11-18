export type StatementStatus = "PENDING" | "HELD" | "PAID";

/** What the seller still has to add before payouts are released. */
export type PayoutRequirement = "NTN" | "VERIFIED_BANK_ACCOUNT";

/**
 * Monthly statement. All amounts are in PKR and come from Aariy's ledger;
 * the portal shows them as they are and never recalculates them.
 */
export type Statement = {
  id: string;
  /** First day of the month, e.g. "2026-10-01". */
  month: string;
  parcelCount: number;
  grossSales: number;
  refunds: number;
  /** Aariy commission in percent, per parcel. */
  commissionRate: number;
  commission: number;
  /** Withholding tax. */
  tax: number;
  /** Held back until the return window closes; released in a later statement. */
  reserve: number;
  netPayout: number;
  status: StatementStatus;
  /** Date the statement was issued (after the return window closed). */
  issuedAt: string;
  paidAt?: string | null;
  /** Bank transfer reference, once paid. */
  paymentReference?: string | null;
};

export type PayoutHold = {
  onHold: boolean;
  missing: PayoutRequirement[];
};

export type StatementsData = {
  statements: Statement[];
};
