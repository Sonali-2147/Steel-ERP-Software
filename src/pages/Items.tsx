import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, Pencil, Plus, Power, Trash2, Upload } from 'lucide-react'
import ImportItems from '@/components/ImportItems'
import {
  Button, Card, ConfirmDialog, EmptyRow, Field, Input, Modal, PageHeader, Pagination, SearchBox, Select, StatusBadge, Table, Td, Th, Tr,
} from '@/components/ui'
import { api } from '@/lib/api'
import { downloadCSV, inr, qty } from '@/lib/format'
import { stockStatus, useStore } from '@/lib/store'
import { UNITS, type Item, type ItemInput } from '@/lib/types'

const EMPTY: ItemInput = {
  code: '',
  name: '',
  category: '',
  grade: '',
  size: '',
  unit: 'kg',
  hsn_code: '',
  gst_rate: 0,
  opening_stock: 0,
  min_stock: 0,
  purchase_rate: 0,
  sale_rate: 0,
  active: 1,
}
const PAGE = 25

export default function Items() {
  const { items, refresh, notify } = useStore()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('active')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Item | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Item | null>(null)
  const [confirmInactive, setConfirmInactive] = useState<Item | null>(null)

  useEffect(() => {
    const action = params.get('action')
    if (action === 'new') { setEditing(null); setFormOpen(true) }
    if (action === 'import') setImportOpen(true)
    if (action) setParams({}, { replace: true })
  }, [params, setParams])

  const categories = useMemo(() => [...new Set(items.map((i) => i.category).filter(Boolean))].sort(), [items])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return items.filter((i) => {
      if (s && !`${i.code} ${i.name} ${i.size} ${i.grade}`.toLowerCase().includes(s)) return false
      if (category && i.category !== category) return false
      const st = stockStatus(i.stock, i.min_stock)
      if (status === 'active' && !i.active) return false
      if (status === 'inactive' && i.active) return false
      if (status === 'low' && (!i.active || st !== 'Low Stock')) return false
      if (status === 'out' && (!i.active || st !== 'Out of Stock')) return false
      return true
    })
  }, [items, q, category, status])

  useEffect(() => setPage(1), [q, category, status])

  const exportCSV = () =>
    downloadCSV('items.csv', filtered.map((i) => ({
      'Item Code': i.code, 'Item Name': i.name, Category: i.category, Grade: i.grade, Size: i.size, Unit: i.unit,
      'Opening Stock': i.opening_stock, 'Current Stock': i.stock, 'Min Stock': i.min_stock,
      'Purchase Rate': i.purchase_rate, 'Sale Rate': i.sale_rate, Status: i.active ? 'Active' : 'Inactive',
    })))

  const toggleActive = async (i: Item) => {
    setConfirmInactive(i)
  }

  const confirmToggleActive = async () => {
    if (!confirmInactive) return
    try {
      await api.setItemActive(confirmInactive.id, !confirmInactive.active)
      notify(`${confirmInactive.name} marked ${confirmInactive.active ? 'inactive' : 'active'}`)
      refresh()
    } catch (e) { notify((e as Error).message, 'error') }
    setConfirmInactive(null)
  }

  const remove = async (i: Item) => {
    setConfirmDelete(i)
  }

  const confirmRemove = async () => {
    if (!confirmDelete) return
    try {
      await api.deleteItem(confirmDelete.id)
      notify('Item deleted')
      refresh()
    } catch (e) { notify((e as Error).message, 'error') }
    setConfirmDelete(null)
  }

  return (
    <div>
      <PageHeader
        title="Items"
        subtitle={`${items.filter((i) => i.active).length} active items`}
        actions={
          <>
            <Button variant="secondary" onClick={exportCSV}><Download size={16} /> Export</Button>
            <Button variant="secondary" onClick={() => setImportOpen(true)}><Upload size={16} /> Import Items</Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus size={16} /> New Item</Button>
          </>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row">
          <SearchBox value={q} onChange={setQ} placeholder="Search by code, name, size…" className="md:w-80" />
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="md:w-52">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="md:w-44">
            <option value="active">Active items</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
            <option value="inactive">Inactive items</option>
            <option value="all">All items</option>
          </Select>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Code / Category</Th><Th>Item Name</Th>
              <Th right>Current Stock</Th><Th right>Min Stock</Th><Th right>Purchase / Sale Rate</Th>
              <Th>Status</Th><Th right>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <EmptyRow cols={7} text="No items found." />}
            {filtered.slice((page - 1) * PAGE, page * PAGE).map((i) => (
              <Tr key={i.id} className={i.active ? '' : 'opacity-60'}>
                <Td className="whitespace-nowrap">
                  <div className="font-mono text-xs">{i.code}</div>
                  {i.category && <div className="text-xs text-slate-400">{i.category}</div>}
                </Td>
                <Td className="min-w-56 font-medium text-slate-900">
                  {i.name}
                  {(i.size || i.grade) && <div className="text-xs font-normal text-slate-400">{[i.size, i.grade].filter(Boolean).join(' · ')}</div>}
                </Td>
                <Td right className="whitespace-nowrap font-semibold">{qty(i.stock, i.unit)}</Td>
                <Td right className="whitespace-nowrap">{qty(i.min_stock, i.unit)}</Td>
                <Td right className="whitespace-nowrap">{inr(i.purchase_rate)} / {inr(i.sale_rate)}</Td>
                <Td>{i.active ? <StatusBadge status={stockStatus(i.stock, i.min_stock)} /> : <StatusBadge status="Inactive" />}</Td>
                <Td right>
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" title="Edit" onClick={() => { setEditing(i); setFormOpen(true) }}><Pencil size={14} /></Button>
                    <Button size="sm" variant="ghost" title={i.active ? 'Mark inactive' : 'Mark active'} className={i.active ? 'text-slate-500' : 'text-emerald-600'} onClick={() => toggleActive(i)}><Power size={14} /></Button>
                    <Button size="sm" variant="ghost" title="Delete" className="text-red-600" onClick={() => remove(i)}><Trash2 size={14} /></Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <Pagination page={page} pageSize={PAGE} total={filtered.length} onPage={setPage} />
      </Card>

      {formOpen && <ItemForm item={editing} categories={categories} onClose={() => setFormOpen(false)} />}
      <ImportItems open={importOpen} onClose={() => setImportOpen(false)} />
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Item"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
        onConfirm={confirmRemove}
        confirmText="Delete"
        variant="danger"
      />
      <ConfirmDialog
        open={!!confirmInactive}
        onClose={() => setConfirmInactive(null)}
        title={confirmInactive?.active ? 'Mark Item Inactive' : 'Mark Item Active'}
        message={`Are you sure you want to mark "${confirmInactive?.name}" as ${confirmInactive?.active ? 'inactive' : 'active'}?`}
        onConfirm={confirmToggleActive}
        confirmText={confirmInactive?.active ? 'Mark Inactive' : 'Mark Active'}
        variant="warning"
      />
    </div>
  )
}

function ItemForm({ item, categories, onClose }: { item: Item | null; categories: string[]; onClose: () => void }) {
  const { refresh, notify } = useStore()
  const [f, setF] = useState<ItemInput>(() => (item ? { ...EMPTY, ...item } : EMPTY))
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof ItemInput>(k: K, v: ItemInput[K]) => setF((s) => ({ ...s, [k]: v }))
  const numField = (k: 'opening_stock' | 'min_stock' | 'purchase_rate' | 'sale_rate' | 'gst_rate') => (
    <Input type="number" min={0} step="any" value={f[k] || ''} onChange={(e) => set(k, Number(e.target.value))} placeholder="0" />
  )

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.name.trim()) return notify('Item name is required', 'error')
    setSaving(true)
    try {
      if (item) await api.updateItem(item.id, f)
      else await api.createItem(f)
      notify(item ? 'Item updated' : 'Item created')
      await refresh()
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
      title={item ? `Edit Item – ${item.code}` : 'New Item'}
      wide
      blur
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="item-form" disabled={saving}>{saving ? 'Saving…' : 'Save Item'}</Button>
        </>
      }
    >
      <form id="item-form" onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Item Name" required className="sm:col-span-2">
          <Input autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. TMT Bar 12mm" />
        </Field>
        <Field label="Item Code" hint={item ? undefined : 'Leave blank to generate automatically'}>
          <Input value={f.code} onChange={(e) => set('code', e.target.value)} placeholder="e.g. TMT-12" />
        </Field>
        <Field label="Category">
          <Input list="item-categories" value={f.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. TMT Steel" />
          <datalist id="item-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Grade / Brand">
          <Input value={f.grade} onChange={(e) => set('grade', e.target.value)} placeholder="e.g. Fe 500" />
        </Field>
        <Field label="Size / Specification">
          <Input value={f.size} onChange={(e) => set('size', e.target.value)} placeholder="e.g. 12mm x 12m" />
        </Field>
        <Field label="Unit">
          <Input list="item-units" value={f.unit} onChange={(e) => set('unit', e.target.value)} />
          <datalist id="item-units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
        </Field>
        <Field label="Status">
          <Select value={f.active ? '1' : '0'} onChange={(e) => set('active', e.target.value === '1' ? 1 : 0)}>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </Select>
        </Field>
        <Field label="HSN Code">
          <Input value={f.hsn_code} onChange={(e) => set('hsn_code', e.target.value)} placeholder="e.g. 7208" />
        </Field>
        <Field label="GST Rate (%)">{numField('gst_rate')}</Field>
        <Field label="Opening Stock" hint="Stock you already have when starting">{numField('opening_stock')}</Field>
        <Field label="Minimum Stock" hint="Alert when stock goes at or below this">{numField('min_stock')}</Field>
        <Field label="Purchase Rate (₹ per unit)">{numField('purchase_rate')}</Field>
        <Field label="Sale Rate (₹ per unit)">{numField('sale_rate')}</Field>
      </form>
    </Modal>
  )
}
