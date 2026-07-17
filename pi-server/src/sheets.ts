import { JWT } from 'google-auth-library';
import {
  clearDirtyForSheet,
  findLocalRowByPk,
  getDirtyState,
  getHeaders,
  replaceSheetFromValues,
  setLastPullAt,
  setLastPushAt,
  setLastPushError,
  setSyncing,
  sheetToRows,
  type Db,
} from './db.js';
import { SHEET_HEADERS, SHEET_NAMES, SHEET_PRIMARY_KEYS, type Row } from './schema.js';

export type SheetsEnv = {
  SPREADSHEET_ID: string;
  GOOGLE_CLIENT_EMAIL: string;
  GOOGLE_PRIVATE_KEY: string;
};

let cachedAuthToken: { value: string; expiresAt: number } | null = null;
let authTokenPromise: Promise<string> | null = null;
const sheetIdCache: Record<string, number> = {};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getAuthToken(env: SheetsEnv): Promise<string> {
  const t = Date.now();
  if (cachedAuthToken && t < cachedAuthToken.expiresAt - 60_000) {
    return cachedAuthToken.value;
  }
  if (!authTokenPromise) {
    authTokenPromise = (async () => {
      const client = new JWT({
        email: env.GOOGLE_CLIENT_EMAIL.replace(/^"|"$/g, ''),
        key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, ''),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      const credentials = await client.authorize();
      const token = credentials.access_token as string;
      cachedAuthToken = { value: token, expiresAt: t + 3_500_000 };
      authTokenPromise = null;
      return token;
    })();
  }
  return authTokenPromise;
}

async function sheetsFetch(
  env: SheetsEnv,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const token = await getAuthToken(env);
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(url, { ...init, headers });
  if (res.status === 429 || res.status === 503) {
    await sleep(2000);
    const retry = await fetch(url, { ...init, headers });
    return retry;
  }
  return res;
}

export async function getSheetValues(env: SheetsEnv, range: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
  const res = await sheetsFetch(env, url);
  if (!res.ok) throw new Error(`Sheets API error: ${await res.text()}`);
  const data = (await res.json()) as { values?: unknown[][] };
  return (data.values || []).map((row) =>
    row.map((c) => (c !== undefined && c !== null ? String(c) : '')),
  );
}

async function getSheetId(env: SheetsEnv, sheetName: string): Promise<number> {
  if (sheetIdCache[sheetName] !== undefined) return sheetIdCache[sheetName];
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}?fields=sheets.properties`;
  const res = await sheetsFetch(env, url);
  if (!res.ok) throw new Error(`Sheets API error: ${await res.text()}`);
  const data = (await res.json()) as {
    sheets?: { properties: { title: string; sheetId: number } }[];
  };
  for (const s of data.sheets || []) {
    sheetIdCache[s.properties.title] = s.properties.sheetId;
  }
  if (sheetIdCache[sheetName] === undefined) throw new Error(`Sheet not found: ${sheetName}`);
  return sheetIdCache[sheetName];
}

async function batchUpdateSheet(env: SheetsEnv, requests: unknown[]) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}:batchUpdate`;
  const res = await sheetsFetch(env, url, {
    method: 'POST',
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) throw new Error(`Sheets API error: ${await res.text()}`);
  return res.json();
}

async function clearSheetBody(env: SheetsEnv, sheetName: string) {
  const data = await getSheetValues(env, sheetName);
  if (data.length <= 1) return;
  const sheetId = await getSheetId(env, sheetName);
  await batchUpdateSheet(env, [
    {
      deleteDimension: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: 1,
          endIndex: data.length,
        },
      },
    },
  ]);
}

async function ensureHeaderRow(env: SheetsEnv, sheetName: string) {
  const headers = getHeaders(sheetName);
  const data = await getSheetValues(env, `${sheetName}!1:1`);
  if (data.length === 0 || data[0].length === 0) {
    await updateRange(env, `${sheetName}!A1`, [headers]);
  }
}

function columnToLetter(col: number): string {
  let temp = '';
  let n = col;
  while (n > 0) {
    const rem = (n - 1) % 26;
    temp = String.fromCharCode(65 + rem) + temp;
    n = Math.floor((n - 1) / 26);
  }
  return temp;
}

async function updateRange(env: SheetsEnv, range: string, values: string[][]) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await sheetsFetch(env, url, {
    method: 'PUT',
    body: JSON.stringify({ values }),
  });
  if (!res.ok) throw new Error(`Sheets API error: ${await res.text()}`);
  return res.json();
}

async function appendRows(env: SheetsEnv, sheetName: string, values: string[][]) {
  if (values.length === 0) return;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}/values/${encodeURIComponent(`${sheetName}!A:A`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await sheetsFetch(env, url, {
    method: 'POST',
    body: JSON.stringify({ values }),
  });
  if (!res.ok) throw new Error(`Sheets API error: ${await res.text()}`);
  return res.json();
}

async function findSheetRowIndex(
  env: SheetsEnv,
  sheetName: string,
  pk: Record<string, string>,
): Promise<number> {
  const keys = SHEET_PRIMARY_KEYS[sheetName];
  const data = await getSheetValues(env, sheetName);
  if (data.length < 2) return -1;
  const headers = data[0];
  const colIdxs = keys.map((k) => headers.indexOf(k));
  if (colIdxs.some((i) => i === -1)) return -1;
  for (let i = 1; i < data.length; i++) {
    const match = keys.every((k, j) => String(data[i][colIdxs[j]] ?? '') === String(pk[k] ?? ''));
    if (match) return i + 1;
  }
  return -1;
}

async function rewriteFullSheet(env: SheetsEnv, db: Db, sheetName: string) {
  await ensureHeaderRow(env, sheetName);
  await clearSheetBody(env, sheetName);
  const headers = getHeaders(sheetName);
  const rows = sheetToRows(db, sheetName);
  const values = rows.map((r) => headers.map((h) => r[h] || ''));
  const CHUNK = 200;
  for (let i = 0; i < values.length; i += CHUNK) {
    await appendRows(env, sheetName, values.slice(i, i + CHUNK));
    if (i + CHUNK < values.length) await sleep(300);
  }
}

async function upsertDirtyRows(
  env: SheetsEnv,
  db: Db,
  sheetName: string,
  pkJsonList: string[],
) {
  await ensureHeaderRow(env, sheetName);
  const headers = getHeaders(sheetName);
  const endCol = columnToLetter(headers.length);
  const toAppend: string[][] = [];

  for (const pkStr of pkJsonList) {
    const pk = JSON.parse(pkStr) as Record<string, string>;
    const local = findLocalRowByPk(db, sheetName, pk);
    if (!local) {
      const sheetRow = await findSheetRowIndex(env, sheetName, pk);
      if (sheetRow !== -1) {
        const sheetId = await getSheetId(env, sheetName);
        await batchUpdateSheet(env, [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: sheetRow - 1,
                endIndex: sheetRow,
              },
            },
          },
        ]);
        await sleep(200);
      }
      continue;
    }

    const values = headers.map((h) => local[h] || '');
    const sheetRow = await findSheetRowIndex(env, sheetName, pk);
    if (sheetRow === -1) {
      toAppend.push(values);
    } else {
      await updateRange(env, `${sheetName}!A${sheetRow}:${endCol}${sheetRow}`, [values]);
      await sleep(150);
    }
  }

  const CHUNK = 50;
  for (let i = 0; i < toAppend.length; i += CHUNK) {
    await appendRows(env, sheetName, toAppend.slice(i, i + CHUNK));
    if (i + CHUNK < toAppend.length) await sleep(300);
  }
}

export async function pullAllSheets(env: SheetsEnv, db: Db): Promise<void> {
  setSyncing(true);
  try {
    for (const sheetName of SHEET_NAMES) {
      try {
        const data = await getSheetValues(env, sheetName);
        const expected = SHEET_HEADERS[sheetName];
        if (data.length === 0) {
          replaceSheetFromValues(db, sheetName, expected, []);
        } else {
          const headers = data[0].map(String);
          const body = data.slice(1).map((r) => r.map((c) => String(c ?? '')));
          replaceSheetFromValues(db, sheetName, headers, body);
        }
        await sleep(200);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('Unable to parse range') || msg.includes('Unable to parse')) {
          replaceSheetFromValues(db, sheetName, SHEET_HEADERS[sheetName], []);
          continue;
        }
        throw err;
      }
    }
    setLastPullAt(new Date().toISOString());
    setLastPushError(null);
  } finally {
    setSyncing(false);
  }
}

export async function pushDirtyToSheets(env: SheetsEnv, db: Db): Promise<{
  pushed: string[];
  skipped: boolean;
}> {
  const { fullSyncSheets, dirtyBySheet } = getDirtyState(db);
  const sheetsToPush = new Set([...fullSyncSheets, ...Object.keys(dirtyBySheet)]);
  if (sheetsToPush.size === 0) {
    return { pushed: [], skipped: true };
  }

  setSyncing(true);
  const pushed: string[] = [];
  try {
    for (const sheetName of sheetsToPush) {
      if (fullSyncSheets.includes(sheetName)) {
        await rewriteFullSheet(env, db, sheetName);
      } else {
        await upsertDirtyRows(env, db, sheetName, dirtyBySheet[sheetName] || []);
      }
      clearDirtyForSheet(db, sheetName);
      pushed.push(sheetName);
      await sleep(400);
    }
    setLastPushAt(new Date().toISOString());
    setLastPushError(null);
    return { pushed, skipped: false };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    setLastPushError(msg);
    throw err;
  } finally {
    setSyncing(false);
  }
}

export function rowToValues(row: Row, headers: string[]): string[] {
  return headers.map((h) => row[h] || '');
}
