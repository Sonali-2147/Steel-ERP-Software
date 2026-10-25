import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

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
  reference?: string
  lines: PdfDocumentLine[]
  subtotal: number
  tax?: number
  discount?: number
  loadingAmount?: number
  unloadingAmount?: number
  freightAmount?: number
  totalKg?: number
  total: number
  note?: string
}

const money = (value: number) => `INR ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function createDocumentPdf(data: PdfDocument): File {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const left = 14
  const right = pageWidth - 14
  const partyDetails = [
    `${data.partyLabel}: ${data.partyName || '-'}`,
    data.partyAddress ? `Address: ${data.partyAddress}` : '',
    data.partyPhone ? `Phone: ${data.partyPhone}` : '',
    data.reference ? `Reference: ${data.reference}` : '',
  ].filter(Boolean)

  pdf.setFillColor(30, 58, 95)
  pdf.roundedRect(left, 14, pageWidth - left * 2, 22, 2, 2, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(15)
  pdf.text('KRISHNA STEEL CORPORATION', pageWidth / 2, 23, { align: 'center' })
  pdf.setFontSize(10)
  pdf.text(data.title.toUpperCase(), pageWidth / 2, 31, { align: 'center' })

  pdf.setTextColor(30, 41, 59)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text(`Document No: ${data.number}`, left, 44)
  pdf.text(`Date: ${data.date}`, right, 44, { align: 'right' })
  pdf.setFont('helvetica', 'bold')
  pdf.text('PARTY DETAILS', left, 53)
  pdf.setFont('helvetica', 'normal')
  pdf.text(partyDetails, left, 59, { lineHeightFactor: 1.35 })

  const detailsHeight = Math.max(partyDetails.length, 1) * 5
  const tableStart = Math.max(73, 60 + detailsHeight)

  autoTable(pdf, {
    startY: tableStart,
    margin: { left, right: pageWidth - right, top: 27, bottom: 19 },
    head: [['#', 'Item', 'Code', 'Qty', 'Rate', 'Amount']],
    body: data.lines.map((line, index) => [
      String(index + 1),
      line.name || '-',
      line.code || '-',
      `${Number(line.qty || 0).toLocaleString('en-IN')} ${line.unit || ''}`.trim(),
      money(line.rate),
      money(line.amount),
    ]),
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.5, textColor: [30, 41, 59], lineColor: [203, 213, 225], lineWidth: 0.2 },
    headStyles: { fillColor: [234, 241, 248], textColor: [30, 58, 95], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20 },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
    },
    didDrawPage: (hook) => {
      if (hook.pageNumber > 1) {
        pdf.setTextColor(30, 58, 95)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9)
        pdf.text(`${data.title} - ${data.number}`, left, 16)
      }
    },
  })

  const lastTableY = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? tableStart
  const summaryRows = [
    ['Subtotal', money(data.subtotal)],
    ...(data.tax ? [['Tax', money(data.tax)]] : []),
    ...(data.discount ? [['Discount', `- ${money(data.discount)}`]] : []),
    ...(data.loadingAmount ? [['Loading', money(data.loadingAmount)]] : []),
    ...(data.unloadingAmount ? [['Unloading', money(data.unloadingAmount)]] : []),
    ...(data.freightAmount ? [['Freight', money(data.freightAmount)]] : []),
    ...(data.totalKg ? [['Total KG', Number(data.totalKg).toLocaleString('en-IN')]] : []),
    ['Grand Total', money(data.total)],
  ]
  const summaryHeight = summaryRows.length * 6 + (data.note ? 15 : 0)
  let summaryY = lastTableY + 9
  if (summaryY + summaryHeight > pageHeight - 18) {
    pdf.addPage()
    summaryY = 30
    pdf.setTextColor(30, 58, 95)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.text(`${data.title} - ${data.number}`, left, 16)
  }

  pdf.setFontSize(9)
  summaryRows.forEach(([label, value], index) => {
    const y = summaryY + index * 6
    const isTotal = label === 'Grand Total'
    pdf.setFont('helvetica', isTotal ? 'bold' : 'normal')
    pdf.setTextColor(isTotal ? 30 : 51, isTotal ? 58 : 65, isTotal ? 95 : 85)
    pdf.text(label, right - 58, y)
    pdf.text(value, right, y, { align: 'right' })
    if (isTotal) {
      pdf.setDrawColor(30, 58, 95)
      pdf.line(right - 58, y + 1.5, right, y + 1.5)
    }
  })

  if (data.note) {
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(71, 85, 105)
    pdf.text(`Note: ${data.note}`, left, summaryY + summaryRows.length * 6 + 5, { maxWidth: right - left })
  }

  const pageCount = pdf.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page)
    pdf.setDrawColor(100, 116, 139)
    pdf.setLineWidth(0.3)
    pdf.rect(7, 7, pageWidth - 14, pageHeight - 14)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(100, 116, 139)
    pdf.text(`Krishna Steel Corporation | +91 8329531313`, left, pageHeight - 11)
    pdf.text(`Page ${page} of ${pageCount}`, right, pageHeight - 11, { align: 'right' })
  }

  const fileName = `${data.title}-${data.number}`.replace(/[^a-zA-Z0-9-_]+/g, '-')
  return new File([pdf.output('blob')], `${fileName}.pdf`, { type: 'application/pdf' })
}

export async function sharePdfFile(file: File, title: string, text: string): Promise<boolean> {
  if (!navigator.share || !navigator.canShare?.({ files: [file] })) return false
  await navigator.share({ files: [file], title, text })
  return true
}

export async function downloadPdfFile(file: File): Promise<void> {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
