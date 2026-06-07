# Release Notes — Beta

**Release Date:** 2026-06-07

## Overview

This beta release introduces multi-engine OCR support, a redesigned job management UI, and full Docker deployment capabilities. Users can now choose between Ollama, MLX, and Markitdown as their OCR backend, with clear visual indicators for each engine's status.

## What's New

### 🔄 Multi-Engine OCR
- **Markitdown** added as a selectable backend for native PDF-to-Markdown conversion
- Engine selector with real-time health status for each backend
- Backend-specific model display (e.g., `mlx-community/GLM-OCR-bf16`, `basic (no ocr)`)
- Markitdown OCR plugin detection (`markitdown-ocr` package)

### 📋 Collapsible Job List
- Jobs organized into **"In progress"** and **"Completed"** sections
- Collapsible sections with toggle arrows
- Engine badge on each job showing which backend processed it

### 🎨 Connection Status Redesign
- Clean layout: engine name + model/sublabel
- Color-coded border and text: green (connected), yellow (partial), red (offline)
- Hover tooltips with detailed backend descriptions
- No more status dot — color is on the container border and label

### 🐳 Docker Deployment
- Complete `docker-compose.yml` with backend, frontend, and optional Ollama services
- Frontend Dockerfile with Node 22 Alpine
- Backend Dockerfile with Python 3.13 slim + markitdown
- Dynamic host IP configuration via `.env` file

### 🎯 UI Enhancements
- Markdown document icon in header and browser tab
- Footer with app description
- Live preview with raw markdown tab
- Job history persistence across page refreshes

## Bug Fixes

- MLX health check now uses `/v1/models` endpoint
- MLX default port corrected to 8080
- Worker continues on per-page OCR errors instead of aborting entire job
- Engine selector shows correct URLs for custom endpoints
- CORS/network issues resolved with server-side endpoint validation
- Stale `.jsx` files removed (conflicted with `.tsx` components)
- Vite proxy fixed to use backend service name
- `tsconfig.node.json` include paths corrected

## Quick Start

### Local Development

```bash
# Backend
cd /path/to/project
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm run dev
```

### Docker

```bash
# Start all services
docker compose up -d --build

# Start with Ollama support
docker compose --profile ollama up -d --build

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Stop all
docker compose down
```

## Configuration

Create a `.env` file in the project root:

```env
HOST_IP=YOUR_HOST_IP
```

Update `HOST_IP` to your machine's local IP address. Find it with:

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

## Known Issues

- Markitdown without `markitdown-ocr` plugin shows `basic (no ocr)` — install the plugin for full OCR support
- MLX requires the server to be running on the host machine at the configured port
- Ollama requires the `--profile ollama` flag to start the Ollama container

## Feedback

Please report issues at: https://github.com/spidyskip/pdftomd/issues
