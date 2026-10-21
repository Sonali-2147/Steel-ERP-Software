import { lazy, Suspense, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, IndianRupee, Package, Plus, Upload } from 'lucide-react'
import { Badge, Button, Card, CardHeader, EmptyRow, PageHeader, StatCard, Table, Td, Th, Tr } from '@/components/ui'
import { api } from '@/lib/api'
import { fmtDate, fmtDateTime, inr, inrCompact, qty, todayISO } from '@/lib/format'
import { useStore } from '@/lib/store'
import type { Dashboard as DashboardData } from '@/lib/types'

const DashboardCharts = lazy(() => import('@/components/DashboardCharts'))

export default function Dashboard() {
  const navigate = useNavigate()
  const { items, notify } = useStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [dayBook, setDayBook] = useState<{ purchase: number; sales: number; entries: number; totalKg: number } | null>(null)

  useEffect(() => {
    const loadDashboard = () => {
      api.getDashboard().then(setData).catch((e) => notify(e.message, 'error'))
    }

    loadDashboard()
    const id = window.setInterval(loadDashboard, 15000)
    return () => window.clearInterval(id)
  }, [items, notify])

  useEffect(() => {
    const loadDayBook = () => {
      const today = todayISO()
      Promise.all([
        api.getPurchaseBills({ from: today, to: today }),
        api.getSalesInvoices({ from: today, to: today }),
      ])
        .then(([purchases, sales]) => {
          const purchase = purchases.reduce((sum, bill) => sum + Number(bill.total || 0), 0)
          const sale = sales.reduce((sum, inv) => sum + Number(inv.total || 0), 0)
          const totalKg = [...purchases, ...sales].reduce((sum, row) => sum + Number(row.total_kg || 0), 0)
          setDayBook({ purchase, sales: sale, entries: purchases.length + sales.length, totalKg })
        })
        .catch(() => setDayBook(null))
    }

    loadDayBook()
    const id = window.setInterval(loadDayBook, 15000)
    return () => window.clearInterval(id)
  }, [notify])

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your stock"
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/items?action=import')}><Upload size={16} /> Import Items</Button>
            <Button variant="secondary" onClick={() => navigate('/items?action=new')}><Plus size={16} /> New Item</Button>
            <Button variant="in" onClick={() => navigate('/stock-in?action=new')}><ArrowDownToLine size={16} /> Stock In</Button>
            <Button variant="out" onClick={() => navigate('/stock-out?action=new')}><ArrowUpFromLine size={16} /> Stock Out</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Items" value={data?.totalItems ?? '–'} icon={<Package size={22} />} onClick={() => navigate('/items')} />
        <StatCard label="Stock Value" value={data ? inrCompact(data.stockValue) : '–'} sub="At purchase rate" icon={<IndianRupee size={22} />} />
        <StatCard
          label="Stock In (this month)"
          value={data?.monthIn.entries ?? '–'}
          sub={data ? `entries · ${inr(data.monthIn.amount)}` : undefined}
          tone="green"
          icon={<ArrowDownToLine size={22} />}
          onClick={() => navigate('/stock-in')}
        />
        <StatCard
          label="Stock Out (this month)"
          value={data?.monthOut.entries ?? '–'}
          sub={data ? `entries · ${inr(data.monthOut.amount)}` : undefined}
          tone="red"
          icon={<ArrowUpFromLine size={22} />}
          onClick={() => navigate('/stock-out')}
        />
      </div>

      {data && <Suspense fallback={null}><DashboardCharts data={data} /></Suspense>}

      <div className="mt-5">
        <Card>
          <CardHeader
            title="Day Book"
            subtitle="Today’s purchase and sales summary"
            action={<Button size="sm" variant="ghost" onClick={() => navigate('/reports?tab=day-book')}>View full report</Button>}
          />
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Purchase</div>
              <div className="mt-2 text-xl font-bold text-emerald-700">{inr(dayBook?.purchase ?? 0)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Sales</div>
              <div className="mt-2 text-xl font-bold text-orange-700">{inr(dayBook?.sales ?? 0)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Entries</div>
              <div className="mt-2 text-xl font-bold text-slate-900">{dayBook?.entries ?? 0}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Total KG</div>
              <div className="mt-2 text-xl font-bold text-blue-700">{qty(dayBook?.totalKg ?? 0, 'kg')}</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            title={`Low Stock Items (${data?.lowStockCount ?? 0})`}
            subtitle="Items at or below their minimum stock level"
            action={<Button size="sm" variant="ghost" onClick={() => navigate('/reports?tab=low')}>View all</Button>}
          />
          <Table>
            <thead>
              <tr><Th>Item</Th><Th right>In Stock</Th><Th right>Min. Stock</Th></tr>
            </thead>
            <tbody>
              {data?.lowStock.length === 0 && <EmptyRow cols={3} text="All items have enough stock." />}
              {data?.lowStock.map((i) => (
                <Tr key={i.id}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className={i.stock <= 0 ? 'text-red-500' : 'text-amber-500'} />
                      <span className="font-medium text-slate-800">{i.name}</span>
                    </div>
                    <div className="text-xs text-slate-400">{i.code}</div>
                  </Td>
                  <Td right className={i.stock <= 0 ? 'text-red-600 font-medium' : 'text-amber-600 font-medium'}>{qty(i.stock, i.unit)}</Td>
                  <Td right>{qty(i.min_stock, i.unit)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Recent Entries" subtitle="Latest stock in / stock out" />
          <Table>
            <thead>
              <tr><Th>Date</Th><Th>Time</Th><Th>Entry</Th><Th>Party</Th><Th right>Items</Th></tr>
            </thead>
            <tbody>
              {data?.recent.length === 0 && <EmptyRow cols={5} text="No entries yet. Use Stock In / Stock Out to record movements." />}
              {data?.recent.map((e) => (
                <Tr key={e.id} onClick={() => navigate(e.type === 'IN' ? '/stock-in' : '/stock-out')}>
                  <Td className="whitespace-nowrap">{fmtDate(e.date)}</Td>
                  <Td className="whitespace-nowrap text-slate-600">{fmtDateTime((e as any).created_at || e.date)}</Td>
                  <Td>
                    <Badge tone={e.type === 'IN' ? 'green' : 'red'}>{e.type === 'IN' ? 'In' : 'Out'}</Badge>
                    <span className="ml-2 font-medium">{e.entry_no}</span>
                  </Td>
                  <Td>{e.party_name || '–'}</Td>
                  <Td right>{e.lines.length}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  )
}
