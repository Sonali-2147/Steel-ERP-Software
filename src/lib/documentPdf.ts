import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { amountInWords } from './format'
import { COPYRIGHT } from './copyright'
import { BUSINESS_NAME } from './share'

export interface PdfDocumentLine {
  name?: string
  code?: string
  qty: number
  unit?: string
  rate: number
  amount: number
}

export interface PdfDocument {
  title: string
  number: string
  date: string
  partyLabel: string
  partyName: string
  partyAddress?: string
  partyPhone?: string
  partyContact?: string
  partyEmail?: string
  /** Heading used for the details block and number label, e.g. 'Invoice'. Defaults to the title. */
  detailsLabel?: string
  reference?: string
  lines: PdfDocumentLine[]
  subtotal: number
  tax?: number
  discount?: number
  loadingAmount?: number
  unloadingAmount?: number
  freightAmount?: number
  extraCharges?: number
  paymentMode?: string
  amountReceived?: number
  /** Label for the amountReceived row; defaults to 'Amount Received' (purchase bills use 'Amount Paid'). */
  amountLabel?: string
  totalKg?: number
  total: number
  note?: string
  unitTotals?: { name: string; qty: number; unit: string; amount: number }[]
}

const number2 = (value: number) => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const money = (value: number) => `INR ${number2(value)}`

export function createDocumentPdf(data: PdfDocument): File {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const left = 10
  const right = pageWidth - 10
  const width = right - left
  const half = width / 2
  const pad = 3
  const bottomLimit = pageHeight - 12
  const navy: [number, number, number] = [30, 58, 95]
  const slate: [number, number, number] = [30, 41, 59]
  const rule: [number, number, number] = [203, 213, 225]
  const tint: [number, number, number] = [234, 241, 248]
  const detailsLabel = data.detailsLabel || data.title
  let y = 12

  const hLine = (at: number) => {
    pdf.setDrawColor(...rule)
    pdf.setLineWidth(0.2)
    pdf.line(left, at, right, at)
  }
  const ensureSpace = (height: number) => {
    if (y + height <= bottomLimit) return
    pdf.addPage()
    y = 14
  }
  const sectionTitle = (text: string, x: number, at: number) => {
    pdf.setTextColor(...navy)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9.5)
    pdf.text(text.toUpperCase(), x, at)
  }
  // Draws "Label: value" rows with wrapped values and returns the y below the last row.
  const drawFields = (rows: [string, string][], x: number, labelWidth: number, startY: number, valueWidth: number) => {
    let cy = startY
    pdf.setFontSize(9)
    for (const [label, value] of rows) {
      pdf.setTextColor(...slate)
      pdf.setFont('helvetica', 'bold')
      pdf.text(label, x, cy)
      pdf.setFont('helvetica', 'normal')
      const lines: string[] = pdf.splitTextToSize(value || '-', valueWidth)
      pdf.text(lines, x + labelWidth, cy)
      cy += lines.length * 4.2 + 1.2
    }
    return cy
  }

  // Header block: business name and contact details
  const headerHeight = 31
  pdf.setFillColor(...navy)
  pdf.rect(left, y, width, headerHeight, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.text(BUSINESS_NAME.toUpperCase(), pageWidth / 2, y + 9.5, { align: 'center' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  pdf.setTextColor(226, 232, 240)
  pdf.text('250/1/2, Near Gokul Hotel, Karad Road, Vita,', pageWidth / 2, y + 15, { align: 'center' })
  pdf.text('Tal-Khanapur, Dist-Sangli, Maharashtra', pageWidth / 2, y + 19, { align: 'center' })
  pdf.text('State: Maharashtra', pageWidth / 2, y + 23.5, { align: 'center' })
  pdf.text('Contact: 9975981103 / 9421120822 | E-Mail: krishnasteelcorporation03@gmail.com', pageWidth / 2, y + 27.5, { align: 'center' })
  y += headerHeight

  // Document title bar
  pdf.setFillColor(...tint)
  pdf.rect(left, y, width, 9, 'F')
  hLine(y + 9)
  pdf.setTextColor(...navy)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.text(data.title.toUpperCase(), pageWidth / 2, y + 6.4, { align: 'center' })
  y += 9

  // Details grid: document on the left, party on the right
  const detailsTop = y
  sectionTitle(`${detailsLabel} Details`, left + pad, y + 6)
  sectionTitle(`${data.partyLabel} (Bill to)`, left + half + pad, y + 6)
  const leftEnd = drawFields([
    [`${detailsLabel} No.:`, data.number],
    ['Dated:', data.date],
    ['Delivery Note:', '-'],
    ['Mode/Terms of Payment:', data.paymentMode || '-'],
  ], left + pad, 40, y + 12, half - pad * 2 - 40)
  const rightEnd = drawFields([
    ['Name:', data.partyName],
    ['Address:', data.partyAddress || ''],
    ['Contact Person:', data.partyContact || ''],
    ['Phone:', data.partyPhone || ''],
    ['Email:', data.partyEmail || ''],
  ], left + half + pad, 28, y + 12, half - pad * 2 - 28)
  y = Math.max(leftEnd, rightEnd) + 1
  pdf.setDrawColor(...rule)
  pdf.setLineWidth(0.2)
  pdf.line(left + half, detailsTop, left + half, y)
  hLine(y)

  // Items table
  autoTable(pdf, {
    startY: y,
    theme: 'grid',
    margin: { left, right: pageWidth - right, top: 14, bottom: 14 },
    head: [['SI', 'Description of Goods', 'Quantity', 'Rate', 'Unit', 'Amount']],
    body: data.lines.map((line, index) => [
      String(index + 1),
      line.name || '-',
      number2(line.qty),
      money(line.rate),
      line.unit || '-',
      money(line.amount),
    ]),
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2, textColor: slate, lineColor: rule, lineWidth: 0.2 },
    headStyles: { fillColor: tint, textColor: navy, fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 26, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 32, halign: 'right' },
    },
  })
  y = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y

  // Unit totals box
  if (data.unitTotals && data.unitTotals.length > 0) {
    const entryHeight = 9
    const boxHeight = 8 + data.unitTotals.length * entryHeight
    const boxWidth = width * 0.55
    y += 4
    ensureSpace(boxHeight)
    pdf.setFillColor(248, 250, 252)
    pdf.setDrawColor(147, 169, 194)
    pdf.setLineWidth(0.2)
    pdf.rect(left + pad, y, boxWidth, boxHeight, 'FD')
    sectionTitle('Unit Totals', left + pad + 2, y + 5)
    data.unitTotals.forEach((unitTotal, index) => {
      const top = y + 8 + index * entryHeight
      pdf.setDrawColor(...rule)
      pdf.line(left + pad + 2, top + entryHeight - 1, left + pad + boxWidth - 2, top + entryHeight - 1)
      pdf.setTextColor(...slate)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8.5)
      pdf.text(`Unit Total: ${unitTotal.name}`, left + pad + 2, top + 2.5)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`${number2(unitTotal.qty)} ${unitTotal.unit}`, left + pad + 2, top + 6.5)
      pdf.text(money(unitTotal.amount), left + pad + boxWidth - 2, top + 6.5, { align: 'right' })
    })
    y += boxHeight
  }

  // Summary rows: label on the left, value on the right
  const summary: { label: string; value: string; bold?: boolean; gapBefore?: number; underline?: boolean }[] = [
    { label: 'Subtotal:', value: money(data.subtotal) },
    { label: 'Loading Amount:', value: money(data.loadingAmount || 0) },
    { label: 'Unloading Amount:', value: money(data.unloadingAmount || 0) },
    { label: 'Freight Amount:', value: money(data.freightAmount || 0) },
    { label: 'Discount:', value: money(data.discount || 0) },
    { label: 'Extra Charges:', value: money(data.extraCharges || 0) },
    { label: 'Total:', value: money(data.total), bold: true, gapBefore: 4, underline: true },
  ]
  if (data.amountReceived !== undefined) {
    summary.push(
      { label: `${data.amountLabel || 'Amount Received'}:`, value: money(data.amountReceived), gapBefore: 3 },
      { label: 'Balance Amount:', value: money(data.total - data.amountReceived), bold: true },
    )
  }
  const summaryHeight = pad * 2 + summary.reduce((sum, row) => sum + 5 + (row.gapBefore || 0), 0)
  y += 4
  ensureSpace(summaryHeight)
  hLine(y)
  let rowY = y + pad + 2
  for (const row of summary) {
    rowY += row.gapBefore || 0
    pdf.setTextColor(...slate)
    pdf.setFont('helvetica', row.bold ? 'bold' : 'normal')
    pdf.setFontSize(9)
    pdf.text(row.label, left + pad, rowY)
    pdf.text(row.value, right - pad, rowY, { align: 'right' })
    if (row.underline) {
      pdf.setDrawColor(...navy)
      pdf.setLineWidth(0.3)
      pdf.line(left + pad, rowY + 1.6, right - pad, rowY + 1.6)
    }
    rowY += 5
  }
  y += summaryHeight
  hLine(y)

  // Amount in words
  const wordsLabel = 'Amount Chargeable (in words):'
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  const wordsLabelWidth = pdf.getTextWidth(wordsLabel) + 2
  pdf.setFont('helvetica', 'italic')
  const wordsLines: string[] = pdf.splitTextToSize(amountInWords(data.total), width - pad * 2 - wordsLabelWidth)
  const wordsHeight = Math.max(1, wordsLines.length) * 4.2 + 5
  ensureSpace(wordsHeight)
  pdf.setTextColor(71, 85, 105)
  pdf.text(wordsLines, left + pad + wordsLabelWidth, y + 5)
  pdf.setFont('helvetica', 'bold')
  pdf.text(wordsLabel, left + pad, y + 5)
  y += wordsHeight
  hLine(y)

  // Bank details
  ensureSpace(26)
  sectionTitle('Bank Details', left + pad, y + 6)
  drawFields([
    ['Bank Name:', 'Axis Bank'],
    ['A/c No.:', '922030050546660'],
    ['Branch & IFS Code:', 'Vita - UTIB0002839'],
  ], left + pad, 38, y + 11, width - pad * 2 - 38)
  y += 25
  hLine(y)

  // Footer: declaration and signature, then the computer-generated note
  const footerHeight = 30
  ensureSpace(footerHeight + 10)
  pdf.setDrawColor(...rule)
  pdf.line(left + half, y, left + half, y + footerHeight)
  pdf.setTextColor(...slate)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text('Declaration', left + pad, y + 6)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.text('We declare that this Invoice shows the actual price of the goods described and that all particulars are true and correct.', left + pad, y + 11, { maxWidth: half - pad * 2 })
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text(`for ${BUSINESS_NAME}`, right - pad, y + 6, { align: 'right' })
  pdf.text('Authorised Signatory', right - pad, y + footerHeight - 4, { align: 'right' })
  y += footerHeight
  hLine(y)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.text('This is a Computer Generated Invoice', pageWidth / 2, y + 6, { align: 'center' })
  pdf.setFontSize(8)
  pdf.setTextColor(100, 116, 139)
  pdf.text(COPYRIGHT, pageWidth / 2, y + 11, { align: 'center' })

  // Border around every page, as in the printed copy
  const pageCount = pdf.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page)
    pdf.setDrawColor(100, 116, 139)
    pdf.setLineWidth(0.3)
    pdf.rect(7, 7, pageWidth - 14, pageHeight - 14)
  }

  const fileName = `${data.title}-${data.number}`.replace(/[^a-zA-Z0-9-_]+/g, '-')
  return new File([pdf.output('blob')], `${fileName}.pdf`, { type: 'application/pdf' })
}

async function downloadPdfFile(file: File): Promise<void> {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

interface SaveFileHandle {
  createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>
}

declare global {
  interface Window {
    /** Exposed by preload.js in the desktop app. */
    electronAPI?: {
      savePdf?: (name: string, data: ArrayBuffer) => Promise<boolean>
      openExternal?: (url: string) => Promise<void>
    }
    /** File System Access API (Chromium); not in the TS DOM lib. */
    showSaveFilePicker?: (options: {
      suggestedName: string
      types: { description: string; accept: Record<string, string[]> }[]
    }) => Promise<SaveFileHandle>
  }
}

/**
 * Asks the user where to save the PDF and waits until they answer.
 * Resolves false when the save dialog is cancelled, so callers can stop there.
 */
export async function savePdfFile(file: File): Promise<boolean> {
  const desktop = window.electronAPI
  if (desktop?.savePdf) return desktop.savePdf(file.name, await file.arrayBuffer())

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: file.name,
        types: [{ description: 'PDF document', accept: { 'application/pdf': ['.pdf'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(file)
      await writable.close()
      return true
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false
      throw error
    }
  }

  await downloadPdfFile(file)
  return true
}

/** Opens a web link in the user's default browser (desktop app) or a new tab. False if blocked. */
export function openExternalUrl(url: string): boolean {
  const desktop = window.electronAPI
  if (desktop?.openExternal) {
    void desktop.openExternal(url)
    return true
  }
  return window.open(url, '_blank') !== null
}
