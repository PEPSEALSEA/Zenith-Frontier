import { API_URL } from '@/lib/config'
import {
  ZONE_PRESENCE_HZ,
  type ClientToZone,
  type ZoneEntitySeed,
  type ZoneToClient,
  parseZoneMessage,
} from '@/lib/zoneProtocol'

export type ZoneSocketHandlers = {
  onMessage: (msg: ZoneToClient) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (err: Event) => void
}

const PING_INTERVAL_MS = 2000

function wsBaseFromApi(apiUrl: string): string {
  const u = new URL(apiUrl)
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
  u.pathname = ''
  u.search = ''
  u.hash = ''
  return u.toString().replace(/\/$/, '')
}

export class ZoneSocket {
  private ws: WebSocket | null = null
  private mapId = 'world'
  private handlers: ZoneSocketHandlers | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private presenceTimer: ReturnType<typeof setInterval> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private shouldRun = false
  private joinPayload: Extract<ClientToZone, { type: 'join' }> | null = null
  private lastPresence = { x: 0, y: 0, facing: 1 }
  private intentionalClose = false
  private rttMs = 80
  private pendingPingAt = 0

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN
  }

  getRttMs() {
    return this.rttMs
  }

  connect(mapId: string, join: Extract<ClientToZone, { type: 'join' }>, handlers: ZoneSocketHandlers) {
    this.intentionalClose = false
    this.shouldRun = true
    this.mapId = mapId || 'world'
    this.joinPayload = join
    this.handlers = handlers
    this.lastPresence = { x: join.x, y: join.y, facing: join.facing }
    this.open()
  }

  private open() {
    if (!this.shouldRun) return
    this.clearReconnect()
    try {
      this.ws?.close()
    } catch {
      /* ignore */
    }
    const url = `${wsBaseFromApi(API_URL)}/ws/zone/${encodeURIComponent(this.mapId)}`
    const ws = new WebSocket(url)
    this.ws = ws

    ws.onopen = () => {
      if (this.joinPayload) this.send(this.joinPayload)
      this.startPresenceLoop()
      this.startPingLoop()
      this.handlers?.onOpen?.()
    }

    ws.onmessage = (ev) => {
      const msg = parseZoneMessage(String(ev.data))
      if (!msg || !('type' in msg)) return
      if (msg.type === 'pong') {
        if (this.pendingPingAt > 0 && typeof msg.t === 'number' && msg.t === this.pendingPingAt) {
          const sample = Math.max(1, performance.now() - this.pendingPingAt)
          this.rttMs = this.rttMs * 0.7 + sample * 0.3
          this.pendingPingAt = 0
        }
        return
      }
      this.handlers?.onMessage(msg as ZoneToClient)
    }

    ws.onerror = (err) => {
      this.handlers?.onError?.(err)
    }

    ws.onclose = () => {
      this.stopPresenceLoop()
      this.stopPingLoop()
      this.handlers?.onClose?.()
      if (this.shouldRun && !this.intentionalClose) {
        this.reconnectTimer = setTimeout(() => this.open(), 1500)
      }
    }
  }

  updateJoinEntities(entities: ZoneEntitySeed[]) {
    if (this.joinPayload) this.joinPayload = { ...this.joinPayload, entities }
  }

  setPresence(x: number, y: number, facing: number) {
    this.lastPresence = { x, y, facing }
  }

  sendChat(text: string) {
    this.send({ type: 'chat', text })
  }

  sendAttack(payload: Extract<ClientToZone, { type: 'attack' }>) {
    this.send(payload)
  }

  send(msg: ClientToZone) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  private startPresenceLoop() {
    this.stopPresenceLoop()
    const interval = Math.max(40, Math.floor(1000 / ZONE_PRESENCE_HZ))
    this.presenceTimer = setInterval(() => {
      this.send({
        type: 'presence',
        x: this.lastPresence.x,
        y: this.lastPresence.y,
        facing: this.lastPresence.facing,
      })
    }, interval)
  }

  private stopPresenceLoop() {
    if (this.presenceTimer) {
      clearInterval(this.presenceTimer)
      this.presenceTimer = null
    }
  }

  private startPingLoop() {
    this.stopPingLoop()
    const sendPing = () => {
      if (this.ws?.readyState !== WebSocket.OPEN) return
      const t = performance.now()
      this.pendingPingAt = t
      this.send({ type: 'ping', t })
    }
    sendPing()
    this.pingTimer = setInterval(sendPing, PING_INTERVAL_MS)
  }

  private stopPingLoop() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
    this.pendingPingAt = 0
  }

  private clearReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  disconnect() {
    this.intentionalClose = true
    this.shouldRun = false
    this.clearReconnect()
    this.stopPresenceLoop()
    this.stopPingLoop()
    try {
      this.ws?.close()
    } catch {
      /* ignore */
    }
    this.ws = null
  }
}

export const zoneSocket = new ZoneSocket()
