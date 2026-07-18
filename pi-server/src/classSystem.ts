export type AllocStat = 'str' | 'dex' | 'int' | 'vit' | 'luk';

export const ALLOC_STATS: AllocStat[] = ['str', 'dex', 'int', 'vit', 'luk'];
export const STAT_POINTS_PER_LEVEL = 3;
export const MASTERY_EXP_PER_LEVEL = 100;

export function parsePotential(raw?: string): Record<AllocStat, number> {
  const out: Record<AllocStat, number> = { str: 50, dex: 50, int: 50, vit: 50, luk: 50 };
  if (!raw) return out;
  for (const part of raw.split(',')) {
    const m = part.trim().match(/^(str|dex|int|vit|luk):(\d+)$/i);
    if (!m) continue;
    out[m[1].toLowerCase() as AllocStat] = parseInt(m[2], 10);
  }
  return out;
}

export function combatFromAlloc(
  alloc: Record<AllocStat, number>,
  jobBonus?: string,
): { atk: number; def: number; spd: number; luck: number; maxHp: number; maxMp: number } {
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

export function masteryExpToNext(level: number): number {
  return MASTERY_EXP_PER_LEVEL + (level - 1) * 25;
}
