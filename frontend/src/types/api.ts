export type RiskTier = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type OutreachStage = "NOT_CONTACTED" | "IN_PROGRESS" | "RETAINED" | "LOST";

export type OutreachSubStage =
  | "AWAITING_CUSTOMER"
  | "CALLBACK_DUE"
  | "NO_ANSWER"
  | "OFFER_ACCEPTED"
  | "NO_OFFER_NEEDED"
  | "PRICE"
  | "SERVICE"
  | "UNREACHABLE";

export interface CustomerSummary {
  customer_id: string;
  tenure: number;
  contract: string;
  internet_service: string;
  monthly_charges: number;
  score: number;
  tier: RiskTier;
  outreach_stage: OutreachStage;
  outreach_sub_stage: OutreachSubStage | null;
  top_factors: string[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface FactorContribution {
  factor: string;
  value: string;
  points: number;
  max_points: number;
  reason: string;
}

export interface RiskAssessment {
  score: number;
  tier: RiskTier;
  factors: FactorContribution[];
}

export interface OutreachEvent {
  from_stage: OutreachStage;
  to_stage: OutreachStage;
  sub_stage: OutreachSubStage | null;
  note: string | null;
  occurred_at: string;
}

export interface OutreachState {
  stage: OutreachStage;
  sub_stage: OutreachSubStage | null;
  history: OutreachEvent[];
}

export interface Customer {
  customer_id: string;
  gender: string;
  senior_citizen: boolean;
  partner: boolean;
  dependents: boolean;
  tenure: number;
  phone_service: boolean;
  multiple_lines: string;
  internet_service: string;
  online_security: string;
  online_backup: string;
  device_protection: string;
  tech_support: string;
  streaming_tv: string;
  streaming_movies: string;
  contract: string;
  paperless_billing: boolean;
  payment_method: string;
  monthly_charges: number;
  total_charges: number;
  churn: boolean;
}

export interface CustomerDetail {
  customer: Customer;
  risk: RiskAssessment;
  outreach: OutreachState;
}
