# PDF to Markdown OCR

A modern web-based tool that converts PDF documents to Markdown using **GLM-OCR** via Ollama. Built with **FastAPI** backend and **React** frontend.

## Architecture

```
Frontend (React + Vite) → FastAPI Backend → Ollama / GLM-OCR → Markdown Output
```

## Prerequisites

- [Ollama](https://ollama.com/) installed and running
- GLM-OCR model: `ollama pull glm-ocr`
- `pdftoppm` (from Poppler) — `brew install poppler` on macOS
- Python 3.10+
- Node.js 18+

## Quick Start

### 1. Start Ollama

```bash
ollama serve
# In another terminal:
ollama pull glm-ocr
```

### 2. Backend (FastAPI)

```bash
cd /path/to/project
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — the Vite dev server proxies `/api` to the FastAPI backend on port 8000.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |
| `MODEL_NAME` | `glm-ocr` | Model to use for OCR |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Check Ollama availability |
| `POST` | `/api/upload` | Upload a PDF file |
| `GET` | `/api/jobs` | List all jobs |
| `GET` | `/api/jobs/{id}` | Get job status |
| `GET` | `/api/result/{id}` | Get markdown result |
| `DELETE` | `/api/jobs/{id}` | Delete a job |

## Docker

```bash
chmod +x scripts/*.sh
./scripts/run-local.sh
```