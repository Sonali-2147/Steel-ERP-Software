import { useCallback, useEffect, useState } from 'react'
import {
  Badge, Card, EmptyRow, Field, Input, PageHeader, SearchBox, SearchSelect, Select, Table, Td, Th,
} from '@/components/ui'
import { api } from '@/lib/api'
import { fmtDate, fmtDateTime, inr } from '@/lib/format'
import { useStore } from '@/lib/store'

interface ExpenseRow {
  id: number
  type: 'purchase' | 'sale'
  date: string
  reference: string
  party_name: string
  loading_amount: number
  unloading_amount: number
  freight_amount: number
  total_kg: number
  total_expenses: number
}

export default function Expenses() {
  const { suppliers, customers, notify } = useStore()
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [partyId, setPartyId] = useState<number | null>(null)
  const [type, setType] = useState<'all' | 'purchase' | 'sale'>('all')

  const load = useCallback(() => {
    api.getExpenses({
      from,
      to,
      party_id: partyId ?? undefined,
      type: type === 'all' ? undefined : type,
      q,
    })
      .then(setExpenses)
      .catch((e) => notify(e.message, 'error'))
  }, [from, to, partyId, type, q, notify])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  const filteredExpenses = expenses.filter((e) => {
    const term = q.trim().toLowerCase()
    if (!term) return true
    const haystack = `${e.reference} ${e.party_name}`.toLowerCase()
    return haystack.includes(term)
  })

  const totalLoading = filteredExpenses.reduce((s, e) => s + e.loading_amount, 0)
  const totalUnloading = filteredExpenses.reduce((s, e) => s + e.unloading_amount, 0)
  const totalFreight = filteredExpenses.reduce((s, e) => s + e.freight_amount, 0)
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.total_expenses, 0)

  const allParties = [
    ...suppliers.map(p => ({ ...p, type: 'supplier' as const })),
    ...customers.map(c => ({ ...c, type: 'customer' as const }))
  ]

  return (
    <div>
      <PageHeader
        title="Expenses Ledger"
        subtitle="Track loading, unloading, and freight expenses"
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-end">
          <SearchBox value={q} onChange={setQ} placeholder="Search reference, party…" className="lg:w-72" />
          <Field label="From Date" className="lg:w-40">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To Date" className="lg:w-40">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <SearchSelect
            className="lg:w-64"
            placeholder="All parties"
            value={partyId}
            onChange={setPartyId}
            options={allParties.map((p) => ({ value: p.id, label: p.name, sub: `${p.type} - ${p.city}` }))}
          />
          <Field label="Type" className="lg:w-40">
            <Select value={type} onChange={(e) => setType(e.target.value as 'all' | 'purchase' | 'sale')}>
              <option value="all">All</option>
              <option value="purchase">Purchase Bills (+)</option>
              <option value="sale">Sales Invoices (-)</option>
            </Select>
          </Field>
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Time</Th>
              <Th>Type</Th>
              <Th>Reference</Th>
              <Th>Party</Th>
              <Th className="text-right">Loading</Th>
              <Th className="text-right">Unloading</Th>
              <Th className="text-right">Freight</Th>
              <Th className="text-right">Total Expenses</Th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <EmptyRow cols={9} text="No expenses found" />
            ) : (
              filteredExpenses.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <Td>{fmtDate(e.date)}</Td>
                  <Td className="whitespace-nowrap text-slate-600">{fmtDateTime((e as any).created_at || e.date)}</Td>
                  <Td>
                    <Badge className={e.type === 'purchase' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}>
                      {e.type === 'purchase' ? 'Purchase (+)' : 'Sale (-)'}
                    </Badge>
                  </Td>
                  <Td>{e.reference}</Td>
                  <Td>{e.party_name}</Td>
                  <Td className="text-right">{inr(e.loading_amount)}</Td>
                  <Td className="text-right">{inr(e.unloading_amount)}</Td>
                  <Td className="text-right">{inr(e.freight_amount)}</Td>
                  <Td className={`text-right font-semibold ${e.type === 'purchase' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {e.type === 'purchase' ? '+' : '-'}{inr(e.total_expenses)}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-semibold">
              <td colSpan={3} className="px-4 py-3 text-right">Total</td>
              <td className="px-4 py-3 text-right tabular-nums">{inr(totalLoading)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{inr(totalUnloading)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{inr(totalFreight)}</td>
              <td className={`px-4 py-3 text-right tabular-nums font-bold ${totalExpenses >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {totalExpenses >= 0 ? '+' : ''}{inr(totalExpenses)}
              </td>
            </tr>
          </tfoot>
        </Table>
      </Card>
    </div>
  )
}
