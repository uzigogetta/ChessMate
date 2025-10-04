#!/usr/bin/env bash
set -euo pipefail

# Pull latest (optional; comment out if the user prefers manual pulls)
# git fetch origin && git reset --hard origin/main

# Native paths that require a rebuild if changed
NATIVE_PATHS=(
  "ios/"
  "android/"
  "packages/react-native-stockfish-jsi/ios/"
  "packages/react-native-stockfish-jsi/cpp/"
  "plugins/"
  "**/*.podspec"
)

LAST_TAG_FILE=".last_native_fingerprint"

# Compute fingerprint for native-related files
CURRENT_FP="$(git ls-files -z ${NATIVE_PATHS[@]} 2>/dev/null | xargs -0 sha1sum | sha1sum | awk '{print $1}')"
[ -z "${CURRENT_FP}" ] && CURRENT_FP="no-native-files"

if [ -f "$LAST_TAG_FILE" ]; then
  LAST_FP="$(cat "$LAST_TAG_FILE")"
else
  LAST_FP="first-run"
fi

if [ "$CURRENT_FP" != "$LAST_FP" ]; then
  echo "🔧 Native change detected (or first run). Rebuilding iOS dev client…"
  npm run ios:build:clean || pnpm run ios:build:clean || yarn ios:build:clean
  echo "$CURRENT_FP" > "$LAST_TAG_FILE"
else
  echo "⚡ No native change. Starting Metro only…"
  npm run ios:metro || pnpm run ios:metro || yarn ios:metro
fi


