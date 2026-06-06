# PDF to Markdown OCR

[![CI](https://github.com/spidyskip/pdftomd/actions/workflows/ci.yml/badge.svg)](https://github.com/spidyskip/pdftomd/actions/workflows/ci.yml)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![React 18](https://img.shields.io/badge/react-18-61DAFB.svg?logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Convert PDF documents to structured Markdown using **GLM-OCR**. Supports both **Ollama** and **MLX** (Apple Silicon) backends with a modern React frontend.

## Features

- **Dual OCR Backend** — Switch between Ollama and MLX (Apple Silicon) at runtime
- **Live Preview** — Watch markdown output update in real-time as each page is processed
- **Rich Progress Tracking** — 4-step progress indicator with per-page status
- **Connection Status** — Live health monitoring for both backends with availability indicators
- **Export** — Download results as Markdown files
- **MCP Endpoint** — AI agent integration via `/mcp` (Model Context Protocol)
- **Neo-Brutalist UI** — Notion-Ink inspired design with hard shadows and thick borders

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React + Vite   │────▶│   FastAPI        │────▶│  Ollama / MLX   │
│  Frontend :5173 │     │   Backend :8000  │     │  GLM-OCR Model  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                        ┌──────┴──────┐
                        │  MCP :8000  │
                        │  /mcp       │
                        └─────────────┘
```

## Prerequisites

### Common
- `pdftoppm` (from Poppler) — `brew install poppler` on macOS
- Python 3.10+
- Node.js 18+

### Ollama Backend
- [Ollama](https://ollama.com/) installed and running
- GLM-OCR model: `ollama pull glm-ocr`

### MLX Backend (Apple Silicon)
- Apple Silicon Mac (M series chip)
- macOS 14.0 (Sonoma) or later

```bash
python3 -m venv .venv-mlx
source .venv-mlx/bin/activate
pip install git+https://github.com/Blaizzy/mlx-vlm.git

# Start MLX server (default port 8080)
mlx_vlm.server --trust-remote-code --port 8080

# Or use MLX Studio which runs on port 8080
```

## Quick Start

### 1. Backend

```bash
cd /path/to/project
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# For Ollama (default)
OLLAMA_URL=http://localhost:11434 uvicorn main:app --reload --port 8000

# For MLX
OCR_BACKEND=mlx MLX_URL=http://localhost:8080 uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/jobs` | Upload PDF for conversion |
| `GET` | `/api/jobs` | List all jobs |
| `GET` | `/api/jobs/{id}` | Get job status |
| `GET` | `/api/jobs/{id}/result` | Get markdown result |
| `DELETE` | `/api/jobs/{id}` | Delete job |
| `GET` | `/api/health` | Health check (active backend) |
| `GET` | `/api/health/all` | Health check (all backends) |
| `POST` | `/api/backend` | Switch backend |
| `SSE` | `/mcp` | Model Context Protocol |

## Tech Stack

- **Backend**: FastAPI, Pydantic, httpx, MCP
- **Frontend**: React 18, TypeScript, Vite, CSS
- **OCR**: GLM-OCR via Ollama or MLX
- **Design**: Notion-Ink Neo-Brutalist with Geist + JetBrains Mono
