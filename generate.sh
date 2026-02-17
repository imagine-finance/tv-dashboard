#!/usr/bin/env bash
set -euo pipefail

# Self-contained build script for the TV dashboard pipeline.
# Configures Lightdash CLI, fetches metrics, and renders the video.
#
# Required environment variables:
#   LIGHTDASH_API_KEY
#   LIGHTDASH_SERVER_URL
#   LIGHTDASH_PROJECT_ID

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== TV Dashboard Pipeline ==="
echo ""

# ------------------------------------------------------------------
# 1. Configure Lightdash CLI from environment
# ------------------------------------------------------------------
echo "[1/4] Configuring Lightdash CLI..."

if [ -z "${LIGHTDASH_API_KEY:-}" ]; then
    echo "ERROR: LIGHTDASH_API_KEY is not set" >&2
    exit 1
fi

lightdash login --token "$LIGHTDASH_API_KEY" --url "$LIGHTDASH_SERVER_URL"
lightdash config set-project --uuid "$LIGHTDASH_PROJECT_ID"

echo "  Lightdash configured for project $LIGHTDASH_PROJECT_ID"

# ------------------------------------------------------------------
# 2. Fetch metrics
# ------------------------------------------------------------------
echo ""
echo "[2/4] Fetching dashboard metrics..."

python3 "$SCRIPT_DIR/scripts/fetch-dashboard-metrics.py"

echo "  Metrics written to remotion-dashboard/data/metrics.json"

# ------------------------------------------------------------------
# 3. Install Remotion dependencies
# ------------------------------------------------------------------
echo ""
echo "[3/4] Installing Remotion dependencies..."

cd "$SCRIPT_DIR/remotion-dashboard"
npm ci

# ------------------------------------------------------------------
# 4. Render the video
# ------------------------------------------------------------------
echo ""
echo "[4/4] Rendering dashboard video..."

npx remotion render Dashboard out/dashboard.mp4

echo ""
echo "=== Pipeline complete ==="
echo "Output: $SCRIPT_DIR/remotion-dashboard/out/dashboard.mp4"
