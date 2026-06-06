import pytest
from pathlib import Path

@pytest.mark.asyncio
async def test_upload_pdf(client, tmp_path):
    pdf = tmp_path / "test.pdf"
    pdf.write_bytes(b"%PDF-1.4 fake pdf content")
    with open(pdf, "rb") as f:
        r = await client.post("/api/jobs", files={"file": ("test.pdf", f, "application/pdf")})
    assert r.status_code == 200
    data = r.json()
    assert data["filename"] == "test.pdf"
    assert data["status"] == "queued"
    assert "id" in data

@pytest.mark.asyncio
async def test_upload_non_pdf_rejected(client):
    r = await client.post("/api/jobs", files={"file": ("test.txt", b"not a pdf", "text/plain")})
    assert r.status_code == 400

@pytest.mark.asyncio
async def test_list_jobs_empty(client):
    r = await client.get("/api/jobs")
    assert r.status_code == 200
    assert r.json() == []

@pytest.mark.asyncio
async def test_get_job_not_found(client):
    r = await client.get("/api/jobs/nonexistent")
    assert r.status_code == 404

@pytest.mark.asyncio
async def test_delete_job_not_found(client):
    r = await client.delete("/api/jobs/nonexistent")
    assert r.status_code == 404
