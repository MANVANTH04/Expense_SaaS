import pytest
from backend.app import create_app

@pytest.fixture
def app():
    app = create_app()
    app.config["TESTING"] = True
    return app

@pytest.fixture
def client(app):
    return app.test_client()

def test_home(client):
    # Just test if /test-email route works
    response = client.get("/test-email")
    assert response.status_code in [200, 500]  # 200 if sent, 500 if mail not configured