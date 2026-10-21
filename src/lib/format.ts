export const inr = (n: number) => '₹' + Math.round(n || 0).toLocaleString('en-IN')

export const inrCompact = (n: number) => {
  const abs = Math.abs(n)
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  return inr(n)
}

export const qty = (n: number, unit?: string) =>
  `${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 })}${unit ? ' ' + unit : ''}`

const IST_TIMEZONE = 'Asia/Kolkata'

const parseDateForDisplay = (iso: string) => {
  if (!iso) return new Date(NaN)
  const value = String(iso).trim()
  if (!value) return new Date(NaN)
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00+05:30`)
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) return new Date(value)
  return new Date(`${value}+05:30`)
}

export const todayISO = () => {
  const d = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const map = Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]))
  return `${map.year}-${map.month}-${map.day}`
}

export const monthStartISO = () => todayISO().slice(0, 8) + '01'

export const fmtDate = (iso: string) => {
  const d = parseDateForDisplay(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const fmtDateTime = (iso: string) => {
  const d = parseDateForDisplay(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function numberToWords(n: number): string {
  if (n === 0) return 'Zero'

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const convertLessThanThousand = (num: number): string => {
    if (num === 0) return ''
    if (num < 20) return ones[num]
    if (num < 100) {
      const ten = Math.floor(num / 10)
      const one = num % 10
      return tens[ten] + (one ? ' ' + ones[one] : '')
    }
    const hundred = Math.floor(num / 100)
    const remainder = num % 100
    return ones[hundred] + ' Hundred' + (remainder ? ' and ' + convertLessThanThousand(remainder) : '')
  }

  const convert = (num: number): string => {
    if (num === 0) return ''
    if (num < 1000) return convertLessThanThousand(num)
    if (num < 100000) {
      const thousand = Math.floor(num / 1000)
      const remainder = num % 1000
      return convertLessThanThousand(thousand) + ' Thousand' + (remainder ? ' ' + convertLessThanThousand(remainder) : '')
    }
    if (num < 10000000) {
      const lakh = Math.floor(num / 100000)
      const remainder = num % 100000
      return convertLessThanThousand(lakh) + ' Lakh' + (remainder ? ' ' + convert(remainder) : '')
    }
    const crore = Math.floor(num / 10000000)
    const remainder = num % 10000000
    return convertLessThanThousand(crore) + ' Crore' + (remainder ? ' ' + convert(remainder) : '')
  }

  const integerPart = Math.floor(n)
  const decimalPart = Math.round((n - integerPart) * 100)

  let result = convert(integerPart)
  if (decimalPart > 0) {
    result += ' and ' + convertLessThanThousand(decimalPart) + ' Paise'
  }

  return result.trim()
}

export function amountInWords(n: number): string {
  const words = numberToWords(Math.abs(n))
  return `INR ${words} Only`
}

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
