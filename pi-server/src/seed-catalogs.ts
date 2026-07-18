import 'dotenv/config';
import path from 'node:path';
import { appendRow, deleteRow, findRowIndex, openDb, upsertRow, type Db } from './db.js';
import type { Params } from './schema.js';

/**
 * Seed starter catalog rows when tables are empty.
 * Jobs / Skills / Equipment upsert so class-system fields refresh on redeploy.
 * MapObjects / Monsters / NPCs / Dialogue upsert so Star Town refreshes on redeploy.
 */

function atk(
  style: string,
  light_mult: number,
  hard_mult: number,
  light_range: number,
  hard_range: number,
  light_cd: number,
  hard_cd: number,
  hits = 1,
  mp_cost_hard = 0,
  mp_cost_light = 0,
): string {
  return JSON.stringify({
    style, light_mult, hard_mult, light_range, hard_range, light_cd, hard_cd, hits, mp_cost_hard, mp_cost_light,
  });
}

function skl(p: Params): Params {
  return {
    parent_skill_id: '',
    evolution_branches: '',
    is_locked_by: '',
    unlock_type: 'starter',
    unlock_value: '',
    skill_type: 'damage',
    mp_cost: '10',
    cooldown_ms: '2000',
    power: '1.5',
    range: '80',
    effect: '',
    ...p,
  };
}

const JOBS: Params[] = [
  {
    job_id: 'JOB_001', job_name: 'Warrior', tier: 'low', parent_job_id: '', branch: 'base_warrior',
    is_hidden: '0', unlock_condition: '', stat_bonus: 'atk+10,def+5', description: 'นักรบเริ่มต้น',
    potential: 'str:80,dex:40,int:20,vit:70,luk:30',
    attack_profile: atk('slash', 1.0, 1.7, 72, 90, 300, 600, 1, 0),
  },
  {
    job_id: 'JOB_002', job_name: 'Archer', tier: 'low', parent_job_id: '', branch: 'base_archer',
    is_hidden: '0', unlock_condition: '', stat_bonus: 'spd+10,atk+5', description: 'นักธนูเริ่มต้น',
    potential: 'str:45,dex:85,int:25,vit:40,luk:45',
    attack_profile: atk('shot', 0.9, 1.5, 160, 200, 320, 700, 1, 0),
  },
  {
    job_id: 'JOB_003', job_name: 'Twin-Blade', tier: 'low', parent_job_id: '', branch: 'base_assassin',
    is_hidden: '0', unlock_condition: '', stat_bonus: 'spd+15,atk+3', description: 'นักดาบคู่ผู้รวดเร็ว',
    potential: 'str:55,dex:90,int:20,vit:35,luk:50',
    attack_profile: atk('twin', 0.7, 1.3, 60, 75, 180, 450, 2, 0),
  },
  {
    job_id: 'JOB_004', job_name: 'Spearman', tier: 'low', parent_job_id: '', branch: 'base_spear',
    is_hidden: '0', unlock_condition: '', stat_bonus: 'atk+7,def+8', description: 'พลหอกระยะกลาง',
    potential: 'str:65,dex:55,int:20,vit:65,luk:35',
    attack_profile: atk('thrust', 1.0, 1.55, 100, 130, 320, 620, 1, 0),
  },
  {
    job_id: 'JOB_005', job_name: 'Supporter', tier: 'low', parent_job_id: '', branch: 'base_support',
    is_hidden: '0', unlock_condition: '', stat_bonus: 'mp+30,def+5', description: 'สายสนับสนุนทีม',
    potential: 'str:25,dex:40,int:75,vit:60,luk:40',
    attack_profile: atk('staff', 0.6, 1.1, 65, 85, 350, 650, 1, 0),
  },
  {
    job_id: 'JOB_006', job_name: 'Knight', tier: 'high', parent_job_id: 'JOB_001', branch: 'tank',
    is_hidden: '0', unlock_condition: 'level:20,mastery:5',
    stat_bonus: 'def+20,hp+50', description: 'อัศวินนักป้องกัน',
    potential: 'str:60,dex:35,int:25,vit:95,luk:25',
    attack_profile: atk('bash', 0.85, 1.4, 70, 85, 350, 700, 1, 0),
  },
  {
    job_id: 'JOB_007', job_name: 'Berserker', tier: 'high', parent_job_id: 'JOB_001', branch: 'dps',
    is_hidden: '0', unlock_condition: 'level:20,mastery:5',
    stat_bonus: 'atk+30,def-10', description: 'นักรบคลั่ง',
    potential: 'str:95,dex:50,int:15,vit:55,luk:35',
    attack_profile: atk('frenzy', 1.15, 2.0, 75, 95, 280, 800, 1, 0),
  },
  {
    job_id: 'JOB_008', job_name: 'Mage', tier: 'low', parent_job_id: '', branch: 'base_mage',
    is_hidden: '0', unlock_condition: '', stat_bonus: 'mp+20,atk+5', description: 'นักเวทย์เริ่มต้น',
    potential: 'str:20,dex:35,int:90,vit:40,luk:40',
    attack_profile: atk('bolt', 0.95, 1.65, 140, 180, 340, 750, 1, 8, 2),
  },
  {
    job_id: 'JOB_009', job_name: 'Ranger', tier: 'high', parent_job_id: 'JOB_002', branch: 'scout',
    is_hidden: '0', unlock_condition: 'level:20,mastery:5',
    stat_bonus: 'spd+20,atk+10', description: 'นักล่าที่คล่องตัว ยิงเร็วหลายดอก',
    potential: 'str:50,dex:95,int:30,vit:45,luk:55',
    attack_profile: atk('volley', 0.75, 1.35, 170, 210, 260, 620, 3, 0),
  },
  {
    job_id: 'JOB_010', job_name: 'Sniper', tier: 'high', parent_job_id: 'JOB_002', branch: 'marksman',
    is_hidden: '0', unlock_condition: 'level:20,mastery:5',
    stat_bonus: 'atk+18,spd+5', description: 'มือปืนระยะไกล พลังต่อนัดสูง',
    potential: 'str:40,dex:100,int:35,vit:35,luk:50',
    attack_profile: atk('pierce_shot', 1.1, 2.2, 220, 280, 450, 1100, 1, 0),
  },
  {
    job_id: 'JOB_011', job_name: 'Assassin', tier: 'high', parent_job_id: 'JOB_003', branch: 'shadow',
    is_hidden: '0', unlock_condition: 'level:20,mastery:5',
    stat_bonus: 'spd+25,atk+12', description: 'เงามืด สังหารจากจุดบอด',
    potential: 'str:50,dex:100,int:25,vit:30,luk:70',
    attack_profile: atk('shadow', 0.65, 1.9, 55, 70, 150, 500, 2, 0),
  },
  {
    job_id: 'JOB_012', job_name: 'Duelist', tier: 'high', parent_job_id: 'JOB_003', branch: 'blade',
    is_hidden: '0', unlock_condition: 'level:20,mastery:5',
    stat_bonus: 'atk+16,spd+10', description: 'นักดาบเดี่ยว แม่นและฉับไว',
    potential: 'str:70,dex:85,int:20,vit:45,luk:45',
    attack_profile: atk('riposte', 0.9, 1.75, 68, 82, 200, 520, 2, 0),
  },
  {
    job_id: 'JOB_013', job_name: 'Lancer', tier: 'high', parent_job_id: 'JOB_004', branch: 'charge',
    is_hidden: '0', unlock_condition: 'level:20,mastery:5',
    stat_bonus: 'atk+22,spd+8', description: 'พลหอกพุ่งทะลุแนว',
    potential: 'str:80,dex:60,int:20,vit:55,luk:40',
    attack_profile: atk('charge', 1.05, 1.9, 120, 160, 300, 750, 1, 0),
  },
  {
    job_id: 'JOB_014', job_name: 'Vanguard', tier: 'high', parent_job_id: 'JOB_004', branch: 'phalanx',
    is_hidden: '0', unlock_condition: 'level:20,mastery:5',
    stat_bonus: 'def+18,hp+40', description: 'แนวหน้าหอกตั้งรับ',
    potential: 'str:55,dex:45,int:25,vit:90,luk:30',
    attack_profile: atk('phalanx', 0.9, 1.45, 95, 120, 340, 680, 1, 0),
  },
  {
    job_id: 'JOB_015', job_name: 'Priest', tier: 'high', parent_job_id: 'JOB_005', branch: 'holy',
    is_hidden: '0', unlock_condition: 'level:20,mastery:5',
    stat_bonus: 'mp+50,def+10', description: 'นักบวชผู้รักษา',
    potential: 'str:20,dex:35,int:85,vit:75,luk:45',
    attack_profile: atk('holy', 0.55, 1.0, 70, 95, 360, 700, 1, 5, 2),
  },
  {
    job_id: 'JOB_016', job_name: 'Bard', tier: 'high', parent_job_id: 'JOB_005', branch: 'song',
    is_hidden: '0', unlock_condition: 'level:20,mastery:5',
    stat_bonus: 'mp+35,spd+10', description: 'นักเพลงเสริมพลังทีม',
    potential: 'str:25,dex:55,int:80,vit:50,luk:60',
    attack_profile: atk('song', 0.5, 1.05, 80, 110, 380, 720, 1, 4, 1),
  },
  {
    job_id: 'JOB_017', job_name: 'Elementalist', tier: 'high', parent_job_id: 'JOB_008', branch: 'element',
    is_hidden: '0', unlock_condition: 'level:20,mastery:5',
    stat_bonus: 'mp+40,atk+12', description: 'จอมเวทย์ธาตุ ระเบิดวงกว้าง',
    potential: 'str:15,dex:40,int:100,vit:40,luk:45',
    attack_profile: atk('beam', 1.0, 1.85, 150, 200, 320, 800, 1, 10, 3),
  },
  {
    job_id: 'JOB_018', job_name: 'Warlock', tier: 'high', parent_job_id: 'JOB_008', branch: 'curse',
    is_hidden: '0', unlock_condition: 'level:20,mastery:5',
    stat_bonus: 'mp+30,atk+18', description: 'นักสาป ดาเมจต่อเนื่อง',
    potential: 'str:25,dex:35,int:95,vit:45,luk:55',
    attack_profile: atk('hex', 0.85, 1.7, 130, 170, 360, 850, 1, 8, 2),
  },
  {
    job_id: 'JOB_019', job_name: 'Vorpal Striker', tier: 'high', parent_job_id: '', branch: 'vorpal',
    is_hidden: '1', unlock_condition: 'vorpal_soul:100',
    stat_bonus: 'atk+35,spd+15', description: 'อาชีพลับแห่งเผ่า Vorpal — ปลดเมื่อได้รับความไว้วางใจ',
    potential: 'str:85,dex:85,int:40,vit:50,luk:80',
    attack_profile: atk('vorpal', 1.2, 2.4, 85, 110, 250, 700, 2, 0),
  },
  {
    job_id: 'JOB_020', job_name: 'Cursed Blade', tier: 'high', parent_job_id: '', branch: 'lycagon',
    is_hidden: '1', unlock_condition: 'survive_lycagon_curse_attack',
    stat_bonus: 'atk+28,def+10', description: 'อาชีพลับผู้รอดจากคำสาป Lycagon',
    potential: 'str:90,dex:60,int:30,vit:70,luk:40',
    attack_profile: atk('curse_blade', 1.1, 2.1, 80, 100, 300, 750, 1, 0),
  },
];

const SKILLS: Params[] = [
  skl({ skill_id: 'SKL_001', skill_name: 'Slash', job_id: 'JOB_001', tier: '1', description: 'ฟันโค้งด้านหน้า', unlock_type: 'starter', skill_type: 'damage', mp_cost: '8', cooldown_ms: '1800', power: '1.6', range: '85', effect: 'cone' }),
  skl({ skill_id: 'SKL_002', skill_name: 'Heavy Blow', job_id: 'JOB_001', tier: '2', parent_skill_id: 'SKL_001', description: 'ฟันหนักทำให้มึนงง', unlock_type: 'mastery', unlock_value: '3', skill_type: 'damage', mp_cost: '16', cooldown_ms: '3500', power: '2.2', range: '90', effect: 'cone,stun' }),
  skl({ skill_id: 'SKL_009', skill_name: 'War Cry', job_id: 'JOB_001', tier: '2', description: 'ตะโกนเพิ่มพลัง', unlock_type: 'gold', unlock_value: '150', skill_type: 'buff', mp_cost: '12', cooldown_ms: '8000', power: '1.2', range: '0', effect: 'atk_up' }),
  skl({ skill_id: 'SKL_003', skill_name: 'Blade Storm', job_id: 'JOB_001', tier: '3', parent_skill_id: 'SKL_002', description: 'พายุดาบวงกว้าง', unlock_type: 'scroll', unlock_value: 'EQ_SCR_001', skill_type: 'damage', mp_cost: '28', cooldown_ms: '6000', power: '2.8', range: '110', effect: 'aoe,cone' }),

  skl({ skill_id: 'SKL_004', skill_name: 'Double Shot', job_id: 'JOB_002', tier: '1', description: 'ยิงธนูสองดอก', unlock_type: 'starter', skill_type: 'damage', mp_cost: '10', cooldown_ms: '2000', power: '1.4', range: '200', effect: 'projectile,hits:2' }),
  skl({ skill_id: 'SKL_010', skill_name: 'Rain of Arrows', job_id: 'JOB_002', tier: '2', parent_skill_id: 'SKL_004', description: 'ฝนลูกธนู', unlock_type: 'mastery', unlock_value: '4', skill_type: 'damage', mp_cost: '20', cooldown_ms: '4500', power: '2.0', range: '180', effect: 'aoe,projectile' }),
  skl({ skill_id: 'SKL_011', skill_name: 'Eagle Eye', job_id: 'JOB_002', tier: '2', description: 'เพิ่มระยะยิง', unlock_type: 'gold', unlock_value: '120', skill_type: 'buff', mp_cost: '8', cooldown_ms: '10000', power: '1.0', range: '0', effect: 'range_up' }),
  skl({ skill_id: 'SKL_049', skill_name: 'Power Shot', job_id: 'JOB_002', tier: '2', description: 'ยิงล็อกเป้าแรงสูง', unlock_type: 'mastery', unlock_value: '2', skill_type: 'damage', mp_cost: '16', cooldown_ms: '3200', power: '2.2', range: '220', effect: 'projectile,lock' }),

  skl({ skill_id: 'SKL_006', skill_name: 'Quick Step', job_id: 'JOB_003', tier: '1', description: 'ก้าวหลบเร็ว', unlock_type: 'starter', skill_type: 'dash', mp_cost: '8', cooldown_ms: '2500', power: '0', range: '90', effect: 'dash' }),
  skl({ skill_id: 'SKL_012', skill_name: 'Cross Slash', job_id: 'JOB_003', tier: '2', parent_skill_id: 'SKL_006', description: 'ฟันไขว้สองครั้ง', unlock_type: 'mastery', unlock_value: '3', skill_type: 'damage', mp_cost: '14', cooldown_ms: '2800', power: '1.8', range: '70', effect: 'cone,hits:2' }),
  skl({ skill_id: 'SKL_013', skill_name: 'Shadow Veil', job_id: 'JOB_003', tier: '2', description: 'พรางตัวชั่วคราว', unlock_type: 'scroll', unlock_value: 'EQ_SCR_002', skill_type: 'buff', mp_cost: '18', cooldown_ms: '12000', power: '1.0', range: '0', effect: 'stealth' }),
  skl({ skill_id: 'SKL_050', skill_name: 'Blade Flurry', job_id: 'JOB_003', tier: '2', description: 'ฟันรัวสามครั้ง', unlock_type: 'gold', unlock_value: '140', skill_type: 'damage', mp_cost: '16', cooldown_ms: '3000', power: '1.5', range: '68', effect: 'cone,hits:3' }),

  skl({ skill_id: 'SKL_007', skill_name: 'Pierce', job_id: 'JOB_004', tier: '1', description: 'แทงทะลุเป็นเส้น', unlock_type: 'starter', skill_type: 'damage', mp_cost: '10', cooldown_ms: '2200', power: '1.7', range: '130', effect: 'line' }),
  skl({ skill_id: 'SKL_014', skill_name: 'Spear Wall', job_id: 'JOB_004', tier: '2', parent_skill_id: 'SKL_007', description: 'แทงยาวเป็นแนว', unlock_type: 'mastery', unlock_value: '4', skill_type: 'damage', mp_cost: '18', cooldown_ms: '4000', power: '2.1', range: '150', effect: 'line' }),
  skl({ skill_id: 'SKL_015', skill_name: 'Brace', job_id: 'JOB_004', tier: '2', description: 'ตั้งรับเพิ่มเกราะ', unlock_type: 'gold', unlock_value: '100', skill_type: 'buff', mp_cost: '10', cooldown_ms: '9000', power: '1.0', range: '0', effect: 'def_up' }),
  skl({ skill_id: 'SKL_051', skill_name: 'Sweep', job_id: 'JOB_004', tier: '2', description: 'กวาดหอกวงกว้าง', unlock_type: 'mastery', unlock_value: '2', skill_type: 'damage', mp_cost: '15', cooldown_ms: '3500', power: '1.9', range: '100', effect: 'cone,aoe' }),

  skl({ skill_id: 'SKL_008', skill_name: 'Heal', job_id: 'JOB_005', tier: '1', description: 'รักษา HP', unlock_type: 'starter', skill_type: 'heal', mp_cost: '15', cooldown_ms: '3000', power: '40', range: '0', effect: 'heal' }),
  skl({ skill_id: 'SKL_016', skill_name: 'Bless', job_id: 'JOB_005', tier: '2', parent_skill_id: 'SKL_008', description: 'เสริมพลังทีม', unlock_type: 'mastery', unlock_value: '3', skill_type: 'buff', mp_cost: '18', cooldown_ms: '8000', power: '1.15', range: '0', effect: 'atk_up' }),
  skl({ skill_id: 'SKL_017', skill_name: 'Purify', job_id: 'JOB_005', tier: '2', description: 'ฟื้น MP เล็กน้อย', unlock_type: 'gold', unlock_value: '130', skill_type: 'heal', mp_cost: '5', cooldown_ms: '7000', power: '25', range: '0', effect: 'mp_heal' }),
  skl({ skill_id: 'SKL_052', skill_name: 'Smite', job_id: 'JOB_005', tier: '2', description: 'ลูกศรศักดิ์สิทธิ์', unlock_type: 'mastery', unlock_value: '2', skill_type: 'damage', mp_cost: '14', cooldown_ms: '2800', power: '1.7', range: '150', effect: 'projectile,lock' }),

  skl({ skill_id: 'SKL_005', skill_name: 'Arcane Bolt', job_id: 'JOB_008', tier: '1', description: 'ลูกศรเวทย์', unlock_type: 'starter', skill_type: 'damage', mp_cost: '12', cooldown_ms: '1800', power: '1.8', range: '170', effect: 'projectile' }),
  skl({ skill_id: 'SKL_018', skill_name: 'Fireball', job_id: 'JOB_008', tier: '2', parent_skill_id: 'SKL_005', description: 'ลูกไฟระเบิด', unlock_type: 'mastery', unlock_value: '4', skill_type: 'damage', mp_cost: '22', cooldown_ms: '4000', power: '2.4', range: '160', effect: 'projectile,aoe,fire' }),
  skl({ skill_id: 'SKL_019', skill_name: 'Mana Shield', job_id: 'JOB_008', tier: '2', description: 'โล่เวทย์', unlock_type: 'gold', unlock_value: '140', skill_type: 'buff', mp_cost: '20', cooldown_ms: '10000', power: '1.0', range: '0', effect: 'def_up' }),
  skl({ skill_id: 'SKL_020', skill_name: 'Meteor', job_id: 'JOB_008', tier: '3', parent_skill_id: 'SKL_018', description: 'อุกกาบาตจากคัมภีร์', unlock_type: 'scroll', unlock_value: 'EQ_SCR_003', skill_type: 'damage', mp_cost: '35', cooldown_ms: '8000', power: '3.2', range: '190', effect: 'aoe,fire,lock' }),

  skl({ skill_id: 'SKL_021', skill_name: 'Shield Bash', job_id: 'JOB_006', tier: '1', description: 'กระแทกด้วยโล่', unlock_type: 'starter', skill_type: 'damage', mp_cost: '10', cooldown_ms: '2500', power: '1.5', range: '75', effect: 'stun' }),
  skl({ skill_id: 'SKL_022', skill_name: 'Fortress', job_id: 'JOB_006', tier: '2', description: 'เกราะเหล็ก', unlock_type: 'mastery', unlock_value: '3', skill_type: 'buff', mp_cost: '15', cooldown_ms: '12000', power: '1.0', range: '0', effect: 'def_up' }),
  skl({ skill_id: 'SKL_053', skill_name: 'Holy Strike', job_id: 'JOB_006', tier: '2', description: 'ฟันศักดิ์สิทธิ์', unlock_type: 'gold', unlock_value: '160', skill_type: 'damage', mp_cost: '14', cooldown_ms: '3000', power: '2.0', range: '80', effect: 'cone' }),
  skl({ skill_id: 'SKL_054', skill_name: 'Bulwark Dash', job_id: 'JOB_006', tier: '2', description: 'พุ่งเข้าป้องกัน', unlock_type: 'mastery', unlock_value: '4', skill_type: 'dash', mp_cost: '12', cooldown_ms: '4000', power: '1.2', range: '100', effect: 'dash' }),

  skl({ skill_id: 'SKL_023', skill_name: 'Blood Rage', job_id: 'JOB_007', tier: '1', description: 'คลั่งเลือด', unlock_type: 'starter', skill_type: 'buff', mp_cost: '12', cooldown_ms: '10000', power: '1.3', range: '0', effect: 'atk_up' }),
  skl({ skill_id: 'SKL_024', skill_name: 'Rampage', job_id: 'JOB_007', tier: '2', description: 'พุ่งคลั่ง', unlock_type: 'mastery', unlock_value: '3', skill_type: 'damage', mp_cost: '20', cooldown_ms: '4500', power: '2.6', range: '95', effect: 'aoe,cone' }),
  skl({ skill_id: 'SKL_055', skill_name: 'Cleaving Strike', job_id: 'JOB_007', tier: '2', description: 'ฟันกว้างเลือดสาด', unlock_type: 'gold', unlock_value: '150', skill_type: 'damage', mp_cost: '14', cooldown_ms: '2800', power: '2.1', range: '90', effect: 'cone' }),
  skl({ skill_id: 'SKL_056', skill_name: 'Shockwave Roar', job_id: 'JOB_007', tier: '2', description: 'คำรามมึนงงวงกว้าง', unlock_type: 'mastery', unlock_value: '4', skill_type: 'damage', mp_cost: '18', cooldown_ms: '6000', power: '1.6', range: '110', effect: 'aoe,stun' }),

  skl({ skill_id: 'SKL_025', skill_name: 'Hawk Volley', job_id: 'JOB_009', tier: '1', description: 'ยิงรัวสามดอก', unlock_type: 'starter', skill_type: 'damage', mp_cost: '12', cooldown_ms: '2200', power: '1.3', range: '200', effect: 'projectile,hits:3' }),
  skl({ skill_id: 'SKL_026', skill_name: 'Trail Mark', job_id: 'JOB_009', tier: '2', description: 'มาร์คเป้าหมายเพิ่มดาเมจ', unlock_type: 'mastery', unlock_value: '3', skill_type: 'buff', mp_cost: '14', cooldown_ms: '9000', power: '1.25', range: '220', effect: 'mark,lock' }),
  skl({ skill_id: 'SKL_057', skill_name: 'Trap Shot', job_id: 'JOB_009', tier: '2', description: 'ธนูติดกับดัก', unlock_type: 'gold', unlock_value: '140', skill_type: 'damage', mp_cost: '15', cooldown_ms: '3500', power: '1.8', range: '190', effect: 'projectile,stun,lock' }),
  skl({ skill_id: 'SKL_058', skill_name: 'Camouflage', job_id: 'JOB_009', tier: '2', description: 'พรางตัวในป่า', unlock_type: 'mastery', unlock_value: '4', skill_type: 'buff', mp_cost: '16', cooldown_ms: '12000', power: '1.0', range: '0', effect: 'stealth' }),

  skl({ skill_id: 'SKL_027', skill_name: 'Deadeye', job_id: 'JOB_010', tier: '1', description: 'ยิงหัวแม่นยำ', unlock_type: 'starter', skill_type: 'damage', mp_cost: '16', cooldown_ms: '3200', power: '2.5', range: '260', effect: 'projectile,lock,crit' }),
  skl({ skill_id: 'SKL_028', skill_name: 'Piercing Round', job_id: 'JOB_010', tier: '2', description: 'ลูกธนูทะลุแนว', unlock_type: 'mastery', unlock_value: '3', skill_type: 'damage', mp_cost: '22', cooldown_ms: '5000', power: '2.8', range: '280', effect: 'projectile,line,lock' }),
  skl({ skill_id: 'SKL_059', skill_name: 'Lock On', job_id: 'JOB_010', tier: '2', description: 'ล็อกเป้าเพิ่มระยะ', unlock_type: 'gold', unlock_value: '160', skill_type: 'buff', mp_cost: '10', cooldown_ms: '8000', power: '1.0', range: '0', effect: 'range_up,lock' }),
  skl({ skill_id: 'SKL_060', skill_name: 'Explosive Tip', job_id: 'JOB_010', tier: '2', description: 'หัวลูกระเบิด', unlock_type: 'mastery', unlock_value: '4', skill_type: 'damage', mp_cost: '24', cooldown_ms: '5500', power: '2.4', range: '250', effect: 'projectile,aoe,lock' }),

  skl({ skill_id: 'SKL_029', skill_name: 'Backstab', job_id: 'JOB_011', tier: '1', description: 'แทงจากเงา', unlock_type: 'starter', skill_type: 'damage', mp_cost: '14', cooldown_ms: '2600', power: '2.4', range: '65', effect: 'cone,crit' }),
  skl({ skill_id: 'SKL_030', skill_name: 'Smoke Bomb', job_id: 'JOB_011', tier: '2', description: 'ควันพรางตัว', unlock_type: 'mastery', unlock_value: '3', skill_type: 'buff', mp_cost: '16', cooldown_ms: '11000', power: '1.0', range: '0', effect: 'stealth' }),
  skl({ skill_id: 'SKL_061', skill_name: 'Poison Blade', job_id: 'JOB_011', tier: '2', description: 'ดาบพิษ DoT', unlock_type: 'gold', unlock_value: '150', skill_type: 'damage', mp_cost: '14', cooldown_ms: '3000', power: '1.7', range: '70', effect: 'cone,dot' }),
  skl({ skill_id: 'SKL_062', skill_name: 'Shadow Step', job_id: 'JOB_011', tier: '2', description: 'ก้าวเงาแล้วฟัน', unlock_type: 'mastery', unlock_value: '4', skill_type: 'dash', mp_cost: '15', cooldown_ms: '3500', power: '1.8', range: '110', effect: 'dash' }),

  skl({ skill_id: 'SKL_031', skill_name: 'Flourish', job_id: 'JOB_012', tier: '1', description: 'ฟันต่อเนื่องสองครั้ง', unlock_type: 'starter', skill_type: 'damage', mp_cost: '12', cooldown_ms: '2400', power: '1.7', range: '75', effect: 'cone,hits:2' }),
  skl({ skill_id: 'SKL_032', skill_name: 'Parry Strike', job_id: 'JOB_012', tier: '2', description: 'ปัดแล้วสวนกลับ', unlock_type: 'mastery', unlock_value: '3', skill_type: 'damage', mp_cost: '18', cooldown_ms: '4000', power: '2.3', range: '70', effect: 'cone,stun' }),
  skl({ skill_id: 'SKL_063', skill_name: 'Lunge', job_id: 'JOB_012', tier: '2', description: 'พุ่งแทงเป็นเส้น', unlock_type: 'gold', unlock_value: '140', skill_type: 'damage', mp_cost: '14', cooldown_ms: '2800', power: '2.1', range: '110', effect: 'line' }),
  skl({ skill_id: 'SKL_064', skill_name: 'En Garde', job_id: 'JOB_012', tier: '2', description: 'ตั้งท่าป้องกัน', unlock_type: 'mastery', unlock_value: '4', skill_type: 'buff', mp_cost: '12', cooldown_ms: '9000', power: '1.2', range: '0', effect: 'def_up' }),

  skl({ skill_id: 'SKL_033', skill_name: 'Javelin Rush', job_id: 'JOB_013', tier: '1', description: 'พุ่งแทงระยะไกล', unlock_type: 'starter', skill_type: 'dash', mp_cost: '14', cooldown_ms: '3000', power: '2.0', range: '150', effect: 'dash' }),
  skl({ skill_id: 'SKL_034', skill_name: 'Skyfall Spear', job_id: 'JOB_013', tier: '2', description: 'หอกลงจากฟ้า', unlock_type: 'mastery', unlock_value: '3', skill_type: 'damage', mp_cost: '24', cooldown_ms: '5500', power: '2.7', range: '140', effect: 'aoe,lock' }),
  skl({ skill_id: 'SKL_065', skill_name: 'Impale', job_id: 'JOB_013', tier: '2', description: 'แทงทะลุแนว', unlock_type: 'gold', unlock_value: '150', skill_type: 'damage', mp_cost: '16', cooldown_ms: '3200', power: '2.3', range: '160', effect: 'line' }),
  skl({ skill_id: 'SKL_066', skill_name: 'Whirlwind Spear', job_id: 'JOB_013', tier: '2', description: 'หมุนหอกวงกว้าง', unlock_type: 'mastery', unlock_value: '4', skill_type: 'damage', mp_cost: '20', cooldown_ms: '5000', power: '2.2', range: '100', effect: 'aoe' }),

  skl({ skill_id: 'SKL_035', skill_name: 'Phalanx Guard', job_id: 'JOB_014', tier: '1', description: 'ตั้งแนวป้องกัน', unlock_type: 'starter', skill_type: 'buff', mp_cost: '12', cooldown_ms: '10000', power: '1.0', range: '0', effect: 'def_up' }),
  skl({ skill_id: 'SKL_036', skill_name: 'Hold the Line', job_id: 'JOB_014', tier: '2', description: 'แทงสวนเป็นแนว', unlock_type: 'mastery', unlock_value: '3', skill_type: 'damage', mp_cost: '18', cooldown_ms: '4200', power: '2.0', range: '130', effect: 'line' }),
  skl({ skill_id: 'SKL_067', skill_name: 'Shield Wall', job_id: 'JOB_014', tier: '2', description: 'กำแพงโล่', unlock_type: 'gold', unlock_value: '140', skill_type: 'buff', mp_cost: '14', cooldown_ms: '11000', power: '1.25', range: '0', effect: 'def_up' }),
  skl({ skill_id: 'SKL_068', skill_name: 'Spear Barrage', job_id: 'JOB_014', tier: '2', description: 'แทงรัวสามครั้ง', unlock_type: 'mastery', unlock_value: '4', skill_type: 'damage', mp_cost: '16', cooldown_ms: '3800', power: '1.5', range: '120', effect: 'line,hits:3' }),

  skl({ skill_id: 'SKL_037', skill_name: 'Greater Heal', job_id: 'JOB_015', tier: '1', description: 'รักษาแรง', unlock_type: 'starter', skill_type: 'heal', mp_cost: '22', cooldown_ms: '3500', power: '80', range: '0', effect: 'heal' }),
  skl({ skill_id: 'SKL_038', skill_name: 'Sanctuary', job_id: 'JOB_015', tier: '2', description: 'โล่ศักดิ์สิทธิ์', unlock_type: 'mastery', unlock_value: '3', skill_type: 'buff', mp_cost: '20', cooldown_ms: '12000', power: '1.0', range: '0', effect: 'def_up' }),
  skl({ skill_id: 'SKL_069', skill_name: 'Divine Light', job_id: 'JOB_015', tier: '2', description: 'ลำแสงศักดิ์สิทธิ์', unlock_type: 'gold', unlock_value: '150', skill_type: 'damage', mp_cost: '16', cooldown_ms: '3000', power: '2.0', range: '170', effect: 'projectile,lock' }),
  skl({ skill_id: 'SKL_070', skill_name: 'Cleanse', job_id: 'JOB_015', tier: '2', description: 'ชำระมานา', unlock_type: 'mastery', unlock_value: '4', skill_type: 'heal', mp_cost: '8', cooldown_ms: '7000', power: '40', range: '0', effect: 'mp_heal' }),

  skl({ skill_id: 'SKL_039', skill_name: 'Battle Hymn', job_id: 'JOB_016', tier: '1', description: 'เพลงเสริมพลังโจมตี', unlock_type: 'starter', skill_type: 'buff', mp_cost: '16', cooldown_ms: '9000', power: '1.25', range: '0', effect: 'atk_up' }),
  skl({ skill_id: 'SKL_040', skill_name: 'Resonance', job_id: 'JOB_016', tier: '2', description: 'คลื่นเสียงวงกว้าง', unlock_type: 'mastery', unlock_value: '3', skill_type: 'damage', mp_cost: '20', cooldown_ms: '5000', power: '1.9', range: '120', effect: 'aoe' }),
  skl({ skill_id: 'SKL_071', skill_name: 'Discord', job_id: 'JOB_016', tier: '2', description: 'เสียงแตกมึนงง', unlock_type: 'gold', unlock_value: '145', skill_type: 'damage', mp_cost: '18', cooldown_ms: '4500', power: '1.7', range: '110', effect: 'aoe,stun' }),
  skl({ skill_id: 'SKL_072', skill_name: 'Healing Melody', job_id: 'JOB_016', tier: '2', description: 'ทำนองรักษา', unlock_type: 'mastery', unlock_value: '4', skill_type: 'heal', mp_cost: '18', cooldown_ms: '4000', power: '55', range: '0', effect: 'heal' }),

  skl({ skill_id: 'SKL_041', skill_name: 'Storm Bolt', job_id: 'JOB_017', tier: '1', description: 'สายฟ้าธาตุ', unlock_type: 'starter', skill_type: 'damage', mp_cost: '18', cooldown_ms: '2400', power: '2.2', range: '190', effect: 'projectile,stun,lock' }),
  skl({ skill_id: 'SKL_042', skill_name: 'Elemental Burst', job_id: 'JOB_017', tier: '2', description: 'ระเบิดธาตุรวม', unlock_type: 'mastery', unlock_value: '3', skill_type: 'damage', mp_cost: '30', cooldown_ms: '6500', power: '3.0', range: '180', effect: 'aoe,fire,lock' }),
  skl({ skill_id: 'SKL_073', skill_name: 'Ice Lance', job_id: 'JOB_017', tier: '2', description: 'หอกน้ำแข็งมึน', unlock_type: 'gold', unlock_value: '160', skill_type: 'damage', mp_cost: '16', cooldown_ms: '2800', power: '2.0', range: '180', effect: 'projectile,stun,lock' }),
  skl({ skill_id: 'SKL_074', skill_name: 'Flame Wave', job_id: 'JOB_017', tier: '2', description: 'คลื่นไฟเป็นเส้น', unlock_type: 'mastery', unlock_value: '4', skill_type: 'damage', mp_cost: '22', cooldown_ms: '4800', power: '2.5', range: '170', effect: 'line,fire' }),

  skl({ skill_id: 'SKL_043', skill_name: 'Hex Bolt', job_id: 'JOB_018', tier: '1', description: 'ลูกศรคำสาป', unlock_type: 'starter', skill_type: 'damage', mp_cost: '16', cooldown_ms: '2600', power: '2.0', range: '175', effect: 'projectile,dot,lock' }),
  skl({ skill_id: 'SKL_044', skill_name: 'Soul Drain', job_id: 'JOB_018', tier: '2', description: 'ดูดพลังฟื้น MP', unlock_type: 'mastery', unlock_value: '3', skill_type: 'heal', mp_cost: '10', cooldown_ms: '8000', power: '35', range: '150', effect: 'mp_heal' }),
  skl({ skill_id: 'SKL_075', skill_name: 'Dark Pact', job_id: 'JOB_018', tier: '2', description: 'สัญญาเงาเพิ่มโจมตี', unlock_type: 'gold', unlock_value: '155', skill_type: 'buff', mp_cost: '14', cooldown_ms: '10000', power: '1.3', range: '0', effect: 'atk_up' }),
  skl({ skill_id: 'SKL_076', skill_name: 'Void Rift', job_id: 'JOB_018', tier: '2', description: 'รอยแยกสุญญากาศ', unlock_type: 'mastery', unlock_value: '4', skill_type: 'damage', mp_cost: '26', cooldown_ms: '6000', power: '2.6', range: '160', effect: 'aoe,dot,lock' }),

  skl({ skill_id: 'SKL_045', skill_name: 'Vorpal Edge', job_id: 'JOB_019', tier: '1', description: 'คมดาบ Vorpal', unlock_type: 'starter', skill_type: 'damage', mp_cost: '15', cooldown_ms: '2200', power: '2.6', range: '90', effect: 'cone,crit' }),
  skl({ skill_id: 'SKL_046', skill_name: 'Soul Flash', job_id: 'JOB_019', tier: '2', description: 'แสงวิญญาณพุ่งทะลุ', unlock_type: 'mastery', unlock_value: '3', skill_type: 'damage', mp_cost: '28', cooldown_ms: '5500', power: '3.1', range: '130', effect: 'aoe' }),
  skl({ skill_id: 'SKL_077', skill_name: 'Phantom Dash', job_id: 'JOB_019', tier: '2', description: 'พุ่งเงาวิญญาณ', unlock_type: 'gold', unlock_value: '180', skill_type: 'dash', mp_cost: '14', cooldown_ms: '3200', power: '1.5', range: '120', effect: 'dash' }),
  skl({ skill_id: 'SKL_078', skill_name: 'Reality Tear', job_id: 'JOB_019', tier: '2', description: 'ฉีกความเป็นจริง', unlock_type: 'mastery', unlock_value: '4', skill_type: 'damage', mp_cost: '24', cooldown_ms: '5000', power: '2.8', range: '140', effect: 'line,crit' }),

  skl({ skill_id: 'SKL_047', skill_name: 'Curse Slash', job_id: 'JOB_020', tier: '1', description: 'ฟันด้วยคำสาป', unlock_type: 'starter', skill_type: 'damage', mp_cost: '14', cooldown_ms: '2400', power: '2.3', range: '85', effect: 'cone,dot' }),
  skl({ skill_id: 'SKL_048', skill_name: 'Howl of Lycagon', job_id: 'JOB_020', tier: '2', description: 'คำรามแห่งคำสาป', unlock_type: 'mastery', unlock_value: '3', skill_type: 'buff', mp_cost: '18', cooldown_ms: '11000', power: '1.35', range: '0', effect: 'atk_up' }),
  skl({ skill_id: 'SKL_079', skill_name: 'Blood Howl', job_id: 'JOB_020', tier: '2', description: 'คำรามเลือดวงกว้าง', unlock_type: 'gold', unlock_value: '170', skill_type: 'damage', mp_cost: '20', cooldown_ms: '5000', power: '2.0', range: '115', effect: 'aoe,stun' }),
  skl({ skill_id: 'SKL_080', skill_name: 'Lycan Rush', job_id: 'JOB_020', tier: '2', description: 'พุ่งแทงคำสาป', unlock_type: 'mastery', unlock_value: '4', skill_type: 'dash', mp_cost: '16', cooldown_ms: '3800', power: '2.2', range: '130', effect: 'dash' }),
];

const EQUIPMENT: Params[] = [
  { item_id: 'EQ_001', item_name: 'Rusty Sword', item_type: 'weapon', rarity: 'common', tier: '1', base_stats: 'atk+5', is_hero_weapon: '0', is_legacy: '0', max_quantity: '1', ascension_table: '', description: 'ดาบสนิมสำหรับมือใหม่' },
  { item_id: 'EQ_002', item_name: 'Wooden Bow', item_type: 'weapon', rarity: 'common', tier: '1', base_stats: 'atk+4,spd+2', is_hero_weapon: '0', is_legacy: '0', max_quantity: '1', ascension_table: '', description: 'ธนูไม้เบา' },
  { item_id: 'EQ_003', item_name: 'Cloth Tunic', item_type: 'armor', rarity: 'common', tier: '1', base_stats: 'def+3,hp+10', is_hero_weapon: '0', is_legacy: '0', max_quantity: '1', ascension_table: '', description: 'เสื้อผ้านุ่ม' },
  { item_id: 'EQ_004', item_name: 'Health Potion', item_type: 'consumable', rarity: 'common', tier: '1', base_stats: 'heal+50', is_hero_weapon: '0', is_legacy: '0', max_quantity: '99', ascension_table: '', description: 'ฟื้น HP เล็กน้อย' },
  { item_id: 'EQ_SCR_001', item_name: 'Blade Storm Scroll', item_type: 'skill_scroll', rarity: 'rare', tier: '3', base_stats: 'skill:SKL_003', is_hero_weapon: '0', is_legacy: '0', max_quantity: '10', ascension_table: '', description: 'คัมภีร์พายุดาบ' },
  { item_id: 'EQ_SCR_002', item_name: 'Shadow Veil Scroll', item_type: 'skill_scroll', rarity: 'rare', tier: '2', base_stats: 'skill:SKL_013', is_hero_weapon: '0', is_legacy: '0', max_quantity: '10', ascension_table: '', description: 'คัมภีร์เงา' },
  { item_id: 'EQ_SCR_003', item_name: 'Meteor Scroll', item_type: 'skill_scroll', rarity: 'epic', tier: '3', base_stats: 'skill:SKL_020', is_hero_weapon: '0', is_legacy: '0', max_quantity: '5', ascension_table: '', description: 'คัมภีร์อุกกาบาต' },
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
  { monster_id: 'MON_001', name: 'Moss Slime', hp: '40', atk: '6', def: '1', spd: '6', skills: '', drops: 'EQ_004', appearance: '#22c55e|slime' },
  { monster_id: 'MON_002', name: 'Forest Wolf', hp: '70', atk: '12', def: '4', spd: '14', skills: '', drops: 'EQ_001,EQ_SCR_001', appearance: '#a3a3a3|wolf' },
  { monster_id: 'MON_003', name: 'Fluff Rabbit', hp: '28', atk: '4', def: '1', spd: '14', skills: 'hop', drops: 'EQ_004', appearance: '#fda4af|bunny' },
  { monster_id: 'MON_004', name: 'Sleepy Sloth', hp: '55', atk: '7', def: '3', spd: '4', skills: 'spit', drops: 'EQ_004,EQ_SCR_002', appearance: '#a8a29e|sloth' },
  { monster_id: 'MON_005', name: 'Moss Fox', hp: '42', atk: '9', def: '2', spd: '16', skills: 'hop', drops: 'EQ_004', appearance: '#fb923c|fox' },
  { monster_id: 'MON_006', name: 'Puddle Frog', hp: '36', atk: '5', def: '2', spd: '10', skills: 'spit', drops: 'EQ_004', appearance: '#4ade80|frog' },
  { monster_id: 'MON_007', name: 'Pine Squirrel', hp: '24', atk: '5', def: '1', spd: '18', skills: 'hop', drops: 'EQ_004', appearance: '#c2410c|squirrel' },
  { monster_id: 'MON_008', name: 'Ember Bird', hp: '32', atk: '8', def: '1', spd: '20', skills: '', drops: 'EQ_004', appearance: '#f87171|bird' },
  { monster_id: 'MON_009', name: 'Bark Boar', hp: '80', atk: '14', def: '5', spd: '8', skills: '', drops: 'EQ_001', appearance: '#78716c|boar' },
  { monster_id: 'MON_010', name: 'Honey Bear', hp: '95', atk: '13', def: '6', spd: '7', skills: '', drops: 'EQ_001,EQ_004', appearance: '#92400e|bear' },
  { monster_id: 'MON_011', name: 'Spore Cap', hp: '45', atk: '7', def: '3', spd: '5', skills: 'spit', drops: 'EQ_004', appearance: '#dc2626|mushroom' },
  { monster_id: 'MON_012', name: 'Leaf Beetle', hp: '38', atk: '8', def: '4', spd: '11', skills: '', drops: 'EQ_004', appearance: '#65a30d|beetle' },
];

const DIALOGUE: Params[] = [
  {
    dialogue_id: 'DLG_STELLA_1',
    text: 'Welcome to Star Town (Town 1)! Softcloud Inn for rest, Star Mart for potions, Star Spring to heal. Take the east gate to Whisperwood Park.',
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
    trade_items: 'EQ_004,EQ_SCR_001,EQ_SCR_002,EQ_SCR_003',
  },
];

const STAR_TOWN_MAP: Params[] = [
  {
    id: 'town_start', type: 'town', x: '500', y: '400', z: '0', name: 'Star Town', radius: '420',
    params: 'shape=poly;w=800;h=600;safe=1;map_id=town1;pts=120,100|840,100|880,150|880,650|840,700|120,700|80,650|80,150',
  },
  {
    id: 'player_home', type: 'landmark', x: '500', y: '180', z: '2', name: 'Your House', radius: '42',
    params: 'interact=talk;kind=house;color=#f59e0b;line=Home sweet home. Safe walls of Town 1.',
  },
  {
    id: 'npc_stella', type: 'npc', x: '380', y: '320', z: '0', name: 'Stella', radius: '28',
    params: 'interact=talk;entity_id=NPC_STELLA;color=#fbbf24;face=star;line=Hi! This is Star Town — Town 1. Rest at Softcloud Inn, shop at Star Mart, heal at the spring. East gate leads to Whisperwood Park!',
  },
  { id: 'star_mart', type: 'market', x: '220', y: '400', z: '2', name: 'Star Mart', radius: '36', params: 'interact=shop;price=25;item_id=EQ_004;color=#34d399' },
  { id: 'star_scrolls', type: 'market', x: '260', y: '560', z: '2', name: 'Scroll Stall', radius: '32', params: 'interact=shop;price=200;item_id=EQ_SCR_001;color=#c084fc' },
  { id: 'star_inn', type: 'hotel', x: '720', y: '240', z: '2', name: 'Softcloud Inn', radius: '36', params: 'interact=rest;price=10;color=#60a5fa' },
  { id: 'star_heal', type: 'landmark', x: '500', y: '600', z: '2', name: 'Star Spring', radius: '34', params: 'interact=heal;kind=heal;color=#2dd4bf' },
  { id: 'star_golf', type: 'landmark', x: '720', y: '580', z: '2', name: 'Star Golf', radius: '40', params: 'interact=golf;kind=golf;color=#86efac' },
  {
    id: 'gate_town_exit', type: 'landmark', x: '880', y: '400', z: '1', name: 'East Gate', radius: '36',
    params: 'kind=gate;gate=exit;to=park1;sibling=gate_park_enter;spawn_x=1080;spawn_y=400;color=#facc15',
  },
  { id: 'whisperwood', type: 'forest', x: '1950', y: '970', z: '0', name: 'Whisperwood Park', radius: '930', params: 'shape=poly;w=1860;h=1860;map_id=park1;pts=1100,90|1380,55|1680,95|1980,48|2280,88|2580,70|2800,160|2885,380|2840,620|2900,900|2860,1180|2810,1480|2720,1760|2420,1885|2080,1840|1750,1895|1420,1830|1180,1720|1060,1480|1095,1180|1045,900|1080,620|1055,480|1040,440|1020,400|1040,360|1070,280|1045,170' },
  {
    id: 'gate_park_enter', type: 'landmark', x: '1040', y: '400', z: '1', name: 'Town Gate', radius: '36',
    params: 'kind=gate;gate=entrance;to=town1;sibling=gate_town_exit;spawn_x=800;spawn_y=400;color=#facc15;hidden=1',
  },
  { id: 'forest_rabbit_1', type: 'monster', x: '1400', y: '280', z: '1', name: 'Fluff Rabbit', radius: '30', params: 'entity_id=MON_003' },
  { id: 'forest_rabbit_2', type: 'monster', x: '2400', y: '1500', z: '1', name: 'Fluff Rabbit', radius: '30', params: 'entity_id=MON_003' },
  { id: 'forest_bunny_3', type: 'monster', x: '1950', y: '900', z: '1', name: 'Fluff Rabbit', radius: '30', params: 'entity_id=MON_003' },
  { id: 'forest_sloth_1', type: 'monster', x: '2600', y: '700', z: '1', name: 'Sleepy Sloth', radius: '34', params: 'entity_id=MON_004' },
  { id: 'forest_slime_1', type: 'monster', x: '1550', y: '1100', z: '1', name: 'Moss Slime', radius: '30', params: 'entity_id=MON_001' },
  { id: 'forest_slime_2', type: 'monster', x: '2200', y: '450', z: '1', name: 'Moss Slime', radius: '30', params: 'entity_id=MON_001' },
  { id: 'forest_wolf_1', type: 'monster', x: '2500', y: '1200', z: '1', name: 'Forest Wolf', radius: '34', params: 'entity_id=MON_002' },
  { id: 'forest_wolf_2', type: 'monster', x: '1700', y: '1600', z: '1', name: 'Forest Wolf', radius: '34', params: 'entity_id=MON_002' },
  { id: 'forest_fox_1', type: 'monster', x: '1800', y: '550', z: '1', name: 'Moss Fox', radius: '30', params: 'entity_id=MON_005' },
  { id: 'forest_fox_2', type: 'monster', x: '2300', y: '1700', z: '1', name: 'Moss Fox', radius: '30', params: 'entity_id=MON_005' },
  { id: 'forest_frog_1', type: 'monster', x: '2050', y: '1250', z: '1', name: 'Puddle Frog', radius: '28', params: 'entity_id=MON_006' },
  { id: 'forest_frog_2', type: 'monster', x: '1250', y: '750', z: '1', name: 'Puddle Frog', radius: '28', params: 'entity_id=MON_006' },
  { id: 'forest_squirrel_1', type: 'monster', x: '1600', y: '400', z: '1', name: 'Pine Squirrel', radius: '26', params: 'entity_id=MON_007' },
  { id: 'forest_squirrel_2', type: 'monster', x: '2700', y: '1400', z: '1', name: 'Pine Squirrel', radius: '26', params: 'entity_id=MON_007' },
  { id: 'forest_bird_1', type: 'monster', x: '2100', y: '300', z: '1', name: 'Ember Bird', radius: '28', params: 'entity_id=MON_008' },
  { id: 'forest_bird_2', type: 'monster', x: '1450', y: '1500', z: '1', name: 'Ember Bird', radius: '28', params: 'entity_id=MON_008' },
  { id: 'forest_boar_1', type: 'monster', x: '2450', y: '900', z: '1', name: 'Bark Boar', radius: '36', params: 'entity_id=MON_009' },
  { id: 'forest_bear_1', type: 'monster', x: '1900', y: '1550', z: '1', name: 'Honey Bear', radius: '38', params: 'entity_id=MON_010' },
  { id: 'forest_mushroom_1', type: 'monster', x: '1300', y: '1200', z: '1', name: 'Spore Cap', radius: '28', params: 'entity_id=MON_011' },
  { id: 'forest_mushroom_2', type: 'monster', x: '2550', y: '500', z: '1', name: 'Spore Cap', radius: '28', params: 'entity_id=MON_011' },
  { id: 'forest_beetle_1', type: 'monster', x: '1750', y: '1050', z: '1', name: 'Leaf Beetle', radius: '26', params: 'entity_id=MON_012' },
  { id: 'forest_beetle_2', type: 'monster', x: '2150', y: '1450', z: '1', name: 'Leaf Beetle', radius: '26', params: 'entity_id=MON_012' },
];

type Catalog = { sheet: string; pk: string; rows: Params[]; mode: 'insert' | 'upsert' };

const CATALOGS: Catalog[] = [
  { sheet: 'Jobs', pk: 'job_id', rows: JOBS, mode: 'upsert' },
  { sheet: 'Skills', pk: 'skill_id', rows: SKILLS, mode: 'upsert' },
  { sheet: 'Equipment', pk: 'item_id', rows: EQUIPMENT, mode: 'upsert' },
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
