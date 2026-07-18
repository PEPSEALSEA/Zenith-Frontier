export type EquipmentDef = {
  item_id: string
  item_name: string
  item_type: string
  rarity: string
  tier: string
  base_stats: string
  description: string
  max_quantity: number
}

export type ConsumableEffect = {
  heal: number
  mp: number
}

export function mapEquipmentRows(rows: Record<string, string>[]): EquipmentDef[] {
  return rows.map((r) => ({
    item_id: String(r.item_id || ''),
    item_name: String(r.item_name || r.item_id || ''),
    item_type: String(r.item_type || 'misc'),
    rarity: String(r.rarity || 'common'),
    tier: String(r.tier || '1'),
    base_stats: String(r.base_stats || ''),
    description: String(r.description || ''),
    max_quantity: Number(r.max_quantity) || 99,
  }))
}

export function parseConsumableEffects(baseStats: string): ConsumableEffect {
  const out: ConsumableEffect = { heal: 0, mp: 0 }
  for (const part of String(baseStats || '').split(',')) {
    const token = part.trim().toLowerCase()
    const heal = /^heal\+(\d+)/.exec(token)
    if (heal) out.heal += Number(heal[1])
    const mp = /^(?:mp|mana)\+(\d+)/.exec(token)
    if (mp) out.mp += Number(mp[1])
  }
  return out
}

export function isConsumableType(itemType: string) {
  const t = String(itemType || '').toLowerCase()
  return t === 'consumable' || t === 'potion' || t === 'food'
}

export function isSkillScrollType(itemType: string) {
  return String(itemType || '').toLowerCase() === 'skill_scroll'
}

export function isQuickSlotItem(def?: EquipmentDef | null) {
  if (!def) return false
  return isConsumableType(def.item_type)
}

export function itemSlotStorageKey(email?: string | null) {
  return `zf_item_slots_${email || 'local'}`
}

export function loadItemSlots(email?: string | null): [string, string] {
  if (typeof window === 'undefined') return ['', '']
  try {
    const raw = localStorage.getItem(itemSlotStorageKey(email))
    if (!raw) return ['', '']
    const parsed = JSON.parse(raw)
    return [String(parsed?.[0] || ''), String(parsed?.[1] || '')]
  } catch {
    return ['', '']
  }
}

export function saveItemSlots(slots: [string, string], email?: string | null) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(itemSlotStorageKey(email), JSON.stringify(slots))
  } catch {
    /* ignore */
  }
}
