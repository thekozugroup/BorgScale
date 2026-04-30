from fastapi.testclient import TestClient

from app.main import app


def test_about_endpoint_returns_agpl_metadata():
    client = TestClient(app)
    r = client.get("/api/about")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["name"] == "BorgScale"
    assert body["license"] == "AGPL-3.0"
    assert body["source"] == "https://github.com/thekozugroup/BorgScale"
    assert body["upstream"] == "https://github.com/karanhudia/borg-ui"
    assert body["license_url"] == "https://www.gnu.org/licenses/agpl-3.0.html"
    assert "version" in body and isinstance(body["version"], str)
