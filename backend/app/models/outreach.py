from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field


class OutreachStage(str, Enum):
    NOT_CONTACTED = "NOT_CONTACTED"
    IN_PROGRESS = "IN_PROGRESS"
    RETAINED = "RETAINED"
    LOST = "LOST"


class OutreachSubStage(str, Enum):
    AWAITING_CUSTOMER = "AWAITING_CUSTOMER"
    CALLBACK_DUE = "CALLBACK_DUE"
    NO_ANSWER = "NO_ANSWER"
    OFFER_ACCEPTED = "OFFER_ACCEPTED"
    NO_OFFER_NEEDED = "NO_OFFER_NEEDED"
    PRICE = "PRICE"
    SERVICE = "SERVICE"
    UNREACHABLE = "UNREACHABLE"


ALLOWED_TRANSITIONS: dict[OutreachStage, set[OutreachStage]] = {
    OutreachStage.NOT_CONTACTED: {OutreachStage.IN_PROGRESS},
    OutreachStage.IN_PROGRESS: {
        OutreachStage.IN_PROGRESS,
        OutreachStage.RETAINED,
        OutreachStage.LOST,
    },
    OutreachStage.RETAINED: {OutreachStage.IN_PROGRESS},
    OutreachStage.LOST: {OutreachStage.IN_PROGRESS},
}


ALLOWED_SUB_STAGES: dict[OutreachStage, set[OutreachSubStage]] = {
    OutreachStage.NOT_CONTACTED: set(),
    OutreachStage.IN_PROGRESS: {
        OutreachSubStage.AWAITING_CUSTOMER,
        OutreachSubStage.CALLBACK_DUE,
        OutreachSubStage.NO_ANSWER,
    },
    OutreachStage.RETAINED: {
        OutreachSubStage.OFFER_ACCEPTED,
        OutreachSubStage.NO_OFFER_NEEDED,
    },
    OutreachStage.LOST: {
        OutreachSubStage.PRICE,
        OutreachSubStage.SERVICE,
        OutreachSubStage.UNREACHABLE,
    },
}


class OutreachEvent(BaseModel):
    from_stage: OutreachStage
    to_stage: OutreachStage
    sub_stage: OutreachSubStage | None = None
    note: str | None = None
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OutreachState(BaseModel):
    stage: OutreachStage = OutreachStage.NOT_CONTACTED
    sub_stage: OutreachSubStage | None = None
    history: list[OutreachEvent] = Field(default_factory=list)
