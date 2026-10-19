import { useState } from 'react'
import Papa from 'papaparse'
import { readSheet } from 'read-excel-file/browser'
import { CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { Button, Modal, Table, Td, Th, cx } from './ui'
import { api } from '@/lib/api'
import { downloadCSV } from '@/lib/format'
import { useStore } from '@/lib/store'
import type { ImportResult } from '@/lib/types'

const COLUMNS = [
  { key: 'code', label: 'Item Code', aliases: ['code', 'item code', 'itemcode', 'sku'] },
  { key: 'name', label: 'Item Name', aliases: ['name', 'item name', 'itemname', 'item', 'description', 'product'] },
  { key: 'category', label: 'Category', aliases: ['category', 'group', 'item group', 'type'] },
  { key: 'grade', label: 'Grade', aliases: ['grade', 'brand', 'make'] },
  { key: 'size', label: 'Size', aliases: ['size', 'dimensions', 'dimension', 'specification', 'spec'] },
  { key: 'unit', label: 'Unit', aliases: ['unit', 'uom', 'units'] },
  { key: 'opening_stock', label: 'Opening Stock', aliases: ['opening stock', 'opening', 'opening qty', 'stock', 'qty', 'quantity'] },
  { key: 'min_stock', label: 'Min Stock', aliases: ['min stock', 'minimum stock', 'reorder level', 'min qty', 'min'] },
  { key: 'purchase_rate', label: 'Purchase Rate', aliases: ['purchase rate', 'purchase price', 'cost', 'cost price', 'buy rate'] },
  { key: 'sale_rate', label: 'Sale Rate', aliases: ['sale rate', 'selling price', 'sale price', 'selling rate', 'mrp', 'rate'] },
] as const

type Row = Record<string, string> & { __row: string }

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

function toRows(table: unknown[][]): { rows: Row[]; matched: string[] } {
  const headerIdx = table.findIndex((r) => r.some((c) => String(c ?? '').trim() !== ''))
  if (headerIdx < 0) return { rows: [], matched: [] }
  const header = table[headerIdx].map((h) => norm(String(h ?? '')))
  const colIndex: Record<string, number> = {}
  for (const col of COLUMNS) {
    const idx = header.findIndex((h) => (col.aliases as readonly string[]).includes(h))
    if (idx >= 0) colIndex[col.key] = idx
  }
  const rows: Row[] = []
  table.slice(headerIdx + 1).forEach((r, i) => {
    if (!r.some((c) => String(c ?? '').trim() !== '')) return
    const row = { __row: String(headerIdx + i + 2) } as Row
    for (const [key, idx] of Object.entries(colIndex)) row[key] = String(r[idx] ?? '').trim()
    rows.push(row)
  })
  return { rows, matched: Object.keys(colIndex) }
}

async function parseFile(file: File): Promise<unknown[][]> {
  if (/\.xlsx$/i.test(file.name)) return (await readSheet(file)) as unknown[][]
  if (/\.(csv|txt)$/i.test(file.name)) {
    const text = await file.text()
    return Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), { skipEmptyLines: true }).data
  }
  throw new Error('Please choose an Excel (.xlsx) or CSV file')
}

export function downloadTemplate() {
  downloadCSV('item-import-template.csv', [
    { 'Item Code': 'TMT-08', 'Item Name': 'TMT Bar 8mm', Category: 'TMT Steel', Grade: 'Fe 500', Size: '8mm x 12m', Unit: 'kg', 'Opening Stock': 1000, 'Min Stock': 200, 'Purchase Rate': 56, 'Sale Rate': 62 },
    { 'Item Code': '', 'Item Name': 'MS Angle 40x40x5', Category: 'MS Angles', Grade: 'IS 2062', Size: '40x40x5mm', Unit: 'kg', 'Opening Stock': 500, 'Min Stock': 100, 'Purchase Rate': 58, 'Sale Rate': 64 },
  ], COLUMNS.map((c) => c.label))
}

export default function ImportItems({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { refresh, notify } = useStore()
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [matched, setMatched] = useState<string[]>([])
  const [updateExisting, setUpdateExisting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')

  const reset = () => {
    setFileName(''); setRows([]); setMatched([]); setResult(null); setError('')
  }
  const close = () => { reset(); onClose() }

  const onFile = async (file?: File) => {
    if (!file) return
    reset()
    setFileName(file.name)
    try {
      const parsed = toRows(await parseFile(file))
      if (!parsed.matched.includes('name')) throw new Error('Could not find an "Item Name" column. Please use the template.')
      if (parsed.rows.length === 0) throw new Error('The file has no data rows.')
      setRows(parsed.rows)
      setMatched(parsed.matched)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const invalid = rows.filter((r) => !r.name).length

  const doImport = async () => {
    setBusy(true)
    try {
      const res = await api.importItems(rows, updateExisting)
      setResult(res)
      notify(`Import finished: ${res.created} added, ${res.updated} updated`)
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const shownCols = COLUMNS.filter((c) => matched.includes(c.key))

  return (
    <Modal
      open={open}
      onClose={close}
      title="Import Items in Bulk"
      wide
      footer={
        result ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button onClick={doImport} disabled={busy || rows.length === 0}>
              <Upload size={16} /> {busy ? 'Importing…' : `Import ${rows.length - invalid} Items`}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="py-4 text-center">
          <CheckCircle2 className="mx-auto text-emerald-500" size={44} />
          <h3 className="mt-3 text-lg font-semibold text-slate-900">Import complete</h3>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-emerald-50 p-3"><div className="text-2xl font-semibold text-emerald-700">{result.created}</div><div className="text-xs text-emerald-700">New items added</div></div>
            <div className="rounded-lg bg-sky-50 p-3"><div className="text-2xl font-semibold text-sky-700">{result.updated}</div><div className="text-xs text-sky-700">Existing updated</div></div>
            <div className="rounded-lg bg-slate-100 p-3"><div className="text-2xl font-semibold text-slate-700">{result.skipped}</div><div className="text-xs text-slate-600">Skipped (already exist)</div></div>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-left text-sm text-red-700">
              <div className="font-medium">{result.errors.length} rows had errors:</div>
              <ul className="mt-1 list-disc pl-5">
                {result.errors.slice(0, 10).map((e) => <li key={e.row}>Row {e.row}: {e.message}</li>)}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <ol className="space-y-1 text-sm text-slate-600">
            <li><b>Step 1.</b> Download the template and fill in your items (Excel or CSV). Only <b>Item Name</b> is required.</li>
            <li><b>Step 2.</b> Upload the file, check the preview and click Import.</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={downloadTemplate}><Download size={16} /> Download Template</Button>
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:border-steel-500 hover:bg-steel-50">
            <FileSpreadsheet size={32} className="text-steel-600" />
            <span className="text-sm font-medium text-slate-700">{fileName || 'Click to choose an Excel (.xlsx) or CSV file'}</span>
            <span className="text-xs text-slate-400">Columns: {COLUMNS.map((c) => c.label).join(', ')}</span>
            <input type="file" accept=".xlsx,.csv,.txt" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
          </label>

          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-slate-600">
                  Found <b>{rows.length}</b> rows{invalid > 0 && <span className="text-red-600"> · {invalid} without item name (will be skipped)</span>}
                </span>
                <label className="flex items-center gap-2 text-slate-700">
                  <input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} className="h-4 w-4" />
                  Update items that already exist (matched by code, or name if code is blank)
                </label>
              </div>
              <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
                <Table>
                  <thead>
                    <tr><Th>Row</Th>{shownCols.map((c) => <Th key={c.key}>{c.label}</Th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 100).map((r) => (
                      <tr key={r.__row} className={cx(!r.name && 'bg-red-50')}>
                        <Td className="text-slate-400">{r.__row}</Td>
                        {shownCols.map((c) => <Td key={c.key}>{r[c.key] || (c.key === 'code' ? <span className="text-slate-400">auto</span> : '')}</Td>)}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              {rows.length > 100 && <p className="text-xs text-slate-400">Showing first 100 rows.</p>}
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
