import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

function readStdin() {
  try {
    return readFileSync(0, 'utf8')
  } catch {
    return '{}'
  }
}

function gitPorcelain() {
  try {
    return execSync('git status --porcelain', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

function changedPaths(porcelain) {
  return porcelain
    .split(/\r?\n/)
    .map((line) => line.slice(3).trim().replace(/^.* -> /, ''))
    .filter(Boolean)
}

const raw = readStdin()
let input = {}
try {
  input = JSON.parse(raw || '{}')
} catch {
  input = {}
}

const status = input.status || ''
const loopCount = Number(input.loop_count || 0)

if (status !== 'completed' || loopCount > 0) {
  process.stdout.write('{}')
  process.exit(0)
}

const porcelain = gitPorcelain()
if (!porcelain) {
  process.stdout.write('{}')
  process.exit(0)
}

const paths = changedPaths(porcelain)
const workerTouched = paths.some((p) => p === 'worker' || p.startsWith('worker/'))
const piTouched = paths.some((p) => p === 'pi-server' || p.startsWith('pi-server/'))

const followup = [
  'SHIP WORKFLOW (Zenith Frontier project rule): uncommitted changes detected.',
  'If this turn finished intentional code work (not Q&A / not incomplete mid-debug), ship now:',
  '1) git commit + push relevant files (no secrets)',
  workerTouched
    ? '2) Worker paths changed → run: cd worker; npx wrangler deploy'
    : '2) Worker unchanged → skip wrangler deploy',
  piTouched
    ? '3) pi-server paths changed → run: powershell -File pi-server/deploy/push-to-pi.ps1 (this Pi project only)'
    : '3) pi-server unchanged → skip Pi deploy',
  'If work is incomplete or this was discussion-only, reply "skip ship" and do nothing else.',
].join('\n')

process.stdout.write(JSON.stringify({ followup_message: followup }))
