#!/usr/bin/env bash

set -euo pipefail

echo "🔄 Initializing git submodules..."
git submodule update --init --recursive

echo "✅ Submodules initialized successfully"

