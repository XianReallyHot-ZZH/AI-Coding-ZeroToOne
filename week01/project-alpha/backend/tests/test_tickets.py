from fastapi.testclient import TestClient


def test_create_ticket(client: TestClient):
    response = client.post(
        "/api/v1/tickets",
        json={"title": "Test Ticket", "description": "Test Description"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Ticket"
    assert data["description"] == "Test Description"
    assert data["status"] == "open"
    assert "id" in data


def test_get_tickets(client: TestClient):
    client.post("/api/v1/tickets", json={"title": "Ticket 1"})
    client.post("/api/v1/tickets", json={"title": "Ticket 2"})

    response = client.get("/api/v1/tickets")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 2
    assert data["pagination"]["total"] == 2


def test_get_ticket_by_id(client: TestClient):
    create_response = client.post(
        "/api/v1/tickets",
        json={"title": "Test Ticket"}
    )
    ticket_id = create_response.json()["id"]

    response = client.get(f"/api/v1/tickets/{ticket_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Ticket"


def test_update_ticket(client: TestClient):
    create_response = client.post(
        "/api/v1/tickets",
        json={"title": "Original Title"}
    )
    ticket_id = create_response.json()["id"]

    response = client.put(
        f"/api/v1/tickets/{ticket_id}",
        json={"title": "Updated Title"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"


def test_delete_ticket(client: TestClient):
    create_response = client.post(
        "/api/v1/tickets",
        json={"title": "To Delete"}
    )
    ticket_id = create_response.json()["id"]

    response = client.delete(f"/api/v1/tickets/{ticket_id}")
    assert response.status_code == 204

    get_response = client.get(f"/api/v1/tickets/{ticket_id}")
    assert get_response.status_code == 404


def test_complete_ticket(client: TestClient):
    create_response = client.post(
        "/api/v1/tickets",
        json={"title": "To Complete"}
    )
    ticket_id = create_response.json()["id"]

    response = client.post(f"/api/v1/tickets/{ticket_id}/complete")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"


def test_cancel_ticket(client: TestClient):
    create_response = client.post(
        "/api/v1/tickets",
        json={"title": "To Cancel"}
    )
    ticket_id = create_response.json()["id"]

    response = client.post(f"/api/v1/tickets/{ticket_id}/cancel")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "cancelled"


def test_get_ticket_not_found(client: TestClient):
    response = client.get("/api/v1/tickets/999")
    assert response.status_code == 404


def test_search_tickets(client: TestClient):
    client.post("/api/v1/tickets", json={"title": "Python Task"})
    client.post("/api/v1/tickets", json={"title": "Java Task"})

    response = client.get("/api/v1/tickets?search=Python")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 1
    assert data["data"][0]["title"] == "Python Task"
