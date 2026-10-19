export interface Item {
  id: number
  code: string
  name: string
  category: string
  grade: string
  size: string
  unit: string
  opening_stock: number
  min_stock: number
  purchase_rate: number
  sale_rate: number
  active: number
  stock: number
}

export type ItemInput = Omit<Item, 'id' | 'active' | 'stock'>

export type PartyType = 'supplier' | 'customer'

export interface Party {
  id: number
  type: PartyType
  name: string
  contact_person: string
  phone: string
  email: string
  address: string
  city: string
  gstin: string
  active: number
  entry_count?: number
}

export type PartyInput = Pick<Party, 'name' | 'contact_person' | 'phone' | 'email' | 'address' | 'city' | 'gstin'>

export type EntryType = 'IN' | 'OUT'

export interface EntryLine {
  id?: number
  item_id: number
  qty: number
  rate: number
  item_code?: string
  item_name?: string
  unit?: string
}

export interface Entry {
  id: number
  entry_no: string
  type: EntryType
  date: string
  party_id: number | null
  party_name: string | null
  reference: string
  note: string
  amount: number
  lines: EntryLine[]
}

export interface EntryInput {
  type: EntryType
  date: string
  party_id: number | null
  reference: string
  note: string
  lines: { item_id: number; qty: number; rate: number }[]
}

export interface Dashboard {
  totalItems: number
  stockValue: number
  lowStockCount: number
  lowStock: Item[]
  monthIn: { entries: number; amount: number }
  monthOut: { entries: number; amount: number }
  suppliers: number
  customers: number
  recent: Entry[]
  monthly: { month: string; in: number; out: number }[]
  byCategory: { category: string; value: number }[]
  topOut: { name: string; unit: string; qty: number; amount: number }[]
}

export interface StockSummaryRow {
  id: number
  code: string
  name: string
  category: string
  unit: string
  min_stock: number
  purchase_rate: number
  active: number
  opening: number
  qty_in: number
  qty_out: number
  closing: number
}

export interface LedgerRow {
  entry_id: number
  entry_no: string
  type: EntryType
  date: string
  reference: string
  party_name: string | null
  qty: number
  rate: number
  balance: number
}

export interface ItemLedger {
  item: Item
  opening: number
  closing: number
  rows: LedgerRow[]
}

export interface RegisterRow {
  entry_id: number
  entry_no: string
  date: string
  reference: string
  party_name: string | null
  item_code: string
  item_name: string
  unit: string
  qty: number
  rate: number
  amount: number
}

export interface ImportResult {
  created: number
  updated: number
  skipped: number
  errors: { row: number; message: string }[]
}

export interface PurchaseBillLine {
  id?: number
  bill_id?: number
  item_id: number
  qty: number
  rate: number
  amount: number
  code?: string
  name?: string
  unit?: string
}

export interface PurchaseBill {
  id: number
  bill_no: string
  date: string
  supplier_id: number
  supplier_name?: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  gstin?: string
  reference: string
  note: string
  subtotal: number
  tax: number
  discount: number
  total: number
  created_at: string
  lines?: PurchaseBillLine[]
}

export interface PurchaseBillInput {
  bill_no?: string
  date: string
  supplier_id: number
  reference: string
  note: string
  tax: number
  discount: number
  lines: { item_id: number; qty: number; rate: number }[]
}

export interface SalesInvoiceLine {
  id: number
  invoice_id: number
  item_id: number
  qty: number
  rate: number
  amount: number
  name?: string
  code?: string
  unit?: string
}

export interface SalesInvoice {
  id: number
  invoice_no: string
  date: string
  customer_id: number
  customer_name?: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  gstin?: string
  reference: string
  note: string
  subtotal: number
  tax: number
  discount: number
  total: number
  created_at: string
  lines?: SalesInvoiceLine[]
}

export interface SalesInvoiceInput {
  invoice_no?: string
  date: string
  customer_id: number
  reference: string
  note: string
  tax: number
  discount: number
  lines: { item_id: number; qty: number; rate: number }[]
}

export interface Quotation {
  id: number
  quotation_no: string
  date: string
  supplier_id: number
  supplier_name?: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  gstin?: string
  reference: string
  note: string
  subtotal: number
  tax: number
  discount: number
  total: number
  valid_until: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  created_at: string
  lines?: QuotationLine[]
}

export interface QuotationLine {
  id: number
  quotation_id: number
  item_id: number
  qty: number
  rate: number
  amount: number
  name?: string
  code?: string
  unit?: string
}

export interface QuotationInput {
  quotation_no?: string
  date: string
  supplier_id: number
  reference?: string
  note?: string
  tax?: number
  discount?: number
  valid_until?: string
  status?: string
  lines: { item_id: number; qty: number; rate: number }[]
}

export const UNITS = ['kg', 'MT', 'pcs', 'nos', 'm', 'ft', 'bundle', 'set']
