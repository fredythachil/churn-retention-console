import pytest

from app.models.outreach import OutreachStage, OutreachState, OutreachSubStage
from app.services.outreach import InvalidTransition, apply_transition


def test_starts_not_contacted():
    state = OutreachState()
    assert state.stage is OutreachStage.NOT_CONTACTED
    assert state.sub_stage is None
    assert state.history == []


def test_not_contacted_to_in_progress_is_allowed():
    state = apply_transition(OutreachState(), OutreachStage.IN_PROGRESS)
    assert state.stage is OutreachStage.IN_PROGRESS
    assert len(state.history) == 1


def test_cannot_jump_straight_to_retained():
    with pytest.raises(InvalidTransition):
        apply_transition(OutreachState(), OutreachStage.RETAINED)


def test_cannot_jump_straight_to_lost():
    with pytest.raises(InvalidTransition):
        apply_transition(OutreachState(), OutreachStage.LOST)


def test_in_progress_can_repeat_for_another_attempt():
    state = apply_transition(OutreachState(), OutreachStage.IN_PROGRESS)
    state = apply_transition(
        state, OutreachStage.IN_PROGRESS, OutreachSubStage.NO_ANSWER, "voicemail"
    )
    assert state.stage is OutreachStage.IN_PROGRESS
    assert len(state.history) == 2


def test_sub_stage_must_belong_to_target_stage():
    state = apply_transition(OutreachState(), OutreachStage.IN_PROGRESS)
    with pytest.raises(InvalidTransition):
        apply_transition(state, OutreachStage.IN_PROGRESS, OutreachSubStage.OFFER_ACCEPTED)


def test_retained_can_be_reopened():
    state = apply_transition(OutreachState(), OutreachStage.IN_PROGRESS)
    state = apply_transition(state, OutreachStage.RETAINED, OutreachSubStage.OFFER_ACCEPTED)
    state = apply_transition(state, OutreachStage.IN_PROGRESS)
    assert state.stage is OutreachStage.IN_PROGRESS
    assert len(state.history) == 3


def test_history_records_the_full_trail():
    state = apply_transition(OutreachState(), OutreachStage.IN_PROGRESS, note="first call")
    state = apply_transition(state, OutreachStage.LOST, OutreachSubStage.PRICE, "too expensive")

    first, second = state.history
    assert first.from_stage is OutreachStage.NOT_CONTACTED
    assert first.to_stage is OutreachStage.IN_PROGRESS
    assert first.note == "first call"
    assert second.to_stage is OutreachStage.LOST
    assert second.sub_stage is OutreachSubStage.PRICE


def test_original_state_is_not_mutated():
    original = OutreachState()
    apply_transition(original, OutreachStage.IN_PROGRESS)
    assert original.stage is OutreachStage.NOT_CONTACTED
    assert original.history == []
