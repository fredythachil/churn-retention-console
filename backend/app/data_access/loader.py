import csv
import logging
from pathlib import Path

from app.models.customer import Customer

logger = logging.getLogger(__name__)

DATA_FILE = Path(__file__).resolve().parents[3] / "data" / "WA_Fn-UseC_-Telco-Customer-Churn.csv"


def _to_bool(value: str) -> bool:
    return value.strip() in {"Yes", "1"}


def _to_float(value: str) -> float:
    stripped = value.strip()
    if not stripped:
        return 0.0
    return float(stripped)


def _build_customer(row: dict) -> Customer:
    return Customer(
        customer_id=row["customerID"],
        gender=row["gender"],
        senior_citizen=_to_bool(row["SeniorCitizen"]),
        partner=_to_bool(row["Partner"]),
        dependents=_to_bool(row["Dependents"]),
        tenure=int(row["tenure"]),
        phone_service=_to_bool(row["PhoneService"]),
        multiple_lines=row["MultipleLines"],
        internet_service=row["InternetService"],
        online_security=row["OnlineSecurity"],
        online_backup=row["OnlineBackup"],
        device_protection=row["DeviceProtection"],
        tech_support=row["TechSupport"],
        streaming_tv=row["StreamingTV"],
        streaming_movies=row["StreamingMovies"],
        contract=row["Contract"],
        paperless_billing=_to_bool(row["PaperlessBilling"]),
        payment_method=row["PaymentMethod"],
        monthly_charges=float(row["MonthlyCharges"]),
        total_charges=_to_float(row["TotalCharges"]),
        churn=_to_bool(row["Churn"]),
    )


def load_customers(path: Path = DATA_FILE) -> dict[str, Customer]:
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found at {path}")

    customers: dict[str, Customer] = {}
    skipped = 0

    with path.open(newline="", encoding="utf-8") as handle:
        for line_no, row in enumerate(csv.DictReader(handle), start=2):
            try:
                customer = _build_customer(row)
            except (ValueError, KeyError) as exc:
                skipped += 1
                logger.warning("Skipping row %s: %s", line_no, exc)
                continue
            customers[customer.customer_id] = customer

    logger.info("Loaded %s customers (%s skipped)", len(customers), skipped)
    return customers
