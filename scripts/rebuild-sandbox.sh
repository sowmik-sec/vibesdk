#!/bin/bash
echo "🏗️  Rebuilding Sandbox Container..."
docker build -f SandboxDockerfile -t docker.io/library/sandbox:latest .
echo "✅ Build Complete!"
