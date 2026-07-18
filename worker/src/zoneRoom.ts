import {
  ZONE_CHAT_MAX_LEN,
  ZONE_HIT_RANGE_PAD,
  ZONE_LOOT_RANGE,
  ZONE_MAX_PLAYERS,
  ZONE_RESPAWN_MS,
  type ClientToZone,
  type ZoneEntityPublic,
  type ZoneEntitySeed,
  type ZonePlayerPublic,
  type ZoneStatsSnapshot,
  type ZoneToClient,
} from './zoneProtocol'

declare const WebSocketPair: {
  new (): { 0: CfWebSocket; 1: CfWebSocket }
}

interface CfWebSocket {
  send(data: string | ArrayBuffer): void
  close(code?: number, reason?: string): void
  serializeAttachment(value: unknown): void
  deserializeAttachment(): unknown
}

type WorkerResponseInit = ResponseInit & { webSocket?: CfWebSocket }

export type ZoneEnv = {
  ZONE_ROOM: DurableObjectNamespace
  PI_ORIGIN?: { get(key: string): Promise<string | null> }
  PI_ORIGIN_SECRET?: string
  COMBAT_GRANT_SECRET?: string
  PUBLIC_API_BASE?: string
  SPREADSHEET_ID?: string
  GOOGLE_CLIENT_EMAIL?: string
  GOOGLE_PRIVATE_KEY?: string
}

type Session = {
  playerId: string
  name: string
  appearance: { color: string; face: string }
  jobMain: string
  stats: ZoneStatsSnapshot
  x: number
  y: number
  facing: number
  lastChatAt: number
  lastHitAt: number
  joined: boolean
}

type LiveEntity = ZoneEntitySeed & {
  deadUntil: number
  homeX: number
  homeY: number
  targetId: string | null
  contributors: Map<string, number>
}

function dist(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx
  const dy = ay - by
  return Math.sqrt(dx * dx + dy * dy)
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

export class ZoneRoom implements DurableObject {
  private sessions = new Map<CfWebSocket, Session>()
  private entities = new Map<string, LiveEntity>()
  private seeded = false
  private mapId = 'zone'
  private aiTimer: number | null = null

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: ZoneEnv,
  ) {
    this.state.getWebSockets().forEach((ws) => {
      const socket = ws as unknown as CfWebSocket
      const meta = socket.deserializeAttachment() as Session | null
      if (meta?.playerId) this.sessions.set(socket, meta)
    })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const parts = url.pathname.split('/').filter(Boolean)
    const mapIdx = parts.indexOf('zone')
    if (mapIdx >= 0 && parts[mapIdx + 1]) this.mapId = decodeURIComponent(parts[mapIdx + 1])

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }

    const pair = new WebSocketPair()
    const client = pair[0]
    const server = pair[1]
    this.state.acceptWebSocket(server as unknown as WebSocket)
    this.sessions.set(server, {
      playerId: '',
      name: '',
      appearance: { color: '#94a3b8', face: 'ghost' },
      jobMain: '',
      stats: { atk: 5, def: 1, spd: 5, acc: 0.15, luk: 5, level: 1 },
      x: 0,
      y: 0,
      facing: 1,
      lastChatAt: 0,
      lastHitAt: 0,
      joined: false,
    })
    this.ensureAiLoop()
    return new Response(null, { status: 101, webSocket: client } as WorkerResponseInit)
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const socket = ws as unknown as CfWebSocket
    const raw = typeof message === 'string' ? message : new TextDecoder().decode(message)
    let msg: ClientToZone
    try {
      msg = JSON.parse(raw) as ClientToZone
    } catch {
      this.send(socket, { type: 'error', message: 'bad_json' })
      return
    }

    const session = this.sessions.get(socket)
    if (!session) return

    if (msg.type === 'ping') {
      this.send(socket, { type: 'pong', t: msg.t })
      return
    }

    if (msg.type === 'join') {
      await this.handleJoin(socket, session, msg)
      return
    }

    if (!session.joined) {
      this.send(socket, { type: 'error', message: 'join_first' })
      return
    }

    if (msg.type === 'presence') {
      session.x = msg.x
      session.y = msg.y
      session.facing = msg.facing
      this.persistSession(socket, session)
      return
    }

    if (msg.type === 'chat') {
      this.handleChat(socket, session, msg.text)
      return
    }

    if (msg.type === 'attack') {
      await this.handleAttack(socket, session, msg)
    }
  }

  async webSocketClose(ws: WebSocket) {
    this.sessions.delete(ws as unknown as CfWebSocket)
    this.broadcastRoster()
  }

  async webSocketError(ws: WebSocket) {
    this.sessions.delete(ws as unknown as CfWebSocket)
    this.broadcastRoster()
  }

  private persistSession(ws: CfWebSocket, session: Session) {
    try {
      ws.serializeAttachment(session)
    } catch {
      /* ignore */
    }
  }

  private send(ws: CfWebSocket, msg: ZoneToClient) {
    try {
      ws.send(JSON.stringify(msg))
    } catch {
      /* ignore */
    }
  }

  private broadcast(msg: ZoneToClient, except?: CfWebSocket) {
    const raw = JSON.stringify(msg)
    for (const [sock] of this.sessions) {
      if (except && sock === except) continue
      try {
        sock.send(raw)
      } catch {
        /* ignore */
      }
    }
  }

  private broadcastToPlayer(playerId: string, msg: ZoneToClient) {
    for (const [sock, s] of this.sessions) {
      if (s.playerId === playerId) this.send(sock, msg)
    }
  }

  private activePlayers(): Session[] {
    return [...this.sessions.values()].filter((s) => s.joined && s.playerId)
  }

  private toPublic(s: Session): ZonePlayerPublic {
    return {
      playerId: s.playerId,
      name: s.name,
      appearance: s.appearance,
      jobMain: s.jobMain,
      x: s.x,
      y: s.y,
      facing: s.facing,
      level: s.stats.level,
    }
  }

  private entityPublic(e: LiveEntity): ZoneEntityPublic {
    return {
      id: e.id,
      hp: e.hp,
      maxHp: e.maxHp,
      x: e.x,
      y: e.y,
      deadUntil: e.deadUntil,
      name: e.name,
      color: e.color,
      face: e.face,
      kind: e.kind,
      bossId: e.bossId,
    }
  }

  private broadcastRoster() {
    const players = this.activePlayers().map((s) => this.toPublic(s))
    this.broadcast({ type: 'roster', players })
  }

  private ensureAiLoop() {
    if (this.aiTimer != null) return
    this.aiTimer = setInterval(() => {
      this.tickPresence()
      this.tickEntities()
    }, 100) as unknown as number
  }

  private tickPresence() {
    const players = this.activePlayers().map((s) => ({
      playerId: s.playerId,
      x: s.x,
      y: s.y,
      facing: s.facing,
    }))
    if (players.length === 0) return
    this.broadcast({ type: 'presence_batch', players })
  }

  private tickEntities() {
    const now = Date.now()
    const players = this.activePlayers()
    if (this.entities.size === 0) return
    const deltas: (Partial<ZoneEntityPublic> & { id: string })[] = []

    for (const e of this.entities.values()) {
      if (e.kind === 'boss' && e.deadUntil > 0) continue
      if (e.deadUntil > 0 && e.deadUntil <= now) {
        e.hp = e.maxHp
        e.x = e.homeX
        e.y = e.homeY
        e.deadUntil = 0
        e.targetId = null
        e.contributors.clear()
        deltas.push(this.entityPublic(e))
        continue
      }
      if (e.deadUntil > now || e.hp <= 0) continue
      if (players.length === 0) continue

      let best: Session | null = null
      let bestD = Infinity
      for (const p of players) {
        const d = dist(e.x, e.y, p.x, p.y)
        if (d < 220 && d < bestD) {
          bestD = d
          best = p
        }
      }
      if (!best) {
        e.targetId = null
        const hx = e.homeX - e.x
        const hy = e.homeY - e.y
        const hd = Math.sqrt(hx * hx + hy * hy)
        if (hd > 4) {
          const step = Math.min(e.spd * 0.08, hd)
          e.x += (hx / hd) * step
          e.y += (hy / hd) * step
          deltas.push({ id: e.id, x: e.x, y: e.y })
        }
        continue
      }
      e.targetId = best.playerId
      const dx = best.x - e.x
      const dy = best.y - e.y
      const d = Math.sqrt(dx * dx + dy * dy) || 1
      if (d > 36) {
        const step = e.spd * 0.1
        e.x += (dx / d) * step
        e.y += (dy / d) * step
        deltas.push({ id: e.id, x: e.x, y: e.y })
      }
    }

    if (deltas.length) this.broadcast({ type: 'entity_delta', entities: deltas })
  }

  private async handleJoin(
    ws: CfWebSocket,
    session: Session,
    msg: Extract<ClientToZone, { type: 'join' }>,
  ) {
    const joinedCount = this.activePlayers().filter((s) => s.playerId !== msg.playerId).length
    if (joinedCount >= ZONE_MAX_PLAYERS) {
      this.send(ws, { type: 'error', message: 'zone_full' })
      ws.close(1013, 'zone_full')
      return
    }

    for (const [other, s] of this.sessions) {
      if (other !== ws && s.playerId === msg.playerId) {
        this.sessions.delete(other)
        try {
          other.close(1000, 'replaced')
        } catch {
          /* ignore */
        }
      }
    }

    session.playerId = String(msg.playerId || '').slice(0, 120)
    session.name = String(msg.name || 'Traveler').slice(0, 32)
    session.appearance = {
      color: msg.appearance?.color || '#10b981',
      face: msg.appearance?.face || 'ghost',
    }
    session.jobMain = String(msg.jobMain || '')
    session.stats = {
      atk: Number(msg.statsSnapshot?.atk) || 5,
      def: Number(msg.statsSnapshot?.def) || 1,
      spd: Number(msg.statsSnapshot?.spd) || 5,
      acc: Number(msg.statsSnapshot?.acc) || 0.15,
      luk: Number(msg.statsSnapshot?.luk) || 5,
      level: Number(msg.statsSnapshot?.level) || 1,
    }
    session.x = Number(msg.x) || 0
    session.y = Number(msg.y) || 0
    session.facing = Number(msg.facing) || 1
    session.joined = true
    this.persistSession(ws, session)

    if (!this.seeded && Array.isArray(msg.entities) && msg.entities.length > 0) {
      this.seedEntities(msg.entities)
    }

    this.send(ws, { type: 'welcome', mapId: this.mapId, you: session.playerId })
    this.send(ws, {
      type: 'entity_snapshot',
      entities: [...this.entities.values()].map((e) => this.entityPublic(e)),
    })
    this.broadcastRoster()
  }

  private seedEntities(seeds: ZoneEntitySeed[]) {
    this.entities.clear()
    for (const s of seeds.slice(0, 80)) {
      this.entities.set(s.id, {
        ...s,
        homeX: s.x,
        homeY: s.y,
        deadUntil: 0,
        targetId: null,
        contributors: new Map(),
      })
    }
    this.seeded = true
  }

  private handleChat(ws: CfWebSocket, session: Session, text: string) {
    const now = Date.now()
    if (now - session.lastChatAt < 500) return
    const cleaned = String(text || '').trim().slice(0, ZONE_CHAT_MAX_LEN)
    if (!cleaned) return
    session.lastChatAt = now
    this.persistSession(ws, session)
    this.broadcast({
      type: 'chat',
      playerId: session.playerId,
      name: session.name,
      text: cleaned,
      at: now,
    })
  }

  private async handleAttack(
    ws: CfWebSocket,
    session: Session,
    msg: Extract<ClientToZone, { type: 'attack' }>,
  ) {
    const now = Date.now()
    const minCd = msg.attackType === 'hard' ? 420 : msg.attackType === 'skill' ? 280 : 180
    if (now - session.lastHitAt < minCd) return
    session.lastHitAt = now
    this.persistSession(ws, session)

    const entity = this.entities.get(msg.entityId)
    if (!entity || entity.deadUntil > now || entity.hp <= 0) return

    const range =
      (Number(msg.range) || (msg.attackType === 'skill' ? 120 : 70)) + ZONE_HIT_RANGE_PAD
    if (dist(session.x, session.y, entity.x, entity.y) > range) return

    const power = clamp(Number(msg.power) || (msg.attackType === 'hard' ? 1.6 : 1), 0.4, 4)
    const raw = session.stats.atk * power - entity.def * 0.35
    const dmg = Math.max(1, Math.floor(clamp(raw, 1, session.stats.atk * 4 + 40)))

    entity.hp = Math.max(0, entity.hp - dmg)
    entity.contributors.set(
      session.playerId,
      (entity.contributors.get(session.playerId) || 0) + dmg,
    )

    if (entity.hp > 0) {
      this.broadcast({
        type: 'entity_delta',
        entities: [{ id: entity.id, hp: entity.hp, x: entity.x, y: entity.y }],
      })
      return
    }

    await this.handleKill(session, entity)
  }

  private async handleKill(killer: Session, entity: LiveEntity) {
    const now = Date.now()
    entity.hp = 0
    entity.deadUntil = entity.kind === 'boss' ? Number.MAX_SAFE_INTEGER : now + ZONE_RESPAWN_MS
    entity.targetId = null

    this.broadcast({
      type: 'entity_delta',
      entities: [{ id: entity.id, hp: 0, deadUntil: entity.deadUntil, x: entity.x, y: entity.y }],
    })

    const eligible = this.activePlayers().filter(
      (p) => dist(p.x, p.y, entity.x, entity.y) <= ZONE_LOOT_RANGE,
    )
    const recipients = eligible.length
      ? eligible
      : [killer]

    const totalExp = Math.max(10, Math.floor(entity.maxHp / 3))
    const totalMoney = Math.max(4, Math.floor(entity.atk * 2 + 6))
    const shareExp = Math.max(1, Math.floor(totalExp / recipients.length))
    const shareMoney = Math.max(1, Math.floor(totalMoney / recipients.length))

    const dropPool = entity.drops.filter((d) => d.startsWith('EQ_') || d.startsWith('ITEM_'))
    const rolled = dropPool.length ? [dropPool[Math.floor(Math.random() * dropPool.length)]] : []

    const itemWinner = recipients[now % recipients.length]
    for (const r of recipients) {
      const items = rolled.length && r.playerId === itemWinner.playerId ? rolled : []
      const grantId = `${entity.id}_${now}_${r.playerId}`
      await this.persistGrant(grantId, r.playerId, shareExp, shareMoney, items)
      this.broadcastToPlayer(r.playerId, {
        type: 'loot_grant',
        grantId,
        exp: shareExp,
        money: shareMoney,
        items,
      })
    }

    if (entity.kind === 'boss' && entity.bossId) {
      const participantIds = [...new Set([
        ...recipients.map((r) => r.playerId),
        ...entity.contributors.keys(),
      ])]
      const lore = await this.persistBossKill(
        entity.bossId,
        killer.playerId,
        participantIds,
        entity.scenarioKey || '',
      )
      this.broadcast({
        type: 'world_event',
        kind: 'boss_killed',
        bossId: entity.bossId,
        killerPlayerId: killer.playerId,
        participantIds,
        loreText: lore,
      })
    }

    entity.contributors.clear()
  }

  private async apiPost(params: Record<string, string>) {
    const secret = this.env.COMBAT_GRANT_SECRET || this.env.PI_ORIGIN_SECRET || ''
    const body = new URLSearchParams({ ...params })
    const headers: Record<string, string> = {
      'content-type': 'application/x-www-form-urlencoded',
      'x-combat-grant-secret': secret,
    }

    const origin = this.env.PI_ORIGIN ? await this.env.PI_ORIGIN.get('url') : null
    const bases: string[] = []
    if (origin) bases.push(origin.replace(/\/$/, ''))
    if (this.env.PUBLIC_API_BASE) bases.push(this.env.PUBLIC_API_BASE.replace(/\/$/, ''))
    bases.push('https://zenith-frontier-worker.sealseapep.workers.dev')

    for (const base of bases) {
      try {
        const res = await fetch(`${base}/`, { method: 'POST', headers, body })
        const text = await res.text()
        if (text.startsWith('OK') || text.startsWith('ERROR|BOSS_ALREADY_DEAD') || text.startsWith('ERROR|GRANT_ALREADY')) {
          return text
        }
      } catch {
        /* try next */
      }
    }
    return 'ERROR|PERSIST_FAILED'
  }

  private async persistGrant(
    grantId: string,
    playerId: string,
    exp: number,
    money: number,
    items: string[],
  ) {
    return this.apiPost({
      action: 'grant_combat_reward',
      grant_id: grantId,
      player_id: playerId,
      exp: String(exp),
      money: String(money),
      items: items.join(','),
      mastery_gain: '12',
    })
  }

  private async persistBossKill(
    bossId: string,
    killerPlayerId: string,
    participantIds: string[],
    scenarioKey: string,
  ): Promise<string | undefined> {
    const text = await this.apiPost({
      action: 'kill_boss',
      player_id: killerPlayerId,
      boss_id: bossId,
      scenario_key: scenarioKey,
      participant_ids: participantIds.join(','),
    })
    if (text.startsWith('OK|BOSS_KILLED|')) {
      const parts = text.split('|')
      const loreIdx = parts.indexOf('LORE_UNLOCKED')
      if (loreIdx >= 0) return parts.slice(loreIdx + 1).join('|')
    }
    return undefined
  }
}

/** Minimal Durable Object interface for TS without workers types package. */
interface DurableObject {
  fetch(request: Request): Promise<Response>
  webSocketMessage?(ws: WebSocket, message: string | ArrayBuffer): void | Promise<void>
  webSocketClose?(ws: WebSocket, code: number, reason: string, wasClean: boolean): void | Promise<void>
  webSocketError?(ws: WebSocket, error: unknown): void | Promise<void>
}

interface DurableObjectState {
  acceptWebSocket(ws: WebSocket, tags?: string[]): void
  getWebSockets(tag?: string): WebSocket[]
}

interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId
  get(id: DurableObjectId): DurableObjectStub
}

interface DurableObjectId {
  toString(): string
}

interface DurableObjectStub {
  fetch(request: Request): Promise<Response>
}
