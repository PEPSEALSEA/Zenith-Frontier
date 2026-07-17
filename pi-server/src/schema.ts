export type Params = Record<string, string>;
export type Row = Record<string, string>;

export const SHEET_HEADERS: Record<string, string[]> = {
  Players: [
    'player_id', 'name', 'level', 'exp', 'stored_exp',
    'main_job_id', 'sub_job_id', 'karma', 'vorpal_soul', 'arcanum_id',
    'hp', 'mp', 'atk', 'def', 'spd', 'money', 'appearance', 'created_at',
  ],
  Jobs: [
    'job_id', 'job_name', 'tier', 'parent_job_id', 'branch',
    'is_hidden', 'unlock_condition', 'stat_bonus', 'description',
  ],
  PlayerJobs: ['player_id', 'job_id', 'unlocked_at'],
  Skills: [
    'skill_id', 'skill_name', 'job_id', 'tier', 'parent_skill_id',
    'evolution_branches', 'is_locked_by', 'description',
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

export const SHEET_PRIMARY_KEYS: Record<string, string[]> = {
  Players: ['player_id'],
  Jobs: ['job_id'],
  PlayerJobs: ['player_id', 'job_id'],
  Skills: ['skill_id'],
  PlayerSkills: ['player_id', 'skill_id'],
  SkillCombos: ['player_id', 'combo_name'],
  Equipment: ['item_id'],
  PlayerInventory: ['player_id', 'item_id'],
  WorldBoss: ['boss_id'],
  Titles: ['title_id'],
  PlayerTitles: ['player_id', 'title_id'],
  HolderRecords: ['title_id'],
  HiddenParams: ['player_id', 'param_name'],
  Arcanum: ['player_id'],
  ArcanumCards: ['card_id'],
  WorldState: ['key'],
  NPCStatus: ['npc_id', 'scenario_id'],
  MapObjects: ['id'],
  Monsters: ['monster_id'],
  Quests: ['quest_id'],
  NPCs: ['npc_id'],
  Dialogue: ['dialogue_id'],
  Spawners: ['spawner_id'],
  PlayerQuests: ['player_id', 'quest_id'],
};

export const SHEET_NAMES = Object.keys(SHEET_HEADERS);

export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export function pkJson(sheetName: string, row: Params): string {
  const keys = SHEET_PRIMARY_KEYS[sheetName];
  if (!keys) throw new Error(`Unknown sheet: ${sheetName}`);
  const obj: Record<string, string> = {};
  for (const k of keys) {
    obj[k] = row[k] ?? '';
  }
  return JSON.stringify(obj);
}
