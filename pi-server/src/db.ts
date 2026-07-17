import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import {
  SHEET_HEADERS,
  SHEET_NAMES,
  SHEET_PRIMARY_KEYS,
  pkJson,
  quoteIdent,
  type Params,
  type Row,
} from './schema.js';

export type Db = Database.Database;

export type SyncStatus = {
  lastPullAt: string | null;
  lastPushAt: string | null;
  lastPushError: string | null;
  dirtySheets: { sheet: string; fullSync: boolean; dirtyRowCount: number }[];
  syncing: boolean;
};

let syncing = false;
let lastPullAt: string | null = null;
let lastPushAt: string | null = null;
let lastPushError: string | null = null;

export function setSyncing(v: boolean) {
  syncing = v;
}

export function setLastPullAt(v: string) {
  lastPullAt = v;
}

export function setLastPushAt(v: string) {
  lastPushAt = v;
}

export function setLastPushError(v: string | null) {
  lastPushError = v;
}

export function openDb(dataDir: string): Db {
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'zenith.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  migrateColumns(db);
  return db;
}

function initSchema(db: Db) {
  for (const sheet of SHEET_NAMES) {
    const cols = SHEET_HEADERS[sheet]
      .map((c) => `${quoteIdent(c)} TEXT NOT NULL DEFAULT ''`)
      .join(', ');
    db.exec(
      `CREATE TABLE IF NOT EXISTS ${quoteIdent(sheet)} (
        _rowid INTEGER PRIMARY KEY AUTOINCREMENT,
        ${cols}
      )`,
    );
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS _sync_meta (
      sheet_name TEXT PRIMARY KEY,
      full_sync INTEGER NOT NULL DEFAULT 0,
      last_synced_at TEXT
    );
    CREATE TABLE IF NOT EXISTS _dirty_rows (
      sheet_name TEXT NOT NULL,
      pk_json TEXT NOT NULL,
      PRIMARY KEY (sheet_name, pk_json)
    );
    CREATE TABLE IF NOT EXISTS _app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );
  `);

  for (const sheet of SHEET_NAMES) {
    db.prepare(
      `INSERT OR IGNORE INTO _sync_meta (sheet_name, full_sync) VALUES (?, 0)`,
    ).run(sheet);
  }
}

function migrateColumns(db: Db) {
  for (const sheet of SHEET_NAMES) {
    const expected = SHEET_HEADERS[sheet] || [];
    const existing = db.prepare(`PRAGMA table_info(${quoteIdent(sheet)})`).all() as {
      name: string;
    }[];
    const names = new Set(existing.map((c) => c.name));
    for (const col of expected) {
      if (names.has(col)) continue;
      db.exec(
        `ALTER TABLE ${quoteIdent(sheet)} ADD COLUMN ${quoteIdent(col)} TEXT NOT NULL DEFAULT ''`,
      );
    }
  }
  db.prepare(
    `UPDATE ${quoteIdent('Players')} SET money = '100' WHERE money IS NULL OR money = ''`,
  ).run();
}

export function isDbEmpty(db: Db): boolean {
  for (const sheet of SHEET_NAMES) {
    const row = db.prepare(`SELECT 1 AS x FROM ${quoteIdent(sheet)} LIMIT 1`).get() as
      | { x: number }
      | undefined;
    if (row) return false;
  }
  return true;
}

export function getHeaders(sheetName: string): string[] {
  return SHEET_HEADERS[sheetName] || [];
}

export function sheetToRows(db: Db, name: string): Row[] {
  const headers = getHeaders(name);
  if (!headers.length) return [];
  const cols = headers.map(quoteIdent).join(', ');
  const rows = db.prepare(
    `SELECT ${cols} FROM ${quoteIdent(name)} ORDER BY _rowid ASC`,
  ).all() as Record<string, unknown>[];
  return rows.map((r) => {
    const out: Row = {};
    for (const h of headers) {
      out[h] = r[h] !== undefined && r[h] !== null ? String(r[h]) : '';
    }
    return out;
  });
}

export function findRowIndex(db: Db, sheetName: string, key: string, value: string): number {
  const headers = getHeaders(sheetName);
  if (!headers.includes(key)) return -1;
  const row = db.prepare(
    `SELECT _rowid FROM ${quoteIdent(sheetName)} WHERE ${quoteIdent(key)} = ? LIMIT 1`,
  ).get(String(value)) as { _rowid: number } | undefined;
  return row ? row._rowid : -1;
}

export function findRowIndexDouble(
  db: Db,
  sheetName: string,
  key1: string,
  val1: string,
  key2: string,
  val2: string,
): number {
  const headers = getHeaders(sheetName);
  if (!headers.includes(key1) || !headers.includes(key2)) return -1;
  const row = db.prepare(
    `SELECT _rowid FROM ${quoteIdent(sheetName)}
     WHERE ${quoteIdent(key1)} = ? AND ${quoteIdent(key2)} = ?
     LIMIT 1`,
  ).get(String(val1), String(val2)) as { _rowid: number } | undefined;
  return row ? row._rowid : -1;
}

export function getRowByIndex(db: Db, sheetName: string, rowIdx: number): Row | null {
  const headers = getHeaders(sheetName);
  const cols = ['_rowid', ...headers.map(quoteIdent)].join(', ');
  const raw = db.prepare(
    `SELECT ${cols} FROM ${quoteIdent(sheetName)} WHERE _rowid = ?`,
  ).get(rowIdx) as Record<string, unknown> | undefined;
  if (!raw) return null;
  const row: Row = {};
  for (const h of headers) {
    row[h] = raw[h] !== undefined && raw[h] !== null ? String(raw[h]) : '';
  }
  return row;
}

export function appendRow(db: Db, sheetName: string, rowData: Params): boolean {
  const headers = getHeaders(sheetName);
  const values = headers.map((h) => (rowData[h] !== undefined ? String(rowData[h]) : ''));
  const placeholders = headers.map(() => '?').join(', ');
  const cols = headers.map(quoteIdent).join(', ');
  const info = db.prepare(
    `INSERT INTO ${quoteIdent(sheetName)} (${cols}) VALUES (${placeholders})`,
  ).run(...values);
  const inserted = getRowByIndex(db, sheetName, Number(info.lastInsertRowid));
  if (inserted) markDirty(db, sheetName, inserted);
  return true;
}

export function updateCell(
  db: Db,
  sheetName: string,
  rowIdx: number,
  colName: string,
  value: string,
): boolean {
  const headers = getHeaders(sheetName);
  if (!headers.includes(colName)) return false;
  const existing = getRowByIndex(db, sheetName, rowIdx);
  if (!existing) return false;
  db.prepare(
    `UPDATE ${quoteIdent(sheetName)} SET ${quoteIdent(colName)} = ? WHERE _rowid = ?`,
  ).run(String(value), rowIdx);
  const updated = { ...existing, [colName]: String(value) };
  markDirty(db, sheetName, updated);
  return true;
}

export function updateRowCells(
  db: Db,
  sheetName: string,
  rowIdx: number,
  rowData: Params,
): boolean {
  const headers = getHeaders(sheetName);
  const existing = getRowByIndex(db, sheetName, rowIdx);
  if (!existing) return false;
  const sets: string[] = [];
  const vals: string[] = [];
  for (const key of Object.keys(rowData)) {
    if (!headers.includes(key)) continue;
    sets.push(`${quoteIdent(key)} = ?`);
    vals.push(String(rowData[key]));
    existing[key] = String(rowData[key]);
  }
  if (sets.length === 0) return true;
  vals.push(String(rowIdx));
  db.prepare(
    `UPDATE ${quoteIdent(sheetName)} SET ${sets.join(', ')} WHERE _rowid = ?`,
  ).run(...vals);
  markDirty(db, sheetName, existing);
  return true;
}

export function deleteRow(db: Db, sheetName: string, rowIdx: number): void {
  const existing = getRowByIndex(db, sheetName, rowIdx);
  if (!existing) return;
  db.prepare(`DELETE FROM ${quoteIdent(sheetName)} WHERE _rowid = ?`).run(rowIdx);
  markDirty(db, sheetName, existing);
}

export function clearSheetData(db: Db, sheetName: string): void {
  db.prepare(`DELETE FROM ${quoteIdent(sheetName)}`).run();
  markSheetFullSync(db, sheetName);
}

export function upsertRow(db: Db, sheetName: string, key: string, p: Params): string {
  if (!p[key]) return `ERROR|MISSING_KEY_${key}`;
  const rowIdx = findRowIndex(db, sheetName, key, p[key]);
  if (rowIdx === -1) {
    appendRow(db, sheetName, p);
    return `OK|ROW_CREATED|${p[key]}`;
  }
  updateRowCells(db, sheetName, rowIdx, p);
  return `OK|ROW_UPDATED|${p[key]}`;
}

export function markDirty(db: Db, sheetName: string, row: Params): void {
  const pk = pkJson(sheetName, row);
  db.prepare(
    `INSERT OR IGNORE INTO _dirty_rows (sheet_name, pk_json) VALUES (?, ?)`,
  ).run(sheetName, pk);
}

export function markSheetFullSync(db: Db, sheetName: string): void {
  db.prepare(
    `UPDATE _sync_meta SET full_sync = 1 WHERE sheet_name = ?`,
  ).run(sheetName);
  db.prepare(`DELETE FROM _dirty_rows WHERE sheet_name = ?`).run(sheetName);
}

export function clearDirtyForSheet(db: Db, sheetName: string): void {
  db.prepare(`DELETE FROM _dirty_rows WHERE sheet_name = ?`).run(sheetName);
  db.prepare(
    `UPDATE _sync_meta SET full_sync = 0, last_synced_at = ? WHERE sheet_name = ?`,
  ).run(new Date().toISOString(), sheetName);
}

export function getDirtyState(db: Db): {
  fullSyncSheets: string[];
  dirtyBySheet: Record<string, string[]>;
} {
  const fullSyncSheets = (
    db.prepare(`SELECT sheet_name FROM _sync_meta WHERE full_sync = 1`).all() as {
      sheet_name: string;
    }[]
  ).map((r) => r.sheet_name);

  const dirtyRows = db.prepare(
    `SELECT sheet_name, pk_json FROM _dirty_rows`,
  ).all() as { sheet_name: string; pk_json: string }[];

  const dirtyBySheet: Record<string, string[]> = {};
  for (const r of dirtyRows) {
    if (!dirtyBySheet[r.sheet_name]) dirtyBySheet[r.sheet_name] = [];
    dirtyBySheet[r.sheet_name].push(r.pk_json);
  }
  return { fullSyncSheets, dirtyBySheet };
}

export function getSyncStatus(db: Db): SyncStatus {
  const { fullSyncSheets, dirtyBySheet } = getDirtyState(db);
  const sheets = new Set([...fullSyncSheets, ...Object.keys(dirtyBySheet)]);
  const dirtySheets = [...sheets].map((sheet) => ({
    sheet,
    fullSync: fullSyncSheets.includes(sheet),
    dirtyRowCount: dirtyBySheet[sheet]?.length ?? 0,
  }));
  return {
    lastPullAt,
    lastPushAt,
    lastPushError,
    dirtySheets,
    syncing,
  };
}

export function replaceSheetFromValues(
  db: Db,
  sheetName: string,
  headers: string[],
  dataRows: string[][],
): void {
  const expected = getHeaders(sheetName);
  const useHeaders = headers.length > 0 ? headers : expected;
  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM ${quoteIdent(sheetName)}`).run();
    const cols = expected.map(quoteIdent).join(', ');
    const placeholders = expected.map(() => '?').join(', ');
    const stmt = db.prepare(
      `INSERT INTO ${quoteIdent(sheetName)} (${cols}) VALUES (${placeholders})`,
    );
    for (const data of dataRows) {
      const values = expected.map((h) => {
        const idx = useHeaders.indexOf(h);
        if (idx === -1) return '';
        return data[idx] !== undefined && data[idx] !== null ? String(data[idx]) : '';
      });
      stmt.run(...values);
    }
    db.prepare(`DELETE FROM _dirty_rows WHERE sheet_name = ?`).run(sheetName);
    db.prepare(
      `UPDATE _sync_meta SET full_sync = 0, last_synced_at = ? WHERE sheet_name = ?`,
    ).run(new Date().toISOString(), sheetName);
  });
  tx();
}

export function findLocalRowByPk(
  db: Db,
  sheetName: string,
  pk: Record<string, string>,
): Row | null {
  const keys = SHEET_PRIMARY_KEYS[sheetName];
  if (!keys) return null;
  const where = keys.map((k) => `${quoteIdent(k)} = ?`).join(' AND ');
  const vals = keys.map((k) => pk[k] ?? '');
  const headers = getHeaders(sheetName);
  const cols = headers.map(quoteIdent).join(', ');
  const raw = db.prepare(
    `SELECT ${cols} FROM ${quoteIdent(sheetName)} WHERE ${where} LIMIT 1`,
  ).get(...vals) as Record<string, unknown> | undefined;
  if (!raw) return null;
  const row: Row = {};
  for (const h of headers) {
    row[h] = raw[h] !== undefined && raw[h] !== null ? String(raw[h]) : '';
  }
  return row;
}
