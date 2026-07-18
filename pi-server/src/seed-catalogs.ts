import 'dotenv/config';
import path from 'node:path';
import { appendRow, deleteRow, findRowIndex, openDb, upsertRow, type Db } from './db.js';
import type { Params } from './schema.js';

/**
 * Seed starter catalog rows when tables are empty.
 * MapObjects / Monsters / NPCs / Dialogue upsert so Star Town refreshes on redeploy.
 */

const JOBS: Params[] = [
  { job_id: 'JOB_001', job_name: 'Warrior', tier: 'low', parent_job_id: '', branch: 'base_warrior', is_hidden: '0', unlock_condition: '', stat_bonus: 'atk+10,def+5', description: 'นักรบเริ่มต้น' },
  { job_id: 'JOB_002', job_name: 'Archer', tier: 'low', parent_job_id: '', branch: 'base_archer', is_hidden: '0', unlock_condition: '', stat_bonus: 'spd+10,atk+5', description: 'นักธนูเริ่มต้น' },
  { job_id: 'JOB_003', job_name: 'Twin-Blade', tier: 'low', parent_job_id: '', branch: 'base_assassin', is_hidden: '0', unlock_condition: '', stat_bonus: 'spd+15,atk+3', description: 'นักดาบคู่ผู้รวดเร็ว' },
  { job_id: 'JOB_004', job_name: 'Spearman', tier: 'low', parent_job_id: '', branch: 'base_spear', is_hidden: '0', unlock_condition: '', stat_bonus: 'atk+7,def+8', description: 'พลหอกระยะกลาง' },
  { job_id: 'JOB_005', job_name: 'Supporter', tier: 'low', parent_job_id: '', branch: 'base_support', is_hidden: '0', unlock_condition: '', stat_bonus: 'mp+30,def+5', description: 'สายสนับสนุนทีม' },
  { job_id: 'JOB_006', job_name: 'Knight', tier: 'high', parent_job_id: 'JOB_001', branch: 'tank', is_hidden: '0', unlock_condition: '', stat_bonus: 'def+20,hp+50', description: 'อัศวินนักป้องกัน' },
  { job_id: 'JOB_007', job_name: 'Berserker', tier: 'high', parent_job_id: 'JOB_001', branch: 'dps', is_hidden: '0', unlock_condition: '', stat_bonus: 'atk+30,def-10', description: 'นักรบคลั่ง' },
  { job_id: 'JOB_008', job_name: 'Mage', tier: 'low', parent_job_id: '', branch: 'base_mage', is_hidden: '0', unlock_condition: '', stat_bonus: 'mp+20,atk+5', description: 'นักเวทย์เริ่มต้น' },
];

const SKILLS: Params[] = [
  { skill_id: 'SKL_001', skill_name: 'Slash', job_id: 'JOB_001', tier: '1', parent_skill_id: '', evolution_branches: 'power,speed', is_locked_by: '', description: 'ฟันด้วยดาบ' },
  { skill_id: 'SKL_002', skill_name: 'Heavy Blow', job_id: 'JOB_001', tier: '2', parent_skill_id: 'SKL_001', evolution_branches: 'crush,stun', is_locked_by: '', description: 'ฟันหนักทำให้มึนงง' },
  { skill_id: 'SKL_003', skill_name: 'Blade Storm', job_id: 'JOB_001', tier: '3', parent_skill_id: 'SKL_002', evolution_branches: 'wide,single', is_locked_by: 'SKL_004', description: 'พายุดาบ - เลือก wide หรือ single target' },
  { skill_id: 'SKL_004', skill_name: 'Double Shot', job_id: 'JOB_002', tier: '1', parent_skill_id: '', evolution_branches: '', is_locked_by: '', description: 'ยิงธนูสองดอก' },
  { skill_id: 'SKL_005', skill_name: 'Arcane Bolt', job_id: 'JOB_008', tier: '1', parent_skill_id: '', evolution_branches: 'rapid,heavy', is_locked_by: '', description: 'ลูกศรเวทย์' },
  { skill_id: 'SKL_006', skill_name: 'Quick Step', job_id: 'JOB_003', tier: '1', parent_skill_id: '', evolution_branches: '', is_locked_by: '', description: 'ก้าวหลบเร็ว' },
  { skill_id: 'SKL_007', skill_name: 'Pierce', job_id: 'JOB_004', tier: '1', parent_skill_id: '', evolution_branches: '', is_locked_by: '', description: 'แทงทะลุ' },
  { skill_id: 'SKL_008', skill_name: 'Heal', job_id: 'JOB_005', tier: '1', parent_skill_id: '', evolution_branches: '', is_locked_by: '', description: 'รักษา HP' },
];

const EQUIPMENT: Params[] = [
  { item_id: 'EQ_001', item_name: 'Rusty Sword', item_type: 'weapon', rarity: 'common', tier: '1', base_stats: 'atk+5', is_hero_weapon: '0', is_legacy: '0', max_quantity: '1', ascension_table: '', description: 'ดาบสนิมสำหรับมือใหม่' },
  { item_id: 'EQ_002', item_name: 'Wooden Bow', item_type: 'weapon', rarity: 'common', tier: '1', base_stats: 'atk+4,spd+2', is_hero_weapon: '0', is_legacy: '0', max_quantity: '1', ascension_table: '', description: 'ธนูไม้เบา' },
  { item_id: 'EQ_003', item_name: 'Cloth Tunic', item_type: 'armor', rarity: 'common', tier: '1', base_stats: 'def+3,hp+10', is_hero_weapon: '0', is_legacy: '0', max_quantity: '1', ascension_table: '', description: 'เสื้อผ้านุ่ม' },
  { item_id: 'EQ_004', item_name: 'Health Potion', item_type: 'consumable', rarity: 'common', tier: '1', base_stats: 'heal+50', is_hero_weapon: '0', is_legacy: '0', max_quantity: '99', ascension_table: '', description: 'ฟื้น HP เล็กน้อย' },
];

const TITLES: Params[] = [
  { title_id: 'TTL_001', title_name: 'Attack Holder', title_type: 'holder', effect: 'atk_bonus+20%_to_all_attacks', condition: 'highest_atk_in_server', description: 'ผู้มีพลังโจมตีสูงสุดในเซิร์ฟเวอร์' },
  { title_id: 'TTL_002', title_name: 'Cursed by Lycagon', title_type: 'environmental', effect: 'monsters_below_50_flee', condition: 'survive_lycagon_curse_attack', description: 'รอยคำสาปของ Lycagon' },
  { title_id: 'TTL_003', title_name: 'Colossi Slayer', title_type: 'achievement', effect: 'all_boss_dmg+15%', condition: 'kill_all_seven_colossi', description: 'ผู้กำจัดสัตว์ประหลาดทั้งเจ็ด' },
  { title_id: 'TTL_004', title_name: 'Vorpal Champion', title_type: 'hidden', effect: 'vorpal_race_trust_max', condition: 'vorpal_soul>=100', description: 'ผู้ที่ได้รับความไว้วางใจจากเผ่า Vorpal' },
];

const ARCANUM_CARDS: Params[] = [
  { card_id: 'ARC_001', card_name: 'The Tower', positive_effect: 'atk+100%', negative_effect: 'def-50%', description: 'ไพ่หอคอย พลังโจมตีพุ่ง แต่รับดาเมจมากขึ้น' },
  { card_id: 'ARC_002', card_name: 'The Moon', positive_effect: 'mp+200%', negative_effect: 'vision_range-30%', description: 'ไพ่จันทรา มานาล้นเหลือ แต่สายตาสั้นลง' },
  { card_id: 'ARC_003', card_name: 'The Star', positive_effect: 'all_regen+50%', negative_effect: 'max_hp-30%', description: 'ไพ่ดาว ฟื้นฟูเร็วขึ้น แต่ HP สูงสุดลดลง' },
  { card_id: 'ARC_004', card_name: 'Death', positive_effect: 'instant_kill_chance+5%', negative_effect: 'can_be_oneshot=true', description: 'ไพ่มัจจุราช โอกาสสังหารทันที แต่ตัวเองก็โดนได้' },
];

const WORLD_BOSSES: Params[] = [
  { boss_id: 'BOSS_001', boss_name: 'Lycagon the Cursed', colossus_rank: '1', is_alive: '1', required_scenario_key: 'SCENARIO_LYCAGON', killer_player_id: '', killed_at: '', lore_unlocked: '0', lore_text: 'Lycagon คือจอมอสูรผู้สาปแช่งดินแดนตะวันตก...' },
  { boss_id: 'BOSS_002', boss_name: 'Thalvros of the Deep', colossus_rank: '2', is_alive: '1', required_scenario_key: 'SCENARIO_THALVROS', killer_player_id: '', killed_at: '', lore_unlocked: '0', lore_text: 'Thalvros หลับใหลอยู่ใต้มหาสมุทร...' },
  { boss_id: 'BOSS_003', boss_name: 'The Iron Colossus', colossus_rank: '3', is_alive: '1', required_scenario_key: 'SCENARIO_IRON', killer_player_id: '', killed_at: '', lore_unlocked: '0', lore_text: 'หุ่นยักษ์จากยุค Magitek...' },
  { boss_id: 'BOSS_004', boss_name: 'Wraithweave', colossus_rank: '4', is_alive: '1', required_scenario_key: 'SCENARIO_WRAITH', killer_player_id: '', killed_at: '', lore_unlocked: '0', lore_text: 'ผ้าแห่งเงามืด...' },
  { boss_id: 'BOSS_005', boss_name: 'Ashenveil', colossus_rank: '5', is_alive: '1', required_scenario_key: 'SCENARIO_ASH', killer_player_id: '', killed_at: '', lore_unlocked: '0', lore_text: 'เถ้าถ่านแห่งการทำลายล้าง...' },
  { boss_id: 'BOSS_006', boss_name: 'Chronolith', colossus_rank: '6', is_alive: '1', required_scenario_key: 'SCENARIO_CHRONO', killer_player_id: '', killed_at: '', lore_unlocked: '0', lore_text: 'เสาหินที่บิดเบือนกาลเวลา...' },
  { boss_id: 'BOSS_007', boss_name: 'Nullborn', colossus_rank: '7', is_alive: '1', required_scenario_key: 'SCENARIO_NULL', killer_player_id: '', killed_at: '', lore_unlocked: '0', lore_text: 'สิ่งที่เกิดจากความว่างเปล่า...' },
];

const MONSTERS: Params[] = [
  {
    monster_id: 'MON_001',
    name: 'Slime',
    hp: '40',
    atk: '6',
    def: '1',
    spd: '6',
    skills: '',
    drops: 'EQ_004',
    appearance: '#22c55e|ghost',
  },
  {
    monster_id: 'MON_002',
    name: 'Forest Wolf',
    hp: '70',
    atk: '12',
    def: '4',
    spd: '14',
    skills: '',
    drops: 'EQ_001',
    appearance: '#a3a3a3|skull',
  },
  {
    monster_id: 'MON_003',
    name: 'Fluff Rabbit',
    hp: '28',
    atk: '4',
    def: '1',
    spd: '14',
    skills: '',
    drops: 'EQ_004',
    appearance: '#fda4af|bunny',
  },
  {
    monster_id: 'MON_004',
    name: 'Sleepy Sloth',
    hp: '55',
    atk: '7',
    def: '3',
    spd: '4',
    skills: '',
    drops: 'EQ_004',
    appearance: '#a8a29e|sloth',
  },
];

const DIALOGUE: Params[] = [
  {
    dialogue_id: 'DLG_STELLA_1',
    text: 'Welcome to Star Town! Softcloud Inn for rest, Star Mart for potions, Star Spring to heal. Cute critters hop in Whisperwood Forest past the east gate.',
    options_json: '[]',
  },
];

const NPCS: Params[] = [
  {
    npc_id: 'NPC_STELLA',
    name: 'Stella',
    appearance: '#fbbf24|star',
    initial_dialogue_id: 'DLG_STELLA_1',
    quest_id: '',
    is_merchant: '0',
    is_trader: '0',
    trade_items: '',
  },
  {
    npc_id: 'NPC_MART',
    name: 'Miri the Merchant',
    appearance: '#34d399|heart',
    initial_dialogue_id: '',
    quest_id: '',
    is_merchant: '1',
    is_trader: '0',
    trade_items: 'EQ_004',
  },
];

const STAR_TOWN_MAP: Params[] = [
  {
    id: 'town_start',
    type: 'town',
    x: '400',
    y: '300',
    z: '0',
    name: 'Star Town',
    radius: '180',
    params: 'shape=rect;w=360;h=320;safe=1',
  },
  {
    id: 'npc_stella',
    type: 'npc',
    x: '400',
    y: '270',
    z: '0',
    name: 'Stella',
    radius: '28',
    params:
      'interact=talk;entity_id=NPC_STELLA;color=#fbbf24;face=star;line=Hi! This is Star Town — our first city. Rest at Softcloud Inn, shop at Star Mart, heal at the spring. Cute friends live in the forest east of town!',
  },
  {
    id: 'star_mart',
    type: 'market',
    x: '300',
    y: '230',
    z: '0',
    name: 'Star Mart',
    radius: '36',
    params: 'interact=shop;price=25;item_id=EQ_004;color=#34d399',
  },
  {
    id: 'star_inn',
    type: 'hotel',
    x: '500',
    y: '230',
    z: '0',
    name: 'Softcloud Inn',
    radius: '36',
    params: 'interact=rest;price=10;color=#60a5fa',
  },
  {
    id: 'star_heal',
    type: 'landmark',
    x: '300',
    y: '370',
    z: '0',
    name: 'Star Spring',
    radius: '34',
    params: 'interact=heal;kind=heal;color=#2dd4bf',
  },
  {
    id: 'star_golf',
    type: 'landmark',
    x: '510',
    y: '380',
    z: '0',
    name: 'Star Golf',
    radius: '40',
    params: 'interact=golf;kind=golf;color=#86efac',
  },
  {
    id: 'whisperwood',
    type: 'forest',
    x: '760',
    y: '320',
    z: '0',
    name: 'Whisperwood Forest',
    radius: '220',
    params: '',
  },
  {
    id: 'forest_rabbit_1',
    type: 'monster',
    x: '700',
    y: '260',
    z: '0',
    name: 'Fluff Rabbit',
    radius: '30',
    params: 'entity_id=MON_003',
  },
  {
    id: 'forest_rabbit_2',
    type: 'monster',
    x: '760',
    y: '380',
    z: '0',
    name: 'Fluff Rabbit',
    radius: '30',
    params: 'entity_id=MON_003',
  },
  {
    id: 'forest_bunny_3',
    type: 'monster',
    x: '680',
    y: '340',
    z: '0',
    name: 'Fluff Rabbit',
    radius: '30',
    params: 'entity_id=MON_003',
  },
  {
    id: 'forest_sloth_1',
    type: 'monster',
    x: '820',
    y: '300',
    z: '0',
    name: 'Sleepy Sloth',
    radius: '34',
    params: 'entity_id=MON_004',
  },
];

type Catalog = { sheet: string; pk: string; rows: Params[]; mode: 'insert' | 'upsert' };

const CATALOGS: Catalog[] = [
  { sheet: 'Jobs', pk: 'job_id', rows: JOBS, mode: 'insert' },
  { sheet: 'Skills', pk: 'skill_id', rows: SKILLS, mode: 'insert' },
  { sheet: 'Equipment', pk: 'item_id', rows: EQUIPMENT, mode: 'insert' },
  { sheet: 'Titles', pk: 'title_id', rows: TITLES, mode: 'insert' },
  { sheet: 'ArcanumCards', pk: 'card_id', rows: ARCANUM_CARDS, mode: 'insert' },
  { sheet: 'WorldBoss', pk: 'boss_id', rows: WORLD_BOSSES, mode: 'insert' },
  { sheet: 'Monsters', pk: 'monster_id', rows: MONSTERS, mode: 'upsert' },
  { sheet: 'Dialogue', pk: 'dialogue_id', rows: DIALOGUE, mode: 'upsert' },
  { sheet: 'NPCs', pk: 'npc_id', rows: NPCS, mode: 'upsert' },
  { sheet: 'MapObjects', pk: 'id', rows: STAR_TOWN_MAP, mode: 'upsert' },
];

function seedSheetInsert(db: Db, sheet: string, pk: string, rows: Params[]): { inserted: number; skipped: number } {
  let inserted = 0;
  let skipped = 0;
  for (const row of rows) {
    const key = row[pk];
    if (!key) continue;
    if (findRowIndex(db, sheet, pk, key) !== -1) {
      skipped += 1;
      continue;
    }
    appendRow(db, sheet, row);
    inserted += 1;
  }
  return { inserted, skipped };
}

function seedSheetUpsert(db: Db, sheet: string, pk: string, rows: Params[]): { inserted: number; updated: number } {
  let inserted = 0;
  let updated = 0;
  for (const row of rows) {
    const key = row[pk];
    if (!key) continue;
    const existed = findRowIndex(db, sheet, pk, key) !== -1;
    upsertRow(db, sheet, pk, row);
    if (existed) updated += 1;
    else inserted += 1;
  }
  return { inserted, updated };
}

function main() {
  const dataDir = path.resolve(process.env.DATA_DIR || './data');
  const db = openDb(dataDir);
  console.log(`Seeding catalogs into ${dataDir}/zenith.db …`);
  for (const cat of CATALOGS) {
    if (cat.mode === 'upsert') {
      const { inserted, updated } = seedSheetUpsert(db, cat.sheet, cat.pk, cat.rows);
      console.log(`  ${cat.sheet}: +${inserted} inserted, ~${updated} upserted`);
    } else {
      const { inserted, skipped } = seedSheetInsert(db, cat.sheet, cat.pk, cat.rows);
      console.log(`  ${cat.sheet}: +${inserted} inserted, ${skipped} already present`);
    }
  }
  const oldSlime = findRowIndex(db, 'MapObjects', 'id', 'spawn_slime_1');
  if (oldSlime !== -1) {
    deleteRow(db, 'MapObjects', oldSlime);
    console.log('  MapObjects: removed legacy spawn_slime_1');
  }
  console.log('Done. Star Town is ready.');
  db.close();
}

main();
