import pytest

from app.models.customer import Customer
from app.services.scoring import score_customer
from app.services.scoring_rules import MAX_SCORE


def make_customer(**overrides) -> Customer:
    """Lowest-risk customer possible. Override fields to add risk."""
    defaults = dict(
        customer_id="TEST-0001",
        gender="Female",
        senior_citizen=False,
        partner=True,
        dependents=True,
        tenure=72,
        phone_service=True,
        multiple_lines="Yes",
        internet_service="No",
        online_security="No internet service",
        online_backup="No internet service",
        device_protection="No internet service",
        tech_support="No internet service",
        streaming_tv="No internet service",
        streaming_movies="No internet service",
        contract="Two year",
        paperless_billing=False,
        payment_method="Credit card (automatic)",
        monthly_charges=20.0,
        total_charges=1440.0,
        churn=False,
    )
    return Customer(**{**defaults, **overrides})


def test_safest_customer_scores_zero():
    result = score_customer(make_customer())
    assert result.score == 0
    assert result.tier == "LOW"


def test_riskiest_customer_scores_max():
    result = score_customer(
        make_customer(
            contract="Month-to-month",
            tenure=1,
            payment_method="Electronic check",
            internet_service="Fiber optic",
            tech_support="No",
            online_security="No",
            online_backup="No",
            device_protection="No",
            senior_citizen=True,
            partner=False,
            dependents=False,
            paperless_billing=True,
        )
    )
    assert result.score == MAX_SCORE
    assert result.tier == "CRITICAL"


def test_score_never_exceeds_max():
    result = score_customer(make_customer(contract="Month-to-month", tenure=0))
    assert 0 <= result.score <= MAX_SCORE


@pytest.mark.parametrize(
    "contract,expected",
    [("Month-to-month", 30), ("One year", 8), ("Two year", 0)],
)
def test_contract_points(contract, expected):
    result = score_customer(make_customer(contract=contract))
    contract_factor = next(f for f in result.factors if f.factor == "contract")
    assert contract_factor.points == expected


@pytest.mark.parametrize(
    "tenure,expected",
    [(0, 25), (6, 25), (7, 17), (12, 17), (13, 11), (24, 11), (25, 5), (48, 5), (49, 0), (72, 0)],
)
def test_tenure_bands(tenure, expected):
    result = score_customer(make_customer(tenure=tenure))
    tenure_factor = next(f for f in result.factors if f.factor == "tenure")
    assert tenure_factor.points == expected


def test_phone_only_customer_is_not_penalised_for_missing_add_ons():
    result = score_customer(make_customer(internet_service="No"))
    add_ons = next(f for f in result.factors if f.factor == "protective_add_ons")
    assert add_ons.points == 0
    assert "Phone-only" in add_ons.reason


def test_missing_add_ons_are_scored_when_customer_has_internet():
    result = score_customer(
        make_customer(
            internet_service="DSL",
            tech_support="No",
            online_security="No",
            online_backup="Yes",
            device_protection="Yes",
        )
    )
    add_ons = next(f for f in result.factors if f.factor == "protective_add_ons")
    assert add_ons.points == 8


@pytest.mark.parametrize(
    "score_setup,expected_tier",
    [
        ({}, "LOW"),
        ({"contract": "Month-to-month"}, "MEDIUM"),
        ({"contract": "Month-to-month", "tenure": 1}, "HIGH"),
                (
            {
                "contract": "Month-to-month",
                "tenure": 1,
                "payment_method": "Electronic check",
                "internet_service": "Fiber optic",
                "tech_support": "No",
                "online_security": "No",
            },
            "CRITICAL",
        ),

    ],
)
def test_tier_boundaries(score_setup, expected_tier):
    result = score_customer(make_customer(**score_setup))
    assert result.tier == expected_tier


def test_every_factor_is_returned_even_at_zero_points():
    result = score_customer(make_customer())
    factor_names = {f.factor for f in result.factors}
    assert factor_names == {
        "contract",
        "payment_method",
        "internet_service",
        "tenure",
        "protective_add_ons",
        "demographics",
    }


def test_factors_are_sorted_by_contribution():
    result = score_customer(
        make_customer(contract="Month-to-month", tenure=1, payment_method="Electronic check")
    )
    points = [f.points for f in result.factors]
    assert points == sorted(points, reverse=True)
