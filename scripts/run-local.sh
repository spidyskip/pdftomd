#!/bin/bash
# Run locally with mounted volumes
set -e

echo "🔨 Building pdfmd..."
docker build -t pdfmd .

echo "🚀 Starting container..."
docker run -it --rm \
  -p 8000:8000 \
  -v $(pwd)/uploads:/data/uploads \
  -v $(pwd)/outputs:/data/outputs \
  --name pdfmd \
  pdfmd