#!/bin/bash
# EnviroDash Production Deployment Script
#
# Usage:
#   ./scripts/deploy.sh                 # Build and run locally with Docker
#   ./scripts/deploy.sh --build-only    # Just build the Docker images
#   ./scripts/deploy.sh --up            # Start existing containers
#   ./scripts/deploy.sh --down          # Stop containers
#   ./scripts/deploy.sh --logs          # Tail logs

set -e

cd "$(dirname "$0")/.."

COMMAND="${1:-default}"

case "$COMMAND" in
  --build-only)
    echo "🏗️  Building Docker images..."
    docker compose build
    echo "✅ Build complete. Run './scripts/deploy.sh --up' to start."
    ;;

  --up)
    echo "🚀 Starting EnviroDash..."
    docker compose up -d
    echo ""
    echo "✅ Services started:"
    echo "   Web: http://localhost:3000"
    echo "   Alerts WS: http://localhost:3003"
    echo "   Health: http://localhost:3000/api/health"
    ;;

  --down)
    echo "🛑 Stopping EnviroDash..."
    docker compose down
    echo "✅ Stopped."
    ;;

  --logs)
    echo "📋 Tailing logs (Ctrl+C to stop)..."
    docker compose logs -f
    ;;

  default)
    echo "🏗️  Building and starting EnviroDash..."
    if [ ! -f .env ]; then
      echo "⚠️  No .env file found. Copying from .env.example..."
      cp .env.example .env
      echo "⚠️  Edit .env to set your MapTiler API key and NextAuth secret."
    fi
    docker compose up -d --build
    echo ""
    echo "✅ EnviroDash is running:"
    echo "   Web: http://localhost:3000"
    echo "   Alerts WS: http://localhost:3003"
    echo "   Health: http://localhost:3000/api/health"
    echo ""
    echo "Run './scripts/deploy.sh --logs' to tail logs."
    ;;

  *)
    echo "Usage: $0 {--build-only|--up|--down|--logs}"
    echo "  (no args)  Build and start all services"
    echo "  --build-only  Build Docker images without starting"
    echo "  --up          Start existing containers"
    echo "  --down        Stop all containers"
    echo "  --logs        Tail logs"
    exit 1
    ;;
esac
