# Zenith Frontier Worker

Cloudflare Worker at the **public edge**. Live gameplay data lives on the Raspberry Pi (SQLite). This Worker:

1. Proxies `?action=` traffic to the Pi when `PI_ORIGIN` KV has a URL (set by the Pi quick-tunnel publisher via `POST /_pi/origin`)
2. Falls back to Google Sheets handlers only if no Pi origin is registered

## Public URL

`https://zenith-frontier-worker.sealseapep.workers.dev`

## Useful paths

| Path | Purpose |
|------|---------|
| `GET /health` | Liveness |
| `GET /_pi/status` | `{ mode: "proxy-to-pi" \| "sheets-direct", hasOrigin }` |
| `POST /_pi/origin` | Pi registers tunnel URL (`x-pi-secret` header) |
| `GET/POST /?action=...` | Game API (proxied to Pi when origin set) |

## Deploy

```bash
cd worker
npx wrangler secret put GOOGLE_CLIENT_EMAIL
npx wrangler secret put GOOGLE_PRIVATE_KEY
npx wrangler secret put PI_ORIGIN_SECRET
npx wrangler deploy
```

KV binding `PI_ORIGIN` is in `wrangler.toml`.

Override frontend with `NEXT_PUBLIC_API_URL` if needed. See `SYSTEMS_FIX_WORKFLOW.txt` for the full fix plan on the tunnel pipe.
