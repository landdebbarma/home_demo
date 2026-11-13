// Single-admin auth with no database:
// - the password is stored only as an scrypt hash in ADMIN_PASSWORD_HASH (see scripts/hash-password.mjs)
// - sessions are HMAC-signed cookies (SESSION_SECRET); a fingerprint of the password hash is embedded,
//   so changing the password signs out every device. Rotating SESSION_SECRET does the same.
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
const N = 2 ** 15
const OPTS = { N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
export const COOKIE = 'tca_session'
const SESSION_HOURS = 24 * 7

const secure = () => process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const key = await scryptAsync(password, salt, 64, OPTS)
  // ":" separators (not "$") so the value survives .env variable expansion.
  return `scrypt:${N}:${salt.toString('base64')}:${key.toString('base64')}`
}

async function verifyPassword(password, stored) {
  const [kind, n, salt, hash] = String(stored).split(':')
  if (kind !== 'scrypt' || !hash) return false
  const expected = Buffer.from(hash, 'base64')
  const key = await scryptAsync(password, Buffer.from(salt, 'base64'), expected.length, { ...OPTS, N: Number(n) })
  return timingSafeEqual(key, expected)
}

function config() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD_HASH, SESSION_SECRET } = process.env
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH || !SESSION_SECRET || SESSION_SECRET.length < 32) return null
  return { email: ADMIN_EMAIL.trim().toLowerCase(), hash: ADMIN_PASSWORD_HASH.trim(), secret: SESSION_SECRET }
}
export const configured = () => Boolean(config())

export async function checkCredentials(email, password) {
  const c = config()
  if (!c || typeof password !== 'string' || typeof email !== 'string') return false
  // Always run the hash so timing doesn't reveal whether the email matched.
  const ok = await verifyPassword(password, c.hash)
  return ok && email.trim().toLowerCase() === c.email
}

const fingerprint = (c) => createHash('sha256').update(c.hash).digest('base64url').slice(0, 12)
const sign = (payload, secret) => createHmac('sha256', secret).update(payload).digest('base64url')

export function sessionCookie() {
  const c = config()
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600e3, fp: fingerprint(c) })).toString('base64url')
  return `${COOKIE}=${payload}.${sign(payload, c.secret)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}${secure() ? '; Secure' : ''}`
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure() ? '; Secure' : ''}`

export function isAuthed(request) {
  const c = config()
  const m = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([\\w-]+)\\.([\\w-]+)`))
  if (!c || !m) return false
  const expected = Buffer.from(sign(m[1], c.secret))
  const given = Buffer.from(m[2])
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false
  try {
    const { exp, fp } = JSON.parse(Buffer.from(m[1], 'base64url').toString())
    return exp > Date.now() && fp === fingerprint(c)
  } catch {
    return false
  }
}

// ponytail: per-instance memory; serverless instances don't share it, so it slows guessing rather than
// guaranteeing a global limit. Pair with a Vercel Firewall rate-limit rule on /api/admin/login (see README).
const attempts = new Map()
const WINDOW = 15 * 60e3
function bucket(key) {
  let b = attempts.get(key)
  if (!b || Date.now() - b.first > WINDOW) attempts.set(key, (b = { fails: 0, first: Date.now(), until: 0 }))
  return b
}
export function blockedFor(ip) {
  const wait = Math.max(bucket(`ip:${ip}`).until, bucket('all').until) - Date.now()
  return wait > 0 ? Math.ceil(wait / 1000) : 0
}
export function recordFailure(ip) {
  for (const [key, max] of [[`ip:${ip}`, 5], ['all', 25]]) {
    const b = bucket(key)
    if (++b.fails >= max) b.until = Date.now() + WINDOW
  }
}
export const recordSuccess = (ip) => attempts.delete(`ip:${ip}`)
