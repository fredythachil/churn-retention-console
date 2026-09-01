"""Scoring weights, calibrated from the bundled dataset.

Each factor is sized by how far that group's churn rate sits above the
26.5% baseline - see analysis/01_explore.ipynb for the numbers.

Data only. scoring.py applies these and /model/info serialises them, so
the rules and the explanation can't drift apart.
"""


MAX_SCORE = 100
BASELINE_CHURN_RATE = 0.2654

TIERS = [
    (24, "LOW"),
    (49, "MEDIUM"),
    (74, "HIGH"),
    (MAX_SCORE, "CRITICAL"),
]

CATEGORICAL_RULES = {
    "contract": {
        "weight": 30,
        "field": "contract",
        "points": {
            "Month-to-month": (30, "Month-to-month contract - no lock-in, can leave any month"),
            "One year": (8, "One-year contract - some commitment remaining"),
            "Two year": (0, "Two-year contract - strongly locked in"),
        },
    },
    "payment_method": {
        "weight": 15,
        "field": "payment_method",
        "points": {
            "Electronic check": (15, "Pays by electronic check - manual payment, re-decides monthly"),
            "Mailed check": (6, "Pays by mailed check - manual payment"),
            "Bank transfer (automatic)": (2, "Automatic bank transfer - low friction to stay"),
            "Credit card (automatic)": (0, "Automatic credit card - low friction to stay"),
        },
    },
    "internet_service": {
        "weight": 12,
        "field": "internet_service",
        "points": {
            "Fiber optic": (12, "Fiber optic - premium price, most churn-prone product"),
            "DSL": (5, "DSL - mid-tier internet product"),
            "No": (0, "No internet service - phone-only customers are the most loyal"),
        },
    },
}

TENURE_RULE = {
    "weight": 25,
    "field": "tenure",
    "bands": [
        (6, 25, "0-6 months - over half of new customers leave in this window"),
        (12, 17, "7-12 months - still settling, well above baseline"),
        (24, 11, "13-24 months - approaching the population average"),
        (48, 5, "25-48 months - established customer"),
        (None, 0, "49+ months - long-tenured, very unlikely to leave"),
    ],
}

ADD_ON_RULES = {
    "weight": 12,
    "requires_internet": True,
    "services": {
        "tech_support": (4, "No tech support - no help channel when something breaks"),
        "online_security": (4, "No online security - no protective add-on"),
        "online_backup": (2, "No online backup"),
        "device_protection": (2, "No device protection"),
    },
}

DEMOGRAPHIC_RULES = {
    "weight": 6,
    "flags": {
        "senior_citizen": (2, True, "Senior citizen"),
        "partner": (2, False, "No partner"),
        "dependents": (1, False, "No dependents"),
        "paperless_billing": (1, True, "Paperless billing"),
    },
}

EXCLUDED_FIELDS = {
    "gender": "No measurable signal (26.9% vs 26.2%, baseline 26.5%), and scoring retention offers by gender is a fairness risk.",
    "streaming_tv": "Information value drops to 0.006 once the 'no internet service' confound is removed.",
    "streaming_movies": "Information value drops to 0.007 once the 'no internet service' confound is removed.",
    "multiple_lines": "Information value 0.008 - no measurable signal.",
    "phone_service": "Information value 0.001 - no measurable signal.",
    "total_charges": "Correlates 0.9996 with tenure x monthly charges - restates tenure rather than adding signal.",
}
