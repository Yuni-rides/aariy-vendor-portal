export type ReturnStatus = "NEEDS_RESPONSE" | "RESPONDED" | "CLOSED";

/** Aariy operations decide after the seller responds. */
export type ReturnDecision = "ACCEPTED" | "PARTIAL_REFUND" | "REJECTED";

export type ReturnResponse = {
  notes: string;
  /** Evidence photo URLs. */
  evidence: string[];
  respondedAt: string;
};

export type ReturnRequest = {
  id: string;
  returnNumber: string;
  parcelNumber: string;
  itemName: string;
  qty: number;
  buyerReason: string;
  /** Photos the buyer attached. */
  buyerPhotos: string[];
  deliveredAt: string;
  windowEndsAt: string;
  status: ReturnStatus;
  response?: ReturnResponse | null;
  decision?: ReturnDecision | null;
  decisionNote?: string | null;
};

export type ReturnTab = ReturnStatus;

export type ReturnResult = { success: boolean; message: string };
