import asyncio
import logging
from collections.abc import Callable

from app.data_access.loader import load_customers
from app.models.customer import Customer
from app.models.outreach import OutreachState
from app.models.scoring import CustomerSummary, RiskAssessment

logger = logging.getLogger(__name__)

Summariser = Callable[[Customer, RiskAssessment, OutreachState], CustomerSummary]

_customers: dict[str, Customer] = {}
_risk: dict[str, RiskAssessment] = {}
_outreach: dict[str, OutreachState] = {}
_summaries: dict[str, CustomerSummary] = {}
_lock = asyncio.Lock()


def initialise(
    scorer: Callable[[Customer], RiskAssessment], summariser: Summariser
) -> None:
    """Load the CSV, then score and project every customer once.

    Both callables are injected rather than imported so the store stays the
    lowest layer - it holds the caches without knowing how a score or a list
    row is produced.
    """
    global _customers, _risk, _outreach, _summaries
    _customers = load_customers()
    _risk = {
        customer_id: scorer(customer) for customer_id, customer in _customers.items()
    }
    _outreach = {customer_id: OutreachState() for customer_id in _customers}
    _summaries = {
        customer_id: summariser(customer, _risk[customer_id], _outreach[customer_id])
        for customer_id, customer in _customers.items()
    }
    logger.info("Store initialised with %s customers", len(_customers))


def all_customers() -> list[Customer]:
    return list(_customers.values())


def get_customer(customer_id: str) -> Customer | None:
    return _customers.get(customer_id)


def get_risk(customer_id: str) -> RiskAssessment | None:
    return _risk.get(customer_id)


def all_summaries() -> list[CustomerSummary]:
    """The cached list projection. Filtering and sorting run over these."""
    return list(_summaries.values())


def get_outreach(customer_id: str) -> OutreachState | None:
    return _outreach.get(customer_id)


def set_outreach(
    customer_id: str, state: OutreachState, summary: CustomerSummary
) -> None:
    """Write the new outreach state and its rebuilt list row together.

    Outreach is the only mutable input to a summary, so this is the one place
    the projection can go stale. Taking both in a single call means it cannot
    be updated without the cache being refreshed with it.
    """
    _outreach[customer_id] = state
    _summaries[customer_id] = summary


def lock() -> asyncio.Lock:
    return _lock
