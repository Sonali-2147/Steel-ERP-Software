import crypto from 'node:crypto'
import os from 'node:os'
import { db } from './db.js'

// Licence keys are signed with a private key that never ships with the app.
// The matching public key below can only verify keys, not create them.
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEo7nAm0hv+IG/PXCPn0CiFhZJjPop
RURuOCyMKoR+JZAhW4s9f4xipml2YhGy74/3yuCpyWJ4FX3fq9xEAOlolQ==
-----END PUBLIC KEY-----`

const REASON_TEXT = {
  missing: 'This copy is not activated yet. Enter the licence key you received.',
  invalid: 'The saved licence key is not valid. Enter a new licence key.',
  machine: 'This licence key was issued for a different computer.',
  expired: 'Your licence has expired. Enter a new licence key to continue.',
  clock: 'The date on this computer looks wrong. Set the correct date and time, then open the app again.',
}

const dayNumber = (ymd) => Date.parse(`${ymd}T00:00:00Z`) / 86400000
const todayYmd = () => new Date().toISOString().slice(0, 10)

/** Identifies this computer; the licence key is issued for exactly this value. */
export function machineId() {
  const raw = [os.hostname(), os.cpus()[0]?.model || '', os.arch(), os.platform()].join('|')
  const hex = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16).toUpperCase()
  return hex.match(/.{4}/g).join('-')
}

const getValue = (name) => db.prepare('SELECT value FROM app_licence WHERE name = ?').get(name)?.value
const setValue = (name, value) => db.prepare(
  'INSERT INTO app_licence (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value',
).run(name, value)

class LicenceError extends Error {}

/** Returns the signed payload { client, machine, expires, issued } or throws LicenceError. */
function readKey(key) {
  const [body, signature] = String(key || '').replace(/\s+/g, '').split('.')
  if (!body || !signature) throw new LicenceError('That key is not valid. Check it and paste it again.')
  const bytes = Buffer.from(body, 'base64url')
  let verified = false
  try {
    verified = crypto.verify('sha256', bytes, { key: PUBLIC_KEY_PEM, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url'))
  } catch {
    verified = false
  }
  if (!verified) throw new LicenceError('That key is not valid. Check it and paste it again.')
  try {
    return JSON.parse(bytes.toString('utf8'))
  } catch {
    throw new LicenceError('That key is not valid. Check it and paste it again.')
  }
}

export function licenceStatus() {
  const id = machineId()
  const today = todayYmd()
  const lastSeen = getValue('last_seen')
  // Remember the latest date seen so winding the clock back cannot revive an expired key.
  if (!lastSeen || today > lastSeen) setValue('last_seen', today)

  const key = getValue('key')
  if (!key) return { valid: false, reason: 'missing', machineId: id }
  let payload
  try {
    payload = readKey(key)
  } catch {
    return { valid: false, reason: 'invalid', machineId: id }
  }
  const base = { machineId: id, client: payload.client, expires: payload.expires || null }
  if (payload.machine !== id) return { ...base, valid: false, reason: 'machine' }
  if (lastSeen && dayNumber(today) < dayNumber(lastSeen) - 1) return { ...base, valid: false, reason: 'clock' }
  const daysLeft = payload.expires ? dayNumber(payload.expires) - dayNumber(today) : null
  if (daysLeft !== null && daysLeft < 0) return { ...base, valid: false, reason: 'expired', daysLeft }
  return { ...base, valid: true, daysLeft }
}

export function setupLicence(app) {
  db.exec('CREATE TABLE IF NOT EXISTS app_licence (name TEXT PRIMARY KEY, value TEXT NOT NULL)')

  app.get('/api/licence/status', (req, res) => res.json(licenceStatus()))

  app.post('/api/licence/activate', (req, res) => {
    try {
      const key = String(req.body?.key || '').replace(/\s+/g, '')
      const payload = readKey(key)
      if (payload.machine !== machineId()) throw new LicenceError('This key was issued for a different computer. Send the Machine ID shown on this screen to get a matching key.')
      if (payload.expires && dayNumber(payload.expires) < dayNumber(todayYmd())) throw new LicenceError('This key has already expired. Ask for a new key.')
      setValue('key', key)
      res.json(licenceStatus())
    } catch (err) {
      res.status(err instanceof LicenceError ? 400 : 500).json({ error: err.message })
    }
  })

  // Everything else under /api needs a valid licence.
  app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next()
    const status = licenceStatus()
    if (status.valid) return next()
    res.status(403).json({ error: REASON_TEXT[status.reason], code: 'LICENCE', reason: status.reason })
  })
}
