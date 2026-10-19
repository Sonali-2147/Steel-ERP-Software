import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { clientItems } from './client_items.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data')
fs.mkdirSync(dataDir, { recursive: true })

export const db = new DatabaseSync(path.join(dataDir, 'erp.db'))
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;')

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
  `)

  const { c } = db.prepare('SELECT COUNT(*) AS c FROM items').get()
  if (c === 0 && process.env.SKIP_SEED !== '1') seedCatalog()
}

/** Loads the client's item master (all in kg) as the starting item list. */
function seedCatalog() {
  const insert = db.prepare("INSERT INTO items (code, name, category, size, unit) VALUES (?, ?, ?, ?, 'kg')")
  db.exec('BEGIN')
  for (const i of clientItems) insert.run(i.code, i.name, i.category, i.size)
  db.exec('COMMIT')
  console.log(`Loaded ${clientItems.length} items`)
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
