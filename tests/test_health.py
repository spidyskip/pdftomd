import pytest

@pytest.mark.asyncio
async def test_health_returns_status(client):
    r = await client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert "ollama_available" in data
    assert "model" in data
    assert "model_loaded" in data
