from pydantic import BaseModel


class Customer(BaseModel):
    customer_id: str
    gender: str
    senior_citizen: bool
    partner: bool
    dependents: bool
    tenure: int
    phone_service: bool
    multiple_lines: str
    internet_service: str
    online_security: str
    online_backup: str
    device_protection: str
    tech_support: str
    streaming_tv: str
    streaming_movies: str
    contract: str
    paperless_billing: bool
    payment_method: str
    monthly_charges: float
    total_charges: float
    churn: bool

