export const inr = (n: number) => '₹' + Math.round(n || 0).toLocaleString('en-IN')

export const inrCompact = (n: number) => {
  const abs = Math.abs(n)
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  return inr(n)
}

export const qty = (n: number, unit?: string) =>
  `${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 })}${unit ? ' ' + unit : ''}`

export const todayISO = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export const monthStartISO = () => todayISO().slice(0, 8) + '01'

export const fmtDate = (iso: string) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

export function downloadCSV(filename: string, rows: Record<string, string | number>[], headers?: string[]) {
  const cols = headers ?? (rows[0] ? Object.keys(rows[0]) : [])
  if (!cols.length) return
  const esc = (v: string | number | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [cols.map(esc).join(','), ...rows.map((r) => cols.map((h) => esc(r[h])).join(','))].join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
