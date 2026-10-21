import { db, initDb, seedDemoData } from './db.js'

initDb()

const today = () => new Date().toISOString().slice(0, 10)
const hasAnyData = ['items', 'parties', 'purchase_bills', 'sales_invoices', 'payments'].some((table) => {
  const count = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c
  return count > 0
})

if (!hasAnyData) {
  seedDemoData()
} else {
  console.log(`Demo data already present. Skipping seed.`)
}

console.log(`Current date for demo data: ${today()}`)
