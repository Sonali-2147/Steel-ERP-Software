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

  const esc = (value: unknown) =>
    String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char]!)

  const itemRows = (fullInvoice.lines || []).map((item, index) => `
    <tr>
      <td class="center">${index + 1}</td>
      <td>
        <strong>${esc(item.name)}</strong>
        ${item.code ? `<div class="muted">Code: ${esc(item.code)}</div>` : ''}
      </td>
      <td class="right">${esc(qty(item.qty))} ${esc(item.unit)}</td>
      <td class="right">${esc(inr(item.rate))}</td>
      <td class="right">${esc(inr(item.amount))}</td>
    </tr>
  `).join('')

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Tax Invoice - ${esc(invoice.invoice_no)}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10px;
          color: #111;
          line-height: 1.4;
        }

        .invoice {
          width: 100%;
          border: 1px solid #222;
        }

        .title {
          text-align: center;
          font-size: 17px;
          font-weight: bold;
          padding: 7px;
          border-bottom: 1px solid #222;
          letter-spacing: 1px;
        }

        .company {
          text-align: center;
          padding: 12px 8px;
          border-bottom: 1px solid #222;
        }

        .company h1 {
          margin: 0 0 5px;
          font-size: 21px;
          text-transform: uppercase;
        }

        .company p {
          margin: 2px 0;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        td, th {
          border: 1px solid #555;
          padding: 6px;
          vertical-align: top;
          overflow-wrap: anywhere;
        }

        .details td {
          width: 50%;
        }

        .section-title {
          font-weight: bold;
          margin-bottom: 5px;
        }

        .buyer-name {
          font-size: 12px;
          font-weight: bold;
          margin: 4px 0;
        }

        .meta td {
          padding: 5px;
        }

        .meta td:first-child {
          width: 45%;
        }

        .items {
          table-layout: fixed;
        }

        .items th {
          background: #f0f0f0;
          text-align: center;
          font-weight: bold;
        }

        .items th:nth-child(1) { width: 6%; }
        .items th:nth-child(2) { width: 42%; }
        .items th:nth-child(3) { width: 16%; }
        .items th:nth-child(4) { width: 15%; }
        .items th:nth-child(5) { width: 21%; }

        .center {
          text-align: center;
        }

        .right {
          text-align: right;
          white-space: nowrap;
        }

        .muted {
          color: #555;
          font-size: 9px;
        }

        .totals {
          width: 48%;
          margin-left: auto;
        }

        .totals td {
          padding: 5px 7px;
        }

        .totals td:last-child {
          text-align: right;
        }

        .grand-total td {
          font-size: 12px;
          font-weight: bold;
          border-top: 2px solid #222;
          background: #f0f0f0;
        }

        .words, .note, .bank, .declaration {
          padding: 8px;
          border-top: 1px solid #555;
        }

        .footer {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .footer > div {
          padding: 8px;
          min-height: 105px;
        }

        .footer > div + div {
          border-left: 1px solid #555;
        }

        .bank p, .declaration p {
          margin: 4px 0;
        }

        .signature {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: right;
          min-height: 110px;
        }

        .sign-space {
          height: 45px;
        }

        .computer-generated {
          border-top: 1px solid #555;
          text-align: center;
          padding: 6px;
          font-size: 9px;
        }

        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .invoice {
            width: 100%;
          }

          tr, .footer, .words, .bank {
            break-inside: avoid;
          }
        }
      </style>
    </head>

    <body>
      <div class="invoice">
        <div class="title">TAX INVOICE</div>

        <div class="company">
          <h1>Krishna Steel Corporation</h1>
          <p>250/1/2 Near Gokul Hotel, Karad Road, Vita</p>
          <p>Tal-Khanapur, Dist-Sangli, Maharashtra</p>
          <p><strong>GSTIN/UIN:</strong> 27AVTPC3234C2ZS</p>
          <p><strong>State:</strong> Maharashtra &nbsp; | &nbsp; <strong>Code:</strong> 27</p>
          <p><strong>Contact:</strong> 9975981103, 9421120822</p>
          <p><strong>Email:</strong> krishnasteelcorporation03@gmail.com</p>
        </div>

        <table class="details">
          <tr>
            <td>
              <div class="section-title">Buyer (Bill to)</div>
              <div class="buyer-name">${esc(invoice.customer_name || '-')}</div>
              ${invoice.contact_person
                ? `<p><strong>Contact:</strong> ${esc(invoice.contact_person)}</p>`
                : ''}
              ${invoice.phone
                ? `<p><strong>Phone:</strong> ${esc(invoice.phone)}</p>`
                : ''}
              ${invoice.gstin
                ? `<p><strong>GSTIN/UIN:</strong> ${esc(invoice.gstin)}</p>`
                : ''}
            </td>

            <td>
              <table class="meta">
                <tr>
                  <td>Invoice No.</td>
                  <td><strong>${esc(invoice.invoice_no)}</strong></td>
                </tr>
                <tr>
                  <td>Dated</td>
                  <td><strong>${esc(fmtDate(invoice.date))}</strong></td>
                </tr>
                <tr>
                  <td>Reference No.</td>
                  <td>${esc(invoice.reference || '-')}</td>
                </tr>
                <tr>
                  <td>Mode/Terms of Payment</td>
                  <td>-</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <table class="items">
          <thead>
            <tr>
              <th>Sl.</th>
              <th>Description of Goods</th>
              <th>Quantity</th>
              <th>Rate</th>
              <th>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows || `
              <tr><td colspan="5" class="center">No items</td></tr>
            `}
          </tbody>
        </table>

        <table class="totals">
          <tr>
            <td>Subtotal</td>
            <td>${esc(inr(invoice.subtotal))}</td>
          </tr>

          ${invoice.tax > 0 ? `
            <tr>
              <td>Tax</td>
              <td>${esc(inr(invoice.tax))}</td>
            </tr>
          ` : ''}

          ${invoice.discount > 0 ? `
            <tr>
              <td>Discount</td>
              <td>- ${esc(inr(invoice.discount))}</td>
            </tr>
          ` : ''}

          <tr class="grand-total">
            <td>Grand Total</td>
            <td>${esc(inr(invoice.total))}</td>
          </tr>
        </table>

        <div class="words">
          <strong>Amount Chargeable:</strong>
          ${esc(inr(invoice.total))}
          <span style="float:right"><strong>E. &amp; O.E.</strong></span>
        </div>

        ${invoice.note ? `
          <div class="note">
            <strong>Note:</strong> ${esc(invoice.note)}
          </div>
        ` : ''}

        <div class="footer">
          <div>
            <div class="section-title">Declaration</div>
            <p>
              We declare that this invoice shows the actual price of
              the goods described and that all particulars are true
              and correct.
            </p>
          </div>

          <div class="bank">
            <div class="section-title">Company's Bank Details</div>
            <p><strong>Bank Name:</strong> Bank of Baroda</p>
            <p><strong>A/c No.:</strong> 41180200000676</p>
            <p><strong>Branch &amp; IFSC:</strong> VITA &amp; BARB0VITAXX</p>
            <div class="signature">
              <strong>For Krishna Steel Corporation</strong>
              <div class="sign-space"></div>
              <strong>Authorised Signatory</strong>
            </div>
          </div>
        </div>

        <div class="computer-generated">
          This is a Computer Generated Invoice
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `)

  printWindow.document.close()
}
}

