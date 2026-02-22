from fastapi.testclient import TestClient


def test_create_label(client: TestClient):
    response = client.post(
        "/api/v1/labels",
        json={"name": "Bug", "color": "#FF0000"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Bug"
    assert data["color"] == "#FF0000"
    assert "id" in data


def test_get_labels(client: TestClient):
    client.post("/api/v1/labels", json={"name": "Bug", "color": "#FF0000"})
    client.post("/api/v1/labels", json={"name": "Feature", "color": "#00FF00"})

    response = client.get("/api/v1/labels")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 2


def test_get_label_by_id(client: TestClient):
    create_response = client.post(
        "/api/v1/labels",
        json={"name": "Bug", "color": "#FF0000"}
    )
    label_id = create_response.json()["id"]

    response = client.get(f"/api/v1/labels/{label_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Bug"


def test_update_label(client: TestClient):
    create_response = client.post(
        "/api/v1/labels",
        json={"name": "Bug", "color": "#FF0000"}
    )
    label_id = create_response.json()["id"]

    response = client.put(
        f"/api/v1/labels/{label_id}",
        json={"name": "Critical Bug", "color": "#FF5500"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Critical Bug"
    assert data["color"] == "#FF5500"


def test_delete_label(client: TestClient):
    create_response = client.post(
        "/api/v1/labels",
        json={"name": "To Delete", "color": "#000000"}
    )
    label_id = create_response.json()["id"]

    response = client.delete(f"/api/v1/labels/{label_id}")
    assert response.status_code == 204

    get_response = client.get(f"/api/v1/labels/{label_id}")
    assert get_response.status_code == 404


def test_duplicate_label_name(client: TestClient):
    client.post("/api/v1/labels", json={"name": "Bug", "color": "#FF0000"})

    response = client.post(
        "/api/v1/labels",
        json={"name": "Bug", "color": "#00FF00"}
    )
    assert response.status_code == 409


def test_add_label_to_ticket(client: TestClient):
    label_response = client.post(
        "/api/v1/labels",
        json={"name": "Bug", "color": "#FF0000"}
    )
    label_id = label_response.json()["id"]

    ticket_response = client.post(
        "/api/v1/tickets",
        json={"title": "Test Ticket"}
    )
    ticket_id = ticket_response.json()["id"]

    response = client.post(f"/api/v1/tickets/{ticket_id}/labels/{label_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data["labels"]) == 1
    assert data["labels"][0]["name"] == "Bug"


def test_remove_label_from_ticket(client: TestClient):
    label_response = client.post(
        "/api/v1/labels",
        json={"name": "Bug", "color": "#FF0000"}
    )
    label_id = label_response.json()["id"]

    ticket_response = client.post(
        "/api/v1/tickets",
        json={"title": "Test Ticket", "label_ids": [label_id]}
    )
    ticket_id = ticket_response.json()["id"]

    response = client.delete(f"/api/v1/tickets/{ticket_id}/labels/{label_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data["labels"]) == 0
