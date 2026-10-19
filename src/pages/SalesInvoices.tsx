import { Fragment, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronRight, FileText, Plus, Printer, Trash2 } from 'lucide-react'
import {
  Badge, Button, Card, ConfirmDialog, EmptyRow, Field, Input, Modal, PageHeader, SearchBox, SearchSelect, Table, Td, Textarea, Th, Tr, cx,
} from '@/components/ui'
import { api } from '@/lib/api'
import { fmtDate, inr, qty, todayISO } from '@/lib/format'
import { useStore } from '@/lib/store'
import type { SalesInvoice, SalesInvoiceInput, SalesInvoiceLine } from '@/lib/types'


export default function SalesInvoices() {
  const { customers, items, notify, refresh } = useStore()
  const [params, setParams] = useSearchParams()

  const [invoices, setInvoices] = useState<SalesInvoice[]>([])
  const [invoiceDetails, setInvoiceDetails] = useState<Map<number, SalesInvoice>>(new Map())
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [editing, setEditing] = useState<SalesInvoice | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<SalesInvoice | null>(null)

  const load = useCallback(() => {
    api.getSalesInvoices({ from, to, customer_id: customerId ?? undefined })
      .then(setInvoices)
      .catch((e) => notify(e.message, 'error'))
  }, [from, to, customerId, notify])

  const loadInvoiceDetails = useCallback(async (invoiceId: number) => {
    try {
      const invoice = await api.getSalesInvoice(invoiceId)
      setInvoiceDetails(prev => new Map(prev).set(invoiceId, invoice))
    } catch (e) {
      notify((e as Error).message, 'error')
    }
  }, [notify])

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

  const handleExpand = async (invoiceId: number) => {
    const newExpanded = expanded === invoiceId ? null : invoiceId
    setExpanded(newExpanded)
    if (newExpanded && !invoiceDetails.has(invoiceId)) {
      await loadInvoiceDetails(invoiceId)
    }
  }

  const printInvoice = (invoice: SalesInvoice) => {
    const fullInvoice = invoiceDetails.get(invoice.id) || invoice
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
      <head>
        <title>Sales Invoice - ${invoice.invoice_no}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header h2 { margin: 5px 0; font-size: 16px; color: #666; }
          .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .info div { width: 45%; }
          .info label { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
          .totals { text-align: right; margin-top: 20px; }
          .totals div { margin: 5px 0; }
          .totals .grand-total { font-size: 16px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Krishna Steel Center</h1>
          <h2>Sales Invoice</h2>
        </div>
        <div class="info">
          <div>
            <label>Invoice No:</label> ${invoice.invoice_no}<br>
            <label>Date:</label> ${fmtDate(invoice.date)}<br>
            <label>Reference:</label> ${invoice.reference || '-'}
          </div>
          <div>
            <label>Customer:</label> ${invoice.customer_name || '-'}<br>
            ${invoice.contact_person ? `<label>Contact:</label> ${invoice.contact_person}<br>` : ''}
            ${invoice.phone ? `<label>Phone:</label> ${invoice.phone}<br>` : ''}
            ${invoice.gstin ? `<label>GSTIN:</label> ${invoice.gstin}<br>` : ''}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Code</th>
              <th style="text-align: right">Qty</th>
              <th style="text-align: right">Rate</th>
              <th style="text-align: right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${(fullInvoice.lines || []).map(l => `
              <tr>
                <td>${l.name}</td>
                <td>${l.code}</td>
                <td style="text-align: right">${qty(l.qty)} ${l.unit}</td>
                <td style="text-align: right">${inr(l.rate)}</td>
                <td style="text-align: right">${inr(l.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="totals">
          <div>Subtotal: ${inr(invoice.subtotal)}</div>
          ${invoice.tax > 0 ? `<div>Tax: ${inr(invoice.tax)}</div>` : ''}
          ${invoice.discount > 0 ? `<div>Discount: -${inr(invoice.discount)}</div>` : ''}
          <div class="grand-total">Total: ${inr(invoice.total)}</div>
        </div>
        ${invoice.note ? `<div style="margin-top: 20px;"><label>Note:</label> ${invoice.note}</div>` : ''}
        <script>window.print();</script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const remove = async (inv: SalesInvoice) => {
    setConfirmDelete(inv)
  }

  const confirmRemove = async () => {
    if (!confirmDelete) return
    try {
      await api.deleteSalesInvoice(confirmDelete.id)
      notify(`Sales invoice ${confirmDelete.invoice_no} deleted`)
      refresh()
    } catch (err) { notify((err as Error).message, 'error') }
    setConfirmDelete(null)
  }

  const total = invoices.reduce((s, inv) => s + inv.total, 0)

  return (
    <div>
      <PageHeader
        title="Sales Invoices"
        subtitle="Record sales to customers with tax and discount"
        actions={
          <Button variant="out" onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus size={16} /> New Sales Invoice
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-end">
          <SearchBox value={q} onChange={setQ} placeholder="Search invoice no, item…" className="lg:w-72" />
          <SearchSelect
            className="lg:w-64"
            placeholder="All customers"
            value={customerId}
            onChange={setCustomerId}
            options={customers.map((p) => ({ value: p.id, label: p.name, sub: p.city }))}
          />
          <div className="flex items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" aria-label="From date" />
            <span className="text-sm text-slate-400">to</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" aria-label="To date" />
          </div>
          {(from || to || customerId || q) && (
            <Button variant="ghost" onClick={() => { setFrom(''); setTo(''); setCustomerId(null); setQ('') }}>Clear</Button>
          )}
        </div>
        <Table>
          <thead>
            <tr>
              <Th className="w-8" /><Th>Date</Th><Th>Invoice No</Th><Th>Customer</Th><Th>Reference</Th>
              <Th>Items</Th><Th right>Subtotal</Th><Th right>Total</Th><Th right>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <EmptyRow cols={9} text="No sales invoices found" />
            ) : invoices.map((inv) => {
              const fullInvoice = invoiceDetails.get(inv.id) || inv
              return (
              <Fragment key={inv.id}>
                <Tr onClick={() => handleExpand(inv.id)} className="cursor-pointer hover:bg-slate-50">
                  <Td><ChevronRight size={16} className={cx('transition-transform', expanded === inv.id && 'rotate-90')} /></Td>
                  <Td>{fmtDate(inv.date)}</Td>
                  <Td><Badge>{inv.invoice_no}</Badge></Td>
                  <Td>{inv.customer_name}</Td>
                  <Td>{inv.reference || '-'}</Td>
                  <Td>{fullInvoice.lines?.length || 0} items</Td>
                  <Td right>{inr(inv.subtotal)}</Td>
                  <Td right className="font-semibold">{inr(inv.total)}</Td>
                  <Td right>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); printInvoice(inv) }}>
                        <Printer size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(inv); setFormOpen(true) }}>
                        <FileText size={14} />
                      </Button>
                      <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); remove(inv) }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Td>
                </Tr>
                {expanded === inv.id && fullInvoice.lines && (
                  <tr className="bg-slate-50">
                    <td colSpan={9} className="p-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-slate-500">
                            <th className="pb-2 text-left font-medium">Item</th>
                            <th className="pb-2 text-right font-medium">Qty</th>
                            <th className="pb-2 text-right font-medium">Rate</th>
                            <th className="pb-2 text-right font-medium">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fullInvoice.lines.map((l, i) => (
                            <tr key={i} className="border-t border-slate-100">
                              <td className="py-2">{l.name} <span className="text-slate-400">({l.code})</span></td>
                              <td className="py-2 text-right">{qty(l.qty)} {l.unit}</td>
                              <td className="py-2 text-right">{inr(l.rate)}</td>
                              <td className="py-2 text-right">{inr(l.amount)}</td>
                            </tr>
                          ))}
                          {inv.tax > 0 && (
                            <tr className="border-t border-slate-200">
                              <td colSpan={3} className="py-2 text-right font-medium">Tax</td>
                              <td className="py-2 text-right">{inr(inv.tax)}</td>
                            </tr>
                          )}
                          {inv.discount > 0 && (
                            <tr className="border-t border-slate-200">
                              <td colSpan={3} className="py-2 text-right font-medium">Discount</td>
                              <td className="py-2 text-right text-red-600">-{inr(inv.discount)}</td>
                            </tr>
                          )}
                          <tr className="border-t-2 border-slate-300">
                            <td colSpan={3} className="py-2 text-right font-semibold">Total</td>
                            <td className="py-2 text-right font-semibold">{inr(inv.total)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-semibold">
              <td colSpan={7} className="px-4 py-3 text-right">Total</td>
              <td className="px-4 py-3 text-right tabular-nums">{inr(total)}</td>
              <td />
            </tr>
          </tfoot>
        </Table>
      </Card>

      {formOpen && <SalesInvoiceForm invoice={editing} onClose={() => setFormOpen(false)} onSuccess={load} />}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Sales Invoice"
        message={`Are you sure you want to delete invoice "${confirmDelete?.invoice_no}"? This action cannot be undone.`}
        onConfirm={confirmRemove}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}

function SalesInvoiceForm({ invoice, onClose, onSuccess }: { invoice: SalesInvoice | null; onClose: () => void; onSuccess: () => void }) {
  const { customers, items, notify } = useStore()
  const [busy, setBusy] = useState(false)
  const [invoiceNo, setInvoiceNo] = useState(invoice?.invoice_no || '')
  const [date, setDate] = useState(invoice?.date || todayISO())
  const [customerId, setCustomerId] = useState<number | null>(invoice?.customer_id || null)
  const [reference, setReference] = useState(invoice?.reference || '')
  const [note, setNote] = useState(invoice?.note || '')
  const [tax, setTax] = useState(invoice?.tax || 0)
  const [discount, setDiscount] = useState(invoice?.discount || 0)
  const [lines, setLines] = useState<Array<{ item_id: number; qty: number; rate: number; amount: number }>>(
    invoice?.lines?.map((l) => ({ item_id: l.item_id, qty: l.qty, rate: l.rate, amount: l.amount })) || [{ item_id: 0, qty: 0, rate: 0, amount: 0 }]
  )

  const subtotal = lines.reduce((s, l) => s + (l.qty * l.rate), 0)
  const total = subtotal + tax - discount

  const updateLine = (index: number, field: keyof SalesInvoiceLine, value: number | null) => {
    const newLines = [...lines]
    if (value !== null) {
      (newLines[index] as any)[field] = value
    }
    if (field === 'qty' || field === 'rate') {
      newLines[index].amount = newLines[index].qty * newLines[index].rate
    }
    setLines(newLines)
  }

  const addLine = () => {
    setLines([...lines, { item_id: 0, qty: 0, rate: 0, amount: 0 }])
  }

  const removeLine = (index: number) => {
    if (lines.length > 1) setLines(lines.filter((_, i) => i !== index))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerId) return notify('Please select a customer', 'error')
    if (lines.some((l) => !l.item_id || l.qty <= 0 || l.rate < 0)) {
      return notify('Please fill all line items with valid values', 'error')
    }
    setBusy(true)
    try {
      const input: SalesInvoiceInput = {
        invoice_no: invoiceNo || undefined,
        date,
        customer_id: customerId,
        reference,
        note,
        tax,
        discount,
        lines: lines.map((l) => ({ item_id: l.item_id, qty: l.qty, rate: l.rate })),
      }
      if (invoice) {
        await api.deleteSalesInvoice(invoice.id)
        await api.createSalesInvoice(input)
        notify('Sales invoice updated')
      } else {
        await api.createSalesInvoice(input)
        notify('Sales invoice created')
      }
      onSuccess()
      onClose()
    } catch (err) { notify((err as Error).message, 'error') } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title={invoice ? 'Edit Sales Invoice' : 'New Sales Invoice'} wide blur>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Invoice No">
            <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Auto-generated if empty" />
          </Field>
          <Field label="Date" required>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
        </div>
        <Field label="Customer" required>
          <SearchSelect
            placeholder="Select customer"
            value={customerId}
            onChange={setCustomerId}
            options={customers.map((p) => ({ value: p.id, label: p.name, sub: p.city }))}
          />
        </Field>
        <Field label="Reference">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Invoice number, challan number, etc." />
        </Field>
        <Field label="Note">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Additional notes..." rows={2} />
        </Field>

        <div className="border-t border-slate-200 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-semibold">Items</span>
            <Button size="sm" variant="ghost" onClick={addLine}><Plus size={14} /> Add Item</Button>
          </div>
          {lines.map((l, i) => (
            <div key={i} className="mb-3 grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                <SearchSelect
                  placeholder="Select item"
                  value={l.item_id || null}
                  onChange={(v) => updateLine(i, 'item_id', v as number)}
                  options={items.map((item) => ({ value: item.id, label: item.name, sub: `${item.code} - ${item.unit}` }))}
                />
              </div>
              <div className="col-span-2">
                <Input type="number" step="0.01" value={l.qty || ''} onChange={(e) => updateLine(i, 'qty', parseFloat(e.target.value) || 0)} placeholder="Qty" />
              </div>
              <div className="col-span-2">
                <Input type="number" step="0.01" value={l.rate || ''} onChange={(e) => updateLine(i, 'rate', parseFloat(e.target.value) || 0)} placeholder="Rate" />
              </div>
              <div className="col-span-2 text-right">
                <span className="text-sm font-medium">{inr(l.amount)}</span>
              </div>
              <div className="col-span-1">
                {lines.length > 1 && (
                  <Button size="sm" variant="danger" onClick={() => removeLine(i)}><Trash2 size={14} /></Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-4 grid grid-cols-3 gap-4">
          <Field label="Tax">
            <Input type="number" step="0.01" value={tax || ''} onChange={(e) => setTax(parseFloat(e.target.value) || 0)} placeholder="0.00" />
          </Field>
          <Field label="Discount">
            <Input type="number" step="0.01" value={discount || ''} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} placeholder="0.00" />
          </Field>
          <div className="flex flex-col justify-end">
            <div className="text-sm text-slate-500">Subtotal: {inr(subtotal)}</div>
            <div className="text-lg font-bold">{inr(total)}</div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Saving...' : invoice ? 'Update' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  )
}
