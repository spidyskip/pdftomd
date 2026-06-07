import pytest

@pytest.mark.asyncio
async def test_health_returns_status(client):
    r = await client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert "available" in data
    assert "model" in data
    assert "model_loaded" in data
    assert "backend" in data

@pytest.mark.asyncio
async def test_health_all_includes_markitdown(client):
    r = await client.get("/api/health/all")
    assert r.status_code == 200
    data = r.json()
    assert "markitdown" in data
    assert "available" in data["markitdown"]
    assert "model_loaded" in data["markitdown"]
    assert "path" in data["markitdown"]
