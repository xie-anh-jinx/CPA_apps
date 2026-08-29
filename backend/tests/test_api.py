import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "app" in response.json()

def test_export_invalid_type():
    response = client.get("/api/export/csv?report_type=invalid")
    # Should throw 400 Bad Request or 500
    assert response.status_code in (400, 500)
