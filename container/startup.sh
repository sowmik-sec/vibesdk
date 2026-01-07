#!/bin/bash
set -e

# Print environment info
echo "Starting Native Sandbox Container..."
echo "Node/Bun Version: $(bun --version)"
echo "Architecture: $(uname -m)"

# Ensure data directory exists
mkdir -p /workspace/data

# Keep container alive forever
echo "Container initialized. Entering keepalive loop..."
exec tail -f /dev/null
