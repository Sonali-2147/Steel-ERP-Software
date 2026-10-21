import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowDownToLine, ArrowUpFromLine, BookOpen, Download, FileText, IndianRupee, Layers, PackageX, Printer, Receipt, Scale, Users,
  type LucideIcon,
} from 'lucide-react'
import { Button, Card, CardHeader, cx, EmptyRow, Field, Input, PageHeader, SearchSelect, Select, StatusBadge, Table, Td, Th, Tr } from '@/components/ui'
import { api } from '@/lib/api'
import { downloadCSV, fmtDate, fmtDateTime, inr, monthStartISO, qty, todayISO } from '@/lib/format'
import { stockStatus, useStore } from '@/lib/store'
import type { ItemLedger, RegisterRow, StockSummaryRow } from '@/lib/types'

const ReportCharts = lazy(() => import('@/components/ReportCharts'))

const TABS = [
  { id: 'summary', label: 'Stock Summary', desc: 'Opening, in, out & closing', icon: Layers, tone: 'blue' },
  { id: 'ledger', label: 'Item Ledger', desc: 'Full history of one item', icon: BookOpen, tone: 'violet' },
  { id: 'in', label: 'Stock In Register', desc: 'Material received', icon: ArrowDownToLine, tone: 'green' },
  { id: 'out', label: 'Stock Out Register', desc: 'Material dispatched', icon: ArrowUpFromLine, tone: 'red' },
  { id: 'purchase', label: 'Purchase Register', desc: 'Purchase bills summary', icon: Receipt, tone: 'emerald' },
  { id: 'day-book', label: 'Day Book', desc: 'Purchase + sale daily ledger', icon: BookOpen, tone: 'slate' },
  { id: 'item-profit', label: 'Item Profit / Loss', desc: 'Item-wise purchase vs sales', icon: IndianRupee, tone: 'blue' },
  { id: 'sales', label: 'Sales Register', desc: 'Sales invoices summary', icon: FileText, tone: 'orange' },
  { id: 'payment-in', label: 'Payment In Register', desc: 'Payments received', icon: ArrowDownToLine, tone: 'green' },
  { id: 'payment-out', label: 'Payment Out Register', desc: 'Payments made', icon: ArrowUpFromLine, tone: 'red' },
  { id: 'low', label: 'Low Stock', desc: 'Items to reorder', icon: AlertTriangle, tone: 'amber' },
] as const

type Tone = 'blue' | 'violet' | 'green' | 'red' | 'amber' | 'slate' | 'emerald' | 'orange'
const TONES: Record<Tone, { chip: string; ring: string; text: string }> = {
  blue: { chip: 'bg-blue-100 text-blue-700', ring: 'ring-blue-500 border-blue-500', text: 'text-blue-700' },
  violet: { chip: 'bg-violet-100 text-violet-700', ring: 'ring-violet-500 border-violet-500', text: 'text-violet-700' },
  green: { chip: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-500 border-emerald-500', text: 'text-emerald-700' },
  red: { chip: 'bg-red-100 text-red-700', ring: 'ring-red-500 border-red-500', text: 'text-red-700' },
  amber: { chip: 'bg-amber-100 text-amber-700', ring: 'ring-amber-500 border-amber-500', text: 'text-amber-700' },
  slate: { chip: 'bg-slate-100 text-slate-700', ring: 'ring-slate-500 border-slate-500', text: 'text-slate-900' },
  emerald: { chip: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-500 border-emerald-500', text: 'text-emerald-700' },
  orange: { chip: 'bg-orange-100 text-orange-700', ring: 'ring-orange-500 border-orange-500', text: 'text-orange-700' },
}

interface Kpi { label: string; value: string; icon: LucideIcon; tone: Tone; sub?: string }

function Kpis({ items }: { items: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ label, value, icon: Icon, tone, sub }) => (
        <div key={label} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
          <div className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-110', TONES[tone].chip)}><Icon size={20} /></div>
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
            <div className={cx('truncate text-lg font-bold', TONES[tone].text)}>{value}</div>
            {sub && <div className="truncate text-xs text-slate-400">{sub}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

const sumKg = (n: number) => qty(n, 'kg')

type ItemProfitRow = {
  item_id: number
  item_code: string
  item_name: string
  unit: string
  purchase_qty: number
  sales_qty: number
  purchase_value: number
  sales_value: number
  profit_loss: number
}

function buildItemProfitRows(purchaseRows: any[], salesRows: any[], items: any[]): ItemProfitRow[] {
  const map = new Map<number, ItemProfitRow>()

  const addPurchase = (line: any) => {
    const itemId = Number(line.item_id)
    const item = items.find((it) => it.id === itemId) || {
      code: line.code || '–',
      name: line.name || 'Unknown Item',
      unit: line.unit || 'kg',
    }
    const entry = map.get(itemId) || {
      item_id: itemId,
      item_code: item.code || '–',
      item_name: item.name || 'Unknown Item',
      unit: item.unit || 'kg',
      purchase_qty: 0,
      sales_qty: 0,
      purchase_value: 0,
      sales_value: 0,
      profit_loss: 0,
    }
    entry.purchase_qty += Number(line.qty || 0)
    entry.purchase_value += Number(line.amount ?? (Number(line.qty || 0) * Number(line.rate || 0)))
    map.set(itemId, entry)
  }

  const addSale = (line: any) => {
    const itemId = Number(line.item_id)
    const item = items.find((it) => it.id === itemId) || {
      code: line.code || '–',
      name: line.name || 'Unknown Item',
      unit: line.unit || 'kg',
    }
    const entry = map.get(itemId) || {
      item_id: itemId,
      item_code: item.code || '–',
      item_name: item.name || 'Unknown Item',
      unit: item.unit || 'kg',
      purchase_qty: 0,
      sales_qty: 0,
      purchase_value: 0,
      sales_value: 0,
      profit_loss: 0,
    }
    entry.sales_qty += Number(line.qty || 0)
    entry.sales_value += Number(line.amount ?? (Number(line.qty || 0) * Number(line.rate || 0)))
    map.set(itemId, entry)
  }

  for (const bill of purchaseRows) {
    for (const line of bill.lines || []) addPurchase(line)
  }
  for (const invoice of salesRows) {
    for (const line of invoice.lines || []) addSale(line)
  }

  return [...map.values()].map((row) => {
    const purchaseQty = Number(row.purchase_qty || 0)
    const salesQty = Number(row.sales_qty || 0)
    const totalPurchaseValue = Number(row.purchase_value || 0)
    const totalSalesValue = Number(row.sales_value || 0)

    const matchedQty = purchaseQty > 0 && salesQty > 0 ? Math.min(purchaseQty, salesQty) : (purchaseQty > 0 ? purchaseQty : salesQty)

    let matchedPurchaseValue = 0
    let matchedSalesValue = 0

    if (purchaseQty > 0 && matchedQty > 0) {
      matchedPurchaseValue = totalPurchaseValue * (matchedQty / purchaseQty)
    }
    if (salesQty > 0 && matchedQty > 0) {
      matchedSalesValue = totalSalesValue * (matchedQty / salesQty)
    }

    if (purchaseQty === 0 && salesQty > 0) {
      matchedPurchaseValue = totalSalesValue
      matchedSalesValue = totalSalesValue
    }

    const showPurchaseQty = purchaseQty > 0 && salesQty > 0 ? matchedQty : purchaseQty
    const showSalesQty = purchaseQty > 0 && salesQty > 0 ? matchedQty : salesQty

    return {
      ...row,
      purchase_qty: showPurchaseQty,
      sales_qty: showSalesQty,
      purchase_value: matchedPurchaseValue,
      sales_value: matchedSalesValue,
      profit_loss: matchedSalesValue - matchedPurchaseValue,
    }
  }).sort((a, b) => Math.abs(b.profit_loss) - Math.abs(a.profit_loss))
}

export default function Reports() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab')! : 'summary'
  return (
    <div>
      <PageHeader title="Reports" subtitle="Stock reports – export to Excel (CSV) or print" />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 print:hidden">
        {TABS.map(({ id, label, desc, icon: Icon, tone }) => (
          <button key={id} onClick={() => setParams({ tab: id })}
            className={cx('flex items-center gap-3 rounded-xl border bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
              tab === id ? cx('ring-2', TONES[tone].ring) : 'border-slate-200')}>
            <div className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-lg', TONES[tone].chip)}><Icon size={19} /></div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">{label}</div>
              <div className="truncate text-xs text-slate-500">{desc}</div>
            </div>
          </button>
        ))}
      </div>
      {tab === 'summary' && <StockSummary />}
      {tab === 'ledger' && <ItemLedgerReport />}
      {tab === 'in' && <Register key="IN" type="IN" />}
      {tab === 'out' && <Register key="OUT" type="OUT" />}
      {tab === 'purchase' && <PurchaseRegister />}
      {tab === 'day-book' && <DayBookReport />}
      {tab === 'item-profit' && <ItemProfitLossReport />}
      {tab === 'sales' && <SalesRegister />}
      {tab === 'payment-in' && <PaymentRegister key="IN" type="IN" />}
      {tab === 'payment-out' && <PaymentRegister key="OUT" type="OUT" />}
      {tab === 'low' && <LowStock />}
    </div>
  )
}

function Toolbar({ children, onExport }: { children?: React.ReactNode; onExport: () => void }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-end print:hidden">
      {children}
      <div className="flex gap-2 md:ml-auto">
        <Button variant="secondary" onClick={onExport}><Download size={16} /> Export</Button>
        <Button variant="secondary" onClick={() => window.print()}><Printer size={16} /> Print</Button>
      </div>
    </div>
  )
}

function DateRange({ from, to, setFrom, setTo }: { from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void }) {
  return (
    <>
      <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="md:w-40" /></Field>
      <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="md:w-40" /></Field>
    </>
  )
}

const PrintTitle = ({ title, sub }: { title: string; sub?: string }) => (
  <div className="hidden px-4 pt-2 pb-3 print:block">
    <h2 className="text-lg font-semibold">{title}</h2>
    {sub && <p className="text-sm text-slate-600">{sub}</p>}
  </div>
)

function StockSummary() {
  const { notify } = useStore()
  const [from, setFrom] = useState(monthStartISO())
  const [to, setTo] = useState(todayISO())
  const [category, setCategory] = useState('')
  const [rows, setRows] = useState<StockSummaryRow[]>([])

  useEffect(() => {
    api.stockSummary(from, to).then(setRows).catch((e) => notify(e.message, 'error'))
  }, [from, to, notify])

  const categories = useMemo(() => [...new Set(rows.map((r) => r.category).filter(Boolean))].sort(), [rows])
  const shown = rows.filter((r) => (r.active || r.opening || r.qty_in || r.qty_out) && (!category || r.category === category))
  const totalValue = shown.reduce((s, r) => s + Math.max(0, r.closing) * r.purchase_rate, 0)

  const exportCSV = () => downloadCSV(`stock-summary-${from}-to-${to}.csv`, shown.map((r) => ({
    'Item Code': r.code, 'Item Name': r.name, Category: r.category, Unit: r.unit,
    Opening: r.opening, 'Stock In': r.qty_in, 'Stock Out': r.qty_out, Closing: r.closing,
    'Rate': r.purchase_rate, Value: Math.round(Math.max(0, r.closing) * r.purchase_rate),
  })))

  const tot = shown.reduce((a, r) => ({ opening: a.opening + r.opening, in: a.in + r.qty_in, out: a.out + r.qty_out, closing: a.closing + r.closing }), { opening: 0, in: 0, out: 0, closing: 0 })

  return (
    <div className="space-y-5">
    <Kpis items={[
      { label: 'Opening Stock', value: sumKg(tot.opening), icon: Layers, tone: 'slate' },
      { label: 'Stock In', value: sumKg(tot.in), icon: ArrowDownToLine, tone: 'green' },
      { label: 'Stock Out', value: sumKg(tot.out), icon: ArrowUpFromLine, tone: 'red' },
      { label: 'Closing Stock', value: sumKg(tot.closing), icon: Scale, tone: 'blue', sub: `Value ${inr(totalValue)}` },
    ]} />
    <Suspense fallback={null}><ReportCharts kind="summary" rows={shown} /></Suspense>
    <Card>
      <Toolbar onExport={exportCSV}>
        <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <Field label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="md:w-48">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
      </Toolbar>
      <PrintTitle title="Stock Summary" sub={`${fmtDate(from)} to ${fmtDate(to)}${category ? ' · ' + category : ''}`} />
      <Table>
        <thead>
          <tr><Th>Code</Th><Th>Item Name</Th><Th right>Opening</Th><Th right>Stock In</Th><Th right>Stock Out</Th><Th right>Closing</Th><Th right>Value (₹)</Th></tr>
        </thead>
        <tbody>
          {shown.length === 0 && <EmptyRow cols={7} />}
          {shown.map((r) => (
            <Tr key={r.id}>
              <Td className="font-mono text-xs">{r.code}</Td>
              <Td className="font-medium text-slate-900">{r.name}</Td>
              <Td right>{qty(r.opening, r.unit)}</Td>
              <Td right className="text-emerald-700">{r.qty_in ? qty(r.qty_in, r.unit) : '–'}</Td>
              <Td right className="text-red-700">{r.qty_out ? qty(r.qty_out, r.unit) : '–'}</Td>
              <Td right className="font-semibold">{qty(r.closing, r.unit)}</Td>
              <Td right>{inr(Math.max(0, r.closing) * r.purchase_rate)}</Td>
            </Tr>
          ))}
        </tbody>
        {shown.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={6} className="px-4 py-3 text-right text-sm font-medium text-slate-600">Total stock value</td>
              <td className="px-4 py-3 text-right text-sm font-semibold">{inr(totalValue)}</td>
            </tr>
          </tfoot>
        )}
      </Table>
    </Card>
    </div>
  )
}

function ItemLedgerReport() {
  const { items, notify } = useStore()
  const [itemId, setItemId] = useState<number | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState<ItemLedger | null>(null)

  useEffect(() => {
    if (!itemId) { setData(null); return }
    api.itemLedger(itemId, from, to).then(setData).catch((e) => notify(e.message, 'error'))
  }, [itemId, from, to, notify])

  const unit = data?.item.unit
  const exportCSV = () => {
    if (!data) return notify('Select an item first', 'error')
    downloadCSV(`ledger-${data.item.code}.csv`, [
      { Date: '', 'Entry No': 'Opening balance', Party: '', 'Bill/Ref': '', In: '', Out: '', Balance: data.opening },
      ...data.rows.map((r) => ({
        Date: r.date, 'Entry No': r.entry_no, Party: r.party_name ?? '', 'Bill/Ref': r.reference,
        In: r.type === 'IN' ? r.qty : '', Out: r.type === 'OUT' ? r.qty : '', Balance: r.balance,
      })),
    ])
  }

  const ledIn = data?.rows.filter((r) => r.type === 'IN').reduce((a, r) => a + r.qty, 0) ?? 0
  const ledOut = data?.rows.filter((r) => r.type === 'OUT').reduce((a, r) => a + r.qty, 0) ?? 0

  return (
    <div className="space-y-5">
    {data && (
      <Kpis items={[
        { label: 'Opening', value: qty(data.opening, unit), icon: Layers, tone: 'slate' },
        { label: 'Total In', value: qty(ledIn, unit), icon: ArrowDownToLine, tone: 'green' },
        { label: 'Total Out', value: qty(ledOut, unit), icon: ArrowUpFromLine, tone: 'red' },
        { label: 'Closing', value: qty(data.closing, unit), icon: Scale, tone: 'blue', sub: `${data.rows.length} movements` },
      ]} />
    )}
    <Card>
      <Toolbar onExport={exportCSV}>
        <Field label="Item">
          <SearchSelect className="md:w-80" placeholder="Select an item" value={itemId} onChange={setItemId}
            options={items.map((i) => ({ value: i.id, label: i.name, sub: i.code }))} />
        </Field>
        <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
      </Toolbar>
      {data && <PrintTitle title={`Item Ledger – ${data.item.name} (${data.item.code})`} sub={from || to ? `${fmtDate(from) || 'Start'} to ${fmtDate(to) || 'Today'}` : undefined} />}
      {!data ? (
        <div className="px-4 py-12 text-center text-sm text-slate-400">Select an item to see all its stock movements.</div>
      ) : (
        <Table>
          <thead>
            <tr><Th>Date</Th><Th>Time</Th><Th>Entry No</Th><Th>Supplier / Customer</Th><Th>Bill / Ref</Th><Th right>In</Th><Th right>Out</Th><Th right>Balance</Th></tr>
          </thead>
          <tbody>
            <tr className="bg-slate-50">
              <Td />
              <Td className="font-medium">Opening balance</Td><Td /><Td /><Td /><Td />
              <Td right className="font-semibold">{qty(data.opening, unit)}</Td>
            </tr>
            {data.rows.length === 0 && <EmptyRow cols={7} text="No movements in this period." />}
            {data.rows.map((r, idx) => (
              <Tr key={idx}>
                <Td className="whitespace-nowrap">{fmtDate(r.date)}</Td>
                <Td className="whitespace-nowrap text-slate-600">{fmtDateTime((r as any).created_at || r.date)}</Td>
                <Td className="font-medium">{r.entry_no}</Td>
                <Td>{r.party_name || '–'}</Td>
                <Td>{r.reference || '–'}</Td>
                <Td right className="text-emerald-700">{r.type === 'IN' ? qty(r.qty) : ''}</Td>
                <Td right className="text-red-700">{r.type === 'OUT' ? qty(r.qty) : ''}</Td>
                <Td right className="font-semibold">{qty(r.balance, unit)}</Td>
              </Tr>
            ))}
            <tr className="bg-slate-50">
              <Td /><Td className="font-medium">Closing balance</Td><Td /><Td /><Td /><Td />
              <Td right className="font-semibold">{qty(data.closing, unit)}</Td>
            </tr>
          </tbody>
        </Table>
      )}
    </Card>
    </div>
  )
}

function Register({ type }: { type: 'IN' | 'OUT' }) {
  const { items, suppliers, customers, notify } = useStore()
  const isIn = type === 'IN'
  const parties = isIn ? suppliers : customers
  const [from, setFrom] = useState(monthStartISO())
  const [to, setTo] = useState(todayISO())
  const [partyId, setPartyId] = useState<number | null>(null)
  const [itemId, setItemId] = useState<number | null>(null)
  const [rows, setRows] = useState<RegisterRow[]>([])

  useEffect(() => {
    api.register({ type, from, to, party_id: partyId ?? undefined, item_id: itemId ?? undefined })
      .then(setRows).catch((e) => notify(e.message, 'error'))
  }, [type, from, to, partyId, itemId, notify])

  const total = rows.reduce((s, r) => s + r.amount, 0)
  const partyLabel = isIn ? 'Supplier' : 'Customer'

  const exportCSV = () => downloadCSV(`stock-${type.toLowerCase()}-register-${from}-to-${to}.csv`, rows.map((r) => ({
    Date: r.date, 'Entry No': r.entry_no, [partyLabel]: r.party_name ?? '', 'Bill/Ref': r.reference,
    'Item Code': r.item_code, 'Item Name': r.item_name, Quantity: r.qty, Unit: r.unit, Rate: r.rate, Amount: r.amount,
  })))

  const totalQty = rows.reduce((s, r) => s + r.qty, 0)
  const entryCount = new Set(rows.map((r) => r.entry_id)).size
  const partyCount = new Set(rows.map((r) => r.party_name).filter(Boolean)).size

  return (
    <div className="space-y-5">
    <Kpis items={[
      { label: 'Entries', value: String(entryCount), icon: FileText, tone: 'slate', sub: `${rows.length} item lines` },
      { label: 'Total Quantity', value: sumKg(totalQty), icon: Scale, tone: isIn ? 'green' : 'red' },
      { label: 'Total Amount', value: inr(total), icon: IndianRupee, tone: 'blue' },
      { label: isIn ? 'Suppliers' : 'Customers', value: String(partyCount), icon: Users, tone: 'violet' },
    ]} />
    <Suspense fallback={null}><ReportCharts kind="register" type={type} rows={rows} /></Suspense>
    <Card>
      <Toolbar onExport={exportCSV}>
        <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <Field label={partyLabel}>
          <SearchSelect className="md:w-56" placeholder="All" value={partyId} onChange={setPartyId}
            options={parties.map((p) => ({ value: p.id, label: p.name }))} />
        </Field>
        <Field label="Item">
          <SearchSelect className="md:w-56" placeholder="All" value={itemId} onChange={setItemId}
            options={items.map((i) => ({ value: i.id, label: i.name, sub: i.code }))} />
        </Field>
      </Toolbar>
      <PrintTitle title={`Stock ${isIn ? 'In' : 'Out'} Register`} sub={`${fmtDate(from)} to ${fmtDate(to)}`} />
      <Table>
        <thead>
          <tr><Th>Date</Th><Th>Time</Th><Th>Entry No</Th><Th>{partyLabel}</Th><Th>Bill / Ref</Th><Th>Item</Th><Th right>Quantity</Th><Th right>Rate</Th><Th right>Amount</Th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow cols={8} />}
          {rows.map((r, idx) => (
            <Tr key={idx}>
              <Td className="whitespace-nowrap">{fmtDate(r.date)}</Td>
              <Td className="whitespace-nowrap text-slate-600">{fmtDateTime((r as any).created_at || r.date)}</Td>
              <Td className="font-medium">{r.entry_no}</Td>
              <Td>{r.party_name || '–'}</Td>
              <Td>{r.reference || '–'}</Td>
              <Td>{r.item_name}</Td>
              <Td right>{qty(r.qty, r.unit)}</Td>
              <Td right>{inr(r.rate)}</Td>
              <Td right>{inr(r.amount)}</Td>
            </Tr>
          ))}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={7} className="px-4 py-3 text-right text-sm font-medium text-slate-600">Total</td>
              <td className="px-4 py-3 text-right text-sm font-semibold">{inr(total)}</td>
            </tr>
          </tfoot>
        )}
      </Table>
    </Card>
    </div>
  )
}

function LowStock() {
  const { items } = useStore()
  const rows = items
    .filter((i) => i.active && i.stock <= i.min_stock)
    .sort((a, b) => a.stock - a.min_stock - (b.stock - b.min_stock))

  const exportCSV = () => downloadCSV('low-stock.csv', rows.map((i) => ({
    'Item Code': i.code, 'Item Name': i.name, Category: i.category, Unit: i.unit,
    'Current Stock': i.stock, 'Min Stock': i.min_stock, 'Shortage': Math.max(0, i.min_stock - i.stock),
  })))

  const outCount = rows.filter((i) => i.stock <= 0).length

  return (
    <div className="space-y-5">
    <Kpis items={[
      { label: 'Need Reorder', value: String(rows.length), icon: AlertTriangle, tone: 'amber' },
      { label: 'Out of Stock', value: String(outCount), icon: PackageX, tone: 'red' },
      { label: 'Low Stock', value: String(rows.length - outCount), icon: Layers, tone: 'amber' },
      { label: 'Total Shortage', value: sumKg(rows.reduce((s, i) => s + Math.max(0, i.min_stock - i.stock), 0)), icon: Scale, tone: 'slate' },
    ]} />
    <Card>
      <Toolbar onExport={exportCSV}>
        <p className="text-sm text-slate-500">Items whose current stock is at or below the minimum stock level.</p>
      </Toolbar>
      <PrintTitle title="Low Stock Report" sub={fmtDate(todayISO())} />
      <Table>
        <thead>
          <tr><Th>Code</Th><Th>Item Name</Th><Th>Category</Th><Th right>Current Stock</Th><Th right>Min Stock</Th><Th right>Shortage</Th><Th>Status</Th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow cols={7} text="All items have enough stock." />}
          {rows.map((i) => (
            <Tr key={i.id}>
              <Td className="font-mono text-xs">{i.code}</Td>
              <Td className="font-medium text-slate-900">{i.name}</Td>
              <Td>{i.category || '–'}</Td>
              <Td right className="font-semibold">{qty(i.stock, i.unit)}</Td>
              <Td right>{qty(i.min_stock, i.unit)}</Td>
              <Td right className="text-red-700">{qty(Math.max(0, i.min_stock - i.stock), i.unit)}</Td>
              <Td><StatusBadge status={stockStatus(i.stock, i.min_stock)} /></Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Card>
    </div>
  )
}

function ItemProfitLossReport() {
  const { items, notify } = useStore()
  const [from, setFrom] = useState(monthStartISO())
  const [to, setTo] = useState(todayISO())
  const [rows, setRows] = useState<ItemProfitRow[]>([])

  useEffect(() => {
    Promise.all([
      api.getPurchaseBills({ from, to }),
      api.getSalesInvoices({ from, to }),
    ])
      .then(([purchase, sales]) => setRows(buildItemProfitRows(purchase, sales, items)))
      .catch((e) => notify(e.message, 'error'))
  }, [from, to, items, notify])

  const totalPurchase = rows.reduce((s, r) => s + r.purchase_value, 0)
  const totalSales = rows.reduce((s, r) => s + r.sales_value, 0)
  const netProfit = totalSales - totalPurchase

  const exportCSV = () => downloadCSV(`item-profit-loss-${from}-to-${to}.csv`, rows.map((r) => ({
    'Item Code': r.item_code,
    'Item Name': r.item_name,
    Unit: r.unit,
    'Purchase Qty': r.purchase_qty,
    'Purchase Value': r.purchase_value,
    'Sales Qty': r.sales_qty,
    'Sales Value': r.sales_value,
    'Profit / Loss': r.profit_loss,
  })))

  return (
    <div className="space-y-5">
      <Kpis items={[
        { label: 'Items', value: String(rows.length), icon: PackageX, tone: 'slate' },
        { label: 'Purchase Value', value: inr(totalPurchase), icon: Receipt, tone: 'emerald' },
        { label: 'Sales Value', value: inr(totalSales), icon: FileText, tone: 'orange' },
        { label: 'Net Profit / Loss', value: inr(netProfit), icon: IndianRupee, tone: netProfit >= 0 ? 'green' : 'red' },
      ]} />
      <Card>
        <Toolbar onExport={exportCSV}>
          <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
        </Toolbar>
        <PrintTitle title="Item Profit / Loss Report" sub={`${fmtDate(from)} to ${fmtDate(to)}`} />
        <Table>
          <thead>
            <tr><Th>Item</Th><Th>Code</Th><Th right>Purchase Qty</Th><Th right>Purchase Value</Th><Th right>Sales Qty</Th><Th right>Sales Value</Th><Th right>Profit / Loss</Th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <EmptyRow cols={7} text="No item profit/loss data found for this period." />}
            {rows.map((r) => (
              <Tr key={r.item_id}>
                <Td className="font-medium text-slate-900">{r.item_name}</Td>
                <Td className="font-mono text-xs text-slate-500">{r.item_code}</Td>
                <Td right>{qty(r.purchase_qty, r.unit)}</Td>
                <Td right>{inr(r.purchase_value)}</Td>
                <Td right>{qty(r.sales_qty, r.unit)}</Td>
                <Td right>{inr(r.sales_value)}</Td>
                <Td right className={cx('font-semibold', r.profit_loss >= 0 ? 'text-emerald-700' : 'text-red-700')}>{inr(r.profit_loss)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}

function PurchaseRegister() {
  const { suppliers, notify } = useStore()
  const [from, setFrom] = useState(monthStartISO())
  const [to, setTo] = useState(todayISO())
  const [supplierId, setSupplierId] = useState<number | null>(null)
  const [rows, setRows] = useState<any[]>([])

  useEffect(() => {
    api.purchaseRegister({ from, to, supplier_id: supplierId ?? undefined })
      .then(setRows).catch((e) => notify(e.message, 'error'))
  }, [from, to, supplierId, notify])

  const total = rows.reduce((s, r) => s + r.total, 0)
  const billCount = rows.length

  const exportCSV = () => downloadCSV(`purchase-register-${from}-to-${to}.csv`, rows.map((r) => ({
    Date: r.date, 'Bill No': r.bill_no, Supplier: r.supplier_name || '', Reference: r.reference || '',
    Subtotal: r.subtotal, Tax: r.tax, Discount: r.discount, Total: r.total,
  })))

  return (
    <div className="space-y-5">
    <Kpis items={[
      { label: 'Bills', value: String(billCount), icon: FileText, tone: 'emerald' },
      { label: 'Subtotal', value: inr(rows.reduce((s, r) => s + r.subtotal, 0)), icon: IndianRupee, tone: 'slate' },
      { label: 'Tax', value: inr(rows.reduce((s, r) => s + r.tax, 0)), icon: IndianRupee, tone: 'slate' },
      { label: 'Total', value: inr(total), icon: IndianRupee, tone: 'emerald' },
    ]} />
    <Card>
      <Toolbar onExport={exportCSV}>
        <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <Field label="Supplier">
          <SearchSelect className="md:w-56" placeholder="All" value={supplierId} onChange={setSupplierId}
            options={suppliers.map((p) => ({ value: p.id, label: p.name }))} />
        </Field>
      </Toolbar>
      <PrintTitle title="Purchase Register" sub={`${fmtDate(from)} to ${fmtDate(to)}`} />
      <Table>
        <thead>
          <tr><Th>Date</Th><Th>Time</Th><Th>Bill No</Th><Th>Supplier</Th><Th>Reference</Th><Th right>Subtotal</Th><Th right>Tax</Th><Th right>Discount</Th><Th right>Total</Th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow cols={8} />}
          {rows.map((r, idx) => (
            <Tr key={idx}>
              <Td className="whitespace-nowrap">{fmtDate(r.date)}</Td>
              <Td className="whitespace-nowrap text-slate-600">{fmtDateTime((r as any).created_at || r.date)}</Td>
              <Td className="font-medium">{r.bill_no}</Td>
              <Td>{r.supplier_name || '–'}</Td>
              <Td>{r.reference || '–'}</Td>
              <Td right>{inr(r.subtotal)}</Td>
              <Td right>{r.tax > 0 ? inr(r.tax) : '–'}</Td>
              <Td right>{r.discount > 0 ? inr(r.discount) : '–'}</Td>
              <Td right className="font-semibold">{inr(r.total)}</Td>
            </Tr>
          ))}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={7} className="px-4 py-3 text-right text-sm font-medium text-slate-600">Total</td>
              <td className="px-4 py-3 text-right text-sm font-semibold">{inr(total)}</td>
            </tr>
          </tfoot>
        )}
      </Table>
    </Card>
    </div>
  )
}

function SalesRegister() {
  const { customers, notify } = useStore()
  const [from, setFrom] = useState(monthStartISO())
  const [to, setTo] = useState(todayISO())
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [rows, setRows] = useState<any[]>([])

  useEffect(() => {
    api.salesRegister({ from, to, customer_id: customerId ?? undefined })
      .then(setRows).catch((e) => notify(e.message, 'error'))
  }, [from, to, customerId, notify])

  const total = rows.reduce((s, r) => s + r.total, 0)
  const invoiceCount = rows.length

  const exportCSV = () => downloadCSV(`sales-register-${from}-to-${to}.csv`, rows.map((r) => ({
    Date: r.date, 'Invoice No': r.invoice_no, Customer: r.customer_name || '', Reference: r.reference || '',
    Subtotal: r.subtotal, Tax: r.tax, Discount: r.discount, Total: r.total,
  })))

  return (
    <div className="space-y-5">
    <Kpis items={[
      { label: 'Invoices', value: String(invoiceCount), icon: FileText, tone: 'orange' },
      { label: 'Subtotal', value: inr(rows.reduce((s, r) => s + r.subtotal, 0)), icon: IndianRupee, tone: 'slate' },
      { label: 'Tax', value: inr(rows.reduce((s, r) => s + r.tax, 0)), icon: IndianRupee, tone: 'slate' },
      { label: 'Total', value: inr(total), icon: IndianRupee, tone: 'orange' },
    ]} />
    <Card>
      <Toolbar onExport={exportCSV}>
        <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <Field label="Customer">
          <SearchSelect className="md:w-56" placeholder="All" value={customerId} onChange={setCustomerId}
            options={customers.map((p) => ({ value: p.id, label: p.name }))} />
        </Field>
      </Toolbar>
      <PrintTitle title="Sales Register" sub={`${fmtDate(from)} to ${fmtDate(to)}`} />
      <Table>
        <thead>
          <tr><Th>Date</Th><Th>Time</Th><Th>Invoice No</Th><Th>Customer</Th><Th>Reference</Th><Th right>Subtotal</Th><Th right>Tax</Th><Th right>Discount</Th><Th right>Total</Th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow cols={8} />}
          {rows.map((r, idx) => (
            <Tr key={idx}>
              <Td className="whitespace-nowrap">{fmtDate(r.date)}</Td>
              <Td className="whitespace-nowrap text-slate-600">{fmtDateTime((r as any).created_at || r.date)}</Td>
              <Td className="font-medium">{r.invoice_no}</Td>
              <Td>{r.customer_name || '–'}</Td>
              <Td>{r.reference || '–'}</Td>
              <Td right>{inr(r.subtotal)}</Td>
              <Td right>{r.tax > 0 ? inr(r.tax) : '–'}</Td>
              <Td right>{r.discount > 0 ? inr(r.discount) : '–'}</Td>
              <Td right className="font-semibold">{inr(r.total)}</Td>
            </Tr>
          ))}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={7} className="px-4 py-3 text-right text-sm font-medium text-slate-600">Total</td>
              <td className="px-4 py-3 text-right text-sm font-semibold">{inr(total)}</td>
            </tr>
          </tfoot>
        )}
      </Table>
    </Card>
    </div>
  )
}

function DayBookReport() {
  const { suppliers, customers, items, notify } = useStore()
  const [from, setFrom] = useState(monthStartISO())
  const [to, setTo] = useState(todayISO())
  const [partyId, setPartyId] = useState<number | null>(null)
  const [partyType, setPartyType] = useState<'all' | 'supplier' | 'customer'>('all')
  const [purchaseRows, setPurchaseRows] = useState<any[]>([])
  const [salesRows, setSalesRows] = useState<any[]>([])
  const [rows, setRows] = useState<any[]>([])

  useEffect(() => {
    const allParties = [...suppliers, ...customers]
    const filteredPartyId = partyId && allParties.some((p) => p.id === partyId) ? partyId : undefined

    Promise.all([
      api.getPurchaseBills({ from, to, supplier_id: partyType === 'customer' ? undefined : filteredPartyId }),
      api.getSalesInvoices({ from, to, customer_id: partyType === 'supplier' ? undefined : filteredPartyId }),
    ])
      .then(([purchase, sales]) => {
        setPurchaseRows(purchase)
        setSalesRows(sales)
        const combined = [
          ...purchase.map((b) => ({
            date: b.date,
            type: 'Purchase',
            doc_no: b.bill_no,
            party_name: b.supplier_name || '–',
            reference: b.reference || '–',
            total_kg: b.total_kg || 0,
            amount: b.total || 0,
            expense_total: (Number(b.loading_amount || 0) + Number(b.unloading_amount || 0) + Number(b.freight_amount || 0)),
          })),
          ...sales.map((i) => ({
            date: i.date,
            type: 'Sale',
            doc_no: i.invoice_no,
            party_name: i.customer_name || '–',
            reference: i.reference || '–',
            total_kg: i.total_kg || 0,
            amount: i.total || 0,
            expense_total: (Number(i.loading_amount || 0) + Number(i.unloading_amount || 0) + Number(i.freight_amount || 0)),
          })),
        ].sort((a, b) => b.date.localeCompare(a.date) || a.doc_no.localeCompare(b.doc_no))
        setRows(combined)
      })
      .catch((e) => notify(e.message, 'error'))
  }, [from, to, partyId, partyType, suppliers, customers, notify])

  const purchases = rows.filter((r) => r.type === 'Purchase').reduce((s, r) => s + r.amount, 0)
  const sales = rows.filter((r) => r.type === 'Sale').reduce((s, r) => s + r.amount, 0)
  const totalExpenses = rows.reduce((s, r) => s + Number(r.expense_total || 0), 0)
  const totalKg = rows.reduce((s, r) => s + Number(r.total_kg || 0), 0)
  const netBillAmount = sales - totalExpenses
  const itemProfitRows = buildItemProfitRows(purchaseRows, salesRows, items)
  const itemProfitTotal = itemProfitRows.reduce((s, r) => s + r.profit_loss, 0)

  const exportCSV = () => downloadCSV(`day-book-${from}-to-${to}.csv`, rows.map((r) => ({
    Date: r.date,
    Type: r.type,
    'Doc No': r.doc_no,
    Party: r.party_name,
    Reference: r.reference,
    'Total KG': r.total_kg,
    Amount: r.amount,
  })))

  return (
    <div className="space-y-5">
      <Kpis items={[
        { label: 'Entries', value: String(rows.length), icon: FileText, tone: 'slate' },
        { label: 'Purchase', value: inr(purchases), icon: Receipt, tone: 'emerald' },
        { label: 'Sales', value: inr(sales), icon: FileText, tone: 'orange' },
        { label: 'Total KG', value: qty(totalKg, 'kg'), icon: Scale, tone: 'blue' },
      ]} />
      <Card>
        <Toolbar onExport={exportCSV}>
          <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
          <Field label="Party Type">
            <Select value={partyType} onChange={(e) => setPartyType(e.target.value as 'all' | 'supplier' | 'customer')} className="md:w-40">
              <option value="all">All</option>
              <option value="supplier">Supplier</option>
              <option value="customer">Customer</option>
            </Select>
          </Field>
          <Field label="Party">
            <SearchSelect
              className="md:w-56"
              placeholder="All"
              value={partyId}
              onChange={setPartyId}
              options={[...suppliers.map((p) => ({ value: p.id, label: p.name, sub: 'supplier' })), ...customers.map((p) => ({ value: p.id, label: p.name, sub: 'customer' }))]
                .filter((p) => partyType === 'all' || p.sub === partyType)}
            />
          </Field>
        </Toolbar>
        <PrintTitle title="Day Book" sub={`${fmtDate(from)} to ${fmtDate(to)}`} />
        <Table>
          <thead>
            <tr><Th>Date</Th><Th>Time</Th><Th>Type</Th><Th>Doc No</Th><Th>Party</Th><Th>Reference</Th><Th right>Total KG</Th><Th right>Amount</Th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <EmptyRow cols={7} text="No day book entries found" />}
            {rows.map((r, idx) => (
              <Tr key={`${r.type}-${r.doc_no}-${idx}`}>
                <Td>{fmtDate(r.date)}</Td>
                <Td className="whitespace-nowrap text-slate-600">{fmtDateTime((r as any).created_at || r.date)}</Td>
                <Td>
                  <span className={cx('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', r.type === 'Purchase' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700')}>
                    {r.type}
                  </span>
                </Td>
                <Td className="font-medium">{r.doc_no}</Td>
                <Td>{r.party_name}</Td>
                <Td>{r.reference}</Td>
                <Td right>{qty(r.total_kg, 'kg')}</Td>
                <Td right className={cx('font-semibold', r.type === 'Purchase' ? 'text-emerald-700' : 'text-orange-700')}>{inr(r.amount)}</Td>
              </Tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={5} className="px-4 py-3 text-right text-sm font-medium text-slate-600">Net Bill Amount</td>
                <td className="px-4 py-3 text-right text-sm font-semibold">{qty(totalKg, 'kg')}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-700">{inr(netBillAmount)}</td>
              </tr>
            </tfoot>
          )}
        </Table>
      </Card>

      <Card>
        <CardHeader title="Item-wise Profit / Loss" subtitle="Purchase value vs sales value by item" />
        <Table>
          <thead>
            <tr><Th>Item</Th><Th>Code</Th><Th right>Purchase Qty</Th><Th right>Purchase Value</Th><Th right>Sales Qty</Th><Th right>Sales Value</Th><Th right>Profit / Loss</Th></tr>
          </thead>
          <tbody>
            {itemProfitRows.length === 0 && <EmptyRow cols={7} text="No item profit/loss data found." />}
            {itemProfitRows.map((r) => (
              <Tr key={r.item_id}>
                <Td className="font-medium text-slate-900">{r.item_name}</Td>
                <Td className="font-mono text-xs text-slate-500">{r.item_code}</Td>
                <Td right>{qty(r.purchase_qty, r.unit)}</Td>
                <Td right>{inr(r.purchase_value)}</Td>
                <Td right>{qty(r.sales_qty, r.unit)}</Td>
                <Td right>{inr(r.sales_value)}</Td>
                <Td right className={cx('font-semibold', r.profit_loss >= 0 ? 'text-emerald-700' : 'text-red-700')}>{inr(r.profit_loss)}</Td>
              </Tr>
            ))}
          </tbody>
          {itemProfitRows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={6} className="px-4 py-3 text-right text-sm font-medium text-slate-600">Total item profit / loss</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-slate-700">{inr(itemProfitTotal)}</td>
              </tr>
            </tfoot>
          )}
        </Table>
      </Card>
    </div>
  )
}

function PaymentRegister({ type }: { type: 'IN' | 'OUT' }) {
  const { suppliers, customers, notify } = useStore()
  const isIn = type === 'IN'
  const parties = isIn ? customers : suppliers
  const [from, setFrom] = useState(monthStartISO())
  const [to, setTo] = useState(todayISO())
  const [partyId, setPartyId] = useState<number | null>(null)
  const [rows, setRows] = useState<any[]>([])

  useEffect(() => {
    const apiFn = isIn ? api.paymentInRegister : api.paymentOutRegister
    apiFn({ from, to, party_id: partyId ?? undefined })
      .then(setRows).catch((e) => notify(e.message, 'error'))
  }, [type, from, to, partyId, notify])

  const total = rows.reduce((s, r) => s + r.amount, 0)
  const partyLabel = isIn ? 'Customer' : 'Supplier'

  const exportCSV = () => downloadCSV(`payment-${type.toLowerCase()}-register-${from}-to-${to}.csv`, rows.map((r) => ({
    Date: r.date, 'Voucher No': r.voucher_no, [partyLabel]: r.party_name || '', Mode: r.mode,
    'Reference No': r.reference_no || '', 'Bank Name': r.bank_name || '', Amount: r.amount, Note: r.note || '',
  })))

  const voucherCount = rows.length
  const partyCount = new Set(rows.map((r) => r.party_name).filter(Boolean)).size

  return (
    <div className="space-y-5">
    <Kpis items={[
      { label: 'Vouchers', value: String(voucherCount), icon: FileText, tone: isIn ? 'green' : 'red' },
      { label: 'Total Amount', value: inr(total), icon: IndianRupee, tone: 'blue' },
      { label: isIn ? 'Customers' : 'Suppliers', value: String(partyCount), icon: Users, tone: 'violet' },
      { label: 'Avg Amount', value: inr(voucherCount > 0 ? total / voucherCount : 0), icon: Scale, tone: 'slate' },
    ]} />
    <Card>
      <Toolbar onExport={exportCSV}>
        <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <Field label={partyLabel}>
          <SearchSelect className="md:w-56" placeholder="All" value={partyId} onChange={setPartyId}
            options={parties.map((p) => ({ value: p.id, label: p.name }))} />
        </Field>
      </Toolbar>
      <PrintTitle title={`Payment ${isIn ? 'In' : 'Out'} Register`} sub={`${fmtDate(from)} to ${fmtDate(to)}`} />
      <Table>
        <thead>
          <tr><Th>Date</Th><Th>Time</Th><Th>Voucher No</Th><Th>{partyLabel}</Th><Th>Mode</Th><Th>Reference No</Th><Th>Bank Name</Th><Th right>Amount</Th><Th>Note</Th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow cols={8} />}
          {rows.map((r, idx) => (
            <Tr key={idx}>
              <Td className="whitespace-nowrap">{fmtDate(r.date)}</Td>
              <Td className="whitespace-nowrap text-slate-600">{fmtDateTime((r as any).created_at || r.date)}</Td>
              <Td className="font-medium">{r.voucher_no}</Td>
              <Td>{r.party_name || '–'}</Td>
              <Td className="capitalize">{r.mode.replace('_', ' ')}</Td>
              <Td>{r.reference_no || '–'}</Td>
              <Td>{r.bank_name || '–'}</Td>
              <Td right className="font-semibold">{inr(r.amount)}</Td>
              <Td className="text-xs text-slate-500">{r.note || '–'}</Td>
            </Tr>
          ))}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={6} className="px-4 py-3 text-right text-sm font-medium text-slate-600">Total</td>
              <td colSpan={2} className="px-4 py-3 text-right text-sm font-semibold">{inr(total)}</td>
            </tr>
          </tfoot>
        )}
      </Table>
    </Card>
    </div>
  )
}
