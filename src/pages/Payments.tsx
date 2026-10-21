import { useMemo, useState } from 'react'
import { Download, Pencil, Plus, Printer, Trash2 } from 'lucide-react'
import { Button, Card, ConfirmDialog, EmptyRow, Field, Input, Modal, PageHeader, SearchBox, Select, StatusBadge, Table, Td, Textarea, Th, Tr } from '@/components/ui'
import { api } from '@/lib/api'
import { downloadCSV, fmtDateTime, inr, todayISO } from '@/lib/format'
import { useStore } from '@/lib/store'
import type { Payment, PaymentInput, PaymentType, PaymentMode } from '@/lib/types'

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
]

const DEFAULT_BANK = {
  accountName: 'Krishna Steel Center',
  accountNo: '922030050546660',
  ifscCode: 'UTIB0002839',
  bankName: 'Axis Bank',
  branch: 'Vita',
}

export default function Payments({ type: fixedType }: { type?: 'IN' | 'OUT' }) {
  const store = useStore()
  const [type, setType] = useState<'IN' | 'OUT' | ''>(fixedType || '')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Payment | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Payment | null>(null)

  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  const loadPayments = async () => {
    setLoading(true)
    try {
      const data = await api.getPayments(type ? { type } : {})
      setPayments(data)
    } catch (e) {
      store.notify((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useMemo(() => {
    loadPayments()
  }, [type])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return payments.filter((p) =>
      !s || `${p.voucher_no} ${p.party_name} ${p.mode} ${p.reference_no}`.toLowerCase().includes(s)
    )
  }, [payments, q])

  const remove = async (p: Payment) => {
    setConfirmDelete(p)
  }

  const confirmRemove = async () => {
    if (!confirmDelete) return
    try {
      await api.deletePayment(confirmDelete.id)
      store.notify(`Payment ${confirmDelete.voucher_no} deleted`)
      loadPayments()
    } catch (e) { store.notify((e as Error).message, 'error') }
    setConfirmDelete(null)
  }

  const exportCSV = () => downloadCSV('payments.csv', filtered.map((p) => ({
    'Voucher No': p.voucher_no,
    Type: p.type,
    Date: p.date,
    Party: p.party_name || '-',
    Amount: p.amount,
    Mode: p.mode,
    'Reference No': p.reference_no,
    'Bank Name': p.bank_name,
    'Cheque No': p.cheque_no,
    'Cheque Date': p.cheque_date,
    Note: p.note,
  })))

  const total = filtered.reduce((s, p) => s + p.amount, 0)

  const title = fixedType === 'IN' ? 'Payment In (Received)' : fixedType === 'OUT' ? 'Payment Out (Paid)' : 'Payment Vouchers'
  const subtitle = `${filtered.length} voucher${filtered.length !== 1 ? 's' : ''}`

  const printPayment = (payment: Payment) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Voucher - ${payment.voucher_no}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 18px; }
          .header p { margin: 5px 0; color: #666; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .section { border: 1px solid #ccc; padding: 15px; margin-bottom: 15px; }
          .section-title { font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
          .row { display: flex; justify-content: space-between; margin: 5px 0; }
          .label { color: #666; }
          .value { font-weight: bold; }
          .bank-details { background: #f5f5f5; padding: 10px; margin-top: 10px; }
          .bank-details p { margin: 3px 0; }
          .amount { font-size: 18px; font-weight: bold; color: #2563eb; }
          .footer { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 50px; }
          .signature { text-align: center; border-top: 1px solid #ccc; padding-top: 10px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Krishna Steel Center</h1>
          <p>Payment Voucher</p>
        </div>
        <div class="info-grid">
          <div class="section">
            <div class="section-title">Voucher Details</div>
            <div class="row"><span class="label">Voucher No:</span><span class="value">${payment.voucher_no}</span></div>
            <div class="row"><span class="label">Date:</span><span class="value">${payment.date}</span></div>
            <div class="row"><span class="label">Type:</span><span class="value">${payment.type === 'IN' ? 'Payment In (Received)' : 'Payment Out (Paid)'}</span></div>
            <div class="row"><span class="label">Mode:</span><span class="value">${payment.mode.replace('_', ' ').toUpperCase()}</span></div>
          </div>
          <div class="section">
            <div class="section-title">Party Details</div>
            <div class="row"><span class="label">Name:</span><span class="value">${payment.party_name || 'N/A'}</span></div>
            <div class="row"><span class="label">Reference No:</span><span class="value">${payment.reference_no || 'N/A'}</span></div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Payment Amount</div>
          <div class="amount">${inr(payment.amount)}</div>
          ${payment.note ? `<div style="margin-top: 10px;"><span class="label">Note:</span> ${payment.note}</div>` : ''}
        </div>
        <div class="section">
          <div class="section-title">Bank Details</div>
          <div class="bank-details">
            <p><strong>Account Name:</strong> Krishna Steel Center</p>
            <p><strong>Account No:</strong> 922030050546660</p>
            <p><strong>Bank Name:</strong> Axis Bank</p>
            <p><strong>Branch:</strong> Vita</p>
            <p><strong>IFSC Code:</strong> UTIB0002839</p>
          </div>
          ${payment.bank_name ? `<div style="margin-top: 10px;"><span class="label">Transfer Bank:</span> ${payment.bank_name}</div>` : ''}
          ${payment.cheque_no ? `<div><span class="label">Cheque No:</span> ${payment.cheque_no}</div>` : ''}
          ${payment.cheque_date ? `<div><span class="label">Cheque Date:</span> ${payment.cheque_date}</div>` : ''}
        </div>
        <div class="footer">
          <div class="signature">Prepared By</div>
          <div class="signature">Verified By</div>
          <div class="signature">Authorized Signatory</div>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <Button variant="secondary" onClick={exportCSV}><Download size={16} /> Export</Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus size={16} /> New {fixedType === 'IN' ? 'Payment In' : fixedType === 'OUT' ? 'Payment Out' : 'Payment'}</Button>
          </>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row">
          <SearchBox value={q} onChange={setQ} placeholder="Search by voucher, party, reference…" className="md:w-80" />
          {!fixedType && (
            <Select value={type} onChange={(e) => setType(e.target.value as any)} className="md:w-44">
              <option value="">All Types</option>
              <option value="IN">Payment In</option>
              <option value="OUT">Payment Out</option>
            </Select>
          )}
        </div>
        <Table>
          <thead>
            <tr><Th>Voucher No</Th><Th>Type</Th><Th>Date</Th><Th>Time</Th><Th>Party</Th><Th>Mode</Th><Th right>Amount</Th><Th>Reference</Th><Th right>Actions</Th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="py-8 text-center text-slate-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <EmptyRow cols={9} text="No payments yet. Click 'New Payment' to add one." />
            ) : filtered.map((p) => (
              <Tr key={p.id}>
                <Td className="font-mono text-xs">{p.voucher_no}</Td>
                <Td><StatusBadge status={p.type === 'IN' ? 'Payment In' : 'Payment Out'} /></Td>
                <Td>{p.date}</Td>
                <Td className="whitespace-nowrap text-slate-600">{fmtDateTime((p as any).created_at || p.date)}</Td>
                <Td>{p.party_name || '–'}</Td>
                <Td className="capitalize">{p.mode.replace('_', ' ')}</Td>
                <Td right className="font-medium">{inr(p.amount)}</Td>
                <Td className="text-xs">{p.reference_no || '–'}</Td>
                <Td right>
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" title="Print" onClick={() => printPayment(p)}><Printer size={14} /></Button>
                    <Button size="sm" variant="ghost" title="Edit" onClick={() => { setEditing(p); setFormOpen(true) }}><Pencil size={14} /></Button>
                    <Button size="sm" variant="ghost" title="Delete" className="text-red-600" onClick={() => remove(p)}><Trash2 size={14} /></Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {filtered.length > 0 && (
          <div className="border-t border-slate-200 p-4 text-right">
            <span className="text-sm text-slate-500">Total: </span>
            <span className="text-lg font-bold">{inr(total)}</span>
          </div>
        )}
      </Card>
      {formOpen && <PaymentForm payment={editing} onClose={() => { setFormOpen(false); loadPayments() }} fixedType={fixedType} />}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Payment"
        message={`Are you sure you want to delete payment "${confirmDelete?.voucher_no}"? This action cannot be undone.`}
        onConfirm={confirmRemove}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}

function PaymentForm({ payment, onClose, fixedType }: { payment: Payment | null; onClose: () => void; fixedType?: 'IN' | 'OUT' }) {
  const { suppliers, customers, notify, purchaseBills, salesInvoices } = useStore()
  const [saving, setSaving] = useState(false)
  const [type, setType] = useState<PaymentType>(payment?.type || fixedType || 'IN')
  const [voucherNo, setVoucherNo] = useState(payment?.voucher_no || '')
  const [date, setDate] = useState(payment?.date || todayISO())
  const [partyId, setPartyId] = useState<number | null>(payment?.party_id || null)
  const [amount, setAmount] = useState(payment?.amount || 0)
  const [mode, setMode] = useState<PaymentMode>(payment?.mode || 'cash')
  const [referenceNo, setReferenceNo] = useState(payment?.reference_no || '')
  const [bankName, setBankName] = useState(payment?.bank_name || DEFAULT_BANK.bankName)
  const [chequeNo, setChequeNo] = useState(payment?.cheque_no || '')
  const [chequeDate, setChequeDate] = useState(payment?.cheque_date || '')
  const [note, setNote] = useState(payment?.note || '')
  const [purchaseBillId, setPurchaseBillId] = useState<number | null>(payment?.purchase_bill_id || null)
  const [salesInvoiceId, setSalesInvoiceId] = useState<number | null>(payment?.sales_invoice_id || null)

  const parties = type === 'IN' ? customers : suppliers

  // Filter bills/invoices by selected party
  const filteredPurchaseBills = purchaseBills.filter(b => !partyId || b.supplier_id === partyId)
  const filteredSalesInvoices = salesInvoices.filter(i => !partyId || i.customer_id === partyId)

  // Auto-fill amount when bill/invoice is selected
  const handlePurchaseBillChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    const id = value ? Number(value) : null
    setPurchaseBillId(id)
    if (id) {
      const bill = filteredPurchaseBills.find(b => b.id === id)
      if (bill) setAmount(bill.total)
    }
  }

  const handleSalesInvoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    const id = value ? Number(value) : null
    setSalesInvoiceId(id)
    if (id) {
      const invoice = filteredSalesInvoices.find(i => i.id === id)
      if (invoice) setAmount(invoice.total)
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || amount <= 0) return notify('Amount must be greater than zero', 'error')
    setSaving(true)
    try {
      const input: PaymentInput = {
        voucher_no: voucherNo || undefined,
        type,
        date,
        party_id: partyId || undefined,
        amount,
        mode,
        reference_no: referenceNo,
        bank_name: bankName,
        cheque_no: chequeNo,
        cheque_date: chequeDate,
        note
        // purchase_bill_id: type === 'OUT' ? purchaseBillId : null,
        // sales_invoice_id: type === 'IN' ? salesInvoiceId : null,
      }
      if (payment) {
        await api.updatePayment(payment.id, input)
        notify('Payment updated')
      } else {
        await api.createPayment(input)
        notify('Payment created')
      }
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
      title={payment ? 'Edit Payment' : 'New Payment'}
      wide
      blur
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="payment-form" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Voucher No">
          <Input value={voucherNo} onChange={(e) => setVoucherNo(e.target.value)} placeholder="Auto-generated if empty" />
        </Field>
        {!fixedType && (
          <Field label="Type" required>
            <Select value={type} onChange={(e) => { setType(e.target.value as PaymentType); setPartyId(null) }}>
              <option value="IN">Payment In (Received)</option>
              <option value="OUT">Payment Out (Paid)</option>
            </Select>
          </Field>
        )}
        <Field label="Date" required>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={type === 'IN' ? 'Customer' : 'Supplier'}>
          <Select value={partyId?.toString() || ''} onChange={(e) => setPartyId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Select {type === 'IN' ? 'customer' : 'supplier'}</option>
            {parties.filter((p) => p.active).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </Field>
        {type === 'OUT' && (
          <Field label="Purchase Bill (Optional)" className="sm:col-span-2">
            <Select value={purchaseBillId?.toString() || ''} onChange={handlePurchaseBillChange}>
              <option value="">Select purchase bill</option>
              {filteredPurchaseBills.map((b) => (
                <option key={b.id} value={b.id}>{b.bill_no} - {inr(b.total)}</option>
              ))}
            </Select>
          </Field>
        )}
        {type === 'IN' && (
          <Field label="Sales Invoice (Optional)" className="sm:col-span-2">
            <Select value={salesInvoiceId?.toString() || ''} onChange={handleSalesInvoiceChange}>
              <option value="">Select sales invoice</option>
              {filteredSalesInvoices.map((i) => (
                <option key={i.id} value={i.id}>{i.invoice_no} - {inr(i.total)}</option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Amount" required className="sm:col-span-2">
          <Input type="number" step="0.01" value={amount || ''} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} placeholder="0.00" />
        </Field>
        <Field label="Payment Mode" required className="sm:col-span-2">
          <Select value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)}>
            {PAYMENT_MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </Select>
        </Field>
        {(mode === 'bank_transfer' || mode === 'cheque' || mode === 'upi') && (
          <div className="sm:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="text-sm font-semibold text-slate-700 mb-2">Our Bank Details</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div><span className="font-medium">Account Name:</span> {DEFAULT_BANK.accountName}</div>
              <div><span className="font-medium">Account No:</span> {DEFAULT_BANK.accountNo}</div>
              <div><span className="font-medium">Bank:</span> {DEFAULT_BANK.bankName}</div>
              <div><span className="font-medium">Branch:</span> {DEFAULT_BANK.branch}</div>
              <div className="col-span-2"><span className="font-medium">IFSC Code:</span> {DEFAULT_BANK.ifscCode}</div>
            </div>
          </div>
        )}
        <Field label="Reference No">
          <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Transaction ID / UPI Ref" />
        </Field>
        <Field label="Bank Name">
          <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank name" />
        </Field>
        {mode === 'cheque' && (
          <>
            <Field label="Cheque No">
              <Input value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} placeholder="Cheque number" />
            </Field>
            <Field label="Cheque Date">
              <Input type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} />
            </Field>
          </>
        )}
        <Field label="Note" className="sm:col-span-2">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Additional notes..." />
        </Field>
      </form>
    </Modal>
  )
}
