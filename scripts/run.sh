#!/bin/bash

cleanup() {
  echo "Stopping services..."
  kill 0
}

trap cleanup EXIT

echo "Starting Next.js server..."
bun server.js &

echo "Starting FastAPI..."

(
  cd fastapi || exit

  # activate venv
  source .venv/bin/activate

  uvicorn main:app --host 0.0.0.0 --port 8000
) &

wait