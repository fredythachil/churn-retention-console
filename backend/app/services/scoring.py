from app.models.customer import Customer
from app.models.scoring import FactorContribution, RiskAssessment
from app.services.scoring_rules import (
    ADD_ON_RULES,
    CATEGORICAL_RULES,
    DEMOGRAPHIC_RULES,
    MAX_SCORE,
    TENURE_RULE,
    TIERS,
)


def _tier_for(score: int) -> str:
    for upper_bound, name in TIERS:
        if score <= upper_bound:
            return name
    return TIERS[-1][1]


def _score_categoricals(customer: Customer) -> list[FactorContribution]:
    factors = []
    for name, rule in CATEGORICAL_RULES.items():
        value = getattr(customer, rule["field"])
        points, reason = rule["points"][value]
        factors.append(
            FactorContribution(
                factor=name,
                value=value,
                points=points,
                max_points=rule["weight"],
                reason=reason,
            )
        )
    return factors


def _score_tenure(customer: Customer) -> FactorContribution:
    for upper_bound, points, reason in TENURE_RULE["bands"]:
        if upper_bound is None or customer.tenure <= upper_bound:
            return FactorContribution(
                factor="tenure",
                value=f"{customer.tenure} month{'s' if customer.tenure != 1 else ''}",
                points=points,
                max_points=TENURE_RULE["weight"],
                reason=reason,
            )
    raise ValueError(f"No tenure band matched tenure={customer.tenure}")


def _score_add_ons(customer: Customer) -> FactorContribution:
    has_internet = customer.internet_service != "No"

    if not has_internet:
        return FactorContribution(
            factor="protective_add_ons",
            value="No internet service",
            points=0,
            max_points=ADD_ON_RULES["weight"],
            reason="Phone-only customer - protective add-ons do not apply",
        )

    points = 0
    missing = []
    for field, (field_points, label) in ADD_ON_RULES["services"].items():
        if getattr(customer, field) == "No":
            points += field_points
            missing.append(label)

    reason = "; ".join(missing) if missing else "All protective add-ons active"
    return FactorContribution(
        factor="protective_add_ons",
        value=f"{len(missing)} of {len(ADD_ON_RULES['services'])} missing",
        points=points,
        max_points=ADD_ON_RULES["weight"],
        reason=reason,
    )


def _score_demographics(customer: Customer) -> FactorContribution:
    points = 0
    reasons = []
    for field, (field_points, risky_value, label) in DEMOGRAPHIC_RULES["flags"].items():
        if getattr(customer, field) is risky_value:
            points += field_points
            reasons.append(label)

    reason = "; ".join(reasons) if reasons else "No demographic risk factors"
    return FactorContribution(
        factor="demographics",
        value=f"{len(reasons)} risk factors",
        points=points,
        max_points=DEMOGRAPHIC_RULES["weight"],
        reason=reason,
    )


def score_customer(customer: Customer) -> RiskAssessment:
    factors = _score_categoricals(customer)
    factors.append(_score_tenure(customer))
    factors.append(_score_add_ons(customer))
    factors.append(_score_demographics(customer))

    total = sum(factor.points for factor in factors)
    total = min(total, MAX_SCORE)

    factors.sort(key=lambda factor: factor.points, reverse=True)
    return RiskAssessment(score=total, tier=_tier_for(total), factors=factors)
