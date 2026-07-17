# Zenith Frontier

Web RPG inspired by Shangri-La Frontier. **Live game data is SQLite on a Raspberry Pi**; Google Sheets is backup only.

```text
Browser / Next.js
       |
       |  NEXT_PUBLIC_API_URL
       v
Cloudflare Worker  (public CORS + /_pi/origin proxy)
       |
       |  fetch → trycloudflare (quick tunnel; custom domain later)
       v
cloudflared on Pi
       |
       v
pi-server :8788  (Hono + SQLite)  === LIVE ===
       |
       |  dirty sync every ~3 min
       v
Google Sheets  === BACKUP ===
```

LAN shortcut (home): `http://192.168.1.59:8788` → Pi directly.

## Repo layout

| Path | Role |
|------|------|
| `src/` | Next.js frontend (Scene2D play + admin forge) |
| `src/lib/config.ts` | Default `API_URL` → Worker |
| `src/lib/googleClientId.ts` | Google OAuth Web Client ID (same as kanban) |
| `src/services/gasService.ts` | Client API (`?action=`) → Worker → Pi |
| `worker/` | Cloudflare Worker proxy + Sheets fallback |
| `pi-server/` | Live API + SQLite + Sheets backup sync |
| `SYSTEMS_FIX_WORKFLOW.txt` | Checklist (ops + playable phases) |

## Frontend (dev)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Override API:

```bash
# .env.local (gitignored)
NEXT_PUBLIC_API_URL=https://zenith-frontier-worker.sealseapep.workers.dev
# optional: NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
```

**MVP engine:** Scene2D only (`src/components/game/Scene2D.tsx`). R3F files under `src/components/game/Scene.tsx` (and Monster/NPC/Spawner) are orphan — not mounted.

## Google OAuth (A10)

Client ID matches kanban: `src/lib/googleClientId.ts`  
(`787988651964-gf258mnif89bu6g0jao2mpdsm72j96da.apps.googleusercontent.com`)

In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → that OAuth **Web** client, add **Authorized JavaScript origins** for every host you serve the frontend from, e.g.:

- `http://localhost:3000`
- your deployed Pages / Vercel origin (when you have one)

Authorized redirect URIs are usually not required for `@react-oauth/google` One Tap / button (GIS). If login fails with `origin_mismatch`, the current page origin is missing from that list.

Service-account keys for Sheets backup live in `pi-server/.env` / Worker secrets — never commit them. Credentials files and `pi-server/deploy/.pi-credentials` are gitignored.

## Public health checks

```bash
curl https://zenith-frontier-worker.sealseapep.workers.dev/health
curl https://zenith-frontier-worker.sealseapep.workers.dev/_pi/status
# expect {"mode":"proxy-to-pi","hasOrigin":true,...}
```

## Pi server

Install path on Pi (isolated): `/home/pepsealsea/zenith-frontier-pi`

```powershell
powershell -File pi-server/deploy/push-to-pi.ps1
```

On the Pi:

```bash
cd ~/zenith-frontier-pi
npm install
npm run seed-catalogs   # Jobs / Skills / Equipment / Titles / ArcanumCards / WorldBoss
# or: npm run import-sheets   # pull everything from Sheets backup
npm run start
```

systemd: `zenith-frontier-pi`, `cloudflared`, `zenith-frontier-quick-tunnel`  
See [pi-server/README.md](pi-server/README.md).

## Worker

```bash
cd worker
npx wrangler deploy
```

See [worker/README.md](worker/README.md).

## Rules

1. Live writes → Pi only (via Worker public URL or LAN `:8788`).
2. Sheets → backup; never block gameplay on Sheets quota.
3. Frontend never imports `google-auth` or Sheets SDKs.
4. Prefer Scene2D play loop before Shangri-La depth systems.

Custom domain on the named tunnel is deferred (no domain yet) — quick tunnel + Worker `/_pi/origin` stays the public pipe.
