#!/bin/bash

read -p "Image name [logspectra]  : " IMAGE_NAME
IMAGE_NAME=${IMAGE_NAME:-logspectra}
read -p "Image tag [latest]    : " IMAGE_TAG
IMAGE_TAG=${IMAGE_TAG:-latest}

echo "Creating docker image : $IMAGE_NAME:$IMAGE_TAG"

# Auto-generate dynamic metadata
VERSION=$(git describe --tags --always 2>/dev/null || echo "dev")
VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BUILD_SOURCE=local

build_args=(
  --build-arg VERSION="$VERSION"
  --build-arg VCS_REF="$VCS_REF"
  --build-arg BUILD_DATE="$BUILD_DATE"
  --build-arg BUILD_SOURCE="$BUILD_SOURCE"
)

# Load static metadata from .env.docker
if [ -f .env.docker ]; then
  while IFS= read -r line; do
    clean_line=$(echo "$line" | sed 's/^"\(.*\)"$/\1/' | sed 's/=\("\(.*\)"\)/=\2/')
    build_args+=(--build-arg "$clean_line")
  done < .env.docker
else
  echo "No .env.docker file found, using only auto-generated metadata"
fi

# Build
docker build "${build_args[@]}" -t "$IMAGE_NAME:$IMAGE_TAG" .

# Status
if [ $? -eq 0 ]; then
  echo "Status : Build success"
else
  echo "Status : Build failed"
fi

# Tag
docker tag "$IMAGE_NAME:$IMAGE_TAG" "$IMAGE_NAME:latest"
docker tag "$IMAGE_NAME:$IMAGE_TAG" "$IMAGE_NAME:$VERSION"
