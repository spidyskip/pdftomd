# ---------- Build Stage ----------
FROM node:20-alpine AS react-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --silent
COPY frontend .
RUN npm run build

# ---------- Runtime Stage ----------
FROM python:3.13-slim
LABEL maintainer="pdfmd-service"

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY converter/ ./converter/
COPY app.py .
COPY static/ ./static/

# Copy built React app
COPY --from=react-build /app/frontend/dist ./static

# Create volume mount points
RUN mkdir -p /data/uploads /data/outputs

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

ENTRYPOINT ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]