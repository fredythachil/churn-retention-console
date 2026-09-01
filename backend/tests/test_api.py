import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_model_info_exposes_weights_and_exclusions(client):
    body = client.get("/model/info").json()
    assert body["max_score"] == 100
    factors = {f["factor"]: f["max_points"] for f in body["factors"]}
    assert factors["contract"] == 30
    assert sum(factors.values()) == 100
    assert "gender" in body["excluded_fields"]


def test_list_returns_a_page_not_the_whole_dataset(client):
    body = client.get("/customers?page_size=25").json()
    assert body["total"] == 7043
    assert len(body["items"]) == 25
    assert body["has_next"] is True
    assert body["has_previous"] is False


def test_list_is_sorted_by_score_descending_by_default(client):
    scores = [item["score"] for item in client.get("/customers?page_size=50").json()["items"]]
    assert scores == sorted(scores, reverse=True)


def test_list_filters_by_tier(client):
    body = client.get("/customers?tier=LOW&page_size=50").json()
    assert body["total"] < 7043
    assert all(item["tier"] == "LOW" for item in body["items"])


def test_list_rejects_unknown_sort_field(client):
    response = client.get("/customers?sort_by=banana")
    assert response.status_code == 400
    assert "banana" in response.json()["detail"]


def test_list_rejects_oversized_page_size(client):
    assert client.get("/customers?page_size=5000").status_code == 422


def test_pagination_does_not_repeat_customers(client):
    page1 = client.get("/customers?page=1&page_size=20").json()["items"]
    page2 = client.get("/customers?page=2&page_size=20").json()["items"]
    ids1 = {item["customer_id"] for item in page1}
    ids2 = {item["customer_id"] for item in page2}
    assert not ids1 & ids2


def test_detail_returns_customer_risk_and_outreach(client):
    body = client.get("/customers/7590-VHVEG").json()
    assert body["customer"]["customer_id"] == "7590-VHVEG"
    assert body["risk"]["tier"] == "CRITICAL"
    assert len(body["risk"]["factors"]) == 6
    assert body["outreach"]["stage"] in {"NOT_CONTACTED", "IN_PROGRESS", "RETAINED", "LOST"}


def test_detail_returns_404_for_unknown_customer(client):
    response = client.get("/customers/NOPE-99999")
    assert response.status_code == 404
    assert "NOPE-99999" in response.json()["detail"]


def test_outreach_rejects_illegal_transition_with_409(client):
    response = client.patch(
        "/customers/3668-QPYBK/outreach",
        json={"stage": "RETAINED", "sub_stage": "OFFER_ACCEPTED"},
    )
    assert response.status_code == 409
    assert "NOT_CONTACTED" in response.json()["detail"]


def test_outreach_rejects_unknown_stage_with_422(client):
    response = client.patch("/customers/3668-QPYBK/outreach", json={"stage": "BANANA"})
    assert response.status_code == 422


def test_outreach_returns_404_for_unknown_customer(client):
    response = client.patch("/customers/NOPE-99999/outreach", json={"stage": "IN_PROGRESS"})
    assert response.status_code == 404


def test_outreach_happy_path_records_history(client):
    customer_id = "9237-HQITU"

    first = client.patch(
        f"/customers/{customer_id}/outreach",
        json={"stage": "IN_PROGRESS", "sub_stage": "NO_ANSWER", "note": "voicemail"},
    )
    assert first.status_code == 200
    assert first.json()["stage"] == "IN_PROGRESS"

    second = client.patch(
        f"/customers/{customer_id}/outreach",
        json={"stage": "RETAINED", "sub_stage": "OFFER_ACCEPTED", "note": "accepted offer"},
    )
    assert second.status_code == 200

    body = second.json()
    assert body["stage"] == "RETAINED"
    assert len(body["history"]) == 2
    assert body["history"][0]["note"] == "voicemail"
    assert body["history"][1]["from_stage"] == "IN_PROGRESS"


def test_outreach_change_appears_in_the_list(client):
    customer_id = "9305-CDSKC"
    client.patch(f"/customers/{customer_id}/outreach", json={"stage": "IN_PROGRESS"})

    body = client.get(f"/customers?search={customer_id}").json()
    assert body["items"][0]["outreach_stage"] == "IN_PROGRESS"
