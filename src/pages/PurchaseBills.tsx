import { Fragment, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronRight, FileText, Plus, Printer, Trash2 } from 'lucide-react'
import {
  Badge, Button, Card, ConfirmDialog, EmptyRow, Field, Input, Modal, PageHeader, SearchBox, SearchSelect, Table, Td, Textarea, Th, Tr, cx,
} from '@/components/ui'
import { api } from '@/lib/api'
import { amountInWords, fmtDate, fmtDateTime, inr, qty, todayISO } from '@/lib/format'
import { useStore } from '@/lib/store'
import type { PurchaseBill, PurchaseBillInput, PurchaseBillLine } from '@/lib/types'

export default function PurchaseBills() {
  const { suppliers, items, notify, refresh } = useStore()
  const [params, setParams] = useSearchParams()

  const [bills, setBills] = useState<PurchaseBill[]>([])
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [supplierId, setSupplierId] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [editing, setEditing] = useState<PurchaseBill | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<PurchaseBill | null>(null)

  const load = useCallback(() => {
    api.getPurchaseBills({ from, to, supplier_id: supplierId ?? undefined })
      .then(setBills)
      .catch((e) => notify(e.message, 'error'))
  }, [from, to, supplierId, notify])


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

  const handleExpand = (billId: number) => {
    setExpanded(expanded === billId ? null : billId)
  }

  const printBill = async (bill: PurchaseBill) => {
    const fullBill = await api.getPurchaseBill(bill.id).catch(() => bill)
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const totalQty = (fullBill.lines || []).reduce((sum, l) => sum + l.qty, 0)
    const supplierName = fullBill.supplier_name || bill.supplier_name || '-'
    const supplierAddress = fullBill.address || bill.address || '-'
    const supplierContact = fullBill.contact_person || bill.contact_person || '-'
    const supplierPhone = fullBill.phone || bill.phone || '-'
    const supplierEmail = fullBill.email || bill.email || '-'

    printWindow.document.write(`
      <html>
      <head>
        <title>Purchase Bill - ${bill.bill_no}</title>
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

          <div class="invoice-title">Purchase Bill</div>

          <div class="details-grid">
            <div>
              <div class="section-title">Bill Details</div>
              <div class="field-row"><span class="field-label">Bill No.:</span><span class="field-value">${bill.bill_no}</span></div>
              <div class="field-row"><span class="field-label">Dated:</span><span class="field-value">${fmtDate(bill.date)}</span></div>
              <div class="field-row"><span class="field-label">Delivery Note:</span><span class="field-value">-</span></div>
              <div class="field-row"><span class="field-label">Mode/Terms of Payment:</span><span class="field-value">-</span></div>
              <div class="field-row"><span class="field-label">Supplier's Order No.:</span><span class="field-value">-</span></div>
              <div class="field-row"><span class="field-label">Dated:</span><span class="field-value">-</span></div>
              <div class="field-row"><span class="field-label">Dispatch Doc No.:</span><span class="field-value">-</span></div>
              <div class="field-row"><span class="field-label">Delivery Note Date:</span><span class="field-value">-</span></div>
            </div>
            <div>
              <div class="section-title">Supplier (Bill to)</div>
              <div class="field-row"><span class="field-label">Name:</span><span class="field-value">${supplierName}</span></div>
              <div class="field-row"><span class="field-label">Address:</span><span class="field-value">${supplierAddress}</span></div>
              <div class="field-row"><span class="field-label">Contact Person:</span><span class="field-value">${supplierContact}</span></div>
              <div class="field-row"><span class="field-label">Phone:</span><span class="field-value">${supplierPhone}</span></div>
              <div class="field-row"><span class="field-label">Email:</span><span class="field-value">${supplierEmail}</span></div>
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
              ${(fullBill.lines || []).map((l, i) => `
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
            <div class="summary-row"><span>Subtotal:</span><span>${inr(bill.subtotal)}</span></div>
            <div class="summary-row"><span>Loading Amount:</span><span>${inr(bill.loading_amount)}</span></div>
            <div class="summary-row"><span>Unloading Amount:</span><span>${inr(bill.unloading_amount)}</span></div>
            <div class="summary-row"><span>Freight Amount:</span><span>${inr(bill.freight_amount)}</span></div>
            <div class="summary-row"><span>Total KG:</span><span>${bill.total_kg}</span></div>
            <div class="summary-row"><span>Discount:</span><span>${inr(bill.discount)}</span></div>
            <div class="summary-row" style="font-weight: bold; margin-top: 4px;"><span>Total:</span><span>${inr(bill.total)}</span></div>
            <div style="margin-top: 4px; font-style: italic;">E. & O.E</div>
          </div>

          <div class="amount-words">
            <strong>Amount Chargeable (in words):</strong> ${amountInWords(bill.total)}
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
                We declare that this Bill shows the actual price of the goods described and that all particulars are true and correct.
              </p>
            </div>
            <div class="signature">
              <strong>for Krishna Steel Corporation</strong>
              <div class="sign-space"></div>
              <div class="sign-label">Authorised Signatory</div>
            </div>
          </div>

          <div class="computer-note">
            This is a Computer Generated Purchase Bill
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

  const remove = async (b: PurchaseBill) => {
    setConfirmDelete(b)
  }

  const confirmRemove = async () => {
    if (!confirmDelete) return
    try {
      await api.deletePurchaseBill(confirmDelete.id)
      notify(`Purchase bill ${confirmDelete.bill_no} deleted`)
      refresh()
    } catch (err) { notify((err as Error).message, 'error') }
    setConfirmDelete(null)
  }

  const total = bills.reduce((s, b) => s + b.total, 0)
  const totalKg = bills.reduce((s, b) => s + (Number(b.total_kg) || 0), 0)

  return (
    <div>
      <PageHeader
        title="Purchase Bills"
        subtitle="Record purchases from suppliers with tax and discount"
        actions={
          <Button variant="in" onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus size={16} /> New Purchase Bill
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-end">
          <SearchBox value={q} onChange={setQ} placeholder="Search bill no, item…" className="lg:w-72" />
          <SearchSelect
            className="lg:w-64"
            placeholder="All suppliers"
            value={supplierId}
            onChange={setSupplierId}
            options={suppliers.map((p) => ({ value: p.id, label: p.name, sub: p.city }))}
          />
          <div className="flex items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" aria-label="From date" />
            <span className="text-sm text-slate-400">to</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" aria-label="To date" />
          </div>
          {(from || to || supplierId || q) && (
            <Button variant="ghost" onClick={() => { setFrom(''); setTo(''); setSupplierId(null); setQ('') }}>Clear</Button>
          )}
        </div>
        <Table>
          <thead>
            <tr>
              <Th className="w-8" /><Th>Date</Th><Th>Entry Time</Th><Th>Bill No</Th><Th>Supplier</Th><Th>Reference</Th>
              <Th>Items</Th><Th right>Subtotal</Th><Th right>Total</Th><Th right>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {bills.length === 0 ? (
              <EmptyRow cols={10} text="No purchase bills found" />
            ) : bills.map((b) => {
              return (
              <Fragment key={b.id}>
                <Tr onClick={() => handleExpand(b.id)} className="cursor-pointer hover:bg-slate-50">
                  <Td><ChevronRight size={16} className={cx('transition-transform', expanded === b.id && 'rotate-90')} /></Td>
                  <Td>{fmtDate(b.date)}</Td>
                  <Td className="whitespace-nowrap text-slate-600">{fmtDateTime(b.created_at)}</Td>
                  <Td><Badge>{b.bill_no}</Badge></Td>
                  <Td>{b.supplier_name}</Td>
                  <Td>{b.reference || '-'}</Td>
                  <Td>{b.lines?.length || 0} items</Td>
                  <Td right>{inr(b.subtotal)}</Td>
                  <Td right className="font-semibold">{inr(b.total)}</Td>
                  <Td right>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); printBill(b) }}>
                        <Printer size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(b); setFormOpen(true) }}>
                        <FileText size={14} />
                      </Button>
                      <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); remove(b) }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Td>
                </Tr>
                {expanded === b.id && b.lines && (
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
                          {b.lines.map((l, i) => {
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
                          {b.discount > 0 && (
                            <tr className="border-t border-slate-200">
                              <td colSpan={4} className="py-2 text-right font-medium">Discount</td>
                              <td className="py-2 text-right text-red-600">-{inr(b.discount)}</td>
                            </tr>
                          )}
                          <tr className="border-t-2 border-slate-300">
                            <td colSpan={4} className="py-2 text-right font-semibold">Net Total</td>
                            <td className="py-2 text-right font-semibold">{inr(b.total)}</td>
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

      {formOpen && <PurchaseBillForm bill={editing} onClose={() => setFormOpen(false)} onSuccess={load} />}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Purchase Bill"
        message={`Are you sure you want to delete bill "${confirmDelete?.bill_no}"? This action cannot be undone.`}
        onConfirm={confirmRemove}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}

function PurchaseBillForm({ bill, onClose, onSuccess }: { bill: PurchaseBill | null; onClose: () => void; onSuccess: () => void }) {
  const { suppliers, items, notify, refresh } = useStore()
  const [busy, setBusy] = useState(false)
  const [billNo, setBillNo] = useState(bill?.bill_no || '')
  const [date, setDate] = useState(bill?.date || todayISO())
  const [supplierId, setSupplierId] = useState<number | null>(bill?.supplier_id || null)
  const [reference, setReference] = useState(bill?.reference || '')
  const [note, setNote] = useState(bill?.note || '')
  const [discount, setDiscount] = useState(bill?.discount || 0)
  const [loadingAmount, setLoadingAmount] = useState(bill?.loading_amount || 0)
  const [unloadingAmount, setUnloadingAmount] = useState(bill?.unloading_amount || 0)
  const [freightAmount, setFreightAmount] = useState(bill?.freight_amount || 0)
  const [lines, setLines] = useState<PurchaseBillLine[]>(
    bill?.lines?.map((l) => ({ item_id: l.item_id, qty: l.qty, rate: l.rate, amount: l.amount })) || [{ item_id: 0, qty: 0, rate: 0, amount: 0 }]
  )

  const subtotal = lines.reduce((s, l) => s + (l.qty * l.rate), 0)
  const totalKg = lines.reduce((s, l) => s + l.qty, 0)
  const total = subtotal - discount + loadingAmount + unloadingAmount + freightAmount

  const updateLine = (index: number, field: keyof PurchaseBillLine, value: number | null) => {
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
    if (lines.some((l) => !l.item_id || Number(l.qty) <= 0 || Number(l.rate) < 0)) {
      return notify('Each purchase row must have a valid item, quantity greater than zero, and a non-negative rate.', 'error')
    }
    setBusy(true)
    try {
      const input: PurchaseBillInput = {
        bill_no: billNo || undefined,
        date,
        supplier_id: supplierId,
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
      if (bill) {
        await api.deletePurchaseBill(bill.id)
        await api.createPurchaseBill(input)
        notify('Purchase bill updated')
      } else {
        await api.createPurchaseBill(input)
        notify('Purchase bill created')
      }
      refresh()
      onSuccess()
      onClose()
    } catch (err) { notify((err as Error).message, 'error') } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title={bill ? 'Edit Purchase Bill' : 'New Purchase Bill'} wide blur>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Bill No">
            <Input value={billNo} onChange={(e) => setBillNo(e.target.value)} placeholder="Auto-generated if empty" />
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
        <Field label="Reference">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Bill number, PO number, etc." />
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
          <Button type="submit" disabled={busy}>{busy ? 'Saving...' : bill ? 'Update' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  )
}
