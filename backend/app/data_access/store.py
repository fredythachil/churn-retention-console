import asyncio
import logging

from app.data_access.loader import load_customers
from app.models.customer import Customer
from app.models.outreach import OutreachState

logger = logging.getLogger(__name__)

_customers: dict[str, Customer] = {}
_outreach: dict[str, OutreachState] = {}
_lock = asyncio.Lock()


def initialise() -> None:
    global _customers, _outreach
    _customers = load_customers()
    _outreach = {customer_id: OutreachState() for customer_id in _customers}
    logger.info("Store initialised with %s customers", len(_customers))


def all_customers() -> list[Customer]:
    return list(_customers.values())


def get_customer(customer_id: str) -> Customer | None:
    return _customers.get(customer_id)


def get_outreach(customer_id: str) -> OutreachState | None:
    return _outreach.get(customer_id)


def set_outreach(customer_id: str, state: OutreachState) -> None:
    _outreach[customer_id] = state


def lock() -> asyncio.Lock:
    return _lock
