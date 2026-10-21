import { db, initDb, seedDemoData } from './db.js'

initDb()

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
