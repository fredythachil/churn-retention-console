import logging

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.data_access import store
from app.models.customer import Customer
from app.models.outreach import OutreachStage, OutreachState, OutreachSubStage
from app.models.pagination import Page
from app.models.scoring import CustomerSummary, RiskAssessment
from app.services import query
from app.services.outreach import InvalidTransition, apply_transition
from app.services.scoring import score_customer



logger = logging.getLogger(__name__)

router = APIRouter(prefix="/customers", tags=["customers"])
class CustomerDetail(BaseModel):
    customer: Customer
    risk: RiskAssessment
    outreach: OutreachState


class OutreachUpdate(BaseModel):
    stage: OutreachStage
    sub_stage: OutreachSubStage | None = None
    note: str | None = Field(None, max_length=500)


@router.get("", response_model=Page[CustomerSummary])
def list_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    tier: str | None = None,
    contract: str | None = None,
    outreach_stage: str | None = None,
    search: str | None = None,
    min_score: int | None = Query(None, ge=0, le=100),
    sort_by: str = "score",
    descending: bool = True,
):
    summaries = [
        query.build_summary(
            customer,
            score_customer(customer),
            (store.get_outreach(customer.customer_id) or OutreachState()).stage,
        )
        for customer in store.all_customers()
    ]

    summaries = query.filter_summaries(
        summaries,
        tier=tier,
        contract=contract,
        outreach_stage=outreach_stage,
        search=search,
        min_score=min_score,
    )

    try:
        summaries = query.sort_summaries(summaries, sort_by, descending)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return query.paginate(summaries, page, page_size)


@router.get("/summary/stats")
def customer_stats():
    tiers: dict[str, int] = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    stages: dict[str, int] = {}
    contracts: dict[str, int] = {}
    total_score = 0

    for customer in store.all_customers():
        risk = score_customer(customer)
        tiers[risk.tier] += 1
        total_score += risk.score

        stage = (store.get_outreach(customer.customer_id) or OutreachState()).stage.value
        stages[stage] = stages.get(stage, 0) + 1
        contracts[customer.contract] = contracts.get(customer.contract, 0) + 1

    total = len(store.all_customers())
    return {
        "total": total,
        "tiers": tiers,
        "stages": stages,
        "contracts": contracts,
        "average_score": round(total_score / total, 1) if total else 0,
    }


@router.get("/{customer_id}", response_model=CustomerDetail)
def get_customer(customer_id: str):
    customer = store.get_customer(customer_id)
    if customer is None:
        logger.info("Customer not found: %s", customer_id)
        raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")

    outreach = store.get_outreach(customer_id)
    if outreach is None:
        outreach = OutreachState()

    return CustomerDetail(
        customer=customer,
        risk=score_customer(customer),
        outreach=outreach,
    )


@router.patch("/{customer_id}/outreach", response_model=OutreachState)
async def update_outreach(customer_id: str, update: OutreachUpdate):
    customer_id = customer_id.strip()

    if store.get_customer(customer_id) is None:
        raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")

    async with store.lock():
        current = store.get_outreach(customer_id) or OutreachState()

        try:
            new_state = apply_transition(
                current, update.stage, update.sub_stage, update.note
            )
        except InvalidTransition as exc:
            logger.info("Rejected transition for %s: %s", customer_id, exc)
            raise HTTPException(status_code=409, detail=str(exc)) from exc

        store.set_outreach(customer_id, new_state)

    logger.info(
        "Outreach updated for %s: %s -> %s",
        customer_id,
        current.stage.value,
        new_state.stage.value,
    )
    return new_state


