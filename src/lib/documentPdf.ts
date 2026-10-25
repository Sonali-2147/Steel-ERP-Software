import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { amountInWords } from './format'

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
  unitTotals?: { name: string; qty: number; unit: string; amount: number }[]
}

const money = (value: number) => `INR ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function createDocumentPdf(data: PdfDocument): File {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const left = 14
  const right = pageWidth - 14

  // Header section with business details
  pdf.setFillColor(30, 58, 95)
  pdf.roundedRect(left, 14, pageWidth - left * 2, 28, 2, 2, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.text('KRISHNA STEEL CORPORATION', pageWidth / 2, 22, { align: 'center' })
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.text('250/1/2, Near Gokul Hotel, Karad Road, Vita, Tal-Khanapur, Dist-Sangli, Maharashtra', pageWidth / 2, 27, { align: 'center' })
  pdf.text('State: Maharashtra | Contact: 8329531313 / 9421120822 | E-Mail: krishnasteelcorporation03@gmail.com', pageWidth / 2, 32, { align: 'center' })

  // Document title
  pdf.setFillColor(234, 241, 248)
  pdf.rect(left, 45, pageWidth - left * 2, 8, 'F')
  pdf.setTextColor(30, 58, 95)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.text(data.title.toUpperCase(), pageWidth / 2, 51, { align: 'center' })

  // Details grid
  pdf.setTextColor(30, 58, 95)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  const detailsStart = 58
  pdf.text(`${data.title} Details`, left, detailsStart)
  pdf.text(`${data.partyLabel} (Bill to)`, left + (pageWidth - left * 2) / 2, detailsStart)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  const detailLeft = left
  const detailRight = left + (pageWidth - left * 2) / 2
  const rowHeight = 4.5

  // Left column - document details
  pdf.text(`${data.title} No.: ${data.number}`, detailLeft, detailsStart + rowHeight)
  pdf.text(`Dated: ${data.date}`, detailLeft, detailsStart + rowHeight * 2)
  pdf.text('Delivery Note: -', detailLeft, detailsStart + rowHeight * 3)
  pdf.text('Mode/Terms of Payment: -', detailLeft, detailsStart + rowHeight * 4)
  pdf.text(`${data.partyLabel}'s Order No.: -`, detailLeft, detailsStart + rowHeight * 5)
  pdf.text('Dated: -', detailLeft, detailsStart + rowHeight * 6)
  pdf.text('Dispatch Doc No.: -', detailLeft, detailsStart + rowHeight * 7)
  pdf.text('Delivery Note Date: -', detailLeft, detailsStart + rowHeight * 8)

  // Right column - party details
  pdf.text(`Name: ${data.partyName || '-'}`, detailRight, detailsStart + rowHeight)
  pdf.text(`Address: ${data.partyAddress || '-'}`, detailRight, detailsStart + rowHeight * 2)
  pdf.text(`Contact Person: -`, detailRight, detailsStart + rowHeight * 3)
  pdf.text(`Phone: ${data.partyPhone || '-'}`, detailRight, detailsStart + rowHeight * 4)
  pdf.text(`Email: -`, detailRight, detailsStart + rowHeight * 5)

  // Vertical divider line
  pdf.setDrawColor(203, 213, 225)
  pdf.setLineWidth(0.2)
  pdf.line(left + (pageWidth - left * 2) / 2, detailsStart - 2, left + (pageWidth - left * 2) / 2, detailsStart + rowHeight * 8 + 2)

  // Horizontal divider line
  pdf.line(left, detailsStart + rowHeight * 8 + 4, right, detailsStart + rowHeight * 8 + 4)

  // Items table
  const tableStart = detailsStart + rowHeight * 8 + 10
  autoTable(pdf, {
    startY: tableStart,
    margin: { left, right: pageWidth - right, top: 27, bottom: 70 },
    head: [['SI', 'Description of Goods', 'Quantity', 'Rate', 'Unit', 'Amount']],
    body: data.lines.map((line, index) => [
      String(index + 1),
      line.name || '-',
      `${Number(line.qty || 0).toLocaleString('en-IN')}`,
      money(line.rate),
      line.unit || '-',
      money(line.amount),
    ]),
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 3, textColor: [30, 41, 59], lineColor: [203, 213, 225], lineWidth: 0.2 },
    headStyles: { fillColor: [234, 241, 248], textColor: [30, 58, 95], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 15, halign: 'center' },
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

  // Unit totals section
  let unitTotalsY = lastTableY + 5
  if (data.unitTotals && data.unitTotals.length > 0) {
    pdf.setDrawColor(203, 213, 225)
    pdf.line(left, unitTotalsY - 3, right, unitTotalsY - 3)
    pdf.setDrawColor(147, 169, 194)
    pdf.setLineWidth(0.2)
    const unitTotalsHeight = 10 + data.unitTotals.length * 6
    pdf.rect(left, unitTotalsY, pageWidth - left * 2, unitTotalsHeight)

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(30, 58, 95)
    pdf.text('Unit Totals', left + 3, unitTotalsY + 5)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    data.unitTotals.forEach((unitTotal, index) => {
      const y = unitTotalsY + 10 + index * 6
      pdf.text(`${unitTotal.name}:`, left + 3, y)
      pdf.text(`${Number(unitTotal.qty).toLocaleString('en-IN')} ${unitTotal.unit}`, left + 80, y)
      pdf.text(money(unitTotal.amount), right, y, { align: 'right' })
    })

    unitTotalsY += unitTotalsHeight + 5
  }

  // Summary section
  const summaryStart = unitTotalsY + 3
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(30, 41, 59)

  const summaryRows = [
    ['Subtotal:', money(data.subtotal)],
    ['Loading Amount:', money(data.loadingAmount || 0)],
    ['Unloading Amount:', money(data.unloadingAmount || 0)],
    ['Freight Amount:', money(data.freightAmount || 0)],
    ['Discount:', money(data.discount || 0)],
    ['Total:', money(data.total)],
  ]

  summaryRows.forEach(([label, value], index) => {
    const y = summaryStart + index * 5
    const isTotal = label === 'Total:'
    pdf.setFont('helvetica', isTotal ? 'bold' : 'normal')
    pdf.text(label, right - 40, y)
    pdf.text(value, right, y, { align: 'right' })
  })

  pdf.setFont('helvetica', 'italic')
  pdf.setFontSize(8)
  pdf.text('E. & O.E', right - 40, summaryStart + summaryRows.length * 5 + 3)

  // Amount in words
  const amountWordsY = summaryStart + summaryRows.length * 5 + 10
  pdf.setDrawColor(203, 213, 225)
  pdf.line(left, amountWordsY - 3, right, amountWordsY - 3)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Amount Chargeable (in words):', left, amountWordsY)
  pdf.setFont('helvetica', 'italic')
  pdf.text(amountInWords(data.total), left + 65, amountWordsY)

  // Bank details
  const bankDetailsY = amountWordsY + 10
  pdf.setDrawColor(203, 213, 225)
  pdf.line(left, bankDetailsY - 3, right, bankDetailsY - 3)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text('Bank Details', left, bankDetailsY + 3)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.text('Bank Name: Axis Bank', left, bankDetailsY + 8)
  pdf.text('A/c No.: 922030050546660', left, bankDetailsY + 13)
  pdf.text('Branch & IFS Code: Vita - UTIB0002839', left, bankDetailsY + 18)

  // Footer with declaration and signature
  const footerY = bankDetailsY + 28
  pdf.setDrawColor(203, 213, 225)
  pdf.line(left, footerY - 3, right, footerY - 3)

  // Declaration
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text('Declaration', left, footerY + 3)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.text('We declare that this Invoice shows the actual price of the goods described and that all particulars are true and correct.', left, footerY + 8, { maxWidth: (pageWidth - left * 2) / 2 - 5 })

  // Signature
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text('for Krishna Steel Corporation', right, footerY + 8, { align: 'right' })
  pdf.text('Authorised Signatory', right, footerY + 20, { align: 'right' })

  // Computer generated note
  const noteY = footerY + 30
  pdf.setDrawColor(203, 213, 225)
  pdf.line(left, noteY - 3, right, noteY - 3)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.text('This is a Computer Generated Invoice', pageWidth / 2, noteY + 5, { align: 'center' })

  // Border around page
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
