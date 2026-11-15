import { DashboardData } from "./dashboard.types";

// TODO(api): replace with GET /seller/dashboard (payout numbers come from the statements ledger)
export const DASHBOARD_MOCK: DashboardData = {
  accountStatus: "APPROVED",
  payout: {
    netPayoutThisMonth: 182500,
  },
};
