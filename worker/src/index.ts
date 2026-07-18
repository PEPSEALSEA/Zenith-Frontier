import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { JWT } from 'google-auth-library';

/** Minimal KV binding type (avoids pulling Cloudflare types into Next root). */
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

type Bindings = {
  SPREADSHEET_ID: string;
  GOOGLE_CLIENT_EMAIL: string;
  GOOGLE_PRIVATE_KEY: string;
  GOOGLE_CLIENT_ID?: string;
  PI_ORIGIN?: KVNamespace;
  PI_ORIGIN_SECRET?: string;
};

type Params = Record<string, string>;
type Row = Record<string, string>;

const app = new Hono<{ Bindings: Bindings }>();
app.use('*', cors());

const SHEET_HEADERS: Record<string, string[]> = {
  Players: [
    'player_id', 'name', 'level', 'exp', 'stored_exp',
    'main_job_id', 'sub_job_id', 'karma', 'vorpal_soul', 'arcanum_id',
    'hp', 'mp', 'atk', 'def', 'spd', 'money', 'appearance', 'created_at',
    'str', 'dex', 'int', 'vit', 'luk', 'stat_points',
    'skill_slot_1', 'skill_slot_2', 'skill_slot_3', 'skill_slot_4',
    'job_mastery', 'job_mastery_exp',
  ],
  Jobs: [
    'job_id', 'job_name', 'tier', 'parent_job_id', 'branch',
    'is_hidden', 'unlock_condition', 'stat_bonus', 'description',
    'potential', 'attack_profile',
  ],
  PlayerJobs: ['player_id', 'job_id', 'unlocked_at'],
  Skills: [
    'skill_id', 'skill_name', 'job_id', 'tier', 'parent_skill_id',
    'evolution_branches', 'is_locked_by', 'description',
    'unlock_type', 'unlock_value', 'skill_type', 'mp_cost', 'cooldown_ms',
    'power', 'range', 'effect',
  ],
  PlayerSkills: [
    'player_id', 'skill_id', 'skill_level', 'branch_chosen', 'is_locked', 'unlocked_at',
  ],
  SkillCombos: [
    'player_id', 'skill_id_1', 'skill_id_2', 'combo_name', 'power_bonus', 'created_at',
  ],
  Equipment: [
    'item_id', 'item_name', 'item_type', 'rarity', 'tier',
    'base_stats', 'is_hero_weapon', 'is_legacy', 'max_quantity',
    'ascension_table', 'description',
  ],
  PlayerInventory: [
    'player_id', 'item_id', 'quantity', 'raise_level', 'ascension_form', 'obtained_at',
  ],
  WorldBoss: [
    'boss_id', 'boss_name', 'colossus_rank', 'is_alive',
    'required_scenario_key', 'killer_player_id', 'killed_at',
    'lore_unlocked', 'lore_text',
  ],
  Titles: ['title_id', 'title_name', 'title_type', 'effect', 'condition', 'description'],
  PlayerTitles: ['player_id', 'title_id', 'obtained_at', 'source'],
  HolderRecords: ['title_id', 'player_id', 'stat_value', 'updated_at'],
  HiddenParams: ['player_id', 'param_name', 'param_value', 'last_updated'],
  Arcanum: [
    'player_id', 'card_id', 'card_name', 'positive_effect', 'negative_effect',
    'is_reverse', 'is_controllable', 'activated', 'set_at',
  ],
  ArcanumCards: ['card_id', 'card_name', 'positive_effect', 'negative_effect', 'description'],
  WorldState: ['key', 'value', 'updated_at'],
  NPCStatus: ['npc_id', 'scenario_id', 'is_dead', 'killed_by', 'killed_at', 'quest_closed'],
  MapObjects: ['id', 'type', 'x', 'y', 'z', 'name', 'radius', 'params'],
  Monsters: ['monster_id', 'name', 'hp', 'atk', 'def', 'spd', 'skills', 'drops', 'appearance'],
  Quests: [
    'quest_id', 'name', 'description', 'type', 'target_id', 'target_count',
    'rewards', 'is_hidden', 'next_quest_id',
  ],
  NPCs: [
    'npc_id', 'name', 'appearance', 'initial_dialogue_id', 'quest_id',
    'is_merchant', 'is_trader', 'trade_items',
  ],
  Dialogue: ['dialogue_id', 'text', 'options_json'],
  Spawners: [
    'spawner_id', 'monster_id', 'x', 'y', 'z', 'range', 'spawn_rate', 'max_monsters',
  ],
  PlayerQuests: ['player_id', 'quest_id', 'status', 'progress', 'updated_at'],
};

let cachedAuthToken: { value: string; expiresAt: number } | null = null;
let authTokenPromise: Promise<string> | null = null;
const sheetIdCache: Record<string, number> = {};

function now() {
  return new Date().toISOString();
}

type AllocStat = 'str' | 'dex' | 'int' | 'vit' | 'luk';
const ALLOC_STATS: AllocStat[] = ['str', 'dex', 'int', 'vit', 'luk'];
const STAT_POINTS_PER_LEVEL = 3;

function parsePotential(raw?: string): Record<AllocStat, number> {
  const out: Record<AllocStat, number> = { str: 50, dex: 50, int: 50, vit: 50, luk: 50 };
  if (!raw) return out;
  for (const part of raw.split(',')) {
    const m = part.trim().match(/^(str|dex|int|vit|luk):(\d+)$/i);
    if (!m) continue;
    out[m[1].toLowerCase() as AllocStat] = parseInt(m[2], 10);
  }
  return out;
}

function combatFromAlloc(alloc: Record<AllocStat, number>, jobBonus?: string) {
  const base = {
    atk: 8 + alloc.str * 2,
    def: 5 + Math.floor(alloc.vit * 1.2),
    spd: 8 + alloc.dex * 2,
    luck: 5 + alloc.luk,
    maxHp: 80 + alloc.vit * 8,
    maxMp: 40 + alloc.int * 6,
  };
  if (jobBonus) {
    for (const part of jobBonus.split(',')) {
      const m = part.trim().match(/^(atk|def|spd|hp|mp|luck)([+-]\d+)$/i);
      if (!m) continue;
      const key = m[1].toLowerCase();
      const delta = parseInt(m[2], 10);
      if (key === 'atk') base.atk += delta;
      else if (key === 'def') base.def += delta;
      else if (key === 'spd') base.spd += delta;
      else if (key === 'luck') base.luck += delta;
      else if (key === 'hp') base.maxHp += delta;
      else if (key === 'mp') base.maxMp += delta;
    }
  }
  return base;
}

function masteryExpToNext(level: number): number {
  return 100 + (level - 1) * 25;
}

async function getAuthToken(env: Bindings): Promise<string> {
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

async function getSheetValues(env: Bindings, range: string): Promise<any[][]> {
  const token = await getAuthToken(env);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Sheets API error: ${await res.text()}`);
  const data = await res.json() as { values?: any[][] };
  return data.values || [];
}

async function appendSheetRow(env: Bindings, range: string, values: any[]) {
  const token = await getAuthToken(env);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [values] }),
  });
  if (!res.ok) throw new Error(`Sheets API error: ${await res.text()}`);
  return res.json();
}

async function updateSheetRow(env: Bindings, range: string, values: any[]) {
  const token = await getAuthToken(env);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [values] }),
  });
  if (!res.ok) throw new Error(`Sheets API error: ${await res.text()}`);
  return res.json();
}

async function updateSheetCell(env: Bindings, range: string, value: any) {
  return updateSheetRow(env, range, [value]);
}

async function batchUpdateSheet(env: Bindings, requests: any[]) {
  const token = await getAuthToken(env);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}:batchUpdate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) throw new Error(`Sheets API error: ${await res.text()}`);
  return res.json();
}

async function getSheetId(env: Bindings, sheetName: string): Promise<number> {
  if (sheetIdCache[sheetName] !== undefined) return sheetIdCache[sheetName];
  const token = await getAuthToken(env);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}?fields=sheets.properties`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Sheets API error: ${await res.text()}`);
  const data = await res.json() as { sheets?: { properties: { title: string; sheetId: number } }[] };
  for (const s of data.sheets || []) {
    sheetIdCache[s.properties.title] = s.properties.sheetId;
  }
  if (sheetIdCache[sheetName] === undefined) throw new Error(`Sheet not found: ${sheetName}`);
  return sheetIdCache[sheetName];
}

async function getHeaders(env: Bindings, sheetName: string): Promise<string[]> {
  const rows = await getSheetValues(env, `${sheetName}!1:1`);
  if (rows.length > 0 && rows[0].length > 0) {
    return rows[0].map((h: any) => String(h));
  }
  return SHEET_HEADERS[sheetName] || [];
}

async function sheetToRows(env: Bindings, name: string): Promise<Row[]> {
  const data = await getSheetValues(env, name);
  if (data.length < 2) return [];
  const headers = data[0].map((h: any) => String(h));
  const rows: Row[] = [];
  for (let i = 1; i < data.length; i++) {
    const row: Row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j] !== undefined && data[i][j] !== null ? String(data[i][j]) : '';
    }
    rows.push(row);
  }
  return rows;
}

async function findRowIndex(env: Bindings, sheetName: string, key: string, value: string): Promise<number> {
  const data = await getSheetValues(env, sheetName);
  if (data.length < 2) return -1;
  const headers = data[0].map((h: any) => String(h));
  const colIdx = headers.indexOf(key);
  if (colIdx === -1) return -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIdx] ?? '') === String(value)) return i + 1;
  }
  return -1;
}

async function findRowIndexDouble(
  env: Bindings,
  sheetName: string,
  key1: string,
  val1: string,
  key2: string,
  val2: string,
): Promise<number> {
  const data = await getSheetValues(env, sheetName);
  if (data.length < 2) return -1;
  const headers = data[0].map((h: any) => String(h));
  const c1 = headers.indexOf(key1);
  const c2 = headers.indexOf(key2);
  if (c1 === -1 || c2 === -1) return -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][c1] ?? '') === String(val1) && String(data[i][c2] ?? '') === String(val2)) {
      return i + 1;
    }
  }
  return -1;
}

function rowsToText(rows: Row[]): string {
  if (!rows || rows.length === 0) return 'EMPTY';
  const headers = Object.keys(rows[0]);
  const lines = [`HEADERS|${headers.join('|')}`];
  for (const row of rows) {
    lines.push(`ROW|${headers.map((h) => row[h] || '').join('|')}`);
  }
  return lines.join('\n');
}

function singleRowToText(row: Row | null): string {
  if (!row) return 'EMPTY';
  const keys = Object.keys(row);
  return `HEADERS|${keys.join('|')}\nROW|${keys.map((k) => row[k] || '').join('|')}`;
}

async function appendRow(env: Bindings, sheetName: string, rowData: Params): Promise<boolean> {
  const headers = await getHeaders(env, sheetName);
  const row = headers.map((h) => (rowData[h] !== undefined ? rowData[h] : ''));
  await appendSheetRow(env, `${sheetName}!A:A`, row);
  return true;
}

async function updateCell(env: Bindings, sheetName: string, rowIdx: number, colName: string, value: string) {
  const headers = await getHeaders(env, sheetName);
  const colIdx = headers.indexOf(colName);
  if (colIdx === -1) return false;
  const colLetter = columnToLetter(colIdx + 1);
  await updateSheetCell(env, `${sheetName}!${colLetter}${rowIdx}`, value);
  return true;
}

async function updateRowCells(env: Bindings, sheetName: string, rowIdx: number, rowData: Params) {
  const headers = await getHeaders(env, sheetName);
  const data = await getSheetValues(env, `${sheetName}!${rowIdx}:${rowIdx}`);
  const current = data[0] ? [...data[0]] : headers.map(() => '');
  while (current.length < headers.length) current.push('');
  for (const key of Object.keys(rowData)) {
    const colIdx = headers.indexOf(key);
    if (colIdx !== -1) current[colIdx] = rowData[key];
  }
  const endCol = columnToLetter(headers.length);
  await updateSheetRow(env, `${sheetName}!A${rowIdx}:${endCol}${rowIdx}`, current);
  return true;
}

async function getRowByIndex(env: Bindings, sheetName: string, rowIdx: number): Promise<Row | null> {
  const headers = await getHeaders(env, sheetName);
  const data = await getSheetValues(env, `${sheetName}!${rowIdx}:${rowIdx}`);
  if (!data[0]) return null;
  const row: Row = {};
  for (let i = 0; i < headers.length; i++) {
    row[headers[i]] = data[0][i] !== undefined && data[0][i] !== null ? String(data[0][i]) : '';
  }
  return row;
}

async function deleteSheetRow(env: Bindings, sheetName: string, rowIdx: number) {
  const sheetId = await getSheetId(env, sheetName);
  await batchUpdateSheet(env, [{
    deleteDimension: {
      range: {
        sheetId,
        dimension: 'ROWS',
        startIndex: rowIdx - 1,
        endIndex: rowIdx,
      },
    },
  }]);
}

async function clearSheetData(env: Bindings, sheetName: string) {
  const data = await getSheetValues(env, sheetName);
  if (data.length <= 1) return;
  const sheetId = await getSheetId(env, sheetName);
  await batchUpdateSheet(env, [{
    deleteDimension: {
      range: {
        sheetId,
        dimension: 'ROWS',
        startIndex: 1,
        endIndex: data.length,
      },
    },
  }]);
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

async function upsertRow(env: Bindings, sheetName: string, key: string, p: Params): Promise<string> {
  if (!p[key]) return `ERROR|MISSING_KEY_${key}`;
  const rowIdx = await findRowIndex(env, sheetName, key, p[key]);
  if (rowIdx === -1) {
    await appendRow(env, sheetName, p);
    return `OK|ROW_CREATED|${p[key]}`;
  }
  await updateRowCells(env, sheetName, rowIdx, p);
  return `OK|ROW_UPDATED|${p[key]}`;
}

async function getPlayer(env: Bindings, playerId?: string) {
  if (!playerId) return 'ERROR|MISSING_PLAYER_ID';
  const rows = await sheetToRows(env, 'Players');
  const found = rows.find((r) => r.player_id === String(playerId));
  return found ? singleRowToText(found) : 'ERROR|PLAYER_NOT_FOUND';
}

async function createPlayer(env: Bindings, p: Params) {
  if (!p.player_id || !p.name) return 'ERROR|MISSING_REQUIRED_FIELDS';
  if (await findRowIndex(env, 'Players', 'player_id', p.player_id) !== -1) {
    return 'ERROR|PLAYER_ALREADY_EXISTS';
  }
  const alloc = { str: 5, dex: 5, int: 5, vit: 5, luk: 5 };
  const combat = combatFromAlloc(alloc);
  await appendRow(env, 'Players', {
    player_id: p.player_id,
    name: p.name,
    level: '1',
    exp: '0',
    stored_exp: '0',
    main_job_id: '',
    sub_job_id: '',
    karma: '0',
    vorpal_soul: '0',
    arcanum_id: '',
    hp: String(combat.maxHp),
    mp: String(combat.maxMp),
    atk: String(combat.atk),
    def: String(combat.def),
    spd: String(combat.spd),
    money: p.money || '100',
    appearance: p.appearance || '',
    created_at: now(),
    str: '5',
    dex: '5',
    int: '5',
    vit: '5',
    luk: '5',
    stat_points: '0',
    skill_slot_1: '',
    skill_slot_2: '',
    skill_slot_3: '',
    skill_slot_4: '',
    job_mastery: '1',
    job_mastery_exp: '0',
  });
  return `OK|PLAYER_CREATED|${p.player_id}`;
}

async function updatePlayerStats(env: Bindings, p: Params) {
  if (!p.player_id) return 'ERROR|MISSING_PLAYER_ID';
  const rowIdx = await findRowIndex(env, 'Players', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|PLAYER_NOT_FOUND';
  const allowed = [
    'hp', 'mp', 'atk', 'def', 'spd', 'money', 'level', 'exp', 'name', 'appearance',
    'str', 'dex', 'int', 'vit', 'luk', 'stat_points',
    'skill_slot_1', 'skill_slot_2', 'skill_slot_3', 'skill_slot_4',
    'job_mastery', 'job_mastery_exp',
  ];
  const updates: Params = {};
  for (const f of allowed) {
    if (p[f] !== undefined) updates[f] = p[f];
  }
  await updateRowCells(env, 'Players', rowIdx, updates);
  return `OK|STATS_UPDATED|${p.player_id}`;
}

function readAlloc(row: Row): Record<AllocStat, number> {
  return {
    str: parseInt(row.str) || 5,
    dex: parseInt(row.dex) || 5,
    int: parseInt(row.int) || 5,
    vit: parseInt(row.vit) || 5,
    luk: parseInt(row.luk) || 5,
  };
}

async function recomputeCombatStats(env: Bindings, rowIdx: number, row: Row) {
  const jobs = await sheetToRows(env, 'Jobs');
  const job = jobs.find((j) => j.job_id === row.main_job_id);
  const combat = combatFromAlloc(readAlloc(row), job?.stat_bonus);
  const hp = Math.min(parseInt(row.hp) || combat.maxHp, combat.maxHp);
  const mp = Math.min(parseInt(row.mp) || combat.maxMp, combat.maxMp);
  await updateRowCells(env, 'Players', rowIdx, {
    atk: String(combat.atk),
    def: String(combat.def),
    spd: String(combat.spd),
    hp: String(hp),
    mp: String(mp),
  });
}

async function grantStarterSkills(env: Bindings, playerId: string, jobId: string) {
  const starters = (await sheetToRows(env, 'Skills')).filter(
    (s) => s.job_id === jobId && (s.unlock_type === 'starter' || !s.unlock_type),
  );
  for (const skill of starters) {
    if (await findRowIndexDouble(env, 'PlayerSkills', 'player_id', playerId, 'skill_id', skill.skill_id) !== -1) {
      continue;
    }
    await appendRow(env, 'PlayerSkills', {
      player_id: playerId,
      skill_id: skill.skill_id,
      skill_level: '1',
      branch_chosen: '',
      is_locked: '0',
      unlocked_at: now(),
    });
  }
  const rowIdx = await findRowIndex(env, 'Players', 'player_id', playerId);
  if (rowIdx === -1) return;
  const row = await getRowByIndex(env, 'Players', rowIdx);
  if (!row) return;
  if (!row.skill_slot_1 && starters[0]) {
    await updateCell(env, 'Players', rowIdx, 'skill_slot_1', starters[0].skill_id);
  }
}

function expToNextLevel(level: number): number {
  let need = 100;
  for (let i = 1; i < level; i++) need = Math.floor(need * 1.5);
  return need;
}

async function addExp(env: Bindings, p: Params) {
  if (!p.player_id || !p.exp_amount) return 'ERROR|MISSING_FIELDS';
  const rowIdx = await findRowIndex(env, 'Players', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|PLAYER_NOT_FOUND';
  const row = await getRowByIndex(env, 'Players', rowIdx);
  if (!row) return 'ERROR|PLAYER_NOT_FOUND';
  let level = parseInt(row.level) || 1;
  let exp = parseInt(row.exp) || 0;
  let stored = parseInt(row.stored_exp) || 0;
  let statPoints = parseInt(row.stat_points) || 0;
  let mastery = parseInt(row.job_mastery) || 1;
  let masteryExp = parseInt(row.job_mastery_exp) || 0;
  const amount = parseInt(p.exp_amount) || 0;
  const masteryGain = parseInt(p.mastery_gain || '0') || 0;

  if (masteryGain > 0) {
    masteryExp += masteryGain;
    while (masteryExp >= masteryExpToNext(mastery) && mastery < 99) {
      masteryExp -= masteryExpToNext(mastery);
      mastery += 1;
    }
  }

  if (level >= 99 && level < 150) {
    stored += amount;
    await updateRowCells(env, 'Players', rowIdx, {
      stored_exp: String(stored),
      job_mastery: String(mastery),
      job_mastery_exp: String(masteryExp),
    });
    return `OK|EXP_STORED|${stored}|${mastery}|${masteryExp}`;
  }
  exp += amount;
  let leveled = 0;
  while (level < 99 && exp >= expToNextLevel(level)) {
    exp -= expToNextLevel(level);
    level += 1;
    leveled += 1;
    statPoints += STAT_POINTS_PER_LEVEL;
  }
  await updateRowCells(env, 'Players', rowIdx, {
    exp: String(exp),
    level: String(level),
    stat_points: String(statPoints),
    job_mastery: String(mastery),
    job_mastery_exp: String(masteryExp),
  });
  return `OK|EXP_ADDED|${level}|${exp}|${leveled}|${statPoints}|${mastery}|${masteryExp}`;
}

async function addMoney(env: Bindings, p: Params) {
  if (!p.player_id || p.amount === undefined) return 'ERROR|MISSING_FIELDS';
  const rowIdx = await findRowIndex(env, 'Players', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|PLAYER_NOT_FOUND';
  const row = await getRowByIndex(env, 'Players', rowIdx);
  if (!row) return 'ERROR|PLAYER_NOT_FOUND';
  const money = Math.max(0, (parseInt(row.money) || 0) + (parseInt(p.amount) || 0));
  await updateCell(env, 'Players', rowIdx, 'money', String(money));
  return `OK|MONEY_UPDATED|${money}`;
}

async function capBreakthrough(env: Bindings, p: Params) {
  if (!p.player_id) return 'ERROR|MISSING_PLAYER_ID';
  const rowIdx = await findRowIndex(env, 'Players', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|PLAYER_NOT_FOUND';
  const row = await getRowByIndex(env, 'Players', rowIdx);
  if (!row) return 'ERROR|PLAYER_NOT_FOUND';
  const level = parseInt(row.level) || 1;
  if (level < 99) return 'ERROR|LEVEL_CAP_NOT_REACHED';
  const condition = p.condition || '';
  if (condition !== 'new_continent' && condition !== 'kill_lv100_boss') {
    return 'ERROR|INVALID_BREAKTHROUGH_CONDITION';
  }
  const stored = parseInt(row.stored_exp) || 0;
  await updateRowCells(env, 'Players', rowIdx, {
    level: '100',
    exp: String(stored),
    stored_exp: '0',
  });
  return 'OK|CAP_BROKEN|100';
}

async function getPlayerJobs(env: Bindings, playerId?: string) {
  if (!playerId) return 'ERROR|MISSING_PLAYER_ID';
  const rows = (await sheetToRows(env, 'PlayerJobs')).filter((r) => r.player_id === String(playerId));
  return rowsToText(rows);
}

async function getAllJobs(env: Bindings) {
  return rowsToText(await sheetToRows(env, 'Jobs'));
}

async function getJobById(env: Bindings, jobId?: string) {
  if (!jobId) return 'ERROR|MISSING_JOB_ID';
  const found = (await sheetToRows(env, 'Jobs')).find((r) => r.job_id === String(jobId));
  return found ? singleRowToText(found) : 'ERROR|JOB_NOT_FOUND';
}

async function unlockJob(env: Bindings, p: Params) {
  if (!p.player_id || !p.job_id) return 'ERROR|MISSING_FIELDS';
  const job = (await sheetToRows(env, 'Jobs')).find((r) => r.job_id === String(p.job_id));
  if (!job) return 'ERROR|JOB_NOT_FOUND';
  if (job.is_hidden === '1' && (!p.unlock_condition || p.unlock_condition !== job.unlock_condition)) {
    return 'ERROR|HIDDEN_JOB_CONDITION_NOT_MET';
  }
  if (await findRowIndexDouble(env, 'PlayerJobs', 'player_id', p.player_id, 'job_id', p.job_id) !== -1) {
    return 'ERROR|JOB_ALREADY_UNLOCKED';
  }
  await appendRow(env, 'PlayerJobs', {
    player_id: p.player_id,
    job_id: p.job_id,
    unlocked_at: now(),
  });
  return `OK|JOB_UNLOCKED|${p.job_id}`;
}

async function setMainJob(env: Bindings, p: Params) {
  if (!p.player_id || !p.job_id) return 'ERROR|MISSING_FIELDS';
  const job = (await sheetToRows(env, 'Jobs')).find((r) => r.job_id === String(p.job_id));
  if (!job) return 'ERROR|JOB_NOT_FOUND';
  if (await findRowIndexDouble(env, 'PlayerJobs', 'player_id', p.player_id, 'job_id', p.job_id) === -1) {
    await appendRow(env, 'PlayerJobs', {
      player_id: p.player_id,
      job_id: p.job_id,
      unlocked_at: now(),
    });
  }
  const rowIdx = await findRowIndex(env, 'Players', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|PLAYER_NOT_FOUND';
  const row = await getRowByIndex(env, 'Players', rowIdx);
  if (!row) return 'ERROR|PLAYER_NOT_FOUND';
  if (row.sub_job_id === String(p.job_id)) return 'ERROR|JOB_ALREADY_SET_AS_SUB';
  const switching = row.main_job_id && row.main_job_id !== String(p.job_id);
  await updateRowCells(env, 'Players', rowIdx, {
    main_job_id: p.job_id,
    ...(switching ? { job_mastery: '1', job_mastery_exp: '0' } : {}),
  });
  const updated = await getRowByIndex(env, 'Players', rowIdx);
  if (updated) await recomputeCombatStats(env, rowIdx, updated);
  await grantStarterSkills(env, p.player_id, p.job_id);
  return `OK|MAIN_JOB_SET|${p.job_id}`;
}

async function setSubJob(env: Bindings, p: Params) {
  if (!p.player_id || !p.job_id) return 'ERROR|MISSING_FIELDS';
  if (await findRowIndexDouble(env, 'PlayerJobs', 'player_id', p.player_id, 'job_id', p.job_id) === -1) {
    return 'ERROR|JOB_NOT_UNLOCKED';
  }
  const rowIdx = await findRowIndex(env, 'Players', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|PLAYER_NOT_FOUND';
  const row = await getRowByIndex(env, 'Players', rowIdx);
  if (!row) return 'ERROR|PLAYER_NOT_FOUND';
  if (row.main_job_id === String(p.job_id)) return 'ERROR|JOB_ALREADY_SET_AS_MAIN';
  await updateCell(env, 'Players', rowIdx, 'sub_job_id', p.job_id);
  return `OK|SUB_JOB_SET|${p.job_id}`;
}

async function getAllSkills(env: Bindings) {
  return rowsToText(await sheetToRows(env, 'Skills'));
}

async function getSkillsByJob(env: Bindings, jobId?: string) {
  if (!jobId) return 'ERROR|MISSING_JOB_ID';
  const rows = (await sheetToRows(env, 'Skills')).filter((r) => r.job_id === String(jobId));
  return rowsToText(rows);
}

async function getPlayerSkills(env: Bindings, playerId?: string) {
  if (!playerId) return 'ERROR|MISSING_PLAYER_ID';
  const rows = (await sheetToRows(env, 'PlayerSkills')).filter((r) => r.player_id === String(playerId));
  return rowsToText(rows);
}

async function unlockSkill(env: Bindings, p: Params) {
  if (!p.player_id || !p.skill_id) return 'ERROR|MISSING_FIELDS';
  const skill = (await sheetToRows(env, 'Skills')).find((r) => r.skill_id === String(p.skill_id));
  if (!skill) return 'ERROR|SKILL_NOT_FOUND';
  if (await findRowIndexDouble(env, 'PlayerSkills', 'player_id', p.player_id, 'skill_id', p.skill_id) !== -1) {
    return 'ERROR|SKILL_ALREADY_UNLOCKED';
  }
  if (skill.parent_skill_id) {
    if (await findRowIndexDouble(env, 'PlayerSkills', 'player_id', p.player_id, 'skill_id', skill.parent_skill_id) === -1) {
      return 'ERROR|PARENT_SKILL_NOT_UNLOCKED';
    }
  }
  const playerIdx = await findRowIndex(env, 'Players', 'player_id', p.player_id);
  const playerRow = playerIdx === -1 ? null : await getRowByIndex(env, 'Players', playerIdx);
  if (!playerRow) return 'ERROR|PLAYER_NOT_FOUND';

  const unlockType = skill.unlock_type || 'starter';
  const unlockValue = skill.unlock_value || '';
  const mastery = parseInt(playerRow.job_mastery) || 1;
  const level = parseInt(playerRow.level) || 1;
  const money = parseInt(playerRow.money) || 0;

  if (unlockType === 'mastery') {
    if (mastery < (parseInt(unlockValue) || 1)) return 'ERROR|MASTERY_TOO_LOW';
  } else if (unlockType === 'level') {
    if (level < (parseInt(unlockValue) || 1)) return 'ERROR|LEVEL_TOO_LOW';
  } else if (unlockType === 'gold') {
    const cost = parseInt(unlockValue) || 0;
    if (money < cost) return 'ERROR|NOT_ENOUGH_GOLD';
    await updateCell(env, 'Players', playerIdx, 'money', String(money - cost));
  } else if (unlockType === 'scroll') {
    return 'ERROR|USE_SCROLL_ITEM';
  }

  const isSubJob = playerRow.sub_job_id === skill.job_id;
  const isMainJob = playerRow.main_job_id === skill.job_id;
  if (!isMainJob && !isSubJob && unlockType !== 'scroll') {
    return 'ERROR|WRONG_JOB';
  }
  const maxTier = isSubJob && !isMainJob ? 2 : 3;
  if (parseInt(skill.tier) > maxTier) return 'ERROR|SKILL_TIER_LOCKED_FOR_SUB_JOB';

  await appendRow(env, 'PlayerSkills', {
    player_id: p.player_id,
    skill_id: p.skill_id,
    skill_level: '1',
    branch_chosen: '',
    is_locked: '0',
    unlocked_at: now(),
  });
  return `OK|SKILL_UNLOCKED|${p.skill_id}`;
}

async function allocateStat(env: Bindings, p: Params) {
  if (!p.player_id || !p.stat) return 'ERROR|MISSING_FIELDS';
  const stat = String(p.stat).toLowerCase() as AllocStat;
  if (!ALLOC_STATS.includes(stat)) return 'ERROR|INVALID_STAT';
  const rowIdx = await findRowIndex(env, 'Players', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|PLAYER_NOT_FOUND';
  const row = await getRowByIndex(env, 'Players', rowIdx);
  if (!row) return 'ERROR|PLAYER_NOT_FOUND';
  const points = parseInt(row.stat_points) || 0;
  if (points < 1) return 'ERROR|NO_STAT_POINTS';
  const job = (await sheetToRows(env, 'Jobs')).find((j) => j.job_id === row.main_job_id);
  const potential = parsePotential(job?.potential);
  const current = parseInt(row[stat]) || 5;
  if (current >= potential[stat]) return 'ERROR|POTENTIAL_CAP';
  const next = current + 1;
  await updateRowCells(env, 'Players', rowIdx, {
    [stat]: String(next),
    stat_points: String(points - 1),
  });
  const updated = await getRowByIndex(env, 'Players', rowIdx);
  if (updated) await recomputeCombatStats(env, rowIdx, updated);
  return `OK|STAT_ALLOCATED|${stat}|${next}|${points - 1}`;
}

async function setSkillLoadout(env: Bindings, p: Params) {
  if (!p.player_id || !p.slot) return 'ERROR|MISSING_FIELDS';
  const slot = parseInt(p.slot);
  if (slot < 1 || slot > 4) return 'ERROR|INVALID_SLOT';
  const col = `skill_slot_${slot}`;
  const skillId = p.skill_id || '';
  const rowIdx = await findRowIndex(env, 'Players', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|PLAYER_NOT_FOUND';
  if (skillId) {
    if (await findRowIndexDouble(env, 'PlayerSkills', 'player_id', p.player_id, 'skill_id', skillId) === -1) {
      return 'ERROR|SKILL_NOT_UNLOCKED';
    }
    const row = await getRowByIndex(env, 'Players', rowIdx);
    if (!row) return 'ERROR|PLAYER_NOT_FOUND';
    for (let i = 1; i <= 4; i++) {
      if (i === slot) continue;
      if (row[`skill_slot_${i}`] === skillId) {
        await updateCell(env, 'Players', rowIdx, `skill_slot_${i}`, '');
      }
    }
  }
  await updateCell(env, 'Players', rowIdx, col, skillId);
  return `OK|LOADOUT_SET|${slot}|${skillId || 'EMPTY'}`;
}

async function useSkillScroll(env: Bindings, p: Params) {
  if (!p.player_id || !p.item_id) return 'ERROR|MISSING_FIELDS';
  const eq = (await sheetToRows(env, 'Equipment')).find((r) => r.item_id === String(p.item_id));
  if (!eq) return 'ERROR|ITEM_NOT_FOUND';
  if (eq.item_type !== 'skill_scroll') return 'ERROR|NOT_A_SCROLL';
  const m = (eq.base_stats || '').match(/skill:([A-Za-z0-9_]+)/);
  if (!m) return 'ERROR|SCROLL_HAS_NO_SKILL';
  const skillId = m[1];
  const skill = (await sheetToRows(env, 'Skills')).find((r) => r.skill_id === skillId);
  if (!skill) return 'ERROR|SKILL_NOT_FOUND';
  if (await findRowIndexDouble(env, 'PlayerSkills', 'player_id', p.player_id, 'skill_id', skillId) !== -1) {
    return 'ERROR|SKILL_ALREADY_UNLOCKED';
  }
  const rem = await removeItem(env, { player_id: p.player_id, item_id: p.item_id, quantity: '1' });
  if (!rem.startsWith('OK|')) return rem;
  if (skill.parent_skill_id) {
    if (await findRowIndexDouble(env, 'PlayerSkills', 'player_id', p.player_id, 'skill_id', skill.parent_skill_id) === -1) {
      await addItem(env, { player_id: p.player_id, item_id: p.item_id, quantity: '1' });
      return 'ERROR|PARENT_SKILL_NOT_UNLOCKED';
    }
  }
  await appendRow(env, 'PlayerSkills', {
    player_id: p.player_id,
    skill_id: skillId,
    skill_level: '1',
    branch_chosen: '',
    is_locked: '0',
    unlocked_at: now(),
  });
  return `OK|SCROLL_USED|${skillId}`;
}

async function promoteJob(env: Bindings, p: Params) {
  if (!p.player_id || !p.job_id) return 'ERROR|MISSING_FIELDS';
  const job = (await sheetToRows(env, 'Jobs')).find((r) => r.job_id === String(p.job_id));
  if (!job) return 'ERROR|JOB_NOT_FOUND';
  if (job.tier !== 'high' || !job.parent_job_id) return 'ERROR|NOT_A_PROMOTION';
  const rowIdx = await findRowIndex(env, 'Players', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|PLAYER_NOT_FOUND';
  const row = await getRowByIndex(env, 'Players', rowIdx);
  if (!row) return 'ERROR|PLAYER_NOT_FOUND';
  if (row.main_job_id !== job.parent_job_id) return 'ERROR|WRONG_PARENT_JOB';
  const level = parseInt(row.level) || 1;
  const mastery = parseInt(row.job_mastery) || 1;
  const cond = job.unlock_condition || '';
  let needLevel = 20;
  let needMastery = 5;
  for (const part of cond.split(',')) {
    const [k, v] = part.split(':');
    if (k === 'level') needLevel = parseInt(v) || 20;
    if (k === 'mastery') needMastery = parseInt(v) || 5;
  }
  if (level < needLevel) return 'ERROR|LEVEL_TOO_LOW';
  if (mastery < needMastery) return 'ERROR|MASTERY_TOO_LOW';
  return setMainJob(env, { player_id: p.player_id, job_id: p.job_id });
}

async function evolveSkill(env: Bindings, p: Params) {
  if (!p.player_id || !p.skill_id || !p.branch) return 'ERROR|MISSING_FIELDS';
  const psRowIdx = await findRowIndexDouble(env, 'PlayerSkills', 'player_id', p.player_id, 'skill_id', p.skill_id);
  if (psRowIdx === -1) return 'ERROR|SKILL_NOT_UNLOCKED';
  const psRow = await getRowByIndex(env, 'PlayerSkills', psRowIdx);
  if (!psRow) return 'ERROR|SKILL_NOT_UNLOCKED';
  if (psRow.is_locked === '1') return 'ERROR|SKILL_BRANCH_LOCKED';
  if (psRow.branch_chosen && psRow.branch_chosen !== String(p.branch)) {
    return 'ERROR|DIFFERENT_BRANCH_ALREADY_CHOSEN';
  }
  const skillRow = (await sheetToRows(env, 'Skills')).find((r) => r.skill_id === String(p.skill_id));
  if (!skillRow) return 'ERROR|SKILL_NOT_FOUND';
  const validBranches = skillRow.evolution_branches ? skillRow.evolution_branches.split(',') : [];
  if (validBranches.length > 0 && !validBranches.includes(String(p.branch))) {
    return 'ERROR|INVALID_BRANCH';
  }
  await updateRowCells(env, 'PlayerSkills', psRowIdx, { branch_chosen: p.branch, is_locked: '0' });
  return `OK|SKILL_EVOLVED|${p.skill_id}|${p.branch}`;
}

async function linkSkillCombo(env: Bindings, p: Params) {
  if (!p.player_id || !p.skill_id_1 || !p.skill_id_2 || !p.combo_name) return 'ERROR|MISSING_FIELDS';
  const has1 = await findRowIndexDouble(env, 'PlayerSkills', 'player_id', p.player_id, 'skill_id', p.skill_id_1) !== -1;
  const has2 = await findRowIndexDouble(env, 'PlayerSkills', 'player_id', p.player_id, 'skill_id', p.skill_id_2) !== -1;
  if (!has1 || !has2) return 'ERROR|SKILLS_NOT_UNLOCKED';
  if (await findRowIndexDouble(env, 'SkillCombos', 'player_id', p.player_id, 'combo_name', p.combo_name) !== -1) {
    return 'ERROR|COMBO_ALREADY_EXISTS';
  }
  await appendRow(env, 'SkillCombos', {
    player_id: p.player_id,
    skill_id_1: p.skill_id_1,
    skill_id_2: p.skill_id_2,
    combo_name: p.combo_name,
    power_bonus: p.power_bonus || '10',
    created_at: now(),
  });
  return `OK|COMBO_LINKED|${p.combo_name}`;
}

async function getAllBosses(env: Bindings) {
  return rowsToText(await sheetToRows(env, 'WorldBoss'));
}

async function getBoss(env: Bindings, bossId?: string) {
  if (!bossId) return 'ERROR|MISSING_BOSS_ID';
  const found = (await sheetToRows(env, 'WorldBoss')).find((r) => r.boss_id === String(bossId));
  return found ? singleRowToText(found) : 'ERROR|BOSS_NOT_FOUND';
}

async function setWorldState(env: Bindings, p: Params) {
  if (!p.key || !p.value) return 'ERROR|MISSING_FIELDS';
  const rowIdx = await findRowIndex(env, 'WorldState', 'key', p.key);
  if (rowIdx === -1) {
    await appendRow(env, 'WorldState', { key: p.key, value: p.value, updated_at: now() });
  } else {
    await updateRowCells(env, 'WorldState', rowIdx, { value: p.value, updated_at: now() });
  }
  return `OK|WORLD_STATE_SET|${p.key}|${p.value}`;
}

async function checkWorldProgression(env: Bindings) {
  const bosses = await sheetToRows(env, 'WorldBoss');
  const colossi = bosses.filter((b) => b.colossus_rank !== '');
  if (colossi.length > 0 && colossi.every((b) => b.is_alive === '0')) {
    await setWorldState(env, { key: 'main_story_phase', value: 'post_colossi' });
  }
}

async function killBoss(env: Bindings, p: Params) {
  if (!p.player_id || !p.boss_id) return 'ERROR|MISSING_FIELDS';
  const rowIdx = await findRowIndex(env, 'WorldBoss', 'boss_id', p.boss_id);
  if (rowIdx === -1) return 'ERROR|BOSS_NOT_FOUND';
  const bossRow = await getRowByIndex(env, 'WorldBoss', rowIdx);
  if (!bossRow) return 'ERROR|BOSS_NOT_FOUND';
  if (bossRow.is_alive === '0') return 'ERROR|BOSS_ALREADY_DEAD';
  if (p.scenario_key !== bossRow.required_scenario_key) return 'ERROR|SCENARIO_NOT_UNLOCKED';
  await updateRowCells(env, 'WorldBoss', rowIdx, {
    is_alive: '0',
    killer_player_id: p.player_id,
    killed_at: now(),
    lore_unlocked: '1',
  });
  await checkWorldProgression(env);
  return `OK|BOSS_KILLED|${p.boss_id}|LORE_UNLOCKED|${bossRow.lore_text}`;
}

async function getWorldState(env: Bindings) {
  return rowsToText(await sheetToRows(env, 'WorldState'));
}

async function getAllEquipment(env: Bindings) {
  return rowsToText(await sheetToRows(env, 'Equipment'));
}

async function getPlayerInventory(env: Bindings, playerId?: string) {
  if (!playerId) return 'ERROR|MISSING_PLAYER_ID';
  const rows = (await sheetToRows(env, 'PlayerInventory')).filter((r) => r.player_id === String(playerId));
  return rowsToText(rows);
}

async function addItem(env: Bindings, p: Params) {
  if (!p.player_id || !p.item_id) return 'ERROR|MISSING_FIELDS';
  const eqRow = (await sheetToRows(env, 'Equipment')).find((r) => r.item_id === String(p.item_id));
  if (!eqRow) return 'ERROR|ITEM_NOT_FOUND';
  if (eqRow.is_hero_weapon === '1') {
    const existing = (await sheetToRows(env, 'PlayerInventory')).filter((r) => r.item_id === String(p.item_id));
    if (existing.length >= parseInt(eqRow.max_quantity || '1')) return 'ERROR|HERO_WEAPON_LIMIT_REACHED';
  }
  const rowIdx = await findRowIndexDouble(env, 'PlayerInventory', 'player_id', p.player_id, 'item_id', p.item_id);
  if (rowIdx !== -1 && eqRow.is_hero_weapon !== '1') {
    const row = await getRowByIndex(env, 'PlayerInventory', rowIdx);
    if (!row) return 'ERROR|ITEM_NOT_IN_INVENTORY';
    const qty = parseInt(row.quantity || '0') + parseInt(p.quantity || '1');
    await updateCell(env, 'PlayerInventory', rowIdx, 'quantity', String(qty));
    return `OK|ITEM_QUANTITY_UPDATED|${p.item_id}|${qty}`;
  }
  await appendRow(env, 'PlayerInventory', {
    player_id: p.player_id,
    item_id: p.item_id,
    quantity: p.quantity || '1',
    raise_level: '0',
    ascension_form: 'base',
    obtained_at: now(),
  });
  return `OK|ITEM_ADDED|${p.item_id}`;
}

async function removeItem(env: Bindings, p: Params) {
  if (!p.player_id || !p.item_id) return 'ERROR|MISSING_FIELDS';
  const rowIdx = await findRowIndexDouble(env, 'PlayerInventory', 'player_id', p.player_id, 'item_id', p.item_id);
  if (rowIdx === -1) return 'ERROR|ITEM_NOT_IN_INVENTORY';
  const row = await getRowByIndex(env, 'PlayerInventory', rowIdx);
  if (!row) return 'ERROR|ITEM_NOT_IN_INVENTORY';
  const qty = parseInt(row.quantity || '0') - parseInt(p.quantity || '1');
  if (qty <= 0) {
    await deleteSheetRow(env, 'PlayerInventory', rowIdx);
    return `OK|ITEM_REMOVED|${p.item_id}`;
  }
  await updateCell(env, 'PlayerInventory', rowIdx, 'quantity', String(qty));
  return `OK|ITEM_QUANTITY_REDUCED|${p.item_id}|${qty}`;
}

async function raiseItem(env: Bindings, p: Params) {
  if (!p.player_id || !p.item_id) return 'ERROR|MISSING_FIELDS';
  const rowIdx = await findRowIndexDouble(env, 'PlayerInventory', 'player_id', p.player_id, 'item_id', p.item_id);
  if (rowIdx === -1) return 'ERROR|ITEM_NOT_IN_INVENTORY';
  const row = await getRowByIndex(env, 'PlayerInventory', rowIdx);
  if (!row) return 'ERROR|ITEM_NOT_IN_INVENTORY';
  const currentRaise = parseInt(row.raise_level || '0');
  if (currentRaise >= 10) return 'ERROR|MAX_RAISE_LEVEL_REACHED';
  await updateCell(env, 'PlayerInventory', rowIdx, 'raise_level', String(currentRaise + 1));
  return `OK|ITEM_RAISED|${p.item_id}|${currentRaise + 1}`;
}

async function ascendItem(env: Bindings, p: Params) {
  if (!p.player_id || !p.item_id || !p.material_id) return 'ERROR|MISSING_FIELDS';
  const rowIdx = await findRowIndexDouble(env, 'PlayerInventory', 'player_id', p.player_id, 'item_id', p.item_id);
  if (rowIdx === -1) return 'ERROR|ITEM_NOT_IN_INVENTORY';
  const matIdx = await findRowIndexDouble(env, 'PlayerInventory', 'player_id', p.player_id, 'item_id', p.material_id);
  if (matIdx === -1) return 'ERROR|MATERIAL_NOT_IN_INVENTORY';
  const eqRow = (await sheetToRows(env, 'Equipment')).find((r) => r.item_id === String(p.item_id));
  if (!eqRow) return 'ERROR|ITEM_DEF_NOT_FOUND';
  const newForm = p.target_form || 'ascended_1';
  await updateCell(env, 'PlayerInventory', rowIdx, 'ascension_form', newForm);
  await removeItem(env, { player_id: p.player_id, item_id: p.material_id, quantity: '1' });
  return `OK|ITEM_ASCENDED|${p.item_id}|${newForm}`;
}

async function getAllTitles(env: Bindings) {
  return rowsToText(await sheetToRows(env, 'Titles'));
}

async function getPlayerTitles(env: Bindings, playerId?: string) {
  if (!playerId) return 'ERROR|MISSING_PLAYER_ID';
  const rows = (await sheetToRows(env, 'PlayerTitles')).filter((r) => r.player_id === String(playerId));
  return rowsToText(rows);
}

async function updateHolderTitle(env: Bindings, p: Params) {
  if (!p.player_id || !p.title_id) return 'ERROR|MISSING_FIELDS';
  const rowIdx = await findRowIndex(env, 'HolderRecords', 'title_id', p.title_id);
  if (rowIdx === -1) {
    await appendRow(env, 'HolderRecords', {
      title_id: p.title_id,
      player_id: p.player_id,
      stat_value: p.stat_value || '0',
      updated_at: now(),
    });
  } else {
    const existing = await getRowByIndex(env, 'HolderRecords', rowIdx);
    if (existing && parseInt(p.stat_value || '0') > parseInt(existing.stat_value || '0')) {
      await updateRowCells(env, 'HolderRecords', rowIdx, {
        player_id: p.player_id,
        stat_value: p.stat_value,
        updated_at: now(),
      });
    }
  }
  return `OK|HOLDER_UPDATED|${p.title_id}`;
}

async function addTitle(env: Bindings, p: Params) {
  if (!p.player_id || !p.title_id) return 'ERROR|MISSING_FIELDS';
  const titleRow = (await sheetToRows(env, 'Titles')).find((r) => r.title_id === String(p.title_id));
  if (!titleRow) return 'ERROR|TITLE_NOT_FOUND';
  if (await findRowIndexDouble(env, 'PlayerTitles', 'player_id', p.player_id, 'title_id', p.title_id) !== -1) {
    return 'ERROR|TITLE_ALREADY_OWNED';
  }
  await appendRow(env, 'PlayerTitles', {
    player_id: p.player_id,
    title_id: p.title_id,
    obtained_at: now(),
    source: p.source || 'unknown',
  });
  if (titleRow.title_type === 'holder') {
    await updateHolderTitle(env, {
      player_id: p.player_id,
      title_id: p.title_id,
      stat_value: p.stat_value || '0',
    });
  }
  return `OK|TITLE_ADDED|${p.title_id}|${titleRow.title_name}`;
}

async function getHiddenParams(env: Bindings, playerId?: string) {
  if (!playerId) return 'ERROR|MISSING_PLAYER_ID';
  const rows = (await sheetToRows(env, 'HiddenParams')).filter((r) => r.player_id === String(playerId));
  return rowsToText(rows);
}

async function updateHiddenParam(env: Bindings, p: Params) {
  if (!p.player_id || !p.param_name || !p.param_value) return 'ERROR|MISSING_FIELDS';
  const rowIdx = await findRowIndexDouble(env, 'HiddenParams', 'player_id', p.player_id, 'param_name', p.param_name);
  if (rowIdx === -1) {
    await appendRow(env, 'HiddenParams', {
      player_id: p.player_id,
      param_name: p.param_name,
      param_value: p.param_value,
      last_updated: now(),
    });
  } else {
    await updateRowCells(env, 'HiddenParams', rowIdx, {
      param_value: p.param_value,
      last_updated: now(),
    });
  }
  return `OK|HIDDEN_PARAM_UPDATED|${p.param_name}|${p.param_value}`;
}

async function updateKarma(env: Bindings, p: Params) {
  if (!p.player_id || !p.delta) return 'ERROR|MISSING_FIELDS';
  const rowIdx = await findRowIndex(env, 'Players', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|PLAYER_NOT_FOUND';
  const row = await getRowByIndex(env, 'Players', rowIdx);
  if (!row) return 'ERROR|PLAYER_NOT_FOUND';
  const karma = parseInt(row.karma || '0') + parseInt(p.delta);
  await updateCell(env, 'Players', rowIdx, 'karma', String(karma));
  let status = 'neutral';
  if (karma >= 100) status = 'dark_accessible';
  if (karma >= 200) status = 'bounty_target';
  await updateHiddenParam(env, {
    player_id: p.player_id,
    param_name: 'karma_status',
    param_value: status,
  });
  return `OK|KARMA_UPDATED|${karma}|${status}`;
}

async function updateVorpalSoul(env: Bindings, p: Params) {
  if (!p.player_id || !p.delta) return 'ERROR|MISSING_FIELDS';
  const rowIdx = await findRowIndex(env, 'Players', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|PLAYER_NOT_FOUND';
  const row = await getRowByIndex(env, 'Players', rowIdx);
  if (!row) return 'ERROR|PLAYER_NOT_FOUND';
  let vs = parseInt(row.vorpal_soul || '0') + parseInt(p.delta);
  if (vs < 0) vs = 0;
  await updateCell(env, 'Players', rowIdx, 'vorpal_soul', String(vs));
  if (vs >= 50) {
    await updateHiddenParam(env, {
      player_id: p.player_id,
      param_name: 'vorpal_trust',
      param_value: 'unlocked',
    });
  }
  return `OK|VORPAL_SOUL_UPDATED|${vs}`;
}

async function getArcanum(env: Bindings, playerId?: string) {
  if (!playerId) return 'ERROR|MISSING_PLAYER_ID';
  const rows = (await sheetToRows(env, 'Arcanum')).filter((r) => r.player_id === String(playerId));
  return rowsToText(rows);
}

async function setArcanum(env: Bindings, p: Params) {
  if (!p.player_id || !p.card_id) return 'ERROR|MISSING_FIELDS';
  const cardRow = (await sheetToRows(env, 'ArcanumCards')).find((r) => r.card_id === String(p.card_id));
  if (!cardRow) return 'ERROR|ARCANUM_CARD_NOT_FOUND';
  const existing = await findRowIndex(env, 'Arcanum', 'player_id', p.player_id);
  const payload = {
    card_id: p.card_id,
    card_name: cardRow.card_name,
    positive_effect: cardRow.positive_effect,
    negative_effect: cardRow.negative_effect,
    is_reverse: '0',
    is_controllable: '0',
    activated: '1',
    set_at: now(),
  };
  if (existing !== -1) {
    await updateRowCells(env, 'Arcanum', existing, payload);
  } else {
    await appendRow(env, 'Arcanum', { player_id: p.player_id, ...payload });
  }
  const playerRowIdx = await findRowIndex(env, 'Players', 'player_id', p.player_id);
  if (playerRowIdx !== -1) {
    const playerRow = await getRowByIndex(env, 'Players', playerRowIdx);
    if (playerRow && parseInt(playerRow.level || '0') >= 150) {
      const arcanumIdx = await findRowIndex(env, 'Arcanum', 'player_id', p.player_id);
      if (arcanumIdx !== -1) await updateCell(env, 'Arcanum', arcanumIdx, 'is_reverse', '1');
    }
  }
  return `OK|ARCANUM_SET|${p.card_id}|${cardRow.card_name}`;
}

async function toggleArcanum(env: Bindings, p: Params) {
  if (!p.player_id) return 'ERROR|MISSING_PLAYER_ID';
  const rowIdx = await findRowIndex(env, 'Arcanum', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|ARCANUM_NOT_SET';
  const row = await getRowByIndex(env, 'Arcanum', rowIdx);
  if (!row) return 'ERROR|ARCANUM_NOT_SET';
  if (row.is_controllable !== '1') return 'ERROR|ARCANUM_NOT_CONTROLLABLE';
  const newState = row.activated === '1' ? '0' : '1';
  await updateCell(env, 'Arcanum', rowIdx, 'activated', newState);
  return `OK|ARCANUM_TOGGLED|${newState}`;
}

async function getMoonCycle(env: Bindings) {
  const rows = await sheetToRows(env, 'WorldState');
  const moonRow = rows.find((r) => r.key === 'moon_phase');
  const manaRow = rows.find((r) => r.key === 'mana_level');
  const phase = moonRow ? moonRow.value : 'full';
  const mana = manaRow ? manaRow.value : '100';
  return `HEADERS|moon_phase|mana_level\nROW|${phase}|${mana}`;
}

async function advanceMoonCycle(env: Bindings, _p: Params) {
  const phases = [
    'new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous',
    'full', 'waning_gibbous', 'last_quarter', 'waning_crescent',
  ];
  const manaLevels: Record<string, string> = {
    new: '40', waxing_crescent: '55', first_quarter: '70', waxing_gibbous: '85',
    full: '120', waning_gibbous: '100', last_quarter: '75', waning_crescent: '55',
  };
  const rows = await sheetToRows(env, 'WorldState');
  const moonRow = rows.find((r) => r.key === 'moon_phase');
  const currentPhase = moonRow ? moonRow.value : 'new';
  const idx = phases.indexOf(currentPhase);
  const nextPhase = phases[(idx + 1) % phases.length];
  await setWorldState(env, { key: 'moon_phase', value: nextPhase });
  await setWorldState(env, { key: 'mana_level', value: manaLevels[nextPhase] });
  return `OK|MOON_ADVANCED|${nextPhase}|MANA|${manaLevels[nextPhase]}`;
}

async function npcPermadeath(env: Bindings, p: Params) {
  if (!p.npc_id || !p.scenario_id) return 'ERROR|MISSING_FIELDS';
  const rowIdx = await findRowIndexDouble(env, 'NPCStatus', 'npc_id', p.npc_id, 'scenario_id', p.scenario_id);
  if (rowIdx === -1) {
    await appendRow(env, 'NPCStatus', {
      npc_id: p.npc_id,
      scenario_id: p.scenario_id,
      is_dead: '1',
      killed_by: p.player_id || 'unknown',
      killed_at: now(),
      quest_closed: '1',
    });
  } else {
    await updateRowCells(env, 'NPCStatus', rowIdx, {
      is_dead: '1',
      quest_closed: '1',
      killed_at: now(),
    });
  }
  return `OK|NPC_DEAD|${p.npc_id}|QUEST_CLOSED`;
}

async function getWorldMap(env: Bindings) {
  return rowsToText(await sheetToRows(env, 'MapObjects'));
}

async function saveWorldMap(env: Bindings, p: Params) {
  const text = p.objects_text || '';
  await clearSheetData(env, 'MapObjects');
  if (!text.trim()) return 'OK|WORLD_MAP_CLEARED';

  const headers = await getHeaders(env, 'MapObjects');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const parts = line.split('|');
    const rowData: Params = {};
    const keys = headers.length > 0
      ? headers
      : ['id', 'type', 'x', 'y', 'z', 'name', 'radius', 'params'];
    keys.forEach((h, i) => {
      rowData[h] = parts[i] !== undefined ? parts[i] : '';
    });
    await appendRow(env, 'MapObjects', rowData);
  }
  return `OK|WORLD_MAP_SAVED|${lines.length}`;
}

async function getPlayerQuests(env: Bindings, playerId?: string) {
  if (!playerId) return 'ERROR|MISSING_PLAYER_ID';
  const rows = (await sheetToRows(env, 'PlayerQuests')).filter((r) => r.player_id === String(playerId));
  return rowsToText(rows);
}

async function getDialogue(env: Bindings, dialogueId?: string) {
  if (!dialogueId) return 'ERROR|MISSING_DIALOGUE_ID';
  const found = (await sheetToRows(env, 'Dialogue')).find((r) => r.dialogue_id === String(dialogueId));
  return found ? singleRowToText(found) : 'ERROR|DIALOGUE_NOT_FOUND';
}

async function updateQuestProgress(env: Bindings, p: Params) {
  if (!p.player_id || !p.quest_id) return 'ERROR|MISSING_FIELDS';
  const rowIdx = await findRowIndexDouble(env, 'PlayerQuests', 'player_id', p.player_id, 'quest_id', p.quest_id);
  if (rowIdx === -1) {
    await appendRow(env, 'PlayerQuests', {
      player_id: p.player_id,
      quest_id: p.quest_id,
      status: 'active',
      progress: p.progress || '0',
      updated_at: now(),
    });
    return `OK|QUEST_STARTED|${p.quest_id}`;
  }
  await updateRowCells(env, 'PlayerQuests', rowIdx, {
    progress: p.progress,
    status: p.status || 'active',
    updated_at: now(),
  });
  return `OK|QUEST_PROGRESS_UPDATED|${p.quest_id}`;
}

async function routeGet(env: Bindings, action: string, p: Params): Promise<string> {
  switch (action) {
    case 'get_player': return getPlayer(env, p.player_id);
    case 'get_player_jobs': return getPlayerJobs(env, p.player_id);
    case 'get_player_skills': return getPlayerSkills(env, p.player_id);
    case 'get_player_inventory': return getPlayerInventory(env, p.player_id);
    case 'get_player_titles': return getPlayerTitles(env, p.player_id);
    case 'get_hidden_params': return getHiddenParams(env, p.player_id);
    case 'get_arcanum': return getArcanum(env, p.player_id);
    case 'get_all_jobs': return getAllJobs(env);
    case 'get_job': return getJobById(env, p.job_id);
    case 'get_all_skills': return getAllSkills(env);
    case 'get_skills_by_job': return getSkillsByJob(env, p.job_id);
    case 'get_boss': return getBoss(env, p.boss_id);
    case 'get_all_bosses': return getAllBosses(env);
    case 'get_world_state': return getWorldState(env);
    case 'get_all_equipment': return getAllEquipment(env);
    case 'get_all_titles': return getAllTitles(env);
    case 'get_moon_cycle': return getMoonCycle(env);
    case 'get_world_map': return getWorldMap(env);
    case 'get_all_monsters': return rowsToText(await sheetToRows(env, 'Monsters'));
    case 'get_all_npcs': return rowsToText(await sheetToRows(env, 'NPCs'));
    case 'get_all_quests': return rowsToText(await sheetToRows(env, 'Quests'));
    case 'get_all_spawners': return rowsToText(await sheetToRows(env, 'Spawners'));
    case 'get_player_quests': return getPlayerQuests(env, p.player_id);
    case 'get_dialogue': return getDialogue(env, p.dialogue_id);
    default: return 'ERROR|UNKNOWN_GET_ACTION';
  }
}

async function routePost(env: Bindings, action: string, p: Params): Promise<string> {
  switch (action) {
    case 'create_player': return createPlayer(env, p);
    case 'update_player_stats': return updatePlayerStats(env, p);
    case 'add_exp': return addExp(env, p);
    case 'add_money': return addMoney(env, p);
    case 'cap_breakthrough': return capBreakthrough(env, p);
    case 'set_main_job': return setMainJob(env, p);
    case 'set_sub_job': return setSubJob(env, p);
    case 'unlock_job': return unlockJob(env, p);
    case 'unlock_skill': return unlockSkill(env, p);
    case 'allocate_stat': return allocateStat(env, p);
    case 'set_skill_loadout': return setSkillLoadout(env, p);
    case 'use_skill_scroll': return useSkillScroll(env, p);
    case 'promote_job': return promoteJob(env, p);
    case 'evolve_skill': return evolveSkill(env, p);
    case 'link_skill_combo': return linkSkillCombo(env, p);
    case 'kill_boss': return killBoss(env, p);
    case 'add_item': return addItem(env, p);
    case 'remove_item': return removeItem(env, p);
    case 'raise_item': return raiseItem(env, p);
    case 'ascend_item': return ascendItem(env, p);
    case 'add_title': return addTitle(env, p);
    case 'update_hidden_param': return updateHiddenParam(env, p);
    case 'set_arcanum': return setArcanum(env, p);
    case 'toggle_arcanum': return toggleArcanum(env, p);
    case 'update_karma': return updateKarma(env, p);
    case 'update_vorpal_soul': return updateVorpalSoul(env, p);
    case 'set_world_state': return setWorldState(env, p);
    case 'advance_moon_cycle': return advanceMoonCycle(env, p);
    case 'npc_permadeath': return npcPermadeath(env, p);
    case 'update_holder_title': return updateHolderTitle(env, p);
    case 'save_world_map': return saveWorldMap(env, p);
    case 'upsert_monster': return upsertRow(env, 'Monsters', 'monster_id', p);
    case 'upsert_npc': return upsertRow(env, 'NPCs', 'npc_id', p);
    case 'upsert_quest': return upsertRow(env, 'Quests', 'quest_id', p);
    case 'upsert_spawner': return upsertRow(env, 'Spawners', 'spawner_id', p);
    case 'update_quest_progress': return updateQuestProgress(env, p);
    default: return 'ERROR|UNKNOWN_POST_ACTION';
  }
}

function queryToParams(c: { req: { query: (k?: string) => any } }): Params {
  const q = c.req.query() as Record<string, string>;
  const p: Params = {};
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined) p[k] = String(v);
  }
  return p;
}

async function parseBodyParams(c: { req: { text: () => Promise<string>; header: (n: string) => string | undefined } }): Promise<Params> {
  const contentType = c.req.header('content-type') || '';
  const raw = await c.req.text();
  const p: Params = {};
  if (!raw) return p;

  if (contentType.includes('application/json')) {
    try {
      const json = JSON.parse(raw);
      for (const [k, v] of Object.entries(json)) {
        if (v !== undefined && v !== null) p[k] = String(v);
      }
    } catch {
      return p;
    }
    return p;
  }

  for (const pair of raw.split('&')) {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const k = decodeURIComponent(pair.substring(0, idx).replace(/\+/g, ' '));
      const v = decodeURIComponent(pair.substring(idx + 1).replace(/\+/g, ' '));
      p[k] = v;
    }
  }
  return p;
}

app.get('/health', (c) => c.text('ok'));

/** Pi publishes its public trycloudflare (or custom) URL here so the Worker can proxy. */
app.post('/_pi/origin', async (c) => {
  const secret = c.req.header('x-pi-secret') || '';
  if (!c.env.PI_ORIGIN_SECRET || secret !== c.env.PI_ORIGIN_SECRET) {
    return c.text('unauthorized', 401);
  }
  if (!c.env.PI_ORIGIN) return c.text('ERROR|NO_KV', 500);
  let url = '';
  const ct = c.req.header('content-type') || '';
  if (ct.includes('application/json')) {
    const body = await c.req.json<{ url?: string }>();
    url = String(body.url || '').trim();
  } else {
    const text = await c.req.text();
    try {
      url = String(JSON.parse(text).url || '').trim();
    } catch {
      url = text.trim();
    }
  }
  if (!/^https?:\/\//i.test(url)) return c.text('ERROR|BAD_URL', 400);
  url = url.replace(/\/$/, '');
  await c.env.PI_ORIGIN.put('url', url);
  await c.env.PI_ORIGIN.put('updated_at', new Date().toISOString());
  return c.json({ ok: true, url });
});

app.get('/_pi/status', async (c) => {
  const origin = c.env.PI_ORIGIN ? await c.env.PI_ORIGIN.get('url') : null;
  const updatedAt = c.env.PI_ORIGIN ? await c.env.PI_ORIGIN.get('updated_at') : null;
  return c.json({
    mode: origin ? 'proxy-to-pi' : 'sheets-direct',
    hasOrigin: Boolean(origin),
    updatedAt,
  });
});

async function proxyToPi(c: any): Promise<Response | null> {
  if (!c.env.PI_ORIGIN) return null;
  const origin = await c.env.PI_ORIGIN.get('url');
  if (!origin) return null;
  const url = new URL(c.req.url);
  const target = origin + url.pathname + url.search;
  const headers = new Headers(c.req.raw.headers);
  headers.delete('host');
  const init: RequestInit = {
    method: c.req.method,
    headers,
    redirect: 'manual',
  };
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    init.body = await c.req.raw.arrayBuffer();
  }
  const res = await fetch(target, init);
  const outHeaders = new Headers(res.headers);
  outHeaders.set('access-control-allow-origin', '*');
  return new Response(res.body, { status: res.status, headers: outHeaders });
}

app.get('/', async (c) => {
  const p = queryToParams(c);
  const action = p.action || '';
  if (!action) {
    const origin = c.env.PI_ORIGIN ? await c.env.PI_ORIGIN.get('url') : null;
    return c.text(
      origin
        ? 'Zenith Frontier Worker online (proxy → Pi)'
        : 'Zenith Frontier Cloudflare Worker is online',
    );
  }
  try {
    const proxied = await proxyToPi(c);
    if (proxied) return proxied;
    const out = await routeGet(c.env, action, p);
    return c.text(out);
  } catch (err: any) {
    return c.text(`ERROR|${err?.message || err}`);
  }
});

app.post('/', async (c) => {
  try {
    const proxied = await proxyToPi(c);
    if (proxied) return proxied;
    const body = await parseBodyParams(c);
    const query = queryToParams(c);
    const p: Params = { ...query, ...body };
    const action = p.action || '';
    if (!action) return c.text('ERROR|MISSING_ACTION');
    const out = await routePost(c.env, action, p);
    return c.text(out);
  } catch (err: any) {
    return c.text(`ERROR|${err?.message || err}`);
  }
});

app.all('*', async (c) => {
  if (c.req.path.startsWith('/_pi/')) return c.text('not found', 404);
  const proxied = await proxyToPi(c);
  if (proxied) return proxied;
  return c.text('not found', 404);
});

app.options('*', (c) => c.body(null, 204));

export default app;
