import { useMemo, useState } from 'react'
import { Download, Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { Button, Card, ConfirmDialog, EmptyRow, Field, Input, Modal, PageHeader, SearchBox, Select, StatusBadge, Table, Td, Textarea, Th, Tr } from '@/components/ui'
import { api } from '@/lib/api'
import { downloadCSV } from '@/lib/format'
import { useStore } from '@/lib/store'
import type { Party, PartyInput, PartyType } from '@/lib/types'

const EMPTY: PartyInput = { name: '', contact_person: '', phone: '', email: '', address: '', city: '', gstin: '' }

export default function Parties({ type }: { type: PartyType }) {
  const store = useStore()
  const list = type === 'supplier' ? store.suppliers : store.customers
  const title = type === 'supplier' ? 'Suppliers' : 'Customers'
  const single = type === 'supplier' ? 'Supplier' : 'Customer'
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('active')
  const [editing, setEditing] = useState<Party | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Party | null>(null)
  const [confirmInactive, setConfirmInactive] = useState<Party | null>(null)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return list.filter((p) => {
      if (status === 'active' && !p.active) return false
      if (status === 'inactive' && p.active) return false
      return !s || `${p.name} ${p.contact_person} ${p.phone} ${p.city} ${p.gstin}`.toLowerCase().includes(s)
    })
  }, [list, q, status])

  const toggle = async (p: Party) => {
    setConfirmInactive(p)
  }

  const confirmToggle = async () => {
    if (!confirmInactive) return
    try {
      await api.setPartyActive(confirmInactive.id, !confirmInactive.active)
      store.notify(`${confirmInactive.name} marked ${confirmInactive.active ? 'inactive' : 'active'}`)
      store.refresh()
    } catch (e) { store.notify((e as Error).message, 'error') }
    setConfirmInactive(null)
  }

  const remove = async (p: Party) => {
    setConfirmDelete(p)
  }

  const confirmRemove = async () => {
    if (!confirmDelete) return
    try {
      await api.deleteParty(confirmDelete.id)
      store.notify(`${single} deleted`)
      store.refresh()
    } catch (e) { store.notify((e as Error).message, 'error') }
    setConfirmDelete(null)
  }

  const exportCSV = () => downloadCSV(`${type}s.csv`, filtered.map((p) => ({
    Name: p.name, 'Contact Person': p.contact_person, Phone: p.phone, Email: p.email,
    Address: p.address, City: p.city, GSTIN: p.gstin, Status: p.active ? 'Active' : 'Inactive',
  })))

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={`${list.filter((p) => p.active).length} active ${title.toLowerCase()}`}
        actions={
          <>
            <Button variant="secondary" onClick={exportCSV}><Download size={16} /> Export</Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus size={16} /> New {single}</Button>
          </>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row">
          <SearchBox value={q} onChange={setQ} placeholder="Search by name, phone, city…" className="md:w-80" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="md:w-44">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </Select>
        </div>
        <Table>
          <thead>
            <tr><Th>Name</Th><Th>Contact Person</Th><Th>Phone</Th><Th>City</Th><Th>GSTIN</Th><Th right>Entries</Th><Th>Status</Th><Th right>Actions</Th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <EmptyRow cols={8} text={`No ${title.toLowerCase()} yet. Click "New ${single}" to add one.`} />}
            {filtered.map((p) => (
              <Tr key={p.id} className={p.active ? '' : 'opacity-60'}>
                <Td className="font-medium text-slate-900">{p.name}{p.email && <div className="text-xs font-normal text-slate-400">{p.email}</div>}</Td>
                <Td>{p.contact_person || '–'}</Td>
                <Td>{p.phone || '–'}</Td>
                <Td>{p.city || '–'}</Td>
                <Td className="font-mono text-xs">{p.gstin || '–'}</Td>
                <Td right>{p.entry_count ?? 0}</Td>
                <Td><StatusBadge status={p.active ? 'Active' : 'Inactive'} /></Td>
                <Td right>
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" title="Edit" onClick={() => { setEditing(p); setFormOpen(true) }}><Pencil size={14} /></Button>
                    <Button size="sm" variant="ghost" title={p.active ? 'Mark inactive' : 'Mark active'} className={p.active ? 'text-slate-500' : 'text-emerald-600'} onClick={() => toggle(p)}><Power size={14} /></Button>
                    <Button size="sm" variant="ghost" title="Delete" className="text-red-600" onClick={() => remove(p)}><Trash2 size={14} /></Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
      {formOpen && <PartyForm type={type} party={editing} onClose={() => setFormOpen(false)} />}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title={`Delete ${single}`}
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
        onConfirm={confirmRemove}
        confirmText="Delete"
        variant="danger"
      />
      <ConfirmDialog
        open={!!confirmInactive}
        onClose={() => setConfirmInactive(null)}
        title={confirmInactive?.active ? `Mark ${single} Inactive` : `Mark ${single} Active`}
        message={`Are you sure you want to mark "${confirmInactive?.name}" as ${confirmInactive?.active ? 'inactive' : 'active'}?`}
        onConfirm={confirmToggle}
        confirmText={confirmInactive?.active ? 'Mark Inactive' : 'Mark Active'}
        variant="warning"
      />
    </div>
  )
}

function PartyForm({ type, party, onClose }: { type: PartyType; party: Party | null; onClose: () => void }) {
  const { refresh, notify } = useStore()
  const single = type === 'supplier' ? 'Supplier' : 'Customer'
  const [f, setF] = useState<PartyInput>(() => (party ? { ...EMPTY, ...party } : EMPTY))
  const [saving, setSaving] = useState(false)
  const set = (k: keyof PartyInput, v: string) => setF((s) => ({ ...s, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.name.trim()) return notify('Name is required', 'error')
    setSaving(true)
    try {
      if (party) await api.updateParty(party.id, f)
      else await api.createParty(type, f)
      notify(`${single} ${party ? 'updated' : 'added'}`)
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
      title={party ? `Edit ${single}` : `New ${single}`}
      blur
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="party-form" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </>
      }
    >
      <form id="party-form" onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={`${single} Name`} required className="sm:col-span-2">
          <Input autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Contact Person"><Input value={f.contact_person} onChange={(e) => set('contact_person', e.target.value)} /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="City"><Input value={f.city} onChange={(e) => set('city', e.target.value)} /></Field>
        <Field label="GSTIN" className="sm:col-span-2"><Input value={f.gstin} onChange={(e) => set('gstin', e.target.value)} placeholder="Optional" /></Field>
        <Field label="Address" className="sm:col-span-2"><Textarea rows={2} value={f.address} onChange={(e) => set('address', e.target.value)} /></Field>
      </form>
    </Modal>
  )
}
