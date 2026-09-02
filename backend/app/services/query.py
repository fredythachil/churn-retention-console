from app.models.customer import Customer
from app.models.outreach import OutreachState
from app.models.pagination import Page
from app.models.scoring import CustomerSummary, RiskAssessment

SORT_FIELDS = {
    "score",
    "tenure",
    "monthly_charges",
    "customer_id",
    "contract",
    "outreach_stage",
}


def build_summary(
    customer: Customer, risk: RiskAssessment, outreach: OutreachState
) -> CustomerSummary:
    return CustomerSummary(
        customer_id=customer.customer_id,
        tenure=customer.tenure,
        contract=customer.contract,
        internet_service=customer.internet_service,
        monthly_charges=customer.monthly_charges,
        score=risk.score,
        tier=risk.tier,
        outreach_stage=outreach.stage.value,
        outreach_sub_stage=outreach.sub_stage.value if outreach.sub_stage else None,
        top_factors=[f.factor for f in risk.factors if f.points > 0][:3],
    )


def filter_summaries(
    summaries: list[CustomerSummary],
    tier: str | None = None,
    contract: str | None = None,
    outreach_stage: str | None = None,
    search: str | None = None,
    min_score: int | None = None,
) -> list[CustomerSummary]:
    result = summaries

    if tier is not None:
        result = [s for s in result if s.tier == tier]
    if contract is not None:
        result = [s for s in result if s.contract == contract]
    if outreach_stage is not None:
        result = [s for s in result if s.outreach_stage == outreach_stage]
    if min_score is not None:
        result = [s for s in result if s.score >= min_score]
    if search:
        needle = search.strip().lower()
        result = [s for s in result if needle in s.customer_id.lower()]

    return result


def sort_summaries(
    summaries: list[CustomerSummary], sort_by: str, descending: bool
) -> list[CustomerSummary]:
    if sort_by not in SORT_FIELDS:
        raise ValueError(f"Cannot sort by {sort_by!r}. Allowed: {sorted(SORT_FIELDS)}")

    return sorted(
        summaries,
        key=lambda s: (getattr(s, sort_by), s.customer_id),
        reverse=descending,
    )



def paginate(
    summaries: list[CustomerSummary], page: int, page_size: int
) -> Page[CustomerSummary]:
    total = len(summaries)
    total_pages = max(1, -(-total // page_size))
    offset = (page - 1) * page_size

    return Page[CustomerSummary](
        items=summaries[offset : offset + page_size],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=offset + page_size < total,
        has_previous=page > 1,
    )
