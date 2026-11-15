export type SellerAccountStatus = "APPROVED" | "PENDING" | "SUSPENDED";

export type PayoutSummary = {
  /** Net payout for the current month so far. */
  netPayoutThisMonth: number;
};

export type DashboardData = {
  accountStatus: SellerAccountStatus;
  payout: PayoutSummary;
};
