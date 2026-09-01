from app.models.outreach import (
    ALLOWED_SUB_STAGES,
    ALLOWED_TRANSITIONS,
    OutreachEvent,
    OutreachStage,
    OutreachState,
    OutreachSubStage,
)


class InvalidTransition(Exception):
    """Raised when a requested outreach change is not permitted."""


def apply_transition(
    state: OutreachState,
    to_stage: OutreachStage,
    sub_stage: OutreachSubStage | None = None,
    note: str | None = None,
) -> OutreachState:
    if to_stage not in ALLOWED_TRANSITIONS[state.stage]:
        raise InvalidTransition(
            f"Cannot move from {state.stage.value} to {to_stage.value}"
        )

    if sub_stage is not None and sub_stage not in ALLOWED_SUB_STAGES[to_stage]:
        raise InvalidTransition(
            f"Sub-stage {sub_stage.value} is not valid for stage {to_stage.value}"
        )

    event = OutreachEvent(
        from_stage=state.stage,
        to_stage=to_stage,
        sub_stage=sub_stage,
        note=note,
    )

    return OutreachState(
        stage=to_stage,
        sub_stage=sub_stage,
        history=[*state.history, event],
    )
