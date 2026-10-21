import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowDownToLine, ArrowUpFromLine, BookOpen, Download, FileText, IndianRupee, Layers, PackageX, Printer, Receipt, Scale, Users,
  type LucideIcon,
} from 'lucide-react'
import { Button, Card, cx, EmptyRow, Field, Input, PageHeader, SearchSelect, Select, StatusBadge, Table, Td, Th, Tr } from '@/components/ui'
import { api } from '@/lib/api'
import { downloadCSV, fmtDate, inr, monthStartISO, qty, todayISO } from '@/lib/format'
import { stockStatus, useStore } from '@/lib/store'
import type { ItemLedger, RegisterRow, StockSummaryRow } from '@/lib/types'

const ReportCharts = lazy(() => import('@/components/ReportCharts'))

const TABS = [
  { id: 'summary', label: 'Stock Summary', desc: 'Opening, in, out & closing', icon: Layers, tone: 'blue' },
  { id: 'ledger', label: 'Item Ledger', desc: 'Full history of one item', icon: BookOpen, tone: 'violet' },
  { id: 'in', label: 'Stock In Register', desc: 'Material received', icon: ArrowDownToLine, tone: 'green' },
  { id: 'out', label: 'Stock Out Register', desc: 'Material dispatched', icon: ArrowUpFromLine, tone: 'red' },
  { id: 'purchase', label: 'Purchase Register', desc: 'Purchase bills summary', icon: Receipt, tone: 'emerald' },
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
            <tr><Th>Date</Th><Th>Entry No</Th><Th>Supplier / Customer</Th><Th>Bill / Ref</Th><Th right>In</Th><Th right>Out</Th><Th right>Balance</Th></tr>
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
          <tr><Th>Date</Th><Th>Entry No</Th><Th>{partyLabel}</Th><Th>Bill / Ref</Th><Th>Item</Th><Th right>Quantity</Th><Th right>Rate</Th><Th right>Amount</Th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow cols={8} />}
          {rows.map((r, idx) => (
            <Tr key={idx}>
              <Td className="whitespace-nowrap">{fmtDate(r.date)}</Td>
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
          <tr><Th>Date</Th><Th>Bill No</Th><Th>Supplier</Th><Th>Reference</Th><Th right>Subtotal</Th><Th right>Tax</Th><Th right>Discount</Th><Th right>Total</Th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow cols={8} />}
          {rows.map((r, idx) => (
            <Tr key={idx}>
              <Td className="whitespace-nowrap">{fmtDate(r.date)}</Td>
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
          <tr><Th>Date</Th><Th>Invoice No</Th><Th>Customer</Th><Th>Reference</Th><Th right>Subtotal</Th><Th right>Tax</Th><Th right>Discount</Th><Th right>Total</Th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow cols={8} />}
          {rows.map((r, idx) => (
            <Tr key={idx}>
              <Td className="whitespace-nowrap">{fmtDate(r.date)}</Td>
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
          <tr><Th>Date</Th><Th>Voucher No</Th><Th>{partyLabel}</Th><Th>Mode</Th><Th>Reference No</Th><Th>Bank Name</Th><Th right>Amount</Th><Th>Note</Th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow cols={8} />}
          {rows.map((r, idx) => (
            <Tr key={idx}>
              <Td className="whitespace-nowrap">{fmtDate(r.date)}</Td>
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
