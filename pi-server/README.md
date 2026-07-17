# Zenith Frontier Pi Server

Standalone Node/TypeScript game API for Raspberry Pi. **SQLite is the live store**; Google Sheets is backup only (dirty sync every 3 minutes).

Public internet path:

```text
Browser → Cloudflare Worker (proxy) → cloudflared tunnel → this server :8788
```

Install as a **separate** folder (do not merge with other Pi apps):

```text
/home/pepsealsea/zenith-frontier-pi
```

## Protocol

Same as the legacy Worker / GAS API:

- `GET /?action=...`
- `POST /` with `application/x-www-form-urlencoded` or JSON (`action` required)
- Responses: `HEADERS|...\nROW|...`, `OK|...`, or `ERROR|...`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness |
| GET | `/sync/status` | Dirty / last sync info |
| POST | `/sync/now` | Force push dirty rows to Sheets |

Default listen: `0.0.0.0:8788`

## Setup

From Windows (preferred):

```powershell
powershell -File pi-server/deploy/push-to-pi.ps1
```

Credentials: `pi-server/deploy/.pi-credentials` (gitignored).

On the Pi:

```bash
cd ~/zenith-frontier-pi
npm install
npm run start
```

Empty DB on first boot auto-imports from Sheets. Manual re-import: `npm run import-sheets`.

Starter catalogs without Sheets (Jobs, Skills, Equipment, Titles, ArcanumCards, WorldBoss):

```bash
npm run seed-catalogs
```

Inserts only missing primary keys; safe to re-run.

## systemd

| Unit | Role |
|------|------|
| `zenith-frontier-pi` | Live API (SQLite) |
| `cloudflared` | Named tunnel (custom domain later) |
| `zenith-frontier-quick-tunnel` | trycloudflare → Worker `/_pi/origin` |

```bash
sudo systemctl status zenith-frontier-pi cloudflared zenith-frontier-quick-tunnel
```

## Public URL

Frontend uses `https://zenith-frontier-worker.sealseapep.workers.dev` (Worker proxies to Pi).

LAN: `http://192.168.1.59:8788`

See repo root `SYSTEMS_FIX_WORKFLOW.txt` for the playable-first fix checklist on this pipe.
