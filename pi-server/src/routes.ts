import type { Context } from 'hono';
import {
  appendRow,
  clearSheetData,
  deleteRow,
  findRowIndex,
  findRowIndexDouble,
  getHeaders,
  getRowByIndex,
  markSheetFullSync,
  sheetToRows,
  updateCell,
  updateRowCells,
  upsertRow,
  type Db,
} from './db.js';
import type { Params, Row } from './schema.js';
import {
  ALLOC_STATS,
  STAT_POINTS_PER_LEVEL,
  combatFromAlloc,
  masteryExpToNext,
  parsePotential,
  type AllocStat,
} from './classSystem.js';

export type AppVars = { db: Db };

function now() {
  return new Date().toISOString();
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

function getPlayer(db: Db, playerId?: string) {
  if (!playerId) return 'ERROR|MISSING_PLAYER_ID';
  const rows = sheetToRows(db, 'Players');
  const found = rows.find((r) => r.player_id === String(playerId));
  return found ? singleRowToText(found) : 'ERROR|PLAYER_NOT_FOUND';
}

function createPlayer(db: Db, p: Params) {
  if (!p.player_id || !p.name) return 'ERROR|MISSING_REQUIRED_FIELDS';
  if (findRowIndex(db, 'Players', 'player_id', p.player_id) !== -1) {
    return 'ERROR|PLAYER_ALREADY_EXISTS';
  }
  const alloc = { str: 5, dex: 5, int: 5, vit: 5, luk: 5 };
  const combat = combatFromAlloc(alloc);
  appendRow(db, 'Players', {
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

function updatePlayerStats(db: Db, p: Params) {
  if (!p.player_id) return 'ERROR|MISSING_PLAYER_ID';
  const rowIdx = findRowIndex(db, 'Players', 'player_id', p.player_id);
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
  updateRowCells(db, 'Players', rowIdx, updates);
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

function recomputeCombatStats(db: Db, rowIdx: number, row: Row) {
  const job = sheetToRows(db, 'Jobs').find((j) => j.job_id === row.main_job_id);
  const combat = combatFromAlloc(readAlloc(row), job?.stat_bonus);
  const hp = Math.min(parseInt(row.hp) || combat.maxHp, combat.maxHp);
  const mp = Math.min(parseInt(row.mp) || combat.maxMp, combat.maxMp);
  updateRowCells(db, 'Players', rowIdx, {
    atk: String(combat.atk),
    def: String(combat.def),
    spd: String(combat.spd),
    hp: String(hp),
    mp: String(mp),
  });
  return combat;
}

function grantStarterSkills(db: Db, playerId: string, jobId: string) {
  const starters = sheetToRows(db, 'Skills').filter(
    (s) => s.job_id === jobId && (s.unlock_type === 'starter' || !s.unlock_type),
  );
  for (const skill of starters) {
    if (findRowIndexDouble(db, 'PlayerSkills', 'player_id', playerId, 'skill_id', skill.skill_id) !== -1) {
      continue;
    }
    appendRow(db, 'PlayerSkills', {
      player_id: playerId,
      skill_id: skill.skill_id,
      skill_level: '1',
      branch_chosen: '',
      is_locked: '0',
      unlocked_at: now(),
    });
  }
  const rowIdx = findRowIndex(db, 'Players', 'player_id', playerId);
  if (rowIdx === -1) return;
  const row = getRowByIndex(db, 'Players', rowIdx);
  if (!row) return;
  if (!row.skill_slot_1 && starters[0]) {
    updateCell(db, 'Players', rowIdx, 'skill_slot_1', starters[0].skill_id);
  }
}

function expToNextLevel(level: number): number {
  let need = 100;
  for (let i = 1; i < level; i++) need = Math.floor(need * 1.5);
  return need;
}

function addExp(db: Db, p: Params) {
  if (!p.player_id || !p.exp_amount) return 'ERROR|MISSING_FIELDS';
  const rowIdx = findRowIndex(db, 'Players', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|PLAYER_NOT_FOUND';
  const row = getRowByIndex(db, 'Players', rowIdx);
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
    updateRowCells(db, 'Players', rowIdx, {
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
  updateRowCells(db, 'Players', rowIdx, {
    exp: String(exp),
    level: String(level),
    stat_points: String(statPoints),
    job_mastery: String(mastery),
    job_mastery_exp: String(masteryExp),
  });
  return `OK|EXP_ADDED|${level}|${exp}|${leveled}|${statPoints}|${mastery}|${masteryExp}`;
}

function addMoney(db: Db, p: Params) {
  if (!p.player_id || p.amount === undefined) return 'ERROR|MISSING_FIELDS';
  const rowIdx = findRowIndex(db, 'Players', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|PLAYER_NOT_FOUND';
  const row = getRowByIndex(db, 'Players', rowIdx);
  if (!row) return 'ERROR|PLAYER_NOT_FOUND';
  const money = Math.max(0, (parseInt(row.money) || 0) + (parseInt(p.amount) || 0));
  updateCell(db, 'Players', rowIdx, 'money', String(money));
  return `OK|MONEY_UPDATED|${money}`;
}

function capBreakthrough(db: Db, p: Params) {
  if (!p.player_id) return 'ERROR|MISSING_PLAYER_ID';
  const rowIdx = findRowIndex(db, 'Players', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|PLAYER_NOT_FOUND';
  const row = getRowByIndex(db, 'Players', rowIdx);
  if (!row) return 'ERROR|PLAYER_NOT_FOUND';
  const level = parseInt(row.level) || 1;
  if (level < 99) return 'ERROR|LEVEL_CAP_NOT_REACHED';
  const condition = p.condition || '';
  if (condition !== 'new_continent' && condition !== 'kill_lv100_boss') {
    return 'ERROR|INVALID_BREAKTHROUGH_CONDITION';
  }
  const stored = parseInt(row.stored_exp) || 0;
  updateRowCells(db, 'Players', rowIdx, {
    level: '100',
    exp: String(stored),
    stored_exp: '0',
  });
  return 'OK|CAP_BROKEN|100';
}

function getPlayerJobs(db: Db, playerId?: string) {
  if (!playerId) return 'ERROR|MISSING_PLAYER_ID';
  const rows = sheetToRows(db, 'PlayerJobs').filter((r) => r.player_id === String(playerId));
  return rowsToText(rows);
}

function getAllJobs(db: Db) {
  return rowsToText(sheetToRows(db, 'Jobs'));
}

function getJobById(db: Db, jobId?: string) {
  if (!jobId) return 'ERROR|MISSING_JOB_ID';
  const found = sheetToRows(db, 'Jobs').find((r) => r.job_id === String(jobId));
  return found ? singleRowToText(found) : 'ERROR|JOB_NOT_FOUND';
}

function unlockJob(db: Db, p: Params) {
  if (!p.player_id || !p.job_id) return 'ERROR|MISSING_FIELDS';
  const job = sheetToRows(db, 'Jobs').find((r) => r.job_id === String(p.job_id));
  if (!job) return 'ERROR|JOB_NOT_FOUND';
  if (job.is_hidden === '1' && (!p.unlock_condition || p.unlock_condition !== job.unlock_condition)) {
    return 'ERROR|HIDDEN_JOB_CONDITION_NOT_MET';
  }
  if (findRowIndexDouble(db, 'PlayerJobs', 'player_id', p.player_id, 'job_id', p.job_id) !== -1) {
    return 'ERROR|JOB_ALREADY_UNLOCKED';
  }
  appendRow(db, 'PlayerJobs', {
    player_id: p.player_id,
    job_id: p.job_id,
    unlocked_at: now(),
  });
  return `OK|JOB_UNLOCKED|${p.job_id}`;
}

function setMainJob(db: Db, p: Params) {
  if (!p.player_id || !p.job_id) return 'ERROR|MISSING_FIELDS';
  const job = sheetToRows(db, 'Jobs').find((r) => r.job_id === String(p.job_id));
  if (!job) return 'ERROR|JOB_NOT_FOUND';
  if (findRowIndexDouble(db, 'PlayerJobs', 'player_id', p.player_id, 'job_id', p.job_id) === -1) {
    appendRow(db, 'PlayerJobs', {
      player_id: p.player_id,
      job_id: p.job_id,
      unlocked_at: now(),
    });
  }
  const rowIdx = findRowIndex(db, 'Players', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|PLAYER_NOT_FOUND';
  const row = getRowByIndex(db, 'Players', rowIdx);
  if (!row) return 'ERROR|PLAYER_NOT_FOUND';
  if (row.sub_job_id === String(p.job_id)) return 'ERROR|JOB_ALREADY_SET_AS_SUB';
  const switching = row.main_job_id && row.main_job_id !== String(p.job_id);
  updateRowCells(db, 'Players', rowIdx, {
    main_job_id: p.job_id,
    ...(switching ? { job_mastery: '1', job_mastery_exp: '0' } : {}),
  });
  const updated = getRowByIndex(db, 'Players', rowIdx);
  if (updated) recomputeCombatStats(db, rowIdx, updated);
  grantStarterSkills(db, p.player_id, p.job_id);
  return `OK|MAIN_JOB_SET|${p.job_id}`;
}

function setSubJob(db: Db, p: Params) {
  if (!p.player_id || !p.job_id) return 'ERROR|MISSING_FIELDS';
  if (findRowIndexDouble(db, 'PlayerJobs', 'player_id', p.player_id, 'job_id', p.job_id) === -1) {
    return 'ERROR|JOB_NOT_UNLOCKED';
  }
  const rowIdx = findRowIndex(db, 'Players', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|PLAYER_NOT_FOUND';
  const row = getRowByIndex(db, 'Players', rowIdx);
  if (!row) return 'ERROR|PLAYER_NOT_FOUND';
  if (row.main_job_id === String(p.job_id)) return 'ERROR|JOB_ALREADY_SET_AS_MAIN';
  updateCell(db, 'Players', rowIdx, 'sub_job_id', p.job_id);
  return `OK|SUB_JOB_SET|${p.job_id}`;
}

function getAllSkills(db: Db) {
  return rowsToText(sheetToRows(db, 'Skills'));
}

function getSkillsByJob(db: Db, jobId?: string) {
  if (!jobId) return 'ERROR|MISSING_JOB_ID';
  const rows = sheetToRows(db, 'Skills').filter((r) => r.job_id === String(jobId));
  return rowsToText(rows);
}

function getPlayerSkills(db: Db, playerId?: string) {
  if (!playerId) return 'ERROR|MISSING_PLAYER_ID';
  const rows = sheetToRows(db, 'PlayerSkills').filter((r) => r.player_id === String(playerId));
  return rowsToText(rows);
}

function unlockSkill(db: Db, p: Params) {
  if (!p.player_id || !p.skill_id) return 'ERROR|MISSING_FIELDS';
  const skill = sheetToRows(db, 'Skills').find((r) => r.skill_id === String(p.skill_id));
  if (!skill) return 'ERROR|SKILL_NOT_FOUND';
  if (findRowIndexDouble(db, 'PlayerSkills', 'player_id', p.player_id, 'skill_id', p.skill_id) !== -1) {
    return 'ERROR|SKILL_ALREADY_UNLOCKED';
  }
  if (skill.parent_skill_id) {
    if (findRowIndexDouble(db, 'PlayerSkills', 'player_id', p.player_id, 'skill_id', skill.parent_skill_id) === -1) {
      return 'ERROR|PARENT_SKILL_NOT_UNLOCKED';
    }
  }
  const playerIdx = findRowIndex(db, 'Players', 'player_id', p.player_id);
  const playerRow = playerIdx === -1 ? null : getRowByIndex(db, 'Players', playerIdx);
  if (!playerRow) return 'ERROR|PLAYER_NOT_FOUND';

  const unlockType = skill.unlock_type || 'starter';
  const unlockValue = skill.unlock_value || '';
  const mastery = parseInt(playerRow.job_mastery) || 1;
  const level = parseInt(playerRow.level) || 1;
  const money = parseInt(playerRow.money) || 0;

  if (unlockType === 'starter') {
    // free if same job or already main
  } else if (unlockType === 'mastery') {
    if (mastery < (parseInt(unlockValue) || 1)) return 'ERROR|MASTERY_TOO_LOW';
  } else if (unlockType === 'level') {
    if (level < (parseInt(unlockValue) || 1)) return 'ERROR|LEVEL_TOO_LOW';
  } else if (unlockType === 'gold') {
    const cost = parseInt(unlockValue) || 0;
    if (money < cost) return 'ERROR|NOT_ENOUGH_GOLD';
    updateCell(db, 'Players', playerIdx, 'money', String(money - cost));
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

  appendRow(db, 'PlayerSkills', {
    player_id: p.player_id,
    skill_id: p.skill_id,
    skill_level: '1',
    branch_chosen: '',
    is_locked: '0',
    unlocked_at: now(),
  });
  return `OK|SKILL_UNLOCKED|${p.skill_id}`;
}

function allocateStat(db: Db, p: Params) {
  if (!p.player_id || !p.stat) return 'ERROR|MISSING_FIELDS';
  const stat = String(p.stat).toLowerCase() as AllocStat;
  if (!ALLOC_STATS.includes(stat)) return 'ERROR|INVALID_STAT';
  const rowIdx = findRowIndex(db, 'Players', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|PLAYER_NOT_FOUND';
  const row = getRowByIndex(db, 'Players', rowIdx);
  if (!row) return 'ERROR|PLAYER_NOT_FOUND';
  const points = parseInt(row.stat_points) || 0;
  if (points < 1) return 'ERROR|NO_STAT_POINTS';
  const job = sheetToRows(db, 'Jobs').find((j) => j.job_id === row.main_job_id);
  const potential = parsePotential(job?.potential);
  const current = parseInt(row[stat]) || 5;
  if (current >= potential[stat]) return 'ERROR|POTENTIAL_CAP';
  const next = current + 1;
  updateRowCells(db, 'Players', rowIdx, {
    [stat]: String(next),
    stat_points: String(points - 1),
  });
  const updated = getRowByIndex(db, 'Players', rowIdx);
  if (updated) recomputeCombatStats(db, rowIdx, updated);
  return `OK|STAT_ALLOCATED|${stat}|${next}|${points - 1}`;
}

function setSkillLoadout(db: Db, p: Params) {
  if (!p.player_id || !p.slot) return 'ERROR|MISSING_FIELDS';
  const slot = parseInt(p.slot);
  if (slot < 1 || slot > 4) return 'ERROR|INVALID_SLOT';
  const col = `skill_slot_${slot}`;
  const skillId = p.skill_id || '';
  const rowIdx = findRowIndex(db, 'Players', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|PLAYER_NOT_FOUND';
  if (skillId) {
    if (findRowIndexDouble(db, 'PlayerSkills', 'player_id', p.player_id, 'skill_id', skillId) === -1) {
      return 'ERROR|SKILL_NOT_UNLOCKED';
    }
    const row = getRowByIndex(db, 'Players', rowIdx);
    if (!row) return 'ERROR|PLAYER_NOT_FOUND';
    for (let i = 1; i <= 4; i++) {
      if (i === slot) continue;
      if (row[`skill_slot_${i}`] === skillId) {
        updateCell(db, 'Players', rowIdx, `skill_slot_${i}`, '');
      }
    }
  }
  updateCell(db, 'Players', rowIdx, col, skillId);
  return `OK|LOADOUT_SET|${slot}|${skillId || 'EMPTY'}`;
}

function useSkillScroll(db: Db, p: Params) {
  if (!p.player_id || !p.item_id) return 'ERROR|MISSING_FIELDS';
  const eq = sheetToRows(db, 'Equipment').find((r) => r.item_id === String(p.item_id));
  if (!eq) return 'ERROR|ITEM_NOT_FOUND';
  if (eq.item_type !== 'skill_scroll') return 'ERROR|NOT_A_SCROLL';
  const m = (eq.base_stats || '').match(/skill:([A-Za-z0-9_]+)/);
  if (!m) return 'ERROR|SCROLL_HAS_NO_SKILL';
  const skillId = m[1];
  const skill = sheetToRows(db, 'Skills').find((r) => r.skill_id === skillId);
  if (!skill) return 'ERROR|SKILL_NOT_FOUND';
  if (findRowIndexDouble(db, 'PlayerSkills', 'player_id', p.player_id, 'skill_id', skillId) !== -1) {
    return 'ERROR|SKILL_ALREADY_UNLOCKED';
  }
  const rem = removeItem(db, { player_id: p.player_id, item_id: p.item_id, quantity: '1' });
  if (!rem.startsWith('OK|')) return rem;
  if (skill.parent_skill_id) {
    if (findRowIndexDouble(db, 'PlayerSkills', 'player_id', p.player_id, 'skill_id', skill.parent_skill_id) === -1) {
      addItem(db, { player_id: p.player_id, item_id: p.item_id, quantity: '1' });
      return 'ERROR|PARENT_SKILL_NOT_UNLOCKED';
    }
  }
  appendRow(db, 'PlayerSkills', {
    player_id: p.player_id,
    skill_id: skillId,
    skill_level: '1',
    branch_chosen: '',
    is_locked: '0',
    unlocked_at: now(),
  });
  return `OK|SCROLL_USED|${skillId}`;
}

function promoteJob(db: Db, p: Params) {
  if (!p.player_id || !p.job_id) return 'ERROR|MISSING_FIELDS';
  const job = sheetToRows(db, 'Jobs').find((r) => r.job_id === String(p.job_id));
  if (!job) return 'ERROR|JOB_NOT_FOUND';
  if (job.tier !== 'high' || !job.parent_job_id) return 'ERROR|NOT_A_PROMOTION';
  const rowIdx = findRowIndex(db, 'Players', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|PLAYER_NOT_FOUND';
  const row = getRowByIndex(db, 'Players', rowIdx);
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
  return setMainJob(db, { player_id: p.player_id, job_id: p.job_id });
}

function evolveSkill(db: Db, p: Params) {
  if (!p.player_id || !p.skill_id || !p.branch) return 'ERROR|MISSING_FIELDS';
  const psRowIdx = findRowIndexDouble(db, 'PlayerSkills', 'player_id', p.player_id, 'skill_id', p.skill_id);
  if (psRowIdx === -1) return 'ERROR|SKILL_NOT_UNLOCKED';
  const psRow = getRowByIndex(db, 'PlayerSkills', psRowIdx);
  if (!psRow) return 'ERROR|SKILL_NOT_UNLOCKED';
  if (psRow.is_locked === '1') return 'ERROR|SKILL_BRANCH_LOCKED';
  if (psRow.branch_chosen && psRow.branch_chosen !== String(p.branch)) {
    return 'ERROR|DIFFERENT_BRANCH_ALREADY_CHOSEN';
  }
  const skillRow = sheetToRows(db, 'Skills').find((r) => r.skill_id === String(p.skill_id));
  if (!skillRow) return 'ERROR|SKILL_NOT_FOUND';
  const validBranches = skillRow.evolution_branches ? skillRow.evolution_branches.split(',') : [];
  if (validBranches.length > 0 && !validBranches.includes(String(p.branch))) {
    return 'ERROR|INVALID_BRANCH';
  }
  updateRowCells(db, 'PlayerSkills', psRowIdx, { branch_chosen: p.branch, is_locked: '0' });
  return `OK|SKILL_EVOLVED|${p.skill_id}|${p.branch}`;
}

function linkSkillCombo(db: Db, p: Params) {
  if (!p.player_id || !p.skill_id_1 || !p.skill_id_2 || !p.combo_name) return 'ERROR|MISSING_FIELDS';
  const has1 = findRowIndexDouble(db, 'PlayerSkills', 'player_id', p.player_id, 'skill_id', p.skill_id_1) !== -1;
  const has2 = findRowIndexDouble(db, 'PlayerSkills', 'player_id', p.player_id, 'skill_id', p.skill_id_2) !== -1;
  if (!has1 || !has2) return 'ERROR|SKILLS_NOT_UNLOCKED';
  if (findRowIndexDouble(db, 'SkillCombos', 'player_id', p.player_id, 'combo_name', p.combo_name) !== -1) {
    return 'ERROR|COMBO_ALREADY_EXISTS';
  }
  appendRow(db, 'SkillCombos', {
    player_id: p.player_id,
    skill_id_1: p.skill_id_1,
    skill_id_2: p.skill_id_2,
    combo_name: p.combo_name,
    power_bonus: p.power_bonus || '10',
    created_at: now(),
  });
  return `OK|COMBO_LINKED|${p.combo_name}`;
}

function getAllBosses(db: Db) {
  return rowsToText(sheetToRows(db, 'WorldBoss'));
}

function getBoss(db: Db, bossId?: string) {
  if (!bossId) return 'ERROR|MISSING_BOSS_ID';
  const found = sheetToRows(db, 'WorldBoss').find((r) => r.boss_id === String(bossId));
  return found ? singleRowToText(found) : 'ERROR|BOSS_NOT_FOUND';
}

function setWorldState(db: Db, p: Params) {
  if (!p.key || !p.value) return 'ERROR|MISSING_FIELDS';
  const rowIdx = findRowIndex(db, 'WorldState', 'key', p.key);
  if (rowIdx === -1) {
    appendRow(db, 'WorldState', { key: p.key, value: p.value, updated_at: now() });
  } else {
    updateRowCells(db, 'WorldState', rowIdx, { value: p.value, updated_at: now() });
  }
  return `OK|WORLD_STATE_SET|${p.key}|${p.value}`;
}

function checkWorldProgression(db: Db) {
  const bosses = sheetToRows(db, 'WorldBoss');
  const colossi = bosses.filter((b) => b.colossus_rank !== '');
  if (colossi.length > 0 && colossi.every((b) => b.is_alive === '0')) {
    setWorldState(db, { key: 'main_story_phase', value: 'post_colossi' });
  }
}

function killBoss(db: Db, p: Params) {
  if (!p.player_id || !p.boss_id) return 'ERROR|MISSING_FIELDS';
  const rowIdx = findRowIndex(db, 'WorldBoss', 'boss_id', p.boss_id);
  if (rowIdx === -1) return 'ERROR|BOSS_NOT_FOUND';
  const bossRow = getRowByIndex(db, 'WorldBoss', rowIdx);
  if (!bossRow) return 'ERROR|BOSS_NOT_FOUND';
  if (bossRow.is_alive === '0') return 'ERROR|BOSS_ALREADY_DEAD';
  if (p.scenario_key !== bossRow.required_scenario_key) return 'ERROR|SCENARIO_NOT_UNLOCKED';
  updateRowCells(db, 'WorldBoss', rowIdx, {
    is_alive: '0',
    killer_player_id: p.player_id,
    killed_at: now(),
    lore_unlocked: '1',
  });
  checkWorldProgression(db);
  return `OK|BOSS_KILLED|${p.boss_id}|LORE_UNLOCKED|${bossRow.lore_text}`;
}

function getWorldState(db: Db) {
  return rowsToText(sheetToRows(db, 'WorldState'));
}

function getAllEquipment(db: Db) {
  return rowsToText(sheetToRows(db, 'Equipment'));
}

function getPlayerInventory(db: Db, playerId?: string) {
  if (!playerId) return 'ERROR|MISSING_PLAYER_ID';
  const rows = sheetToRows(db, 'PlayerInventory').filter((r) => r.player_id === String(playerId));
  return rowsToText(rows);
}

function addItem(db: Db, p: Params) {
  if (!p.player_id || !p.item_id) return 'ERROR|MISSING_FIELDS';
  const eqRow = sheetToRows(db, 'Equipment').find((r) => r.item_id === String(p.item_id));
  if (!eqRow) return 'ERROR|ITEM_NOT_FOUND';
  if (eqRow.is_hero_weapon === '1') {
    const existing = sheetToRows(db, 'PlayerInventory').filter((r) => r.item_id === String(p.item_id));
    if (existing.length >= parseInt(eqRow.max_quantity || '1')) return 'ERROR|HERO_WEAPON_LIMIT_REACHED';
  }
  const rowIdx = findRowIndexDouble(db, 'PlayerInventory', 'player_id', p.player_id, 'item_id', p.item_id);
  if (rowIdx !== -1 && eqRow.is_hero_weapon !== '1') {
    const row = getRowByIndex(db, 'PlayerInventory', rowIdx);
    if (!row) return 'ERROR|ITEM_NOT_IN_INVENTORY';
    const qty = parseInt(row.quantity || '0') + parseInt(p.quantity || '1');
    updateCell(db, 'PlayerInventory', rowIdx, 'quantity', String(qty));
    return `OK|ITEM_QUANTITY_UPDATED|${p.item_id}|${qty}`;
  }
  appendRow(db, 'PlayerInventory', {
    player_id: p.player_id,
    item_id: p.item_id,
    quantity: p.quantity || '1',
    raise_level: '0',
    ascension_form: 'base',
    obtained_at: now(),
  });
  return `OK|ITEM_ADDED|${p.item_id}`;
}

function removeItem(db: Db, p: Params) {
  if (!p.player_id || !p.item_id) return 'ERROR|MISSING_FIELDS';
  const rowIdx = findRowIndexDouble(db, 'PlayerInventory', 'player_id', p.player_id, 'item_id', p.item_id);
  if (rowIdx === -1) return 'ERROR|ITEM_NOT_IN_INVENTORY';
  const row = getRowByIndex(db, 'PlayerInventory', rowIdx);
  if (!row) return 'ERROR|ITEM_NOT_IN_INVENTORY';
  const qty = parseInt(row.quantity || '0') - parseInt(p.quantity || '1');
  if (qty <= 0) {
    deleteRow(db, 'PlayerInventory', rowIdx);
    return `OK|ITEM_REMOVED|${p.item_id}`;
  }
  updateCell(db, 'PlayerInventory', rowIdx, 'quantity', String(qty));
  return `OK|ITEM_QUANTITY_REDUCED|${p.item_id}|${qty}`;
}

function raiseItem(db: Db, p: Params) {
  if (!p.player_id || !p.item_id) return 'ERROR|MISSING_FIELDS';
  const rowIdx = findRowIndexDouble(db, 'PlayerInventory', 'player_id', p.player_id, 'item_id', p.item_id);
  if (rowIdx === -1) return 'ERROR|ITEM_NOT_IN_INVENTORY';
  const row = getRowByIndex(db, 'PlayerInventory', rowIdx);
  if (!row) return 'ERROR|ITEM_NOT_IN_INVENTORY';
  const currentRaise = parseInt(row.raise_level || '0');
  if (currentRaise >= 10) return 'ERROR|MAX_RAISE_LEVEL_REACHED';
  updateCell(db, 'PlayerInventory', rowIdx, 'raise_level', String(currentRaise + 1));
  return `OK|ITEM_RAISED|${p.item_id}|${currentRaise + 1}`;
}

function ascendItem(db: Db, p: Params) {
  if (!p.player_id || !p.item_id || !p.material_id) return 'ERROR|MISSING_FIELDS';
  const rowIdx = findRowIndexDouble(db, 'PlayerInventory', 'player_id', p.player_id, 'item_id', p.item_id);
  if (rowIdx === -1) return 'ERROR|ITEM_NOT_IN_INVENTORY';
  const matIdx = findRowIndexDouble(db, 'PlayerInventory', 'player_id', p.player_id, 'item_id', p.material_id);
  if (matIdx === -1) return 'ERROR|MATERIAL_NOT_IN_INVENTORY';
  const eqRow = sheetToRows(db, 'Equipment').find((r) => r.item_id === String(p.item_id));
  if (!eqRow) return 'ERROR|ITEM_DEF_NOT_FOUND';
  const newForm = p.target_form || 'ascended_1';
  updateCell(db, 'PlayerInventory', rowIdx, 'ascension_form', newForm);
  removeItem(db, { player_id: p.player_id, item_id: p.material_id, quantity: '1' });
  return `OK|ITEM_ASCENDED|${p.item_id}|${newForm}`;
}

function getAllTitles(db: Db) {
  return rowsToText(sheetToRows(db, 'Titles'));
}

function getPlayerTitles(db: Db, playerId?: string) {
  if (!playerId) return 'ERROR|MISSING_PLAYER_ID';
  const rows = sheetToRows(db, 'PlayerTitles').filter((r) => r.player_id === String(playerId));
  return rowsToText(rows);
}

function updateHolderTitle(db: Db, p: Params) {
  if (!p.player_id || !p.title_id) return 'ERROR|MISSING_FIELDS';
  const rowIdx = findRowIndex(db, 'HolderRecords', 'title_id', p.title_id);
  if (rowIdx === -1) {
    appendRow(db, 'HolderRecords', {
      title_id: p.title_id,
      player_id: p.player_id,
      stat_value: p.stat_value || '0',
      updated_at: now(),
    });
  } else {
    const existing = getRowByIndex(db, 'HolderRecords', rowIdx);
    if (existing && parseInt(p.stat_value || '0') > parseInt(existing.stat_value || '0')) {
      updateRowCells(db, 'HolderRecords', rowIdx, {
        player_id: p.player_id,
        stat_value: p.stat_value,
        updated_at: now(),
      });
    }
  }
  return `OK|HOLDER_UPDATED|${p.title_id}`;
}

function addTitle(db: Db, p: Params) {
  if (!p.player_id || !p.title_id) return 'ERROR|MISSING_FIELDS';
  const titleRow = sheetToRows(db, 'Titles').find((r) => r.title_id === String(p.title_id));
  if (!titleRow) return 'ERROR|TITLE_NOT_FOUND';
  if (findRowIndexDouble(db, 'PlayerTitles', 'player_id', p.player_id, 'title_id', p.title_id) !== -1) {
    return 'ERROR|TITLE_ALREADY_OWNED';
  }
  appendRow(db, 'PlayerTitles', {
    player_id: p.player_id,
    title_id: p.title_id,
    obtained_at: now(),
    source: p.source || 'unknown',
  });
  if (titleRow.title_type === 'holder') {
    updateHolderTitle(db, {
      player_id: p.player_id,
      title_id: p.title_id,
      stat_value: p.stat_value || '0',
    });
  }
  return `OK|TITLE_ADDED|${p.title_id}|${titleRow.title_name}`;
}

function getHiddenParams(db: Db, playerId?: string) {
  if (!playerId) return 'ERROR|MISSING_PLAYER_ID';
  const rows = sheetToRows(db, 'HiddenParams').filter((r) => r.player_id === String(playerId));
  return rowsToText(rows);
}

function updateHiddenParam(db: Db, p: Params) {
  if (!p.player_id || !p.param_name || !p.param_value) return 'ERROR|MISSING_FIELDS';
  const rowIdx = findRowIndexDouble(db, 'HiddenParams', 'player_id', p.player_id, 'param_name', p.param_name);
  if (rowIdx === -1) {
    appendRow(db, 'HiddenParams', {
      player_id: p.player_id,
      param_name: p.param_name,
      param_value: p.param_value,
      last_updated: now(),
    });
  } else {
    updateRowCells(db, 'HiddenParams', rowIdx, {
      param_value: p.param_value,
      last_updated: now(),
    });
  }
  return `OK|HIDDEN_PARAM_UPDATED|${p.param_name}|${p.param_value}`;
}

function updateKarma(db: Db, p: Params) {
  if (!p.player_id || !p.delta) return 'ERROR|MISSING_FIELDS';
  const rowIdx = findRowIndex(db, 'Players', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|PLAYER_NOT_FOUND';
  const row = getRowByIndex(db, 'Players', rowIdx);
  if (!row) return 'ERROR|PLAYER_NOT_FOUND';
  const karma = parseInt(row.karma || '0') + parseInt(p.delta);
  updateCell(db, 'Players', rowIdx, 'karma', String(karma));
  let status = 'neutral';
  if (karma >= 100) status = 'dark_accessible';
  if (karma >= 200) status = 'bounty_target';
  updateHiddenParam(db, {
    player_id: p.player_id,
    param_name: 'karma_status',
    param_value: status,
  });
  return `OK|KARMA_UPDATED|${karma}|${status}`;
}

function updateVorpalSoul(db: Db, p: Params) {
  if (!p.player_id || !p.delta) return 'ERROR|MISSING_FIELDS';
  const rowIdx = findRowIndex(db, 'Players', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|PLAYER_NOT_FOUND';
  const row = getRowByIndex(db, 'Players', rowIdx);
  if (!row) return 'ERROR|PLAYER_NOT_FOUND';
  let vs = parseInt(row.vorpal_soul || '0') + parseInt(p.delta);
  if (vs < 0) vs = 0;
  updateCell(db, 'Players', rowIdx, 'vorpal_soul', String(vs));
  if (vs >= 50) {
    updateHiddenParam(db, {
      player_id: p.player_id,
      param_name: 'vorpal_trust',
      param_value: 'unlocked',
    });
  }
  return `OK|VORPAL_SOUL_UPDATED|${vs}`;
}

function getArcanum(db: Db, playerId?: string) {
  if (!playerId) return 'ERROR|MISSING_PLAYER_ID';
  const rows = sheetToRows(db, 'Arcanum').filter((r) => r.player_id === String(playerId));
  return rowsToText(rows);
}

function setArcanum(db: Db, p: Params) {
  if (!p.player_id || !p.card_id) return 'ERROR|MISSING_FIELDS';
  const cardRow = sheetToRows(db, 'ArcanumCards').find((r) => r.card_id === String(p.card_id));
  if (!cardRow) return 'ERROR|ARCANUM_CARD_NOT_FOUND';
  const existing = findRowIndex(db, 'Arcanum', 'player_id', p.player_id);
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
    updateRowCells(db, 'Arcanum', existing, payload);
  } else {
    appendRow(db, 'Arcanum', { player_id: p.player_id, ...payload });
  }
  const playerRowIdx = findRowIndex(db, 'Players', 'player_id', p.player_id);
  if (playerRowIdx !== -1) {
    const playerRow = getRowByIndex(db, 'Players', playerRowIdx);
    if (playerRow && parseInt(playerRow.level || '0') >= 150) {
      const arcanumIdx = findRowIndex(db, 'Arcanum', 'player_id', p.player_id);
      if (arcanumIdx !== -1) updateCell(db, 'Arcanum', arcanumIdx, 'is_reverse', '1');
    }
  }
  return `OK|ARCANUM_SET|${p.card_id}|${cardRow.card_name}`;
}

function toggleArcanum(db: Db, p: Params) {
  if (!p.player_id) return 'ERROR|MISSING_PLAYER_ID';
  const rowIdx = findRowIndex(db, 'Arcanum', 'player_id', p.player_id);
  if (rowIdx === -1) return 'ERROR|ARCANUM_NOT_SET';
  const row = getRowByIndex(db, 'Arcanum', rowIdx);
  if (!row) return 'ERROR|ARCANUM_NOT_SET';
  if (row.is_controllable !== '1') return 'ERROR|ARCANUM_NOT_CONTROLLABLE';
  const newState = row.activated === '1' ? '0' : '1';
  updateCell(db, 'Arcanum', rowIdx, 'activated', newState);
  return `OK|ARCANUM_TOGGLED|${newState}`;
}

function getMoonCycle(db: Db) {
  const rows = sheetToRows(db, 'WorldState');
  const moonRow = rows.find((r) => r.key === 'moon_phase');
  const manaRow = rows.find((r) => r.key === 'mana_level');
  const phase = moonRow ? moonRow.value : 'full';
  const mana = manaRow ? manaRow.value : '100';
  return `HEADERS|moon_phase|mana_level\nROW|${phase}|${mana}`;
}

function advanceMoonCycle(db: Db, _p: Params) {
  const phases = [
    'new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous',
    'full', 'waning_gibbous', 'last_quarter', 'waning_crescent',
  ];
  const manaLevels: Record<string, string> = {
    new: '40', waxing_crescent: '55', first_quarter: '70', waxing_gibbous: '85',
    full: '120', waning_gibbous: '100', last_quarter: '75', waning_crescent: '55',
  };
  const rows = sheetToRows(db, 'WorldState');
  const moonRow = rows.find((r) => r.key === 'moon_phase');
  const currentPhase = moonRow ? moonRow.value : 'new';
  const idx = phases.indexOf(currentPhase);
  const nextPhase = phases[(idx + 1) % phases.length];
  setWorldState(db, { key: 'moon_phase', value: nextPhase });
  setWorldState(db, { key: 'mana_level', value: manaLevels[nextPhase] });
  return `OK|MOON_ADVANCED|${nextPhase}|MANA|${manaLevels[nextPhase]}`;
}

function npcPermadeath(db: Db, p: Params) {
  if (!p.npc_id || !p.scenario_id) return 'ERROR|MISSING_FIELDS';
  const rowIdx = findRowIndexDouble(db, 'NPCStatus', 'npc_id', p.npc_id, 'scenario_id', p.scenario_id);
  if (rowIdx === -1) {
    appendRow(db, 'NPCStatus', {
      npc_id: p.npc_id,
      scenario_id: p.scenario_id,
      is_dead: '1',
      killed_by: p.player_id || 'unknown',
      killed_at: now(),
      quest_closed: '1',
    });
  } else {
    updateRowCells(db, 'NPCStatus', rowIdx, {
      is_dead: '1',
      quest_closed: '1',
      killed_at: now(),
    });
  }
  return `OK|NPC_DEAD|${p.npc_id}|QUEST_CLOSED`;
}

function getWorldMap(db: Db) {
  return rowsToText(sheetToRows(db, 'MapObjects'));
}

function saveWorldMap(db: Db, p: Params) {
  const text = p.objects_text || '';
  clearSheetData(db, 'MapObjects');
  if (!text.trim()) return 'OK|WORLD_MAP_CLEARED';

  const headers = getHeaders('MapObjects');
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
    appendRow(db, 'MapObjects', rowData);
  }
  markSheetFullSync(db, 'MapObjects');
  return `OK|WORLD_MAP_SAVED|${lines.length}`;
}

function getPlayerQuests(db: Db, playerId?: string) {
  if (!playerId) return 'ERROR|MISSING_PLAYER_ID';
  const rows = sheetToRows(db, 'PlayerQuests').filter((r) => r.player_id === String(playerId));
  return rowsToText(rows);
}

function getDialogue(db: Db, dialogueId?: string) {
  if (!dialogueId) return 'ERROR|MISSING_DIALOGUE_ID';
  const found = sheetToRows(db, 'Dialogue').find((r) => r.dialogue_id === String(dialogueId));
  return found ? singleRowToText(found) : 'ERROR|DIALOGUE_NOT_FOUND';
}

function updateQuestProgress(db: Db, p: Params) {
  if (!p.player_id || !p.quest_id) return 'ERROR|MISSING_FIELDS';
  const rowIdx = findRowIndexDouble(db, 'PlayerQuests', 'player_id', p.player_id, 'quest_id', p.quest_id);
  if (rowIdx === -1) {
    appendRow(db, 'PlayerQuests', {
      player_id: p.player_id,
      quest_id: p.quest_id,
      status: 'active',
      progress: p.progress || '0',
      updated_at: now(),
    });
    return `OK|QUEST_STARTED|${p.quest_id}`;
  }
  updateRowCells(db, 'PlayerQuests', rowIdx, {
    progress: p.progress,
    status: p.status || 'active',
    updated_at: now(),
  });
  return `OK|QUEST_PROGRESS_UPDATED|${p.quest_id}`;
}

export function routeGet(db: Db, action: string, p: Params): string {
  switch (action) {
    case 'get_player': return getPlayer(db, p.player_id);
    case 'get_player_jobs': return getPlayerJobs(db, p.player_id);
    case 'get_player_skills': return getPlayerSkills(db, p.player_id);
    case 'get_player_inventory': return getPlayerInventory(db, p.player_id);
    case 'get_player_titles': return getPlayerTitles(db, p.player_id);
    case 'get_hidden_params': return getHiddenParams(db, p.player_id);
    case 'get_arcanum': return getArcanum(db, p.player_id);
    case 'get_all_jobs': return getAllJobs(db);
    case 'get_job': return getJobById(db, p.job_id);
    case 'get_all_skills': return getAllSkills(db);
    case 'get_skills_by_job': return getSkillsByJob(db, p.job_id);
    case 'get_boss': return getBoss(db, p.boss_id);
    case 'get_all_bosses': return getAllBosses(db);
    case 'get_world_state': return getWorldState(db);
    case 'get_all_equipment': return getAllEquipment(db);
    case 'get_all_titles': return getAllTitles(db);
    case 'get_moon_cycle': return getMoonCycle(db);
    case 'get_world_map': return getWorldMap(db);
    case 'get_all_monsters': return rowsToText(sheetToRows(db, 'Monsters'));
    case 'get_all_npcs': return rowsToText(sheetToRows(db, 'NPCs'));
    case 'get_all_quests': return rowsToText(sheetToRows(db, 'Quests'));
    case 'get_all_spawners': return rowsToText(sheetToRows(db, 'Spawners'));
    case 'get_player_quests': return getPlayerQuests(db, p.player_id);
    case 'get_dialogue': return getDialogue(db, p.dialogue_id);
    default: return 'ERROR|UNKNOWN_GET_ACTION';
  }
}

export function routePost(db: Db, action: string, p: Params): string {
  switch (action) {
    case 'create_player': return createPlayer(db, p);
    case 'update_player_stats': return updatePlayerStats(db, p);
    case 'add_exp': return addExp(db, p);
    case 'add_money': return addMoney(db, p);
    case 'cap_breakthrough': return capBreakthrough(db, p);
    case 'set_main_job': return setMainJob(db, p);
    case 'set_sub_job': return setSubJob(db, p);
    case 'unlock_job': return unlockJob(db, p);
    case 'unlock_skill': return unlockSkill(db, p);
    case 'allocate_stat': return allocateStat(db, p);
    case 'set_skill_loadout': return setSkillLoadout(db, p);
    case 'use_skill_scroll': return useSkillScroll(db, p);
    case 'promote_job': return promoteJob(db, p);
    case 'evolve_skill': return evolveSkill(db, p);
    case 'link_skill_combo': return linkSkillCombo(db, p);
    case 'kill_boss': return killBoss(db, p);
    case 'add_item': return addItem(db, p);
    case 'remove_item': return removeItem(db, p);
    case 'raise_item': return raiseItem(db, p);
    case 'ascend_item': return ascendItem(db, p);
    case 'add_title': return addTitle(db, p);
    case 'update_hidden_param': return updateHiddenParam(db, p);
    case 'set_arcanum': return setArcanum(db, p);
    case 'toggle_arcanum': return toggleArcanum(db, p);
    case 'update_karma': return updateKarma(db, p);
    case 'update_vorpal_soul': return updateVorpalSoul(db, p);
    case 'set_world_state': return setWorldState(db, p);
    case 'advance_moon_cycle': return advanceMoonCycle(db, p);
    case 'npc_permadeath': return npcPermadeath(db, p);
    case 'update_holder_title': return updateHolderTitle(db, p);
    case 'save_world_map': return saveWorldMap(db, p);
    case 'upsert_monster': return upsertRow(db, 'Monsters', 'monster_id', p);
    case 'upsert_npc': return upsertRow(db, 'NPCs', 'npc_id', p);
    case 'upsert_quest': return upsertRow(db, 'Quests', 'quest_id', p);
    case 'upsert_spawner': return upsertRow(db, 'Spawners', 'spawner_id', p);
    case 'update_quest_progress': return updateQuestProgress(db, p);
    default: return 'ERROR|UNKNOWN_POST_ACTION';
  }
}

export function queryToParams(c: Context): Params {
  const q = c.req.query() as Record<string, string>;
  const p: Params = {};
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined) p[k] = String(v);
  }
  return p;
}

export async function parseBodyParams(c: Context): Promise<Params> {
  const contentType = c.req.header('content-type') || '';
  const raw = await c.req.text();
  const p: Params = {};
  if (!raw) return p;

  if (contentType.includes('application/json')) {
    try {
      const json = JSON.parse(raw) as Record<string, unknown>;
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
