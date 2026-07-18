export type SpriteName = 'house' | 'market' | 'inn' | 'gate' | 'tree'

/** Matches next.config.ts basePath (local next dev + GitHub Pages). */
const BASE_PATH = '/Zenith-Frontier'

const sprites = new Map<SpriteName, HTMLImageElement>()

export function preloadSprites() {
  if (typeof window === 'undefined') return
  const names: SpriteName[] = ['house', 'market', 'inn', 'gate', 'tree']
  for (const n of names) {
    if (sprites.has(n)) continue
    const img = new Image()
    img.src = `${BASE_PATH}/sprites/${n}.png`
    sprites.set(n, img)
  }
}

export function getSprite(name: SpriteName): HTMLImageElement | null {
  const img = sprites.get(name)
  if (!img || !img.complete || img.naturalWidth === 0) return null
  return img
}

/** Draws a sprite centered at (0,0) in current transform, feet resting at y = baseY. */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  name: SpriteName,
  targetWidth: number,
  baseY = 0,
): boolean {
  const img = getSprite(name)
  if (!img) return false
  const scale = targetWidth / img.naturalWidth
  const h = img.naturalHeight * scale
  ctx.drawImage(img, -targetWidth / 2, baseY - h, targetWidth, h)
  return true
}
