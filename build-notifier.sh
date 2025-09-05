#!/bin/bash
set -e

echo "Building notifier app and dependencies for production..."

# Set environment variables
export SKIP_ENV_VALIDATION=1

# Build the dependencies first
echo "Building internal packages..."
pnpm --filter @cfb-picks/notifier^... build

# Build the notifier app  
echo "Building notifier app..."
pnpm --filter @cfb-picks/notifier build

echo "Build completed successfully!"
echo "Built files are located in:"
echo "- packages/cfbd/dist/"
echo "- packages/db/dist/"
echo "- packages/lib/dist/"
echo "- apps/notifier/dist/"

echo ""
echo "To build Docker image, run:"
echo "docker build -f apps/notifier/Dockerfile -t cfb-picks-notifier ."