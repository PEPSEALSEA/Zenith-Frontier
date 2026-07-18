export const WORLD_BOSS_SCENARIO: Record<string, string> = {
  BOSS_001: 'SCENARIO_LYCAGON',
  BOSS_002: 'SCENARIO_THALVROS',
  BOSS_003: 'SCENARIO_IRON',
  BOSS_004: 'SCENARIO_WRAITH',
  BOSS_005: 'SCENARIO_ASH',
  BOSS_006: 'SCENARIO_CHRONO',
  BOSS_007: 'SCENARIO_NULL',
}

export function scenarioForBoss(bossId?: string, fallback?: string) {
  if (!bossId) return fallback || ''
  return WORLD_BOSS_SCENARIO[bossId] || fallback || ''
}
