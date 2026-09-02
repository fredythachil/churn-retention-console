import type { OutreachStage, OutreachSubStage, RiskTier } from "./api";

export const STAGE_LABELS: Record<OutreachStage, string> = {
  NOT_CONTACTED: "Not contacted",
  IN_PROGRESS: "In progress",
  RETAINED: "Retained",
  LOST: "Lost",
};

export const SUB_STAGE_LABELS: Record<OutreachSubStage, string> = {
  AWAITING_CUSTOMER: "Awaiting customer",
  CALLBACK_DUE: "Callback due",
  NO_ANSWER: "No answer",
  OFFER_ACCEPTED: "Offer accepted",
  NO_OFFER_NEEDED: "Stayed, no offer",
  PRICE: "Left over price",
  SERVICE: "Left over service",
  UNREACHABLE: "Never reachable",
};

export const TIER_LABELS: Record<RiskTier, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const FACTOR_LABELS: Record<string, string> = {
  contract: "Contract type",
  tenure: "Time as customer",
  payment_method: "Payment method",
  internet_service: "Internet service",
  protective_add_ons: "Protective add-ons",
  demographics: "Household",
};

// Which sub-stages a given stage allows - mirrors ALLOWED_SUB_STAGES on the
// backend so the UI only offers valid combinations. The API still validates.
export const SUB_STAGES_FOR_STAGE: Record<OutreachStage, OutreachSubStage[]> = {
  NOT_CONTACTED: [],
  IN_PROGRESS: ["AWAITING_CUSTOMER", "CALLBACK_DUE", "NO_ANSWER"],
  RETAINED: ["OFFER_ACCEPTED", "NO_OFFER_NEEDED"],
  LOST: ["PRICE", "SERVICE", "UNREACHABLE"],
};
// Mirrors ALLOWED_TRANSITIONS on the backend. Every stage self-transitions so a
// note or a sub-stage correction can be logged without moving the customer.

export const NEXT_STAGES: Record<OutreachStage, OutreachStage[]> = {
  NOT_CONTACTED: ["NOT_CONTACTED", "IN_PROGRESS"],
  IN_PROGRESS: ["IN_PROGRESS", "RETAINED", "LOST"],
  RETAINED: ["RETAINED", "IN_PROGRESS"],
  LOST: ["LOST", "IN_PROGRESS"],
};
