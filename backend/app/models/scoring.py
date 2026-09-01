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
