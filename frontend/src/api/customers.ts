import type {
  CustomerDetail,
  CustomerSummary,
  OutreachStage,
  OutreachState,
  OutreachSubStage,
  Page,
} from "../types/api";
import { request } from "./client";

export interface CustomerFilters {
  page?: number;
  page_size?: number;
  tier?: string;
  contract?: string;
  outreach_stage?: string;
  search?: string;
  min_score?: number;
  sort_by?: string;
  descending?: boolean;
}

export function listCustomers(filters: CustomerFilters = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }

  return request<Page<CustomerSummary>>(`/customers?${params}`);
}

export function getCustomer(customerId: string) {
  return request<CustomerDetail>(`/customers/${encodeURIComponent(customerId)}`);
}

export function updateOutreach(
  customerId: string,
  stage: OutreachStage,
  subStage: OutreachSubStage | null,
  note: string | null,
) {
  return request<OutreachState>(
    `/customers/${encodeURIComponent(customerId)}/outreach`,
    {
      method: "PATCH",
      body: JSON.stringify({ stage, sub_stage: subStage, note }),
    },
  );
}

export interface CustomerStats {
  total: number;
  tiers: Record<string, number>;
  stages: Record<string, number>;
  contracts: Record<string, number>;
  average_score: number;
}

export function getStats() {
  return request<CustomerStats>("/customers/summary/stats");
}
