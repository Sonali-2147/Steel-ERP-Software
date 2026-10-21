import { useEffect, useState } from 'react'
import { ArrowUpFromLine, TrendingUp, Wallet } from 'lucide-react'
import { Button, Card, Field, Input, PageHeader, Table, Td, Th, Tr } from '@/components/ui'
import { api } from '@/lib/api'
import { inr, monthStartISO, todayISO } from '@/lib/format'
import { useStore } from '@/lib/store'

export default function Profit() {
  const { notify } = useStore()
  const [from, setFrom] = useState(monthStartISO())
  const [to, setTo] = useState(todayISO())
  const [data, setData] = useState<any | null>(null)

  useEffect(() => {
    api.getProfit({ from, to }).then(setData).catch((e) => notify(e.message, 'error'))
  }, [from, to, notify])

  const salesTotal = Number(data?.salesTotal || 0)
  const loading = Number(data?.loading || 0)
  const unloading = Number(data?.unloading || 0)
  const freight = Number(data?.freight || 0)
  const totalExpenses = Number(data?.totalExpenses || 0)
  const netBillAmount = Number(data?.netBillAmount ?? data?.profit ?? 0)

  const summary = [
    { label: 'Sales', value: inr(salesTotal), icon: ArrowUpFromLine, tone: 'orange' },
    { label: 'Expenses', value: inr(totalExpenses), icon: Wallet, tone: 'amber' },
    { label: 'Net Bill Amount', value: inr(netBillAmount), icon: TrendingUp, tone: 'emerald' },
  ]

  const exportCSV = () => {
    const rows = [
      { Category: 'Sales', Amount: salesTotal },
      { Category: 'Loading', Amount: loading },
      { Category: 'Unloading', Amount: unloading },
      { Category: 'Freight', Amount: freight },
      { Category: 'Total Expenses', Amount: totalExpenses },
      { Category: 'Net Bill Amount', Amount: netBillAmount },
    ]
    const csv = 'Category,Amount\n' + rows.map((r) => `${r.Category},${r.Amount}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `profit-${from}-to-${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Profit" subtitle="Sales total less all expense heads" />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-end">
          <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="md:w-40" /></Field>
          <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="md:w-40" /></Field>
          <div className="md:ml-auto">
            <Button variant="secondary" onClick={exportCSV}>Export CSV</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
          {summary.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
                <div className={
                  `grid h-9 w-9 place-items-center rounded-lg ${
                    tone === 'orange' ? 'bg-orange-100 text-orange-700' :
                    tone === 'slate' ? 'bg-slate-100 text-slate-700' :
                    tone === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`
                }>
                  <Icon size={18} />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{value}</div>
            </div>
          ))}
        </div>

        <div className="px-4 pb-4">
          <Table>
            <thead>
              <tr>
                <Th>Particulars</Th>
                <Th right>Amount</Th>
              </tr>
            </thead>
            <tbody>
              <Tr><Td>Sales bill total</Td><Td right>{inr(salesTotal)}</Td></Tr>
              <Tr><Td>Loading</Td><Td right>{inr(loading)}</Td></Tr>
              <Tr><Td>Unloading</Td><Td right>{inr(unloading)}</Td></Tr>
              <Tr><Td>Freight</Td><Td right>{inr(freight)}</Td></Tr>
              <Tr><Td>Total expenses</Td><Td right>{inr(totalExpenses)}</Td></Tr>
              <Tr><Td className="font-semibold">Net bill amount</Td><Td right className="font-semibold text-emerald-700">{inr(netBillAmount)}</Td></Tr>
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
