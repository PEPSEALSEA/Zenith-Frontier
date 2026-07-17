/**
 * Live API:
 * - Public (anyone on the internet): Cloudflare Worker proxies to Pi
 * - Home LAN: can use Pi directly http://192.168.1.59:8788
 */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://zenith-frontier-worker.sealseapep.workers.dev'
