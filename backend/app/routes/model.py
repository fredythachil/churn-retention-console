from fastapi import APIRouter

from app.services import scoring_rules

router = APIRouter(tags=["model"])


@router.get("/model/info")
def model_info():
    return {
        "version": "0.1.0",
        "method": "Weighted rule-based scorecard",
        "max_score": scoring_rules.MAX_SCORE,
        "baseline_churn_rate": scoring_rules.BASELINE_CHURN_RATE,
        "calibration": (
            "Weights are sized from churn rates measured in the bundled Telco "
            "dataset. Each factor's points reflect how far that group sits "
            "above the 26.5% population baseline."
        ),
        "tiers": [
            {"name": name, "max_score": upper_bound}
            for upper_bound, name in scoring_rules.TIERS
        ],
        "factors": _factors(),
        "excluded_fields": scoring_rules.EXCLUDED_FIELDS,
    }


def _factors():
    factors = []

    for name, rule in scoring_rules.CATEGORICAL_RULES.items():
        factors.append(
            {
                "factor": name,
                "max_points": rule["weight"],
                "type": "categorical",
                "rules": [
                    {"value": value, "points": points, "reason": reason}
                    for value, (points, reason) in rule["points"].items()
                ],
            }
        )

    factors.append(
        {
            "factor": "tenure",
            "max_points": scoring_rules.TENURE_RULE["weight"],
            "type": "banded",
            "rules": [
                {
                    "value": f"<= {upper}" if upper is not None else "above all bands",
                    "points": points,
                    "reason": reason,
                }
                for upper, points, reason in scoring_rules.TENURE_RULE["bands"]
            ],
        }
    )

    factors.append(
        {
            "factor": "protective_add_ons",
            "max_points": scoring_rules.ADD_ON_RULES["weight"],
            "type": "additive",
            "requires_internet": scoring_rules.ADD_ON_RULES["requires_internet"],
            "rules": [
                {"value": field, "points": points, "reason": reason}
                for field, (points, reason) in scoring_rules.ADD_ON_RULES["services"].items()
            ],
        }
    )

    factors.append(
        {
            "factor": "demographics",
            "max_points": scoring_rules.DEMOGRAPHIC_RULES["weight"],
            "type": "additive",
            "rules": [
                {"value": field, "points": points, "reason": label}
                for field, (points, _risky, label) in scoring_rules.DEMOGRAPHIC_RULES["flags"].items()
            ],
        }
    )

    return sorted(factors, key=lambda f: f["max_points"], reverse=True)
