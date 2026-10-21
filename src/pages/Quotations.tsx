import { Fragment, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronRight, FileText, Plus, Printer, Trash2 } from 'lucide-react'
import {
  Badge, Button, Card, ConfirmDialog, EmptyRow, Field, Input, Modal, PageHeader, SearchBox, SearchSelect, Select, Table, Td, Textarea, Th, Tr, cx,
} from '@/components/ui'
import { api } from '@/lib/api'
import { fmtDate, inr, qty, todayISO } from '@/lib/format'
import { useStore } from '@/lib/store'
import type { Quotation, QuotationInput, QuotationLine } from '@/lib/types'

export default function Quotations() {
  const { suppliers, items, notify, refresh } = useStore()
  const [params, setParams] = useSearchParams()

  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [quotationDetails, setQuotationDetails] = useState<Map<number, Quotation>>(new Map())
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [supplierId, setSupplierId] = useState<number | null>(null)
  const [status, setStatus] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [editing, setEditing] = useState<Quotation | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Quotation | null>(null)

  const load = useCallback(() => {
    api.getQuotations({ from, to, supplier_id: supplierId ?? undefined, status: status || undefined })
      .then(setQuotations)
      .catch((e) => notify(e.message, 'error'))
  }, [from, to, supplierId, status, notify])

  const loadQuotationDetails = useCallback(async (quotationId: number) => {
    try {
      const quotation = await api.getQuotation(quotationId)
      setQuotationDetails(prev => new Map(prev).set(quotationId, quotation))
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

  const handleExpand = async (quotationId: number) => {
    const newExpanded = expanded === quotationId ? null : quotationId
    setExpanded(newExpanded)
    if (newExpanded && !quotationDetails.has(quotationId)) {
      await loadQuotationDetails(quotationId)
    }
  }

  const printQuotation = (quotation: Quotation) => {
    const fullQuotation = quotationDetails.get(quotation.id) || quotation
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    // Calculate tax summary by HSN code
    const taxSummary = new Map<string, { taxable: number; cgst: number; sgst: number; total: number }>()
    fullQuotation.lines?.forEach(l => {
      const hsn = l.hsn_code || 'N/A'
      const gstRate = l.gst_rate || 0
      const taxable = l.amount
      const cgst = taxable * (gstRate / 2) / 100
      const sgst = cgst
      const total = taxable + cgst + sgst

      if (!taxSummary.has(hsn)) {
        taxSummary.set(hsn, { taxable: 0, cgst: 0, sgst: 0, total: 0 })
      }
      const summary = taxSummary.get(hsn)!
      summary.taxable += taxable
      summary.cgst += cgst
      summary.sgst += sgst
      summary.total += total
    })

    printWindow.document.write(`
      <html>
      <head>
        <title>Quotation - ${quotation.quotation_no}</title>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 20px; font-size: 11px; color: #333; }
          .container { max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header h1 { margin: 0; font-size: 22px; font-weight: bold; color: #1a1a1a; }
          .header p { margin: 5px 0 0; font-size: 11px; color: #666; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 15px; }
          .info-box { width: 48%; }
          .info-box-title { font-weight: bold; font-size: 12px; margin-bottom: 5px; color: #1a1a1a; }
          .info-box-content { font-size: 11px; line-height: 1.6; }
          .status-badge { display: inline-block; padding: 3px 10px; border-radius: 10px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
          .status-pending { background: #fff3cd; color: #856404; }
          .status-accepted { background: #d1e7dd; color: #0f5132; }
          .status-rejected { background: #f8d7da; color: #721c04; }
          .status-expired { background: #e2e3e5; color: #41464b; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th { background: #f8f9fa; border: 1px solid #dee2e6; padding: 8px; text-align: left; font-weight: bold; font-size: 11px; }
          td { border: 1px solid #dee2e6; padding: 8px; font-size: 11px; }
          .text-right { text-align: right; }
          .totals { margin-top: 15px; }
          .totals-row { display: flex; justify-content: flex-end; margin-bottom: 5px; }
          .totals-label { width: 120px; padding-right: 15px; text-align: right; }
          .totals-value { width: 100px; text-align: right; }
          .grand-total { font-weight: bold; font-size: 13px; border-top: 2px solid #333; padding-top: 8px; }
          .tax-summary { margin-top: 20px; border: 1px solid #dee2e6; padding: 10px; }
          .tax-summary-title { font-weight: bold; margin-bottom: 8px; }
          .tax-table { width: 100%; border-collapse: collapse; }
          .tax-table th, .tax-table td { border: 1px solid #dee2e6; padding: 6px; }
          .amount-words { margin-top: 15px; font-style: italic; font-size: 11px; }
          .note { margin-top: 15px; padding: 10px; background: #f8f9fa; border-left: 3px solid #007bff; }
          .declaration { margin-top: 20px; font-size: 10px; color: #666; text-align: center; }
          @media print { body { padding: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>KRISHNA STEEL CORPORATION</h1>
            <p>Steel Stock Management System</p>
          </div>
          <div class="info-row">
            <div class="info-box">
              <div class="info-box-title">Quotation Details</div>
              <div class="info-box-content">
                <strong>Quotation No:</strong> ${quotation.quotation_no}<br>
                <strong>Date:</strong> ${fmtDate(quotation.date)}<br>
                <strong>Valid Until:</strong> ${quotation.valid_until ? fmtDate(quotation.valid_until) : '-'}<br>
                <strong>Status:</strong> <span class="status-badge status-${quotation.status}">${quotation.status}</span><br>
                <strong>Reference:</strong> ${quotation.reference || '-'}
              </div>
            </div>
            <div class="info-box">
              <div class="info-box-title">Supplier Details</div>
              <div class="info-box-content">
                <strong>Name:</strong> ${quotation.supplier_name || '-'}<br>
                ${quotation.contact_person ? `<strong>Contact Person:</strong> ${quotation.contact_person}<br>` : ''}
                ${quotation.phone ? `<strong>Phone:</strong> ${quotation.phone}<br>` : ''}
                ${quotation.email ? `<strong>Email:</strong> ${quotation.email}<br>` : ''}
                ${quotation.gstin ? `<strong>GSTIN:</strong> ${quotation.gstin}<br>` : ''}
                ${quotation.address ? `<strong>Address:</strong> ${quotation.address}<br>` : ''}
                ${quotation.city ? `<strong>City:</strong> ${quotation.city}` : ''}
              </div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 30%">Item Description</th>
                <th style="width: 15%">Code</th>
                <th style="width: 10%" class="text-right">HSN/SAC</th>
                <th style="width: 10%" class="text-right">Qty</th>
                <th style="width: 10%" class="text-right">Rate</th>
                <th style="width: 10%" class="text-right">GST %</th>
                <th style="width: 15%" class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(fullQuotation.lines || []).map(l => `
                <tr>
                  <td>${l.name || '-'}</td>
                  <td>${l.code || '-'}</td>
                  <td class="text-right">${l.hsn_code || '-'}</td>
                  <td class="text-right">${qty(l.qty)} ${l.unit || ''}</td>
                  <td class="text-right">${inr(l.rate)}</td>
                  <td class="text-right">${l.gst_rate || 0}%</td>
                  <td class="text-right">${inr(l.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div class="totals-row">
              <div class="totals-label">Subtotal:</div>
              <div class="totals-value">${inr(quotation.subtotal)}</div>
            </div>
            ${quotation.tax > 0 ? `
              <div class="totals-row">
                <div class="totals-label">Tax:</div>
                <div class="totals-value">${inr(quotation.tax)}</div>
              </div>
            ` : ''}
            ${quotation.discount > 0 ? `
              <div class="totals-row">
                <div class="totals-label">Discount:</div>
                <div class="totals-value">-${inr(quotation.discount)}</div>
              </div>
            ` : ''}
            <div class="totals-row grand-total">
              <div class="totals-label">Grand Total:</div>
              <div class="totals-value">${inr(quotation.total)}</div>
            </div>
          </div>
          ${taxSummary.size > 0 ? `
            <div class="tax-summary">
              <div class="tax-summary-title">Tax Summary (HSN-wise)</div>
              <table class="tax-table">
                <thead>
                  <tr>
                    <th>HSN/SAC</th>
                    <th class="text-right">Taxable Value</th>
                    <th class="text-right">CGST</th>
                    <th class="text-right">SGST</th>
                    <th class="text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  ${Array.from(taxSummary.entries()).map(([hsn, data]) => `
                    <tr>
                      <td>${hsn}</td>
                      <td class="text-right">${inr(data.taxable)}</td>
                      <td class="text-right">${inr(data.cgst)}</td>
                      <td class="text-right">${inr(data.sgst)}</td>
                      <td class="text-right">${inr(data.cgst + data.sgst)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
          ${quotation.note ? `
            <div class="note">
              <strong>Note:</strong> ${quotation.note}
            </div>
          ` : ''}
          <div class="declaration">
            This is a computer-generated quotation and does not require a physical signature.
          </div>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const remove = async (q: Quotation) => {
    setConfirmDelete(q)
  }

  const confirmRemove = async () => {
    if (!confirmDelete) return
    try {
      await api.deleteQuotation(confirmDelete.id)
      notify(`Quotation ${confirmDelete.quotation_no} deleted`)
      refresh()
    } catch (err) { notify((err as Error).message, 'error') }
    setConfirmDelete(null)
  }

  const total = quotations.reduce((s, q) => s + q.total, 0)

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    accepted: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-red-50 text-red-700',
    expired: 'bg-slate-50 text-slate-600',
  }

  return (
    <div>
      <PageHeader
        title="Supplier Quotations"
        subtitle="Manage price quotations from suppliers"
        actions={
          <Button variant="in" onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus size={16} /> New Quotation
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-end">
          <SearchBox value={q} onChange={setQ} placeholder="Search quotation no, item…" className="lg:w-72" />
          <SearchSelect
            className="lg:w-64"
            placeholder="All suppliers"
            value={supplierId}
            onChange={setSupplierId}
            options={suppliers.map((p) => ({ value: p.id, label: p.name, sub: p.city }))}
          />
          <Field label="Status" className="lg:w-40">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </Select>
          </Field>
          <div className="flex items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" aria-label="From date" />
            <span className="text-sm text-slate-400">to</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" aria-label="To date" />
          </div>
          {(from || to || supplierId || status || q) && (
            <Button variant="ghost" onClick={() => { setFrom(''); setTo(''); setSupplierId(null); setStatus(''); setQ('') }}>Clear</Button>
          )}
        </div>
        <Table>
          <thead>
            <tr>
              <Th className="w-8" /><Th>Date</Th><Th>Quotation No</Th><Th>Supplier</Th><Th>Valid Until</Th><Th>Status</Th>
              <Th>Items</Th><Th right>Subtotal</Th><Th right>Total</Th><Th right>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {quotations.length === 0 ? (
              <EmptyRow cols={10} text="No quotations found" />
            ) : quotations.map((q) => {
              const fullQuotation = quotationDetails.get(q.id) || q
              return (
              <Fragment key={q.id}>
                <Tr onClick={() => handleExpand(q.id)} className="cursor-pointer hover:bg-slate-50">
                  <Td><ChevronRight size={16} className={cx('transition-transform', expanded === q.id && 'rotate-90')} /></Td>
                  <Td>{fmtDate(q.date)}</Td>
                  <Td><Badge>{q.quotation_no}</Badge></Td>
                  <Td>{q.supplier_name}</Td>
                  <Td>{q.valid_until ? fmtDate(q.valid_until) : '-'}</Td>
                  <Td><span className={cx('px-2 py-0.5 rounded-full text-xs font-medium uppercase', statusColors[q.status] || statusColors.pending)}>{q.status}</span></Td>
                  <Td>{fullQuotation.lines?.length || 0} items</Td>
                  <Td right>{inr(q.subtotal)}</Td>
                  <Td right className="font-semibold">{inr(q.total)}</Td>
                  <Td right>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); printQuotation(q) }}>
                        <Printer size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(q); setFormOpen(true) }}>
                        <FileText size={14} />
                      </Button>
                      <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); remove(q) }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Td>
                </Tr>
                {expanded === q.id && fullQuotation.lines && (
                  <tr className="bg-slate-50">
                    <td colSpan={10} className="p-4">
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
                          {fullQuotation.lines.map((l, i) => (
                            <tr key={i} className="border-t border-slate-100">
                              <td className="py-2">{l.name} <span className="text-slate-400">({l.code})</span></td>
                              <td className="py-2 text-right">{qty(l.qty)} {l.unit}</td>
                              <td className="py-2 text-right">{inr(l.rate)}</td>
                              <td className="py-2 text-right">{inr(l.amount)}</td>
                            </tr>
                          ))}
                          {q.tax > 0 && (
                            <tr className="border-t border-slate-200">
                              <td colSpan={3} className="py-2 text-right font-medium">Tax</td>
                              <td className="py-2 text-right">{inr(q.tax)}</td>
                            </tr>
                          )}
                          {q.discount > 0 && (
                            <tr className="border-t border-slate-200">
                              <td colSpan={3} className="py-2 text-right font-medium">Discount</td>
                              <td className="py-2 text-right text-red-600">-{inr(q.discount)}</td>
                            </tr>
                          )}
                          <tr className="border-t-2 border-slate-300">
                            <td colSpan={3} className="py-2 text-right font-semibold">Total</td>
                            <td className="py-2 text-right font-semibold">{inr(q.total)}</td>
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
              <td colSpan={8} className="px-4 py-3 text-right">Total</td>
              <td className="px-4 py-3 text-right tabular-nums">{inr(total)}</td>
              <td />
            </tr>
          </tfoot>
        </Table>
      </Card>

      {formOpen && <QuotationForm quotation={editing} onClose={() => { setFormOpen(false); setQuotationDetails(new Map()); load() }} onSuccess={load} />}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Quotation"
        message={`Are you sure you want to delete quotation "${confirmDelete?.quotation_no}"? This action cannot be undone.`}
        onConfirm={confirmRemove}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}

function QuotationForm({ quotation, onClose, onSuccess }: { quotation: Quotation | null; onClose: () => void; onSuccess: () => void }) {
  const { suppliers, items, notify } = useStore()
  const [busy, setBusy] = useState(false)
  const [quotationNo, setQuotationNo] = useState(quotation?.quotation_no || '')
  const [date, setDate] = useState(quotation?.date || todayISO())
  const [supplierId, setSupplierId] = useState<number | null>(quotation?.supplier_id || null)
  const [reference, setReference] = useState(quotation?.reference || '')
  const [note, setNote] = useState(quotation?.note || '')
  const [tax, setTax] = useState(quotation?.tax || 0)
  const [discount, setDiscount] = useState(quotation?.discount || 0)
  const [validUntil, setValidUntil] = useState(quotation?.valid_until || '')
  const [status, setStatus] = useState<'pending' | 'accepted' | 'rejected' | 'expired'>(quotation?.status || 'pending')
  const [lines, setLines] = useState<Array<{ item_id: number; qty: number; rate: number; amount: number }>>(
    quotation?.lines?.map((l) => ({ item_id: l.item_id, qty: l.qty, rate: l.rate, amount: l.amount })) || [{ item_id: 0, qty: 0, rate: 0, amount: 0 }]
  )

  const subtotal = lines.reduce((s, l) => s + (l.qty * l.rate), 0)
  const total = subtotal + tax - discount

  const updateLine = (index: number, field: keyof QuotationLine, value: number | null) => {
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
    if (!supplierId) return notify('Please select a supplier', 'error')
    // Only validate line items for new quotations
    if (!quotation && lines.some((l) => !l.item_id || l.qty <= 0 || l.rate < 0)) {
      return notify('Please fill all line items with valid values', 'error')
    }
    setBusy(true)
    try {
      const input: QuotationInput = {
        quotation_no: quotationNo || undefined,
        date,
        supplier_id: supplierId,
        reference,
        note,
        tax,
        discount,
        valid_until: validUntil,
        status,
        // Only include lines for new quotations or when they've been modified
        lines: quotation ? undefined : lines.map((l) => ({ item_id: l.item_id, qty: l.qty, rate: l.rate })),
      }
      if (quotation) {
        await api.updateQuotation(quotation.id, input)
        notify('Quotation updated')
      } else {
        await api.createQuotation(input)
        notify('Quotation created')
      }
      await onSuccess()
      onClose()
    } catch (err) { notify((err as Error).message, 'error') } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title={quotation ? 'Edit Quotation' : 'New Quotation'} wide blur>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quotation No">
            <Input value={quotationNo} onChange={(e) => setQuotationNo(e.target.value)} placeholder="Auto-generated if empty" />
          </Field>
          <Field label="Date" required>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
        </div>
        <Field label="Supplier" required>
          <SearchSelect
            placeholder="Select supplier"
            value={supplierId}
            onChange={setSupplierId}
            options={suppliers.map((p) => ({ value: p.id, label: p.name, sub: p.city }))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Valid Until">
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as 'pending' | 'accepted' | 'rejected' | 'expired')}>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </Select>
          </Field>
        </div>
        <Field label="Reference">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference number, PO number, etc." />
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
          <Button type="submit" disabled={busy}>{busy ? 'Saving...' : quotation ? 'Update' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  )
}
