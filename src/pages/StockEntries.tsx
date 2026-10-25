import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronRight, Download, Pencil, Plus, Printer, Trash2 } from 'lucide-react'
import {
  Badge, Button, Card, ConfirmDialog, EmptyRow, Field, Input, Modal, PageHeader, SearchBox, SearchSelect, Table, Td, Textarea, Th, Tr, cx,
} from '@/components/ui'
import { api } from '@/lib/api'
import { fmtDate, fmtDateTime, inr, qty, todayISO } from '@/lib/format'
import { useStore } from '@/lib/store'
import type { Entry, EntryType } from '@/lib/types'

export default function StockEntries({ type }: { type: EntryType }) {
  const { suppliers, customers, items, notify, refresh } = useStore()
  const [params, setParams] = useSearchParams()
  const isIn = type === 'IN'
  const parties = isIn ? suppliers : customers
  const partyLabel = isIn ? 'Supplier' : 'Customer'

  const [entries, setEntries] = useState<Entry[]>([])
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [partyId, setPartyId] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [editing, setEditing] = useState<Entry | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Entry | null>(null)

  const load = useCallback(() => {
    api.getEntries({ type, from, to, party_id: partyId ?? undefined, q: q.trim() || undefined })
      .then(setEntries)
      .catch((e) => notify(e.message, 'error'))
  }, [type, from, to, partyId, q, notify])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load, items])

  useEffect(() => {
    if (params.get('action') === 'new') {
      setEditing(null)
      setFormOpen(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const remove = async (e: Entry) => {
    setConfirmDelete(e)
  }

  const confirmRemove = async () => {
    if (!confirmDelete) return
    try {
      await api.deleteEntry(confirmDelete.id)
      notify(`Entry ${confirmDelete.entry_no} deleted`)
      refresh()
    } catch (err) { notify((err as Error).message, 'error') }
    setConfirmDelete(null)
  }

  const printEntry = (entry: Entry) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      notify('Allow pop-ups to open this stock entry for printing or PDF saving.', 'error')
      return
    }
    const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char]!)
    const title = isIn ? 'Stock In Entry' : 'Stock Out Entry'
    const lineRows = entry.lines.map((line, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td>${escapeHtml(line.item_name)} <span class="muted">${escapeHtml(line.item_code)}</span></td>
        <td class="right">${qty(line.qty)}</td>
        <td class="center">${escapeHtml(line.unit || '-')}</td>
        <td class="right">${inr(line.rate)}</td>
        <td class="right">${inr(line.qty * line.rate)}</td>
      </tr>
    `).join('')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} - ${escapeHtml(entry.entry_no)}</title>
        <style>
          @page { size: A4; margin: 15mm 10mm; }
          * { box-sizing: border-box; }
          body { margin: 0; font: 12px Arial, sans-serif; color: #1e293b; }
          body::after { content: ""; position: fixed; inset: 0; border: 1px solid #64748b; pointer-events: none; z-index: 9999; }
          .document { border: 1px solid #cbd5e1; }
          header { padding: 16px; background: #1e3a5f; color: #fff; text-align: center; }
          header h1 { margin: 0 0 5px; font-size: 23px; }
          header p { margin: 0; color: #e2e8f0; }
          h2 { margin: 0; padding: 9px; text-align: center; text-transform: uppercase; font-size: 17px; color: #1e3a5f; background: #eaf1f8; }
          .details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 14px; border-bottom: 1px solid #cbd5e1; }
          .details div { margin: 3px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { padding: 7px 6px; border: 1px solid #cbd5e1; }
          th { text-align: center; color: #1e3a5f; background: #eaf1f8; }
          .center { text-align: center; }
          .right { text-align: right; white-space: nowrap; }
          .muted { color: #64748b; }
          .total { padding: 12px; text-align: right; border-top: 1px solid #cbd5e1; font-size: 14px; font-weight: bold; color: #1e3a5f; }
          .note { padding: 12px; border-top: 1px solid #cbd5e1; }
          @media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <main class="document">
          <header><h1>Krishna Steel Corporation</h1><p>Stock Management</p></header>
          <h2>${title}</h2>
          <section class="details">
            <div><div><b>Entry No:</b> ${escapeHtml(entry.entry_no)}</div><div><b>Date:</b> ${escapeHtml(fmtDate(entry.date))}</div><div><b>Time:</b> ${escapeHtml(fmtDateTime(entry.created_at || entry.date))}</div></div>
            <div><div><b>${partyLabel}:</b> ${escapeHtml(entry.party_name || '-')}</div><div><b>Reference:</b> ${escapeHtml(entry.reference || '-')}</div></div>
          </section>
          <table>
            <thead><tr><th>SI</th><th>Item</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Amount</th></tr></thead>
            <tbody>${lineRows}</tbody>
          </table>
          ${entry.note ? `<div class="note"><b>Note:</b> ${escapeHtml(entry.note)}</div>` : ''}
          <div class="total">Total Amount: ${inr(entry.amount)}</div>
        </main>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const total = entries.reduce((s, e) => s + e.amount, 0)

  return (
    <div>
      <PageHeader
        title={isIn ? 'Stock In' : 'Stock Out'}
        subtitle={isIn ? 'Record material received (purchase, return from customer, etc.)' : 'Record material issued (sale, dispatch, consumption, etc.)'}
        actions={
          <Button variant={isIn ? 'in' : 'out'} onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus size={16} /> New {isIn ? 'Stock In' : 'Stock Out'}
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-end">
          <SearchBox value={q} onChange={setQ} placeholder="Search entry no, bill no, item…" className="lg:w-72" />
          <SearchSelect
            className="lg:w-64"
            placeholder={`All ${partyLabel.toLowerCase()}s`}
            value={partyId}
            onChange={setPartyId}
            options={parties.map((p) => ({ value: p.id, label: p.name, sub: p.city }))}
          />
          <div className="flex items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" aria-label="From date" />
            <span className="text-sm text-slate-400">to</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" aria-label="To date" />
          </div>
          {(from || to || partyId || q) && (
            <Button variant="ghost" onClick={() => { setFrom(''); setTo(''); setPartyId(null); setQ('') }}>Clear</Button>
          )}
        </div>
        <Table>
          <thead>
            <tr>
              <Th className="w-8" /><Th>Date</Th><Th>Entry Time</Th><Th>Entry No</Th><Th>{partyLabel}</Th><Th>Bill / Ref No</Th>
              <Th>Items</Th><Th right>Amount</Th><Th right>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && <EmptyRow cols={9} text={`No ${isIn ? 'stock in' : 'stock out'} entries found.`} />}
            {entries.map((e) => (
              <Fragment key={e.id}>
                <Tr onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                  <Td className="text-slate-400">{expanded === e.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</Td>
                  <Td className="whitespace-nowrap">{fmtDate(e.date)}</Td>
                  <Td className="whitespace-nowrap text-slate-600">{fmtDateTime(e.created_at || e.date)}</Td>
                  <Td className="font-medium text-slate-900">{e.entry_no}</Td>
                  <Td>{e.party_name || '–'}</Td>
                  <Td>{e.reference || '–'}</Td>
                  <Td>
                    <span className="text-slate-700">{e.lines[0]?.item_name}</span>
                    {e.lines.length > 1 && <Badge className="ml-2">+{e.lines.length - 1} more</Badge>}
                  </Td>
                  <Td right>{inr(e.amount)}</Td>
                  <Td right>
                    <div className="flex justify-end gap-1" onClick={(ev) => ev.stopPropagation()}>
                      <Button size="sm" variant="ghost" title="Print entry" onClick={() => printEntry(e)}><Printer size={14} /></Button>
                      <Button size="sm" variant="ghost" title="Save entry as PDF" onClick={() => printEntry(e)}><Download size={14} /></Button>
                      <Button size="sm" variant="ghost" title="Edit" onClick={() => { setEditing(e); setFormOpen(true) }}><Pencil size={14} /></Button>
                      <Button size="sm" variant="ghost" title="Delete" className="text-red-600" onClick={() => remove(e)}><Trash2 size={14} /></Button>
                    </div>
                  </Td>
                </Tr>
                {expanded === e.id && (
                  <tr>
                    <td colSpan={9} className="border-b border-slate-100 bg-slate-50 px-12 py-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-slate-500">
                            <th className="py-1">Item</th><th className="py-1 text-right">Quantity</th><th className="py-1 text-right">Rate</th><th className="py-1 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {e.lines.map((l) => (
                            <tr key={l.id}>
                              <td className="py-1">{l.item_name} <span className="text-xs text-slate-400">{l.item_code}</span></td>
                              <td className="py-1 text-right">{qty(l.qty, l.unit)}</td>
                              <td className="py-1 text-right">{inr(l.rate)}</td>
                              <td className="py-1 text-right">{inr(l.qty * l.rate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {e.note && <p className="mt-2 text-xs text-slate-500">Note: {e.note}</p>}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
          {entries.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={6} className="px-4 py-3 text-right text-sm font-medium text-slate-600">Total ({entries.length} entries)</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{inr(total)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </Table>
      </Card>

      {formOpen && <EntryForm type={type} entry={editing} onClose={() => setFormOpen(false)} onSaved={() => { refresh(); load() }} />}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Entry"
        message={`Are you sure you want to delete entry ${confirmDelete?.entry_no}? Stock will be recalculated. This action cannot be undone.`}
        onConfirm={confirmRemove}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}

interface FormLine {
  key: number
  item_id: number | null
  qty: string
  rate: string
}
let lineKey = 0
const blankLine = (): FormLine => ({ key: ++lineKey, item_id: null, qty: '', rate: '' })

function EntryForm({ type, entry, onClose, onSaved }: { type: EntryType; entry: Entry | null; onClose: () => void; onSaved: () => void }) {
  const { items, suppliers, customers, notify, refresh } = useStore()
  const isIn = type === 'IN'
  const parties = (isIn ? suppliers : customers).filter((p) => p.active || p.id === entry?.party_id)
  const [date, setDate] = useState(entry?.date ?? todayISO())
  const [partyId, setPartyId] = useState<number | null>(entry?.party_id ?? null)
  const [reference, setReference] = useState(entry?.reference ?? '')
  const [note, setNote] = useState(entry?.note ?? '')
  const [lines, setLines] = useState<FormLine[]>(() =>
    entry ? entry.lines.map((l) => ({ key: ++lineKey, item_id: l.item_id, qty: String(l.qty), rate: String(l.rate) })) : [blankLine()])
  const [entryNo, setEntryNo] = useState(entry?.entry_no ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!entry) api.nextEntryNo(type).then((r) => setEntryNo(r.entry_no)).catch(() => {})
  }, [entry, type])

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const itemOptions = useMemo(
    () => items.filter((i) => i.active || lines.some((l) => l.item_id === i.id))
      .map((i) => ({ value: i.id, label: i.name, sub: `${i.code} · ${qty(i.stock, i.unit)}` })),
    [items, lines],
  )

  const setLine = (key: number, patch: Partial<FormLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const pickItem = (key: number, id: number | null) => {
    const it = id ? itemMap.get(id) : undefined
    setLine(key, { item_id: id, rate: it ? String(isIn ? it.purchase_rate : it.sale_rate) : '' })
  }

  /** Stock available for this entry (adds back what this entry already took out when editing). */
  const available = (itemId: number) => {
    const it = itemMap.get(itemId)
    if (!it) return 0
    const prev = entry?.lines.filter((l) => l.item_id === itemId).reduce((s, l) => s + l.qty, 0) ?? 0
    return it.stock + (isIn ? -prev : prev)
  }

  const total = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0)

  const save = async () => {
    if (!partyId) return notify(`Please select a ${isIn ? 'supplier' : 'customer'}`, 'error')
    const valid = lines.filter((l) => l.item_id)
    if (valid.length === 0) return notify('Please select at least one item', 'error')
    if (valid.some((l) => !(Number(l.qty) > 0))) return notify('Please enter quantity for every item', 'error')

    if (!isIn) {
      const totals = new Map<number, number>()
      for (const line of valid) {
        const itemId = Number(line.item_id)
        totals.set(itemId, (totals.get(itemId) || 0) + Number(line.qty || 0))
      }
      for (const [itemId, totalQty] of totals) {
        const item = itemMap.get(itemId)
        if (!item) continue
        const prevQty = entry?.lines.filter((l) => l.item_id === itemId).reduce((sum, l) => sum + l.qty, 0) ?? 0
        const available = item.stock + prevQty
        if (totalQty > available) {
          return notify(`Cannot do stock out for "${item.name}". Requested ${qty(totalQty, item.unit)}, but only ${qty(available, item.unit)} is available.`, 'error')
        }
      }
    }

    setSaving(true)
    try {
      const payload = {
        type, date, party_id: partyId, reference, note,
        lines: valid.map((l) => ({ item_id: l.item_id!, qty: Number(l.qty), rate: Number(l.rate) || 0 })),
      }
      const saved = entry ? await api.updateEntry(entry.id, payload) : await api.createEntry(payload)
      notify(`${isIn ? 'Stock In' : 'Stock Out'} ${saved.entry_no} saved`)
      refresh()
      onSaved()
      onClose()
    } catch (err) {
      notify((err as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      wide
      blur
      title={`${entry ? 'Edit' : 'New'} ${isIn ? 'Stock In' : 'Stock Out'}${entryNo ? ' – ' + entryNo : ''}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving} variant={isIn ? 'in' : 'out'}>
            {saving ? 'Saving…' : 'Save Entry'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Date" required><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label={isIn ? 'Supplier' : 'Customer'} required>
          <SearchSelect
            placeholder={`Select ${isIn ? 'supplier' : 'customer'}`}
            value={partyId}
            onChange={setPartyId}
            options={parties.map((p) => ({ value: p.id, label: p.name, sub: p.city }))}
          />
        </Field>
        <Field label={isIn ? 'Bill / Invoice No' : 'Invoice / Challan No'}>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
        </Field>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="w-32 px-3 py-2 text-right">Quantity</th>
              <th className="w-28 px-3 py-2 text-right">Rate (₹)</th>
              <th className="w-28 px-3 py-2 text-right">Amount</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const it = l.item_id ? itemMap.get(l.item_id) : undefined
              const avail = l.item_id ? available(l.item_id) : 0
              const short = !isIn && it && Number(l.qty) > avail
              return (
                <tr key={l.key} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2">
                    <SearchSelect placeholder="Select item" value={l.item_id} onChange={(v) => pickItem(l.key, v)} options={itemOptions} />
                    {it && (
                      <div className={cx('mt-1 text-xs', short ? 'text-red-600' : 'text-slate-500')}>
                        In stock: {qty(avail, it.unit)}{short && ' – not enough stock'}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Input type="number" min={0} step="any" value={l.qty} onChange={(e) => setLine(l.key, { qty: e.target.value })} className={cx('text-right', short && 'border-red-400')} />
                      <span className="w-8 text-xs text-slate-400">{it?.unit}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Input type="number" min={0} step="any" value={l.rate} onChange={(e) => setLine(l.key, { rate: e.target.value })} className="text-right" />
                  </td>
                  <td className="px-3 py-2 pt-4 text-right tabular-nums">{inr((Number(l.qty) || 0) * (Number(l.rate) || 0))}</td>
                  <td className="px-1 py-2">
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-red-600" aria-label="Remove line" disabled={lines.length === 1}
                      onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200">
              <td className="px-3 py-2">
                <Button size="sm" variant="secondary" onClick={() => setLines((ls) => [...ls, blankLine()])}><Plus size={14} /> Add another item</Button>
              </td>
              <td colSpan={2} className="px-3 py-2 text-right font-medium text-slate-600">Total</td>
              <td className="px-3 py-2 text-right font-semibold text-slate-900">{inr(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <Field label="Note" className="mt-4">
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional (vehicle no, remarks…)" />
      </Field>
    </Modal>
  )
}
