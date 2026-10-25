import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { clientItems } from './client_items.js'
import { initBackup as initDbBackup, backupDatabase } from './dbBackup.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const preferredDataDirs = [
  process.env.DATA_DIR,
  process.env.RENDER ? '/data' : undefined,
  path.join(__dirname, 'data'),
  path.join(process.cwd(), 'server', 'data'),
  path.join(process.cwd(), 'data'),
  '/tmp/steel-erp-data',
].filter(Boolean)

function resolveDataDir() {
  for (const candidate of preferredDataDirs) {
    try {
      fs.mkdirSync(candidate, { recursive: true })
      const probeFile = path.join(candidate, '.write-test')
      fs.writeFileSync(probeFile, 'ok')
      fs.unlinkSync(probeFile)
      return candidate
    } catch {
      // fall through to the next writable candidate
    }
  }

  const fallbackDir = path.join(__dirname, 'data')
  fs.mkdirSync(fallbackDir, { recursive: true })
  return fallbackDir
}

const dataDir = resolveDataDir()
console.log(`Using data directory: ${dataDir}`)
console.log(`DATA_DIR env var: ${process.env.DATA_DIR}`)
console.log(`RENDER env var: ${process.env.RENDER}`)
if (process.env.DATA_DIR && dataDir !== process.env.DATA_DIR) {
  console.warn(`DATA_DIR ${process.env.DATA_DIR} is not writable; using ${dataDir} instead.`)
} else if (process.env.RENDER && dataDir !== '/data') {
  console.warn(`Render data directory /data is not writable; using ${dataDir} instead.`)
}

const legacyDataDir = path.join(__dirname, 'data')
const activeDbPath = path.join(dataDir, 'erp.db')
const legacyDbPath = path.join(legacyDataDir, 'erp.db')

function migrateLegacyDbIfNeeded() {
  if (!fs.existsSync(legacyDbPath)) return
  if (fs.existsSync(activeDbPath) && fs.statSync(activeDbPath).size > 0) return

  try {
    fs.mkdirSync(path.dirname(activeDbPath), { recursive: true })
    fs.copyFileSync(legacyDbPath, activeDbPath)
    console.warn(`Migrated existing database from ${legacyDbPath} to ${activeDbPath}.`)
  } catch (error) {
    console.warn(`Could not migrate legacy database: ${error.message}`)
  }
}

migrateLegacyDbIfNeeded()

// Initialize backup system (non-blocking)
initDbBackup(activeDbPath).catch(err => console.error('Backup init failed:', err))

export const db = new DatabaseSync(activeDbPath)
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;')
console.log(`Database initialized at: ${activeDbPath}`)

function ensureColumn(tableName, columnName, columnDef) {
  const exists = db.prepare(`PRAGMA table_info(${tableName})`).all()
  const hasColumn = exists.some((col) => col.name === columnName)
  if (!hasColumn) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`)
  }
}

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      grade TEXT NOT NULL DEFAULT '',
      size TEXT NOT NULL DEFAULT '',
      unit TEXT NOT NULL DEFAULT 'kg',
      hsn_code TEXT NOT NULL DEFAULT '',
      gst_rate REAL NOT NULL DEFAULT 0,
      opening_stock REAL NOT NULL DEFAULT 0,
      min_stock REAL NOT NULL DEFAULT 0,
      purchase_rate REAL NOT NULL DEFAULT 0,
      sale_rate REAL NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS parties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('supplier', 'customer')),
      name TEXT NOT NULL,
      contact_person TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      gstin TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_no TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK (type IN ('IN', 'OUT')),
      date TEXT NOT NULL,
      party_id INTEGER REFERENCES parties(id),
      reference TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS entry_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id),
      qty REAL NOT NULL CHECK (qty > 0),
      rate REAL NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_lines_item ON entry_lines(item_id);
    CREATE INDEX IF NOT EXISTS idx_lines_entry ON entry_lines(entry_id);
    CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);

    CREATE TABLE IF NOT EXISTS purchase_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_no TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      supplier_id INTEGER REFERENCES parties(id),
      reference TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      subtotal REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      loading_amount REAL NOT NULL DEFAULT 0,
      unloading_amount REAL NOT NULL DEFAULT 0,
      freight_amount REAL NOT NULL DEFAULT 0,
      total_kg REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_bill_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL REFERENCES purchase_bills(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id),
      qty REAL NOT NULL CHECK (qty > 0),
      rate REAL NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sales_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      customer_id INTEGER REFERENCES parties(id),
      reference TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      subtotal REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      loading_amount REAL NOT NULL DEFAULT 0,
      unloading_amount REAL NOT NULL DEFAULT 0,
      freight_amount REAL NOT NULL DEFAULT 0,
      total_kg REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales_invoice_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id),
      qty REAL NOT NULL CHECK (qty > 0),
      rate REAL NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_purchase_bill_lines_item ON purchase_bill_lines(item_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_bill_lines_bill ON purchase_bill_lines(bill_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_bills_date ON purchase_bills(date);
    CREATE INDEX IF NOT EXISTS idx_sales_invoice_lines_item ON sales_invoice_lines(item_id);
    CREATE INDEX IF NOT EXISTS idx_sales_invoice_lines_invoice ON sales_invoice_lines(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_date ON sales_invoices(date);

    CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_no TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      supplier_id INTEGER REFERENCES parties(id),
      reference TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      loading_amount REAL NOT NULL DEFAULT 0,
      unloading_amount REAL NOT NULL DEFAULT 0,
      freight_amount REAL NOT NULL DEFAULT 0,
      total_kg REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      valid_until TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quotation_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id),
      qty REAL NOT NULL CHECK (qty > 0),
      rate REAL NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_quotation_lines_item ON quotation_lines(item_id);
    CREATE INDEX IF NOT EXISTS idx_quotation_lines_quotation ON quotation_lines(quotation_id);
    CREATE INDEX IF NOT EXISTS idx_quotations_date ON quotations(date);

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_no TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK (type IN ('IN', 'OUT')),
      date TEXT NOT NULL,
      party_id INTEGER REFERENCES parties(id),
      amount REAL NOT NULL CHECK (amount > 0),
      mode TEXT NOT NULL CHECK (mode IN ('cash', 'bank_transfer', 'cheque', 'upi', 'card', 'other')),
      reference_no TEXT NOT NULL DEFAULT '',
      bank_name TEXT NOT NULL DEFAULT '',
      cheque_no TEXT NOT NULL DEFAULT '',
      cheque_date TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      purchase_bill_id INTEGER REFERENCES purchase_bills(id),
      sales_invoice_id INTEGER REFERENCES sales_invoices(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
    CREATE INDEX IF NOT EXISTS idx_payments_party ON payments(party_id);
    CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(purchase_bill_id);
    CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(sales_invoice_id);
  `)

  ensureColumn('items', 'hsn_code', "TEXT NOT NULL DEFAULT ''")
  ensureColumn('items', 'gst_rate', 'REAL NOT NULL DEFAULT 0')

  ensureColumn('purchase_bills', 'subtotal', 'REAL NOT NULL DEFAULT 0')
  ensureColumn('purchase_bills', 'tax', 'REAL NOT NULL DEFAULT 0')
  ensureColumn('purchase_bills', 'discount', 'REAL NOT NULL DEFAULT 0')
  ensureColumn('purchase_bills', 'loading_amount', 'REAL NOT NULL DEFAULT 0')
  ensureColumn('purchase_bills', 'unloading_amount', 'REAL NOT NULL DEFAULT 0')
  ensureColumn('purchase_bills', 'freight_amount', 'REAL NOT NULL DEFAULT 0')
  ensureColumn('purchase_bills', 'total_kg', 'REAL NOT NULL DEFAULT 0')
  ensureColumn('purchase_bills', 'total', 'REAL NOT NULL DEFAULT 0')

  ensureColumn('sales_invoices', 'subtotal', 'REAL NOT NULL DEFAULT 0')
  ensureColumn('sales_invoices', 'tax', 'REAL NOT NULL DEFAULT 0')
  ensureColumn('sales_invoices', 'discount', 'REAL NOT NULL DEFAULT 0')
  ensureColumn('sales_invoices', 'loading_amount', 'REAL NOT NULL DEFAULT 0')
  ensureColumn('sales_invoices', 'unloading_amount', 'REAL NOT NULL DEFAULT 0')
  ensureColumn('sales_invoices', 'freight_amount', 'REAL NOT NULL DEFAULT 0')
  ensureColumn('sales_invoices', 'total_kg', 'REAL NOT NULL DEFAULT 0')
  ensureColumn('sales_invoices', 'total', 'REAL NOT NULL DEFAULT 0')

  ensureColumn('quotations', 'subtotal', 'REAL NOT NULL DEFAULT 0')
  ensureColumn('quotations', 'discount', 'REAL NOT NULL DEFAULT 0')
  ensureColumn('quotations', 'loading_amount', 'REAL NOT NULL DEFAULT 0')
  ensureColumn('quotations', 'unloading_amount', 'REAL NOT NULL DEFAULT 0')
  ensureColumn('quotations', 'freight_amount', 'REAL NOT NULL DEFAULT 0')
  ensureColumn('quotations', 'total_kg', 'REAL NOT NULL DEFAULT 0')
  ensureColumn('quotations', 'total', 'REAL NOT NULL DEFAULT 0')
  ensureColumn('quotations', 'valid_until', "TEXT NOT NULL DEFAULT ''")
  ensureColumn('quotations', 'status', "TEXT NOT NULL DEFAULT 'pending'")

  const { c } = db.prepare('SELECT COUNT(*) AS c FROM items').get()
  if (c === 0 && process.env.SKIP_SEED !== '1') seedCatalog()

  const shouldSeedDemoData = process.env.SEED_DEMO === '1'
  if (shouldSeedDemoData) {
    const purchaseCount = db.prepare('SELECT COUNT(*) AS c FROM purchase_bills').get().c
    const salesCount = db.prepare('SELECT COUNT(*) AS c FROM sales_invoices').get().c
    const entryCount = db.prepare('SELECT COUNT(*) AS c FROM entries').get().c
    const paymentCount = db.prepare('SELECT COUNT(*) AS c FROM payments').get().c
    if (purchaseCount === 0 && salesCount === 0 && entryCount === 0 && paymentCount === 0) {
      seedDemoData()
    }
  }
}

/** Loads the client's item master (all in kg) as the starting item list. */
function seedCatalog() {
  const insert = db.prepare("INSERT INTO items (code, name, category, size, unit) VALUES (?, ?, ?, ?, 'kg')")
  db.exec('BEGIN')
  for (const i of clientItems) insert.run(i.code, i.name, i.category, i.size)
  db.exec('COMMIT')
  console.log(`Loaded ${clientItems.length} items`)
}

export function seedDemoData() {
  const today = () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())
    const map = Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]))
    return `${map.year}-${map.month}-${map.day}`
  }
  const itemRows = db.prepare('SELECT id, code, name, unit, purchase_rate, sale_rate FROM items ORDER BY id LIMIT 5').all()
  if (itemRows.length < 2) return

  const supplierCount = db.prepare("SELECT COUNT(*) AS c FROM parties WHERE type = 'supplier'").get().c
  const customerCount = db.prepare("SELECT COUNT(*) AS c FROM parties WHERE type = 'customer'").get().c

  transaction(() => {
    let supplierId = null
    if (supplierCount === 0) {
      const result = db.prepare("INSERT INTO parties (type, name, contact_person, phone, email, address, city, gstin) VALUES ('supplier', 'Apex Steel', 'Rakesh', '9999000001', 'apex@example.com', 'Bawana', 'Delhi', '07AAAA0001A1Z5')").run()
      supplierId = Number(result.lastInsertRowid)
    } else {
      supplierId = db.prepare("SELECT id FROM parties WHERE type = 'supplier' ORDER BY id LIMIT 1").get().id
    }

    let customerId = null
    if (customerCount === 0) {
      const result = db.prepare("INSERT INTO parties (type, name, contact_person, phone, email, address, city, gstin) VALUES ('customer', 'Metro Infra', 'Amit', '8888000001', 'metro@example.com', 'Dwarka', 'Delhi', '07CCCC0001A1Z7')").run()
      customerId = Number(result.lastInsertRowid)
    } else {
      customerId = db.prepare("SELECT id FROM parties WHERE type = 'customer' ORDER BY id LIMIT 1").get().id
    }

    const purchaseItemA = itemRows[0]
    const purchaseItemB = itemRows[1]
    const purchaseSubtotal = Number(purchaseItemA.purchase_rate || 0) * 100 + Number(purchaseItemB.purchase_rate || 0) * 80
    const purchaseTax = 1500
    const purchaseDiscount = 250
    const purchaseLoading = 1200
    const purchaseUnloading = 600
    const purchaseFreight = 900
    const purchaseTotalKg = 180
    const purchaseTotal = purchaseSubtotal + purchaseTax - purchaseDiscount + purchaseLoading + purchaseUnloading + purchaseFreight

    const purchaseBill = db.prepare(`
      INSERT INTO purchase_bills (bill_no, date, supplier_id, reference, note, subtotal, tax, discount, loading_amount, unloading_amount, freight_amount, total_kg, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('PB-0001', today, supplierId, 'PO-1001', 'Demo purchase for today', purchaseSubtotal, purchaseTax, purchaseDiscount, purchaseLoading, purchaseUnloading, purchaseFreight, purchaseTotalKg, purchaseTotal)

    db.prepare('INSERT INTO purchase_bill_lines (bill_id, item_id, qty, rate, amount) VALUES (?, ?, ?, ?, ?)').run(purchaseBill.lastInsertRowid, purchaseItemA.id, 100, Number(purchaseItemA.purchase_rate || 0), Number(purchaseItemA.purchase_rate || 0) * 100)
    db.prepare('INSERT INTO purchase_bill_lines (bill_id, item_id, qty, rate, amount) VALUES (?, ?, ?, ?, ?)').run(purchaseBill.lastInsertRowid, purchaseItemB.id, 80, Number(purchaseItemB.purchase_rate || 0), Number(purchaseItemB.purchase_rate || 0) * 80)

    const purchaseEntry = db.prepare("INSERT INTO entries (entry_no, type, date, party_id, reference, note) VALUES ('IN-0001', 'IN', ?, ?, 'PB-0001', 'Stock in')").run(today, supplierId)
    db.prepare('INSERT INTO entry_lines (entry_id, item_id, qty, rate) VALUES (?, ?, ?, ?)').run(purchaseEntry.lastInsertRowid, purchaseItemA.id, 100, Number(purchaseItemA.purchase_rate || 0))
    db.prepare('INSERT INTO entry_lines (entry_id, item_id, qty, rate) VALUES (?, ?, ?, ?)').run(purchaseEntry.lastInsertRowid, purchaseItemB.id, 80, Number(purchaseItemB.purchase_rate || 0))

    const salesItemA = itemRows[2] || itemRows[0]
    const salesItemB = itemRows[3] || itemRows[1]
    const salesSubtotal = Number(salesItemA.sale_rate || 0) * 60 + Number(salesItemB.sale_rate || 0) * 40
    const salesTax = 1100
    const salesDiscount = 300
    const salesLoading = 1000
    const salesUnloading = 500
    const salesFreight = 700
    const salesTotalKg = 100
    const salesTotal = salesSubtotal + salesTax - salesDiscount + salesLoading + salesUnloading + salesFreight

    const salesInvoice = db.prepare(`
      INSERT INTO sales_invoices (invoice_no, date, customer_id, reference, note, subtotal, tax, discount, loading_amount, unloading_amount, freight_amount, total_kg, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('INV-0001', today, customerId, 'SO-1001', 'Demo sales for today', salesSubtotal, salesTax, salesDiscount, salesLoading, salesUnloading, salesFreight, salesTotalKg, salesTotal)

    db.prepare('INSERT INTO sales_invoice_lines (invoice_id, item_id, qty, rate, amount) VALUES (?, ?, ?, ?, ?)').run(salesInvoice.lastInsertRowid, salesItemA.id, 60, Number(salesItemA.sale_rate || 0), Number(salesItemA.sale_rate || 0) * 60)
    db.prepare('INSERT INTO sales_invoice_lines (invoice_id, item_id, qty, rate, amount) VALUES (?, ?, ?, ?, ?)').run(salesInvoice.lastInsertRowid, salesItemB.id, 40, Number(salesItemB.sale_rate || 0), Number(salesItemB.sale_rate || 0) * 40)

    const salesEntry = db.prepare("INSERT INTO entries (entry_no, type, date, party_id, reference, note) VALUES ('OUT-0001', 'OUT', ?, ?, 'INV-0001', 'Stock out')").run(today, customerId)
    db.prepare('INSERT INTO entry_lines (entry_id, item_id, qty, rate) VALUES (?, ?, ?, ?)').run(salesEntry.lastInsertRowid, salesItemA.id, 60, Number(salesItemA.sale_rate || 0))
    db.prepare('INSERT INTO entry_lines (entry_id, item_id, qty, rate) VALUES (?, ?, ?, ?)').run(salesEntry.lastInsertRowid, salesItemB.id, 40, Number(salesItemB.sale_rate || 0))

    db.prepare("INSERT INTO payments (voucher_no, type, date, party_id, amount, mode, reference_no, bank_name, note) VALUES ('PAYIN-0001', 'IN', ?, ?, ?, 'bank_transfer', 'REF-1001', 'HDFC', 'Customer payment received')").run(today, customerId, salesTotal)
    db.prepare("INSERT INTO payments (voucher_no, type, date, party_id, amount, mode, reference_no, bank_name, note) VALUES ('POUT-0001', 'OUT', ?, ?, ?, 'bank_transfer', 'REF-1002', 'ICICI', 'Supplier payment made')").run(today, supplierId, purchaseTotal)
  })

  console.log(`Seeded demo purchase/sales data for ${today}.`)
}

export function transaction(fn) {
  db.exec('BEGIN')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

export async function manualBackup() {
  console.log('Manual backup triggered')
  return await backupDatabase(activeDbPath)
}
