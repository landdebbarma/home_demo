import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { db } from './db.js'

const scryptAsync = promisify(scrypt)
const N = 2 ** 15
const SCRYPT_OPTS = { N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
const SESSION_DAYS = 7
export const COOKIE = 'tca_session'
const SECURE = process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === '1'

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const key = await scryptAsync(password, salt, 64, SCRYPT_OPTS)
  return `scrypt$${N}$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(password, stored) {
  const [, n, salt, hash] = stored.split('$')
  const expected = Buffer.from(hash, 'base64')
  const key = await scryptAsync(password, Buffer.from(salt, 'base64'), expected.length, { ...SCRYPT_OPTS, N: Number(n) })
  return timingSafeEqual(key, expected)
}

/** Create the single admin account from env on first start. Never overwrites an existing admin. */
export async function bootstrapAdmin() {
  if (db.prepare('SELECT 1 FROM admin').get()) return
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn('[auth] No admin account yet. Set ADMIN_EMAIL and ADMIN_PASSWORD (see .env.example) and restart.')
    return
  }
  if (ADMIN_PASSWORD.length < 10) throw new Error('ADMIN_PASSWORD must be at least 10 characters.')
  db.prepare('INSERT INTO admin (id, email, pass_hash) VALUES (1, ?, ?)').run(ADMIN_EMAIL.trim().toLowerCase(), await hashPassword(ADMIN_PASSWORD))
  console.log(`[auth] Admin account created for ${ADMIN_EMAIL}. You can now remove ADMIN_PASSWORD from the environment.`)
}

const sha = (s) => createHash('sha256').update(s).digest('hex')

export function createSession() {
  const token = randomBytes(32).toString('base64url')
  const expires = Date.now() + SESSION_DAYS * 864e5
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now())
  db.prepare('INSERT INTO sessions (token_hash, expires_at) VALUES (?, ?)').run(sha(token), expires)
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}${SECURE ? '; Secure' : ''}`
}

export const clearCookie = `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${SECURE ? '; Secure' : ''}`

function tokenFrom(req) {
  const m = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`))
  return m ? m[1] : null
}

export function isAuthed(req) {
  const t = tokenFrom(req)
  if (!t) return false
  const row = db.prepare('SELECT expires_at FROM sessions WHERE token_hash = ?').get(sha(t))
  return Boolean(row && row.expires_at > Date.now())
}

export function destroySession(req) {
  const t = tokenFrom(req)
  if (t) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(t))
}

export function destroyAllSessions() {
  db.prepare('DELETE FROM sessions').run()
}

// ponytail: in-memory limiter, resets on restart and is per-process; move to the DB if running several instances.
const attempts = new Map() // key -> { fails, first, lockedUntil }
const WINDOW = 15 * 60e3
const MAX_PER_IP = 5
const MAX_TOTAL = 25 // across all IPs, guards against distributed guessing

function bucket(key) {
  let b = attempts.get(key)
  if (!b || Date.now() - b.first > WINDOW) attempts.set(key, (b = { fails: 0, first: Date.now(), lockedUntil: 0 }))
  return b
}

/** Returns seconds to wait, or 0 if a login attempt is allowed. */
export function loginBlockedFor(ip) {
  const now = Date.now()
  const wait = Math.max(bucket(`ip:${ip}`).lockedUntil, bucket('all').lockedUntil) - now
  return wait > 0 ? Math.ceil(wait / 1000) : 0
}

export function recordLoginFailure(ip) {
  for (const [key, max] of [[`ip:${ip}`, MAX_PER_IP], ['all', MAX_TOTAL]]) {
    const b = bucket(key)
    if (++b.fails >= max) b.lockedUntil = Date.now() + WINDOW
  }
}

export function recordLoginSuccess(ip) {
  attempts.delete(`ip:${ip}`)
}

/** Generic fixed-window limiter for public endpoints (e.g. enquiries). */
export function rateLimit(key, max, windowMs) {
  const b = attempts.get(key)
  const now = Date.now()
  if (!b || now - b.first > windowMs) {
    attempts.set(key, { fails: 1, first: now, lockedUntil: 0 })
    return true
  }
  return ++b.fails <= max
}
