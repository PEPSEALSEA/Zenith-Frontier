import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import path from 'node:path';
import {
  getSyncStatus,
  isDbEmpty,
  openDb,
  type Db,
} from './db.js';
import {
  parseBodyParams,
  queryToParams,
  routeGet,
  routePost,
} from './routes.js';
import {
  pullAllSheets,
  pushDirtyToSheets,
  type SheetsEnv,
} from './sheets.js';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function loadSheetsEnv(): SheetsEnv {
  return {
    SPREADSHEET_ID: requireEnv('SPREADSHEET_ID'),
    GOOGLE_CLIENT_EMAIL: requireEnv('GOOGLE_CLIENT_EMAIL'),
    GOOGLE_PRIVATE_KEY: requireEnv('GOOGLE_PRIVATE_KEY'),
  };
}

const PORT = parseInt(process.env.PORT || '8788', 10);
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
const SYNC_INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_MS || '180000', 10);

const db: Db = openDb(DATA_DIR);
const sheetsEnv = loadSheetsEnv();

const app = new Hono();
app.use('*', cors());

app.get('/health', (c) => c.text('ok'));

app.get('/sync/status', (c) => c.json(getSyncStatus(db)));

app.post('/sync/now', async (c) => {
  try {
    const result = await pushDirtyToSheets(sheetsEnv, db);
    return c.json({ ok: true, ...result, status: getSyncStatus(db) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ ok: false, error: message, status: getSyncStatus(db) }, 500);
  }
});

app.get('/', (c) => {
  const p = queryToParams(c);
  const action = p.action || '';
  if (!action) {
    return c.text('Zenith Frontier Pi Server is online');
  }
  try {
    const out = routeGet(db, action, p);
    return c.text(out);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.text(`ERROR|${message}`);
  }
});

app.post('/', async (c) => {
  try {
    const body = await parseBodyParams(c);
    const query = queryToParams(c);
    const p = { ...query, ...body };
    const action = p.action || '';
    if (!action) return c.text('ERROR|MISSING_ACTION');
    const out = routePost(db, action, p);
    return c.text(out);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.text(`ERROR|${message}`);
  }
});

app.options('*', (c) => c.body(null, 204));

async function bootstrap() {
  if (isDbEmpty(db)) {
    console.log('[boot] SQLite empty — pulling all sheets from Google…');
    await pullAllSheets(sheetsEnv, db);
    console.log('[boot] Import complete');
  } else {
    console.log('[boot] SQLite already has data — skipping initial pull');
  }

  const tick = async () => {
    try {
      const result = await pushDirtyToSheets(sheetsEnv, db);
      if (!result.skipped) {
        console.log(`[sync] Pushed sheets: ${result.pushed.join(', ') || '(none)'}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[sync] Push failed: ${message}`);
    }
  };

  setInterval(() => {
    void tick();
  }, SYNC_INTERVAL_MS);

  serve({ fetch: app.fetch, port: PORT, hostname: HOST }, (info) => {
    console.log(`Zenith Frontier Pi listening on http://${info.address}:${info.port}`);
    console.log(`Data dir: ${DATA_DIR}`);
    console.log(`Sheet backup every ${SYNC_INTERVAL_MS}ms`);
  });
}

bootstrap().catch((err) => {
  console.error('[boot] Fatal:', err);
  process.exit(1);
});
