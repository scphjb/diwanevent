from fastapi.testclient import TestClient
import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from main import app

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert "Diwan Event" in response.text

def test_api_health():
    response = client.get("/api/stats")
    assert response.status_code == 200
    data = response.json()
    assert "present" in data
    assert "total" in data

def test_404_handler():
    response = client.get("/this_route_does_not_exist")
    assert response.status_code == 404
    assert "الصفحة غير موجودة" in response.text
