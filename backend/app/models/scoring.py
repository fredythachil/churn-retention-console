from pydantic import BaseModel


class FactorContribution(BaseModel):
    factor: str
    value: str
    points: int
    max_points: int
    reason: str


class RiskAssessment(BaseModel):
    score: int
    tier: str
    factors: list[FactorContribution]


class CustomerSummary(BaseModel):
    customer_id: str
    tenure: int
    contract: str
    internet_service: str
    monthly_charges: float
    score: int
    tier: str
    outreach_stage: str
    top_factors: list[str]
