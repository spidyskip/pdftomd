# Changelog

## [Beta] - 2026-06-07

### New Features

**Multi-Engine OCR Support**
- Added **Markitdown** as a selectable OCR backend alongside Ollama and MLX
- Markitdown detects `markitdown-ocr` plugin availability and reports status accordingly
- Engine selector UI with backend-specific health indicators and model display

**Collapsible Job List**
- Jobs now split into **"In progress"** and **"Completed"** sections
- Sections are collapsible with a toggle arrow
- Each job shows an **engine badge** (MLX, Ollama, Markitdown) indicating which backend processed it

**Connection Status UI**
- Redesigned status indicator: engine name + model/sublabel (no dot)
- Color-coded states: green (connected), yellow (partial), red (offline)
- Hover tooltip with backend-specific descriptions
- Markitdown shows `basic (no ocr)` or `with OCR` based on plugin availability

**Docker Support**
- Full Docker Compose setup with backend, frontend, and optional Ollama services
- Frontend container with Vite dev server and API proxy
- Backend container with markitdown pre-installed
- Dynamic host IP detection via `.env` file for MLX connectivity from containers

**UI Improvements**
- Markdown document icon in header and browser tab (favicon)
- Footer with app description
- Live preview with raw markdown tab
- Job history persistence and load on refresh

### Bug Fixes

- Fixed MLX health check to use `/v1/models` endpoint
- Fixed MLX default port (8080)
- Fixed worker to continue on per-page OCR errors instead of aborting entire job
- Fixed engine selector showing correct URLs for custom endpoints
- Fixed connection status labeling for Markitdown backend
- Fixed CORS/network issues with server-side custom endpoint validation
- Fixed `tsconfig.node.json` include paths
- Removed stale `.jsx` files conflicting with `.tsx` components
- Fixed Vite proxy to use backend service name instead of localhost
- Removed `VITE_API_URL` env var so frontend uses relative `/api` paths

### Docker

```bash
# Start all services
docker compose up -d --build

# Start with Ollama
docker compose --profile ollama up -d --build

# Rebuild after changes
docker compose down && docker compose up -d --build
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OCR_BACKEND` | `markitdown` | Default OCR engine: `ollama`, `mlx`, or `markitdown` |
| `MLX_URL` | `http://host.docker.internal:8080` | MLX server URL |
| `OLLAMA_URL` | `http://ollama:11434` | Ollama server URL |
| `HOST_IP` | `your.host.ip.here` | Host IP for container-to-host connectivity |
