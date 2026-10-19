import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db, initDb, transaction } from './db.js'
import { setupAuth } from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 5000

app.set('trust proxy', 1)
app.use(cors())
app.use(express.json({ limit: '10mb' }))

initDb()

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const route = (fn) => (req, res) => {
  try {
    const out = fn(req, res)
    if (out !== undefined) res.json(out)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
}

const today = () => new Date().toISOString().slice(0, 10)
const num = (v) => {
  const n = Number(String(v ?? '').replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}
const str = (v) => String(v ?? '').trim()

// ------------------------------------------------------------------
// Stock helpers: stock = opening stock + total in - total out
// ------------------------------------------------------------------
const STOCK_SQL = `
  i.opening_stock
  + COALESCE((SELECT SUM(l.qty) FROM entry_lines l JOIN entries e ON e.id = l.entry_id WHERE l.item_id = i.id AND e.type = 'IN'), 0)
  - COALESCE((SELECT SUM(l.qty) FROM entry_lines l JOIN entries e ON e.id = l.entry_id WHERE l.item_id = i.id AND e.type = 'OUT'), 0)
`

function stockOf(itemId) {
  const row = db.prepare(`SELECT ${STOCK_SQL} AS stock FROM items i WHERE i.id = ?`).get(itemId)
  return row ? row.stock : 0
}

function assertNoNegativeStock(itemIds) {
  for (const id of new Set(itemIds)) {
    const s = stockOf(id)
    if (s < -1e-9) {
      const item = db.prepare('SELECT name, unit FROM items WHERE id = ?').get(id)
      throw new HttpError(400, `Not enough stock for "${item.name}". This change would make stock ${round(s)} ${item.unit}.`)
    }
  }
}
const round = (n) => Math.round(n * 1000) / 1000

function nextItemCode() {
  const rows = db.prepare("SELECT code FROM items WHERE code LIKE 'ITM-%'").all()
  const max = rows.reduce((m, r) => Math.max(m, parseInt(r.code.slice(4), 10) || 0), 0)
  return `ITM-${String(max + 1).padStart(4, '0')}`
}

function nextEntryNo(type) {
  const prefix = type === 'IN' ? 'IN-' : 'OUT-'
  const rows = db.prepare('SELECT entry_no FROM entries WHERE type = ?').all(type)
  const max = rows.reduce((m, r) => Math.max(m, parseInt(r.entry_no.slice(prefix.length), 10) || 0), 0)
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

function nextBillNo() {
  const rows = db.prepare("SELECT bill_no FROM purchase_bills WHERE bill_no LIKE 'PB-%'").all()
  const max = rows.reduce((m, r) => Math.max(m, parseInt(r.bill_no.slice(3), 10) || 0), 0)
  return `PB-${String(max + 1).padStart(4, '0')}`
}

function nextInvoiceNo() {
  const rows = db.prepare("SELECT invoice_no FROM sales_invoices WHERE invoice_no LIKE 'INV-%'").all()
  const max = rows.reduce((m, r) => Math.max(m, parseInt(r.invoice_no.slice(4), 10) || 0), 0)
  return `INV-${String(max + 1).padStart(4, '0')}`
}

function nextQuotationNo() {
  const rows = db.prepare("SELECT quotation_no FROM quotations WHERE quotation_no LIKE 'QT-%'").all()
  const max = rows.reduce((m, r) => Math.max(m, parseInt(r.quotation_no.slice(3), 10) || 0), 0)
  return `QT-${String(max + 1).padStart(4, '0')}`
}

// ------------------------------------------------------------------
// Health
// ------------------------------------------------------------------
setupAuth(app)

app.get('/api/health', route(() => ({ status: 'ok' })))

// ------------------------------------------------------------------
// Items
// ------------------------------------------------------------------
const ITEM_SELECT = `SELECT i.*, (${STOCK_SQL}) AS stock FROM items i`

function cleanItem(body) {
  return {
    code: str(body.code),
    name: str(body.name),
    category: str(body.category),
    grade: str(body.grade),
    size: str(body.size),
    unit: str(body.unit) || 'kg',
    opening_stock: num(body.opening_stock),
    min_stock: num(body.min_stock),
    purchase_rate: num(body.purchase_rate),
    sale_rate: num(body.sale_rate),
  }
}

function insertItem(it) {
  const code = it.code || nextItemCode()
  const r = db.prepare(`
    INSERT INTO items (code, name, category, grade, size, unit, opening_stock, min_stock, purchase_rate, sale_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(code, it.name, it.category, it.grade, it.size, it.unit, it.opening_stock, it.min_stock, it.purchase_rate, it.sale_rate)
  return Number(r.lastInsertRowid)
}

function updateItem(id, it) {
  db.prepare(`
    UPDATE items SET code = ?, name = ?, category = ?, grade = ?, size = ?, unit = ?,
      opening_stock = ?, min_stock = ?, purchase_rate = ?, sale_rate = ?
    WHERE id = ?
  `).run(it.code, it.name, it.category, it.grade, it.size, it.unit, it.opening_stock, it.min_stock, it.purchase_rate, it.sale_rate, id)
}

app.get('/api/items', route(() => db.prepare(`${ITEM_SELECT} ORDER BY i.name COLLATE NOCASE`).all()))

app.post('/api/items', route((req, res) => {
  const it = cleanItem(req.body)
  if (!it.name) throw new HttpError(400, 'Item name is required')
  if (it.code && db.prepare('SELECT id FROM items WHERE code = ?').get(it.code)) {
    throw new HttpError(400, `Item code "${it.code}" already exists`)
  }
  const id = insertItem(it)
  res.status(201)
  return db.prepare(`${ITEM_SELECT} WHERE i.id = ?`).get(id)
}))

app.put('/api/items/:id', route((req) => {
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(id)
  if (!existing) throw new HttpError(404, 'Item not found')
  const it = cleanItem(req.body)
  if (!it.name) throw new HttpError(400, 'Item name is required')
  it.code = it.code || existing.code
  const dup = db.prepare('SELECT id FROM items WHERE code = ? AND id <> ?').get(it.code, id)
  if (dup) throw new HttpError(400, `Item code "${it.code}" already exists`)
  transaction(() => {
    updateItem(id, it)
    assertNoNegativeStock([id])
  })
  return db.prepare(`${ITEM_SELECT} WHERE i.id = ?`).get(id)
}))

app.patch('/api/items/:id/active', route((req) => {
  const id = Number(req.params.id)
  db.prepare('UPDATE items SET active = ? WHERE id = ?').run(req.body.active ? 1 : 0, id)
  return db.prepare(`${ITEM_SELECT} WHERE i.id = ?`).get(id)
}))

app.delete('/api/items/:id', route((req) => {
  const id = Number(req.params.id)
  const used = db.prepare('SELECT COUNT(*) AS c FROM entry_lines WHERE item_id = ?').get(id).c
  if (used > 0) throw new HttpError(400, 'This item has stock entries and cannot be deleted. Mark it inactive instead.')
  db.prepare('DELETE FROM items WHERE id = ?').run(id)
  return { success: true }
}))

/**
 * Bulk import. Body: { rows: [{ code, name, ... }], updateExisting: boolean }
 * Rows are matched to existing items by code (or by name when code is blank).
 */
app.post('/api/items/import', route((req) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : []
  const updateExisting = Boolean(req.body.updateExisting)
  if (rows.length === 0) throw new HttpError(400, 'No rows to import')

  const result = { created: 0, updated: 0, skipped: 0, errors: [] }
  const byCode = db.prepare('SELECT * FROM items WHERE code = ?')
  const byName = db.prepare('SELECT * FROM items WHERE name = ? COLLATE NOCASE')

  transaction(() => {
    rows.forEach((raw, idx) => {
      const rowNo = Number(raw.__row) || idx + 2
      const it = cleanItem(raw)
      if (!it.name) {
        result.errors.push({ row: rowNo, message: 'Item name is missing' })
        return
      }
      const existing = it.code ? byCode.get(it.code) : byName.get(it.name)
      if (existing) {
        if (!updateExisting) {
          result.skipped++
          return
        }
        const merged = { ...it, code: existing.code }
        for (const k of ['category', 'grade', 'size']) if (!str(raw[k])) merged[k] = existing[k]
        for (const k of ['unit']) if (!str(raw[k])) merged[k] = existing[k]
        for (const k of ['opening_stock', 'min_stock', 'purchase_rate', 'sale_rate']) if (str(raw[k]) === '') merged[k] = existing[k]
        updateItem(existing.id, merged)
        result.updated++
      } else {
        insertItem(it)
        result.created++
      }
    })
  })
  return result
}))

// ------------------------------------------------------------------
// Suppliers & Customers
// ------------------------------------------------------------------
function cleanParty(body) {
  return {
    name: str(body.name),
    contact_person: str(body.contact_person),
    phone: str(body.phone),
    email: str(body.email),
    address: str(body.address),
    city: str(body.city),
    gstin: str(body.gstin).toUpperCase(),
  }
}

app.get('/api/parties', route((req) => {
  const type = req.query.type
  const sql = `
    SELECT p.*, (SELECT COUNT(*) FROM entries e WHERE e.party_id = p.id) AS entry_count
    FROM parties p ${type ? 'WHERE p.type = ?' : ''} ORDER BY p.name COLLATE NOCASE`
  return type ? db.prepare(sql).all(type) : db.prepare(sql).all()
}))

app.post('/api/parties', route((req, res) => {
  const type = req.body.type
  if (type !== 'supplier' && type !== 'customer') throw new HttpError(400, 'Invalid type')
  const p = cleanParty(req.body)
  if (!p.name) throw new HttpError(400, 'Name is required')
  const r = db.prepare(`
    INSERT INTO parties (type, name, contact_person, phone, email, address, city, gstin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(type, p.name, p.contact_person, p.phone, p.email, p.address, p.city, p.gstin)
  res.status(201)
  return db.prepare('SELECT * FROM parties WHERE id = ?').get(Number(r.lastInsertRowid))
}))

app.put('/api/parties/:id', route((req) => {
  const id = Number(req.params.id)
  const p = cleanParty(req.body)
  if (!p.name) throw new HttpError(400, 'Name is required')
  db.prepare(`
    UPDATE parties SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, city = ?, gstin = ?
    WHERE id = ?
  `).run(p.name, p.contact_person, p.phone, p.email, p.address, p.city, p.gstin, id)
  return db.prepare('SELECT * FROM parties WHERE id = ?').get(id)
}))

app.patch('/api/parties/:id/active', route((req) => {
  const id = Number(req.params.id)
  db.prepare('UPDATE parties SET active = ? WHERE id = ?').run(req.body.active ? 1 : 0, id)
  return db.prepare('SELECT * FROM parties WHERE id = ?').get(id)
}))

app.delete('/api/parties/:id', route((req) => {
  const id = Number(req.params.id)
  const used = db.prepare('SELECT COUNT(*) AS c FROM entries WHERE party_id = ?').get(id).c
  if (used > 0) throw new HttpError(400, 'This party is used in stock entries and cannot be deleted. Mark it inactive instead.')
  db.prepare('DELETE FROM parties WHERE id = ?').run(id)
  return { success: true }
}))

// ------------------------------------------------------------------
// Stock In / Stock Out entries
// ------------------------------------------------------------------
function loadEntries(where = '', params = []) {
  const entries = db.prepare(`
    SELECT e.*, p.name AS party_name,
      (SELECT COALESCE(SUM(qty * rate), 0) FROM entry_lines WHERE entry_id = e.id) AS amount
    FROM entries e LEFT JOIN parties p ON p.id = e.party_id
    ${where}
    ORDER BY e.date DESC, e.id DESC
  `).all(...params)
  if (entries.length === 0) return []
  const ids = entries.map((e) => e.id)
  const lines = db.prepare(`
    SELECT l.*, i.code AS item_code, i.name AS item_name, i.unit
    FROM entry_lines l JOIN items i ON i.id = l.item_id
    WHERE l.entry_id IN (${ids.map(() => '?').join(',')})
    ORDER BY l.id
  `).all(...ids)
  const byEntry = new Map(ids.map((id) => [id, []]))
  for (const l of lines) byEntry.get(l.entry_id).push(l)
  return entries.map((e) => ({ ...e, lines: byEntry.get(e.id) }))
}

function validateEntry(body) {
  const type = body.type
  if (type !== 'IN' && type !== 'OUT') throw new HttpError(400, 'Invalid entry type')
  const lines = (Array.isArray(body.lines) ? body.lines : [])
    .map((l) => ({ item_id: Number(l.item_id), qty: num(l.qty), rate: num(l.rate) }))
    .filter((l) => l.item_id)
  if (lines.length === 0) throw new HttpError(400, 'Add at least one item')
  for (const l of lines) {
    if (!db.prepare('SELECT id FROM items WHERE id = ?').get(l.item_id)) throw new HttpError(400, 'Selected item not found')
    if (l.qty <= 0) throw new HttpError(400, 'Quantity must be greater than zero')
  }
  const partyId = body.party_id ? Number(body.party_id) : null
  return {
    type,
    date: str(body.date) || today(),
    party_id: partyId,
    reference: str(body.reference),
    note: str(body.note),
    lines,
  }
}

function insertLines(entryId, lines) {
  const ins = db.prepare('INSERT INTO entry_lines (entry_id, item_id, qty, rate) VALUES (?, ?, ?, ?)')
  for (const l of lines) ins.run(entryId, l.item_id, l.qty, l.rate)
}

app.get('/api/entries', route((req) => {
  const { type, from, to, party_id, q } = req.query
  const cond = []
  const params = []
  if (type) { cond.push('e.type = ?'); params.push(type) }
  if (from) { cond.push('e.date >= ?'); params.push(from) }
  if (to) { cond.push('e.date <= ?'); params.push(to) }
  if (party_id) { cond.push('e.party_id = ?'); params.push(Number(party_id)) }
  if (q) {
    cond.push(`(e.entry_no LIKE ? OR e.reference LIKE ? OR p.name LIKE ? OR EXISTS (
      SELECT 1 FROM entry_lines l JOIN items i ON i.id = l.item_id WHERE l.entry_id = e.id AND (i.name LIKE ? OR i.code LIKE ?)))`)
    const t = `%${q}%`
    params.push(t, t, t, t, t)
  }
  return loadEntries(cond.length ? `WHERE ${cond.join(' AND ')}` : '', params)
}))

app.get('/api/entries/next-no', route((req) => ({ entry_no: nextEntryNo(req.query.type === 'OUT' ? 'OUT' : 'IN') })))

app.post('/api/entries', route((req, res) => {
  const e = validateEntry(req.body)
  const id = transaction(() => {
    const entryNo = nextEntryNo(e.type)
    const r = db.prepare(`
      INSERT INTO entries (entry_no, type, date, party_id, reference, note) VALUES (?, ?, ?, ?, ?, ?)
    `).run(entryNo, e.type, e.date, e.party_id, e.reference, e.note)
    const entryId = Number(r.lastInsertRowid)
    insertLines(entryId, e.lines)
    if (e.type === 'OUT') assertNoNegativeStock(e.lines.map((l) => l.item_id))
    return entryId
  })
  res.status(201)
  return loadEntries('WHERE e.id = ?', [id])[0]
}))

app.put('/api/entries/:id', route((req) => {
  const id = Number(req.params.id)
  const old = db.prepare('SELECT * FROM entries WHERE id = ?').get(id)
  if (!old) throw new HttpError(404, 'Entry not found')
  const e = validateEntry({ ...req.body, type: old.type })
  transaction(() => {
    const oldItems = db.prepare('SELECT item_id FROM entry_lines WHERE entry_id = ?').all(id).map((r) => r.item_id)
    db.prepare('UPDATE entries SET date = ?, party_id = ?, reference = ?, note = ? WHERE id = ?')
      .run(e.date, e.party_id, e.reference, e.note, id)
    db.prepare('DELETE FROM entry_lines WHERE entry_id = ?').run(id)
    insertLines(id, e.lines)
    assertNoNegativeStock([...oldItems, ...e.lines.map((l) => l.item_id)])
  })
  return loadEntries('WHERE e.id = ?', [id])[0]
}))

app.delete('/api/entries/:id', route((req) => {
  const id = Number(req.params.id)
  transaction(() => {
    const items = db.prepare('SELECT item_id FROM entry_lines WHERE entry_id = ?').all(id).map((r) => r.item_id)
    db.prepare('DELETE FROM entries WHERE id = ?').run(id)
    assertNoNegativeStock(items)
  })
  return { success: true }
}))

// ------------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------------
app.get('/api/dashboard', route(() => {
  const items = db.prepare(`${ITEM_SELECT} WHERE i.active = 1`).all()
  const month = today().slice(0, 7)
  const monthTotals = db.prepare(`
    SELECT e.type, COUNT(DISTINCT e.id) AS entries, COALESCE(SUM(l.qty * l.rate), 0) AS amount
    FROM entries e JOIN entry_lines l ON l.entry_id = e.id
    WHERE substr(e.date, 1, 7) = ? GROUP BY e.type
  `).all(month)
  const pick = (t) => monthTotals.find((r) => r.type === t) || { entries: 0, amount: 0 }
  const low = items
    .filter((i) => i.stock <= i.min_stock)
    .sort((a, b) => a.stock - a.min_stock - (b.stock - b.min_stock))
  return {
    totalItems: items.length,
    stockValue: items.reduce((s, i) => s + Math.max(0, i.stock) * i.purchase_rate, 0),
    lowStockCount: low.length,
    lowStock: low.slice(0, 8),
    monthIn: pick('IN'),
    monthOut: pick('OUT'),
    suppliers: db.prepare("SELECT COUNT(*) AS c FROM parties WHERE type = 'supplier' AND active = 1").get().c,
    customers: db.prepare("SELECT COUNT(*) AS c FROM parties WHERE type = 'customer' AND active = 1").get().c,
    recent: loadEntries('WHERE e.id IN (SELECT id FROM entries ORDER BY date DESC, id DESC LIMIT 8)'),
    monthly: monthlyTrend(6),
    byCategory: valueByCategory(items, 6),
    topOut: db.prepare(`
      SELECT i.name, i.unit, SUM(l.qty) AS qty, SUM(l.qty * l.rate) AS amount
      FROM entry_lines l JOIN entries e ON e.id = l.entry_id JOIN items i ON i.id = l.item_id
      WHERE e.type = 'OUT' AND e.date >= date('now', '-90 days')
      GROUP BY i.id ORDER BY amount DESC, qty DESC LIMIT 5
    `).all(),
  }
}))

function monthlyTrend(n) {
  const now = new Date()
  const months = Array.from({ length: n }, (_, k) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - k), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const rows = db.prepare(`
    SELECT substr(e.date, 1, 7) AS month, e.type, COALESCE(SUM(l.qty * l.rate), 0) AS amount
    FROM entries e JOIN entry_lines l ON l.entry_id = e.id
    WHERE substr(e.date, 1, 7) >= ? GROUP BY month, e.type
  `).all(months[0])
  const get = (m, t) => rows.find((r) => r.month === m && r.type === t)?.amount ?? 0
  return months.map((m) => ({ month: m, in: get(m, 'IN'), out: get(m, 'OUT') }))
}

function valueByCategory(items, top) {
  const map = new Map()
  for (const i of items) {
    const v = Math.max(0, i.stock) * i.purchase_rate
    if (v > 0) map.set(i.category || 'Uncategorised', (map.get(i.category || 'Uncategorised') ?? 0) + v)
  }
  const sorted = [...map].map(([category, value]) => ({ category, value })).sort((a, b) => b.value - a.value)
  if (sorted.length <= top) return sorted
  const others = sorted.slice(top - 1).reduce((s, r) => s + r.value, 0)
  return [...sorted.slice(0, top - 1), { category: 'Others', value: others }]
}

// ------------------------------------------------------------------
// Reports
// ------------------------------------------------------------------

/** Stock summary for a period: opening, in, out and closing per item. */
app.get('/api/reports/stock-summary', route((req) => {
  const from = str(req.query.from) || '0000-01-01'
  const to = str(req.query.to) || '9999-12-31'
  const sumSql = (type, cond) => `COALESCE((SELECT SUM(l.qty) FROM entry_lines l JOIN entries e ON e.id = l.entry_id
    WHERE l.item_id = i.id AND e.type = '${type}' AND ${cond}), 0)`
  return db.prepare(`
    SELECT i.id, i.code, i.name, i.category, i.unit, i.min_stock, i.purchase_rate, i.active,
      i.opening_stock + ${sumSql('IN', 'e.date < ?')} - ${sumSql('OUT', 'e.date < ?')} AS opening,
      ${sumSql('IN', 'e.date BETWEEN ? AND ?')} AS qty_in,
      ${sumSql('OUT', 'e.date BETWEEN ? AND ?')} AS qty_out
    FROM items i
    ORDER BY i.name COLLATE NOCASE
  `).all(from, from, from, to, from, to).map((r) => ({ ...r, closing: r.opening + r.qty_in - r.qty_out }))
}))

/** Item ledger: every movement of one item with a running balance. */
app.get('/api/reports/item-ledger', route((req) => {
  const itemId = Number(req.query.item_id)
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId)
  if (!item) throw new HttpError(404, 'Item not found')
  const from = str(req.query.from) || '0000-01-01'
  const to = str(req.query.to) || '9999-12-31'
  const before = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN e.type = 'IN' THEN l.qty ELSE -l.qty END), 0) AS net
    FROM entry_lines l JOIN entries e ON e.id = l.entry_id WHERE l.item_id = ? AND e.date < ?
  `).get(itemId, from).net
  const opening = item.opening_stock + before
  let balance = opening
  const rows = db.prepare(`
    SELECT e.id AS entry_id, e.entry_no, e.type, e.date, e.reference, p.name AS party_name, l.qty, l.rate
    FROM entry_lines l JOIN entries e ON e.id = l.entry_id LEFT JOIN parties p ON p.id = e.party_id
    WHERE l.item_id = ? AND e.date BETWEEN ? AND ?
    ORDER BY e.date, e.id, l.id
  `).all(itemId, from, to).map((r) => {
    balance += r.type === 'IN' ? r.qty : -r.qty
    return { ...r, balance }
  })
  return { item, opening, closing: balance, rows }
}))

/** Line-level register of Stock In or Stock Out. */
app.get('/api/reports/register', route((req) => {
  const type = req.query.type === 'OUT' ? 'OUT' : 'IN'
  const cond = ['e.type = ?']
  const params = [type]
  if (req.query.from) { cond.push('e.date >= ?'); params.push(req.query.from) }
  if (req.query.to) { cond.push('e.date <= ?'); params.push(req.query.to) }
  if (req.query.party_id) { cond.push('e.party_id = ?'); params.push(Number(req.query.party_id)) }
  if (req.query.item_id) { cond.push('l.item_id = ?'); params.push(Number(req.query.item_id)) }
  return db.prepare(`
    SELECT e.id AS entry_id, e.entry_no, e.date, e.reference, p.name AS party_name,
      i.code AS item_code, i.name AS item_name, i.unit, l.qty, l.rate, l.qty * l.rate AS amount
    FROM entry_lines l JOIN entries e ON e.id = l.entry_id JOIN items i ON i.id = l.item_id
    LEFT JOIN parties p ON p.id = e.party_id
    WHERE ${cond.join(' AND ')}
    ORDER BY e.date DESC, e.id DESC, l.id
  `).all(...params)
}))

// ------------------------------------------------------------------
// Purchase Bills
// ------------------------------------------------------------------

app.get('/api/purchase-bills', route((req) => {
  const cond = []
  const params = []
  if (req.query.from) { cond.push('b.date >= ?'); params.push(req.query.from) }
  if (req.query.to) { cond.push('b.date <= ?'); params.push(req.query.to) }
  if (req.query.supplier_id) { cond.push('b.supplier_id = ?'); params.push(Number(req.query.supplier_id)) }
  return db.prepare(`
    SELECT b.*, p.name AS supplier_name
    FROM purchase_bills b LEFT JOIN parties p ON p.id = b.supplier_id
    ${cond.length ? 'WHERE ' + cond.join(' AND ') : ''}
    ORDER BY b.date DESC, b.id DESC
  `).all(...params)
}))

app.get('/api/purchase-bills/:id', route((req) => {
  const bill = db.prepare(`
    SELECT b.*, p.name AS supplier_name, p.contact_person, p.phone, p.email, p.address, p.city, p.gstin
    FROM purchase_bills b LEFT JOIN parties p ON p.id = b.supplier_id
    WHERE b.id = ?
  `).get(Number(req.params.id))
  if (!bill) throw new HttpError(404, 'Purchase bill not found')
  const lines = db.prepare(`
    SELECT l.*, i.code, i.name, i.unit
    FROM purchase_bill_lines l JOIN items i ON i.id = l.item_id
    WHERE l.bill_id = ?
    ORDER BY l.id
  `).all(bill.id)
  return { ...bill, lines }
}))

app.post('/api/purchase-bills', route((req) => {
  const body = req.body
  const supplier = db.prepare('SELECT id FROM parties WHERE id = ? AND type = ?').get(Number(body.supplier_id), 'supplier')
  if (!supplier) throw new HttpError(400, 'Invalid supplier')
  if (!body.lines || !Array.isArray(body.lines) || body.lines.length === 0) {
    throw new HttpError(400, 'At least one item is required')
  }

  return transaction(() => {
    const billNo = body.bill_no || nextBillNo()
    const subtotal = body.lines.reduce((s, l) => s + (num(l.qty) * num(l.rate)), 0)
    const tax = num(body.tax)
    const discount = num(body.discount)
    const total = subtotal + tax - discount

    const info = db.prepare(`
      INSERT INTO purchase_bills (bill_no, date, supplier_id, reference, note, subtotal, tax, discount, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(billNo, str(body.date) || today(), Number(body.supplier_id), str(body.reference), str(body.note), subtotal, tax, discount, total)

    const insertLine = db.prepare(`
      INSERT INTO purchase_bill_lines (bill_id, item_id, qty, rate, amount)
      VALUES (?, ?, ?, ?, ?)
    `)
    for (const line of body.lines) {
      const amount = num(line.qty) * num(line.rate)
      insertLine.run(info.lastInsertRowid, Number(line.item_id), num(line.qty), num(line.rate), amount)
    }

    return { id: info.lastInsertRowid, bill_no: billNo }
  })
}))

app.delete('/api/purchase-bills/:id', route((req) => {
  const bill = db.prepare('SELECT id FROM purchase_bills WHERE id = ?').get(Number(req.params.id))
  if (!bill) throw new HttpError(404, 'Purchase bill not found')
  db.prepare('DELETE FROM purchase_bills WHERE id = ?').run(bill.id)
  return { success: true }
}))

// ------------------------------------------------------------------
// Sales Invoices
// ------------------------------------------------------------------

app.get('/api/sales-invoices', route((req) => {
  const cond = []
  const params = []
  if (req.query.from) { cond.push('i.date >= ?'); params.push(req.query.from) }
  if (req.query.to) { cond.push('i.date <= ?'); params.push(req.query.to) }
  if (req.query.customer_id) { cond.push('i.customer_id = ?'); params.push(Number(req.query.customer_id)) }
  return db.prepare(`
    SELECT i.*, p.name AS customer_name
    FROM sales_invoices i LEFT JOIN parties p ON p.id = i.customer_id
    ${cond.length ? 'WHERE ' + cond.join(' AND ') : ''}
    ORDER BY i.date DESC, i.id DESC
  `).all(...params)
}))

app.get('/api/sales-invoices/:id', route((req) => {
  const invoice = db.prepare(`
    SELECT i.*, p.name AS customer_name, p.contact_person, p.phone, p.email, p.address, p.city, p.gstin
    FROM sales_invoices i LEFT JOIN parties p ON p.id = i.customer_id
    WHERE i.id = ?
  `).get(Number(req.params.id))
  if (!invoice) throw new HttpError(404, 'Sales invoice not found')
  const lines = db.prepare(`
    SELECT l.*, i.code, i.name, i.unit
    FROM sales_invoice_lines l JOIN items i ON i.id = l.item_id
    WHERE l.invoice_id = ?
    ORDER BY l.id
  `).all(invoice.id)
  return { ...invoice, lines }
}))

app.post('/api/sales-invoices', route((req) => {
  const body = req.body
  const customer = db.prepare('SELECT id FROM parties WHERE id = ? AND type = ?').get(Number(body.customer_id), 'customer')
  if (!customer) throw new HttpError(400, 'Invalid customer')
  if (!body.lines || !Array.isArray(body.lines) || body.lines.length === 0) {
    throw new HttpError(400, 'At least one item is required')
  }

  return transaction(() => {
    const invoiceNo = body.invoice_no || nextInvoiceNo()
    const subtotal = body.lines.reduce((s, l) => s + (num(l.qty) * num(l.rate)), 0)
    const tax = num(body.tax)
    const discount = num(body.discount)
    const total = subtotal + tax - discount

    const info = db.prepare(`
      INSERT INTO sales_invoices (invoice_no, date, customer_id, reference, note, subtotal, tax, discount, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(invoiceNo, str(body.date) || today(), Number(body.customer_id), str(body.reference), str(body.note), subtotal, tax, discount, total)

    const insertLine = db.prepare(`
      INSERT INTO sales_invoice_lines (invoice_id, item_id, qty, rate, amount)
      VALUES (?, ?, ?, ?, ?)
    `)
    for (const line of body.lines) {
      const amount = num(line.qty) * num(line.rate)
      insertLine.run(info.lastInsertRowid, Number(line.item_id), num(line.qty), num(line.rate), amount)
    }

    return { id: info.lastInsertRowid, invoice_no: invoiceNo }
  })
}))

app.delete('/api/sales-invoices/:id', route((req) => {
  const invoice = db.prepare('SELECT id FROM sales_invoices WHERE id = ?').get(Number(req.params.id))
  if (!invoice) throw new HttpError(404, 'Sales invoice not found')
  db.prepare('DELETE FROM sales_invoices WHERE id = ?').run(invoice.id)
  return { success: true }
}))

// ------------------------------------------------------------------
// Billing Reports
// ------------------------------------------------------------------

app.get('/api/reports/purchase-register', route((req) => {
  const cond = []
  const params = []
  if (req.query.from) { cond.push('b.date >= ?'); params.push(req.query.from) }
  if (req.query.to) { cond.push('b.date <= ?'); params.push(req.query.to) }
  if (req.query.supplier_id) { cond.push('b.supplier_id = ?'); params.push(Number(req.query.supplier_id)) }
  return db.prepare(`
    SELECT b.bill_no, b.date, p.name AS supplier_name, b.reference, b.subtotal, b.tax, b.discount, b.total
    FROM purchase_bills b LEFT JOIN parties p ON p.id = b.supplier_id
    ${cond.length ? 'WHERE ' + cond.join(' AND ') : ''}
    ORDER BY b.date DESC, b.id DESC
  `).all(...params)
}))

app.get('/api/reports/sales-register', route((req) => {
  const cond = []
  const params = []
  if (req.query.from) { cond.push('i.date >= ?'); params.push(req.query.from) }
  if (req.query.to) { cond.push('i.date <= ?'); params.push(req.query.to) }
  if (req.query.customer_id) { cond.push('i.customer_id = ?'); params.push(Number(req.query.customer_id)) }
  return db.prepare(`
    SELECT i.invoice_no, i.date, p.name AS customer_name, i.reference, i.subtotal, i.tax, i.discount, i.total
    FROM sales_invoices i LEFT JOIN parties p ON p.id = i.customer_id
    ${cond.length ? 'WHERE ' + cond.join(' AND ') : ''}
    ORDER BY i.date DESC, i.id DESC
  `).all(...params)
}))

// ------------------------------------------------------------------
// Quotations
// ------------------------------------------------------------------

app.get('/api/quotations', route((req) => {
  const cond = []
  const params = []
  if (req.query.from) { cond.push('q.date >= ?'); params.push(req.query.from) }
  if (req.query.to) { cond.push('q.date <= ?'); params.push(req.query.to) }
  if (req.query.supplier_id) { cond.push('q.supplier_id = ?'); params.push(Number(req.query.supplier_id)) }
  if (req.query.status) { cond.push('q.status = ?'); params.push(req.query.status) }
  return db.prepare(`
    SELECT q.*, p.name AS supplier_name
    FROM quotations q LEFT JOIN parties p ON p.id = q.supplier_id
    ${cond.length ? 'WHERE ' + cond.join(' AND ') : ''}
    ORDER BY q.date DESC, q.id DESC
  `).all(...params)
}))

app.get('/api/quotations/:id', route((req) => {
  const quotation = db.prepare(`
    SELECT q.*, p.name AS supplier_name, p.contact_person, p.phone, p.email, p.address, p.city, p.gstin
    FROM quotations q LEFT JOIN parties p ON p.id = q.supplier_id
    WHERE q.id = ?
  `).get(Number(req.params.id))
  if (!quotation) throw new HttpError(404, 'Quotation not found')
  const lines = db.prepare(`
    SELECT l.*, i.code, i.name, i.unit
    FROM quotation_lines l JOIN items i ON i.id = l.item_id
    WHERE l.quotation_id = ?
    ORDER BY l.id
  `).all(quotation.id)
  return { ...quotation, lines }
}))

app.post('/api/quotations', route((req) => {
  const body = req.body
  const supplier = db.prepare('SELECT id FROM parties WHERE id = ? AND type = ?').get(Number(body.supplier_id), 'supplier')
  if (!supplier) throw new HttpError(400, 'Invalid supplier')
  if (!body.lines || !Array.isArray(body.lines) || body.lines.length === 0) {
    throw new HttpError(400, 'At least one item is required')
  }

  return transaction(() => {
    const quotationNo = body.quotation_no || nextQuotationNo()
    const subtotal = body.lines.reduce((s, l) => s + (num(l.qty) * num(l.rate)), 0)
    const tax = num(body.tax)
    const discount = num(body.discount)
    const total = subtotal + tax - discount

    const info = db.prepare(`
      INSERT INTO quotations (quotation_no, date, supplier_id, reference, note, subtotal, tax, discount, total, valid_until, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(quotationNo, str(body.date) || today(), Number(body.supplier_id), str(body.reference), str(body.note), subtotal, tax, discount, total, str(body.valid_until) || '', str(body.status) || 'pending')

    const insertLine = db.prepare(`
      INSERT INTO quotation_lines (quotation_id, item_id, qty, rate, amount)
      VALUES (?, ?, ?, ?, ?)
    `)
    for (const line of body.lines) {
      const amount = num(line.qty) * num(line.rate)
      insertLine.run(info.lastInsertRowid, Number(line.item_id), num(line.qty), num(line.rate), amount)
    }

    return { id: info.lastInsertRowid, quotation_no: quotationNo }
  })
}))

app.delete('/api/quotations/:id', route((req) => {
  const quotation = db.prepare('SELECT id FROM quotations WHERE id = ?').get(Number(req.params.id))
  if (!quotation) throw new HttpError(404, 'Quotation not found')
  db.prepare('DELETE FROM quotations WHERE id = ?').run(quotation.id)
  return { success: true }
}))

// ------------------------------------------------------------------
// Serve the built frontend (production)
// ------------------------------------------------------------------
const distDir = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`Krishna Steel Center running at http://localhost:${PORT}`)
})
