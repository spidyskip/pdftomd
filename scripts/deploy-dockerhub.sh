#!/bin/bash
# Deploy to Docker Hub
# Usage: ./deploy-dockerhub.sh <docker-username> <image-name> <tag>
set -e

USERNAME=${1:?Docker username required}
IMAGE=${2:-pdfmd}
TAG=${3:-latest}

echo "🔨 Building $IMAGE:$TAG"
Docker build -t $IMAGE:$TAG .

FULL_NAME="$USERNAME/$IMAGE:$TAG"

echo "🏷️ Tagging $FULL_NAME"
Docker tag $IMAGE:$TAG $FULL_NAME

echo "📤 Pushing to Docker Hub"
Docker push $FULL_NAME

echo "✅ Pushed $FULL_NAME"
