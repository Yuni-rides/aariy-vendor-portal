import type { StatusTone } from "@/components/ui/StatusBadge";
import { ReturnDecision, ReturnStatus, ReturnTab } from "./returns.types";

export const returnStatusLabelMap: Record<ReturnStatus, string> = {
  NEEDS_RESPONSE: "Needs response",
  RESPONDED: "Responded",
  CLOSED: "Closed",
};

export const returnStatusToneMap: Record<ReturnStatus, StatusTone> = {
  NEEDS_RESPONSE: "warning",
  RESPONDED: "info",
  CLOSED: "neutral",
};

export const decisionLabelMap: Record<ReturnDecision, string> = {
  ACCEPTED: "Return accepted",
  PARTIAL_REFUND: "Partial refund",
  REJECTED: "Return rejected",
};

export const decisionToneMap: Record<ReturnDecision, StatusTone> = {
  ACCEPTED: "success",
  PARTIAL_REFUND: "warning",
  REJECTED: "danger",
};

export const RETURN_TABS: { value: ReturnTab; label: string; showCount?: boolean; listTitle: string }[] = [
  { value: "NEEDS_RESPONSE", label: "Open", showCount: true, listTitle: "Open" },
  { value: "RESPONDED", label: "Responded", listTitle: "Responded" },
  { value: "CLOSED", label: "Closed", listTitle: "Closed" },
];

export const MAX_EVIDENCE = 6;
