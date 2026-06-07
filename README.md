# PDF to Markdown OCR

[![CI](https://github.com/spidyskip/pdftomd/actions/workflows/ci.yml/badge.svg)](https://github.com/spidyskip/pdftomd/actions/workflows/ci.yml)
[![Docker](https://github.com/spidyskip/pdftomd/actions/workflows/docker.yml/badge.svg)](https://github.com/spidyskip/pdftomd/actions/workflows/docker.yml)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![React 18](https://img.shields.io/badge/react-18-61DAFB.svg?logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Convert PDF documents to structured Markdown using AI-powered OCR engines. Supports **Ollama**, **MLX** (Apple Silicon), and **Markitdown** backends with a modern React frontend.

## Features

- **Multi-Engine OCR** — Switch between Ollama, MLX (Apple Silicon), and Markitdown at runtime
- **Markitdown Support** — Native PDF-to-Markdown conversion without OCR (with optional `markitdown-ocr` plugin for scanned PDFs)
- **Collapsible Job List** — Jobs organized into "In progress" and "Completed" sections with engine badges
- **Live Preview** — Watch markdown output update in real-time as each page is processed
- **Rich Progress Tracking** — 4-step progress indicator with per-page status
- **Connection Status** — Live health monitoring with color-coded indicators (green/red/yellow)
- **Export** — Download results as Markdown files
- **Docker Deployment** — Full Docker Compose setup with backend, frontend, and optional Ollama
- **MCP Endpoint** — AI agent integration via `/mcp` (Model Context Protocol)
- **Neo-Brutalist UI** — Notion-Ink inspired design with hard shadows and thick borders

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React + Vite   │────▶│   FastAPI        │────▶│  Ollama / MLX   │
│  Frontend :5173 │     │   Backend :8000  │     │  / Markitdown   │
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

### OCR Engine Setup

#### Option 1: Ollama (Cross-platform)

**Install Ollama:** [https://ollama.com/download](https://ollama.com/download)

**Pull the GLM-OCR model:**
```bash
ollama pull glm-ocr
```

**Start Ollama:**
```bash
ollama serve
# Runs on http://localhost:11434 by default
```

**Project config:**
```bash
# .env or environment variables
OCR_BACKEND=ollama
OLLAMA_URL=http://localhost:11434
MODEL_NAME=glm-ocr
```

#### Option 2: MLX (Apple Silicon only)

**Requirements:** Apple Silicon Mac (M1/M2/M3/M4), macOS 14.0+

**Install mlx-vlm:**
```bash
python3 -m venv .venv-mlx
source .venv-mlx/bin/activate
pip install git+https://github.com/Blaizzy/mlx-vlm.git
```

**Start MLX server:**
```bash
# Default port 8080
mlx_vlm.server --trust-remote-code --port 8080

# Or specify a model
mlx_vlm.server --model mlx-community/GLM-OCR-bf16 --trust-remote-code --port 8080
```

**Alternative: MLX Studio** — GUI app for running MLX models: [https://github.com/Blaizzy/mlx-studio](https://github.com/Blaizzy/mlx-studio)

**Project config:**
```bash
OCR_BACKEND=mlx
MLX_URL=http://localhost:8080
MLX_MODEL=mlx-community/GLM-OCR-bf16
```

#### Option 3: Markitdown (No server required)

**Install:**
```bash
pip install markitdown[pdf]
```

**Optional OCR plugin** (for scanned PDFs):
```bash
pip install markitdown-ocr
```

**Project config:**
```bash
OCR_BACKEND=markitdown
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

# For Markitdown
OCR_BACKEND=markitdown uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

### 3. Docker (Recommended)

**Option A: Pre-built images (fastest)**
```bash
# Uses images from GitHub Container Registry
docker compose -f docker-compose.prod.yml up -d

# With Ollama
docker compose -f docker-compose.prod.yml --profile ollama up -d
```

**Option B: Build from source**
```bash
# Start all services
docker compose up -d --build

# With Ollama
docker compose --profile ollama up -d --build
```

**Common commands:**
```bash
# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Stop all
docker compose down

# Rebuild after code changes
docker compose down && docker compose up -d --build
```

**For MLX with Docker**, create a `.env` file:
```env
HOST_IP=YOUR_HOST_IP
```
Find your IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`

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
- **OCR**: GLM-OCR via Ollama or MLX, Markitdown for native PDF conversion
- **Design**: Notion-Ink Neo-Brutalist with Geist + JetBrains Mono

## License

[MIT](LICENSE)
