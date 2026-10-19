import crypto from 'node:crypto'
import { db } from './db.js'

const SESSION_DAYS = 7
const MAX_FAILS = 10
const FAIL_WINDOW_MS = 15 * 60 * 1000
const fails = new Map()

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  const expected = Buffer.from(hash, 'hex')
  const actual = crypto.scryptSync(password, salt, 64)
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

function initAuth() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );
  `)
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM users').get()
  if (c === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin'
    const password = process.env.ADMIN_PASSWORD || 'admin123'
    db.prepare('INSERT INTO users (username, name, password_hash) VALUES (?, ?, ?)').run(username, 'Administrator', hashPassword(password))
    console.log(`Created admin user "${username}"${process.env.ADMIN_PASSWORD ? '' : ' with default password – change it after first login'}`)
  }
  db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run()
}

function requireAuth(req, res, next) {
  if (req.path === '/health') return next()
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const user = token && db.prepare(`
    SELECT u.id, u.username, u.name FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(token)
  if (!user) return res.status(401).json({ error: 'Please log in again' })
  req.user = user
  req.token = token
  next()
}

/** Registers /api/auth routes and protects every other /api route. Call before defining API routes. */
export function setupAuth(app) {
  initAuth()

  app.post('/api/auth/login', (req, res) => {
    const ip = req.ip
    const f = fails.get(ip)
    if (f && f.count >= MAX_FAILS && Date.now() - f.first < FAIL_WINDOW_MS) {
      return res.status(429).json({ error: 'Too many failed attempts. Try again in 15 minutes.' })
    }
    const { username, password } = req.body || {}
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username || '').trim())
    if (!user || !verifyPassword(String(password || ''), user.password_hash)) {
      const cur = f && Date.now() - f.first < FAIL_WINDOW_MS ? f : { count: 0, first: Date.now() }
      fails.set(ip, { ...cur, count: cur.count + 1 })
      return res.status(401).json({ error: 'Wrong username or password' })
    }
    fails.delete(ip)
    const token = crypto.randomBytes(32).toString('hex')
    db.prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+${SESSION_DAYS} days'))`).run(token, user.id)
    res.json({ token, user: { id: user.id, username: user.username, name: user.name } })
  })

  app.use('/api', requireAuth)

  app.get('/api/auth/me', (req, res) => res.json(req.user))

  app.post('/api/auth/logout', (req, res) => {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token)
    res.json({ success: true })
  })

  app.post('/api/auth/change-password', (req, res) => {
    const { currentPassword, newPassword } = req.body || {}
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
    if (!verifyPassword(String(currentPassword || ''), user.password_hash)) return res.status(400).json({ error: 'Current password is wrong' })
    if (String(newPassword || '').length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' })
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(String(newPassword)), user.id)
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(user.id, req.token)
    res.json({ success: true })
  })
}
