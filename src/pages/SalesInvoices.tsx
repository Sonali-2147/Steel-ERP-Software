import { Fragment, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronRight, Download, FileText, Plus, Printer, Trash2 } from 'lucide-react'
import {
  Badge, Button, Card, ConfirmDialog, EmptyRow, Field, Input, Modal, PageHeader, SearchBox, SearchSelect, Table, Td, Textarea, Th, Tr, cx,
} from '@/components/ui'
import { api } from '@/lib/api'
import { amountInWords, fmtDate, fmtDateTime, inr, qty, todayISO } from '@/lib/format'
import { useStore } from '@/lib/store'
import type { SalesInvoice, SalesInvoiceInput, SalesInvoiceLine } from '@/lib/types'


export default function SalesInvoices() {
  const { customers, items, notify, refresh } = useStore()
  const [params, setParams] = useSearchParams()

  const [invoices, setInvoices] = useState<SalesInvoice[]>([])
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

  const handleExpand = (invoiceId: number) => {
    setExpanded(expanded === invoiceId ? null : invoiceId)
  }

  const printInvoice = async (invoice: SalesInvoice) => {
    const fullInvoice = await api.getSalesInvoice(invoice.id).catch(() => invoice)
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const totalQty = (fullInvoice.lines || []).reduce((sum, l) => sum + l.qty, 0)
    const customerName = fullInvoice.customer_name || invoice.customer_name || '-'
    const customerAddress = fullInvoice.address || invoice.address || '-'
    const customerContact = fullInvoice.contact_person || invoice.contact_person || '-'
    const customerPhone = fullInvoice.phone || invoice.phone || '-'
    const customerEmail = fullInvoice.email || invoice.email || '-'

    printWindow.document.write(`
      <html>
      <head>
        <title>Quotation - ${invoice.invoice_no}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            font-size: 10px;
            color: #222;
            margin: 0;
            padding: 5px;
          }
          .invoice { width: 100%; border: 1px solid #000; }
          .header {
            text-align: center;
            padding: 8px;
            border-bottom: 1px solid #000;
          }
          .header h1 {
            font-size: 18px;
            margin: 0 0 4px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .header p { margin: 2px 0; line-height: 1.3; font-size: 9px; }
          .invoice-title {
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            padding: 6px;
            border-bottom: 1px solid #000;
            text-transform: uppercase;
          }
          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border-bottom: 1px solid #000;
          }
          .details-grid > div { padding: 8px; line-height: 1.6; font-size: 9px; }
          .details-grid > div:first-child { border-right: 1px solid #000; }
          .section-title {
            font-weight: bold;
            margin-bottom: 4px;
            text-transform: uppercase;
            font-size: 10px;
          }
          .field-row { display: flex; margin-bottom: 2px; }
          .field-label { width: 140px; font-weight: bold; }
          .field-value { flex: 1; }
          table { width: 100%; border-collapse: collapse; font-size: 9px; }
          th, td {
            border: 1px solid #000;
            padding: 4px 3px;
            vertical-align: top;
          }
          th { text-align: center; font-weight: bold; background: #f5f5f5; }
          .right { text-align: right; white-space: nowrap; }
          .center { text-align: center; }
          .summary-section {
            padding: 8px;
            border-bottom: 1px solid #000;
          }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .amount-words {
            padding: 6px 8px;
            border-bottom: 1px solid #000;
            font-style: italic;
            font-size: 9px;
          }
          .tax-summary-table { margin-top: 8px; }
          .tax-summary-table th, .tax-summary-table td { padding: 3px; }
          .bank-details {
            padding: 8px;
            border-bottom: 1px solid #000;
            font-size: 9px;
          }
          .footer {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border-top: 1px solid #000;
            min-height: 80px;
          }
          .footer > div { padding: 8px; font-size: 9px; }
          .footer > div:first-child { border-right: 1px solid #000; }
          .signature {
            text-align: right;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: flex-end;
          }
          .sign-space { height: 30px; }
          .sign-label { font-weight: bold; }
          .computer-note {
            text-align: center;
            padding: 5px;
            border-top: 1px solid #000;
            font-size: 9px;
          }
          @media print {
            body { padding: 0; }
            .invoice, tr { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="header">
            <h1>Krishna Steel Corporation</h1>
            <p>
              250/1/2, Near Gokul Hotel, Karad Road, Vita,<br>
              Tal-Khanapur, Dist-Sangli, Maharashtra
            </p>
            <p>
              <strong>GSTIN/UIN:</strong> 27AVTPC3234C2ZS | <strong>State Name:</strong> Maharashtra<br>
              <strong>Contact:</strong> 9975981103 / 9421120822 | <strong>E-Mail:</strong> krishnasteelcorporation03@gmail.com
            </p>
          </div>

          <div class="invoice-title">Quotation</div>

          <div class="details-grid">
            <div>
              <div class="section-title">Invoice Details</div>
              <div class="field-row"><span class="field-label">Invoice No.:</span><span class="field-value">${invoice.invoice_no}</span></div>
              <div class="field-row"><span class="field-label">Dated:</span><span class="field-value">${fmtDate(invoice.date)}</span></div>
              <div class="field-row"><span class="field-label">Delivery Note:</span><span class="field-value">-</span></div>
              <div class="field-row"><span class="field-label">Mode/Terms of Payment:</span><span class="field-value">-</span></div>
              <div class="field-row"><span class="field-label">Buyer's Order No.:</span><span class="field-value">-</span></div>
              <div class="field-row"><span class="field-label">Dated:</span><span class="field-value">-</span></div>
              <div class="field-row"><span class="field-label">Dispatch Doc No.:</span><span class="field-value">-</span></div>
              <div class="field-row"><span class="field-label">Delivery Note Date:</span><span class="field-value">-</span></div>
            </div>
            <div>
              <div class="section-title">Buyer (Bill to)</div>
              <div class="field-row"><span class="field-label">Name:</span><span class="field-value">${customerName}</span></div>
              <div class="field-row"><span class="field-label">Address:</span><span class="field-value">${customerAddress}</span></div>
              <div class="field-row"><span class="field-label">Contact Person:</span><span class="field-value">${customerContact}</span></div>
              <div class="field-row"><span class="field-label">Phone:</span><span class="field-value">${customerPhone}</span></div>
              <div class="field-row"><span class="field-label">Email:</span><span class="field-value">${customerEmail}</span></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%">SI</th>
                <th style="width: 48%">Description of Goods</th>
                <th style="width: 12%">Quantity</th>
                <th style="width: 12%">Rate</th>
                <th style="width: 8%">per</th>
                <th style="width: 15%">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(fullInvoice.lines || []).map((l, i) => `
                <tr>
                  <td class="center">${i + 1}</td>
                  <td>${l.name}</td>
                  <td class="right">${qty(l.qty)}</td>
                  <td class="right">${inr(l.rate)}</td>
                  <td class="center">${l.unit}</td>
                  <td class="right">${inr(l.amount)}</td>
                </tr>
              `).join('')}
              <tr>
                <td colspan="2" class="right" style="font-weight: bold;">Total Quantity:</td>
                <td colspan="2" class="right" style="font-weight: bold;">${qty(totalQty, 'kg')}</td>
                <td colspan="2"></td>
              </tr>
            </tbody>
          </table>

          <div class="summary-section">
            <div class="summary-row"><span>Subtotal:</span><span>${inr(invoice.subtotal)}</span></div>
            <div class="summary-row"><span>Loading Amount:</span><span>${inr(invoice.loading_amount)}</span></div>
            <div class="summary-row"><span>Unloading Amount:</span><span>${inr(invoice.unloading_amount)}</span></div>
            <div class="summary-row"><span>Freight Amount:</span><span>${inr(invoice.freight_amount)}</span></div>
            <div class="summary-row"><span>Total KG:</span><span>${invoice.total_kg}</span></div>
            <div class="summary-row"><span>Discount:</span><span>${inr(invoice.discount)}</span></div>
            <div class="summary-row" style="font-weight: bold; margin-top: 4px;"><span>Total:</span><span>${inr(invoice.total)}</span></div>
            <div style="margin-top: 4px; font-style: italic;">E. & O.E</div>
          </div>

          <div class="amount-words">
            <strong>Amount Chargeable (in words):</strong> ${amountInWords(invoice.total)}
          </div>

          <div class="bank-details">
            <div class="section-title">Bank Details</div>
            <div class="field-row"><span class="field-label">Bank Name:</span><span class="field-value">Axis Bank</span></div>
            <div class="field-row"><span class="field-label">A/c No.:</span><span class="field-value">922030050546660</span></div>
            <div class="field-row"><span class="field-label">Branch & IFS Code:</span><span class="field-value">Vita - UTIB0002839 </span></div>
          </div>

          <div class="footer">
            <div>
              <strong>Declaration</strong>
              <p style="margin: 4px 0; line-height: 1.4;">
                We declare that this Invoice shows the actual price of the goods described and that all particulars are true and correct.
              </p>
            </div>
            <div class="signature">
              <strong>for Krishna Steel Corporation</strong>
              <div class="sign-space"></div>
              <div class="sign-label">Authorised Signatory</div>
            </div>
          </div>

          <div class="computer-note">
            This is a Computer Generated Invoice
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
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
  const totalKg = invoices.reduce((s, inv) => s + (Number(inv.total_kg) || 0), 0)

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
              <Th className="w-8" /><Th>Date</Th><Th>Entry Time</Th><Th>Invoice No</Th><Th>Customer</Th><Th>Reference</Th>
              <Th>Items</Th><Th right>Subtotal</Th><Th right>Total</Th><Th right>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <EmptyRow cols={10} text="No sales invoices found" />
            ) : invoices.map((inv) => {
              return (
              <Fragment key={inv.id}>
                <Tr onClick={() => handleExpand(inv.id)} className="cursor-pointer hover:bg-slate-50">
                  <Td><ChevronRight size={16} className={cx('transition-transform', expanded === inv.id && 'rotate-90')} /></Td>
                  <Td>{fmtDate(inv.date)}</Td>
                  <Td className="whitespace-nowrap text-slate-600">{fmtDateTime(inv.created_at)}</Td>
                  <Td><Badge>{inv.invoice_no}</Badge></Td>
                  <Td>{inv.customer_name}</Td>
                  <Td>{inv.reference || '-'}</Td>
                  <Td>{inv.lines?.length || 0} items</Td>
                  <Td right>{inr(inv.subtotal)}</Td>
                  <Td right className="font-semibold">{inr(inv.total)}</Td>
                  <Td right>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" title="Print" onClick={(e) => { e.stopPropagation(); printInvoice(inv) }}>
                        <Printer size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" title="Download PDF" onClick={(e) => { e.stopPropagation(); window.print() }}>
                        <Download size={14} />
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
                {expanded === inv.id && inv.lines && (
                  <tr className="bg-slate-50">
                    <td colSpan={10} className="p-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-slate-500">
                            <th className="pb-2 text-left font-medium">Item</th>
                            <th className="pb-2 text-right font-medium">Current Stock</th>
                            <th className="pb-2 text-right font-medium">Qty</th>
                            <th className="pb-2 text-right font-medium">Rate</th>
                            <th className="pb-2 text-right font-medium">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inv.lines.map((l, i) => {
                            const item = items.find(it => it.id === l.item_id)
                            return (
                              <tr key={i} className="border-t border-slate-100">
                                <td className="py-2">{l.name} <span className="text-slate-400">({l.code})</span></td>
                                <td className="py-2 text-right">{item ? qty(item.stock) : '-'} {item?.unit}</td>
                                <td className="py-2 text-right">{qty(l.qty)} {l.unit}</td>
                                <td className="py-2 text-right">{inr(l.rate)}</td>
                                <td className="py-2 text-right">{inr(l.amount)}</td>
                              </tr>
                            )
                          })}
                          {inv.discount > 0 && (
                            <tr className="border-t border-slate-200">
                              <td colSpan={4} className="py-2 text-right font-medium">Discount</td>
                              <td className="py-2 text-right text-red-600">-{inr(inv.discount)}</td>
                            </tr>
                          )}
                          <tr className="border-t-2 border-slate-300">
                            <td colSpan={4} className="py-2 text-right font-semibold">Net Total</td>
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
              <td colSpan={6} className="px-4 py-3 text-right">Total KG</td>
              <td className="px-4 py-3 text-right tabular-nums">{qty(totalKg, 'kg')}</td>
              <td className="px-4 py-3 text-right">Total Amount</td>
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
  const { customers, items, notify, refresh } = useStore()
  const [busy, setBusy] = useState(false)
  const [invoiceNo, setInvoiceNo] = useState(invoice?.invoice_no || '')
  const [date, setDate] = useState(invoice?.date || todayISO())
  const [customerId, setCustomerId] = useState<number | null>(invoice?.customer_id || null)
  const [reference, setReference] = useState(invoice?.reference || '')
  const [note, setNote] = useState(invoice?.note || '')
  const [discount, setDiscount] = useState(invoice?.discount || 0)
  const [loadingAmount, setLoadingAmount] = useState(invoice?.loading_amount || 0)
  const [unloadingAmount, setUnloadingAmount] = useState(invoice?.unloading_amount || 0)
  const [freightAmount, setFreightAmount] = useState(invoice?.freight_amount || 0)
  const [lines, setLines] = useState<Array<{ item_id: number; qty: number; rate: number; amount: number }>>(
    invoice?.lines?.map((l) => ({ item_id: l.item_id, qty: l.qty, rate: l.rate, amount: l.amount })) || [{ item_id: 0, qty: 0, rate: 0, amount: 0 }]
  )

  const subtotal = lines.reduce((s, l) => s + (l.qty * l.rate), 0)
  const totalKg = lines.reduce((s, l) => s + l.qty, 0)
  const total = subtotal - discount + loadingAmount + unloadingAmount + freightAmount

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
    if (lines.some((l) => !l.item_id || Number(l.qty) <= 0 || Number(l.rate) < 0)) {
      return notify('Each sales row must have a valid item, quantity greater than zero, and a non-negative rate.', 'error')
    }

    const totals = new Map<number, number>()
    for (const line of lines) {
      if (!line.item_id) continue
      totals.set(line.item_id, (totals.get(line.item_id) || 0) + Number(line.qty || 0))
    }

    for (const [itemId, totalQty] of totals) {
      const item = items.find((it) => it.id === itemId)
      if (!item) continue
      if (totalQty > item.stock) {
        return notify(`Cannot sell "${item.name}". Requested ${qty(totalQty, item.unit)}, but only ${qty(item.stock, item.unit)} is available.`, 'error')
      }
    }

    setBusy(true)
    try {
      const input: SalesInvoiceInput = {
        invoice_no: invoiceNo || undefined,
        date,
        customer_id: customerId,
        reference,
        note,
        tax: 0,
        discount,
        loading_amount: loadingAmount,
        unloading_amount: unloadingAmount,
        freight_amount: freightAmount,
        total_kg: totalKg,
        lines: lines.map((l) => ({ item_id: l.item_id, qty: l.qty, rate: l.rate })),
      }
      if (invoice) {
        await api.updateSalesInvoice(invoice.id, input)
        notify('Sales invoice updated')
      } else {
        await api.createSalesInvoice(input)
        notify('Sales invoice created')
      }
      refresh()
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

          <div className="overflow-visible rounded-xl border border-slate-200 bg-slate-50">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Rate</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="w-12 px-3 py-2 text-center font-medium"> </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => {
                  const item = items.find(it => it.id === l.item_id)
                  return (
                    <tr key={i} className="border-t border-slate-200 align-top">
                      <td className="px-3 py-3">
                        <SearchSelect
                          placeholder="Select item"
                          value={l.item_id || null}
                          onChange={(v) => updateLine(i, 'item_id', v as number)}
                          options={items.map((item) => ({ value: item.id, label: item.name, sub: `${item.code} - ${item.unit}` }))}
                        />
                        {item && (
                          <div className="mt-1 text-xs text-slate-500">
                            Current Stock: {qty(item.stock)} {item.unit}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Input type="number" step="0.01" value={l.qty || ''} onChange={(e) => updateLine(i, 'qty', parseFloat(e.target.value) || 0)} placeholder="Qty" />
                      </td>
                      <td className="px-3 py-3">
                        <Input type="number" step="0.01" value={l.rate || ''} onChange={(e) => updateLine(i, 'rate', parseFloat(e.target.value) || 0)} placeholder="Rate" />
                      </td>
                      <td className="px-3 py-3 text-right align-middle font-medium text-slate-900">
                        {inr(l.amount)}
                      </td>
                      <td className="px-3 py-3 text-center align-middle">
                        {lines.length > 1 && (
                          <Button size="sm" variant="danger" onClick={() => removeLine(i)}><Trash2 size={14} /></Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-col items-end gap-1 border-t border-slate-200 pt-3 text-sm text-slate-600">
            <div>
              <span className="mr-2 text-slate-500">Total KG:</span>
              <span className="font-semibold text-slate-900">{qty(totalKg, 'kg')}</span>
            </div>
            <div>
              <span className="mr-2 text-slate-500">Total Amount:</span>
              <span className="font-semibold text-slate-900">{inr(subtotal)}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <div className="mb-3 font-semibold">Expenses</div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Field label="Loading Amount">
              <Input type="number" step="0.01" value={loadingAmount || ''} onChange={(e) => setLoadingAmount(parseFloat(e.target.value) || 0)} placeholder="0.00" />
            </Field>
            <Field label="Unloading Amount">
              <Input type="number" step="0.01" value={unloadingAmount || ''} onChange={(e) => setUnloadingAmount(parseFloat(e.target.value) || 0)} placeholder="0.00" />
            </Field>
            <Field label="Freight Amount">
              <Input type="number" step="0.01" value={freightAmount || ''} onChange={(e) => setFreightAmount(parseFloat(e.target.value) || 0)} placeholder="0.00" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Discount">
              <Input type="number" step="0.01" value={discount || ''} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} placeholder="0.00" />
            </Field>
            <div className="flex flex-col justify-end">
              <div className="text-sm text-slate-500">Subtotal: {inr(subtotal)}</div>
              <div className="text-lg font-bold">{inr(total)}</div>
            </div>
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
