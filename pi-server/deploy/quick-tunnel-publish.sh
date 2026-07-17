#!/bin/bash
# Publishes a public trycloudflare.com URL and registers it with the Worker proxy.
set -euo pipefail

ORIGIN_API="${ORIGIN_API:-https://zenith-frontier-worker.sealseapep.workers.dev}"
SECRET_FILE="${SECRET_FILE:-/home/pepsealsea/zenith-frontier-pi/deploy/.pi-origin-secret}"
LOCAL_ORIGIN="${LOCAL_ORIGIN:-http://127.0.0.1:8788}"
URL_FILE="${URL_FILE:-/home/pepsealsea/zenith-frontier-pi/data/public-url.txt}"
LOG_FILE="${LOG_FILE:-/home/pepsealsea/zenith-frontier-pi/data/quick-tunnel.log}"

mkdir -p "$(dirname "$URL_FILE")" "$(dirname "$LOG_FILE")"

if [ ! -f "$SECRET_FILE" ]; then
  echo "Missing $SECRET_FILE"
  exit 1
fi
SECRET=$(tr -d '\r\n' < "$SECRET_FILE")

publish_url() {
  local url="$1"
  echo "$url" > "$URL_FILE"
  curl -fsS -X POST "$ORIGIN_API/_pi/origin" \
    -H "content-type: application/json" \
    -H "x-pi-secret: $SECRET" \
    -d "{\"url\":\"$url\"}" \
    && echo " published $url" || echo " publish failed for $url"
}

# cloudflared prints the URL to stderr/stdout; capture both
/usr/local/bin/cloudflared tunnel --no-autoupdate --url "$LOCAL_ORIGIN" 2>&1 | while IFS= read -r line; do
  echo "$line" >> "$LOG_FILE"
  echo "$line"
  if echo "$line" | grep -Eq 'https://[a-zA-Z0-9-]+\.trycloudflare\.com'; then
    url=$(echo "$line" | grep -Eo 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' | head -1)
    if [ -n "$url" ]; then
      publish_url "$url"
    fi
  fi
done
