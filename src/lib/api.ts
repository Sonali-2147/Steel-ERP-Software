import type {
  Dashboard, Entry, EntryInput, EntryType, ImportResult, Item, ItemInput, ItemLedger, LicenceStatus,
  Party, PartyInput, PartyType, Payment, PaymentInput, PurchaseBill, PurchaseBillInput, Quotation, QuotationInput, RegisterRow, SalesInvoice, SalesInvoiceInput, StockSummaryRow,
} from './types'

const TOKEN_KEY = 'erp_token'
const API_BASE = 'http://localhost:5000'

export const authToken = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = authToken.get()
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    if (res.status === 401 && url !== '/api/auth/login') {
      authToken.clear()
      window.dispatchEvent(new Event('erp:logout'))
    }
    let msg = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body.error) msg = body.error
      if (res.status === 403 && body.code === 'LICENCE') window.dispatchEvent(new Event('erp:licence'))
    } catch {
      // ignore
    }
    throw new Error(msg)
  }
  return res.json()
}

const send = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) })

const qs = (params: Record<string, string | number | undefined | null>) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

export interface User {
  id: number
  username: string
  name: string
}

export const api = {
  licenceStatus: () => request<LicenceStatus>('/api/licence/status'),
  activateLicence: (key: string) => request<LicenceStatus>('/api/licence/activate', send('POST', { key })),
  login: (username: string, password: string) => request<{ token: string; user: User }>('/api/auth/login', send('POST', { username, password })),
  me: () => request<User>('/api/auth/me'),
  logout: () => request<{ success: boolean }>('/api/auth/logout', send('POST')),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean }>('/api/auth/change-password', send('POST', { currentPassword, newPassword })),
  getItems: () => request<Item[]>('/api/items'),
  createItem: (item: ItemInput) => request<Item>('/api/items', send('POST', item)),
  updateItem: (id: number, item: ItemInput) => request<Item>(`/api/items/${id}`, send('PUT', item)),
  setItemActive: (id: number, active: boolean) => request<Item>(`/api/items/${id}/active`, send('PATCH', { active })),
  deleteItem: (id: number) => request<{ success: boolean }>(`/api/items/${id}`, send('DELETE')),
  importItems: (rows: Record<string, unknown>[], updateExisting: boolean) =>
    request<ImportResult>('/api/items/import', send('POST', { rows, updateExisting })),

  getParties: () => request<Party[]>('/api/parties'),
  createParty: (type: PartyType, p: PartyInput) => request<Party>('/api/parties', send('POST', { ...p, type })),
  updateParty: (id: number, p: PartyInput) => request<Party>(`/api/parties/${id}`, send('PUT', p)),
  setPartyActive: (id: number, active: boolean) => request<Party>(`/api/parties/${id}/active`, send('PATCH', { active })),
  deleteParty: (id: number) => request<{ success: boolean }>(`/api/parties/${id}`, send('DELETE')),

  getEntries: (params: { type?: EntryType; from?: string; to?: string; party_id?: number; q?: string }) =>
    request<Entry[]>(`/api/entries${qs(params)}`),
  nextEntryNo: (type: EntryType) => request<{ entry_no: string }>(`/api/entries/next-no${qs({ type })}`),
  createEntry: (e: EntryInput) => request<Entry>('/api/entries', send('POST', e)),
  updateEntry: (id: number, e: EntryInput) => request<Entry>(`/api/entries/${id}`, send('PUT', e)),
  deleteEntry: (id: number) => request<{ success: boolean }>(`/api/entries/${id}`, send('DELETE')),

  getDashboard: () => request<Dashboard>('/api/dashboard'),
  stockSummary: (from?: string, to?: string) => request<StockSummaryRow[]>(`/api/reports/stock-summary${qs({ from, to })}`),
  itemLedger: (item_id: number, from?: string, to?: string) => request<ItemLedger>(`/api/reports/item-ledger${qs({ item_id, from, to })}`),
  register: (params: { type: EntryType; from?: string; to?: string; party_id?: number; item_id?: number }) =>
    request<RegisterRow[]>(`/api/reports/register${qs(params)}`),

  getPurchaseBills: (params?: { from?: string; to?: string; supplier_id?: number }) =>
    request<PurchaseBill[]>(`/api/purchase-bills${qs(params || {})}`),
  getPurchaseBill: (id: number) => request<PurchaseBill>(`/api/purchase-bills/${id}`),
  createPurchaseBill: (bill: PurchaseBillInput) => request<PurchaseBill>('/api/purchase-bills', send('POST', bill)),
  updatePurchaseBill: (id: number, bill: PurchaseBillInput) => request<{ success: boolean }>(`/api/purchase-bills/${id}`, send('PUT', bill)),
  deletePurchaseBill: (id: number) => request<{ success: boolean }>(`/api/purchase-bills/${id}`, send('DELETE')),

  getSalesInvoices: (params?: { from?: string; to?: string; customer_id?: number }) =>
    request<SalesInvoice[]>(`/api/sales-invoices${qs(params || {})}`),
  getSalesInvoice: (id: number) => request<SalesInvoice>(`/api/sales-invoices/${id}`),
  createSalesInvoice: (invoice: SalesInvoiceInput) => request<SalesInvoice>('/api/sales-invoices', send('POST', invoice)),
  updateSalesInvoice: (id: number, invoice: SalesInvoiceInput) => request<{ success: boolean }>(`/api/sales-invoices/${id}`, send('PUT', invoice)),
  deleteSalesInvoice: (id: number) => request<{ success: boolean }>(`/api/sales-invoices/${id}`, send('DELETE')),

  purchaseRegister: (params?: { from?: string; to?: string; supplier_id?: number }) =>
    request<any[]>(`/api/reports/purchase-register${qs(params || {})}`),
  salesRegister: (params?: { from?: string; to?: string; customer_id?: number }) =>
    request<any[]>(`/api/reports/sales-register${qs(params || {})}`),

  getQuotations: (params?: { from?: string; to?: string; supplier_id?: number; status?: string }) =>
    request<Quotation[]>(`/api/quotations${qs(params || {})}`),
  getQuotation: (id: number) => request<Quotation>(`/api/quotations/${id}`),
  createQuotation: (quotation: QuotationInput) => request<{ id: number; quotation_no: string }>('/api/quotations', send('POST', quotation)),
  updateQuotation: (id: number, quotation: QuotationInput) => request<{ success: boolean }>(`/api/quotations/${id}`, send('PUT', quotation)),
  deleteQuotation: (id: number) => request<{ success: boolean }>(`/api/quotations/${id}`, send('DELETE')),

  getPayments: (params?: { type?: 'IN' | 'OUT'; from?: string; to?: string; party_id?: number }) =>
    request<Payment[]>(`/api/payments${qs(params || {})}`),
  getPayment: (id: number) => request<Payment>(`/api/payments/${id}`),
  createPayment: (payment: PaymentInput) => request<Payment>('/api/payments', send('POST', payment)),
  updatePayment: (id: number, payment: PaymentInput) => request<Payment>(`/api/payments/${id}`, send('PUT', payment)),
  deletePayment: (id: number) => request<{ success: boolean }>(`/api/payments/${id}`, send('DELETE')),

  paymentInRegister: (params?: { from?: string; to?: string; party_id?: number }) =>
    request<any[]>(`/api/reports/payment-in-register${qs(params || {})}`),
  paymentOutRegister: (params?: { from?: string; to?: string; party_id?: number }) =>
    request<any[]>(`/api/reports/payment-out-register${qs(params || {})}`),

  getExpenses: (params?: { from?: string; to?: string; party_id?: number; type?: 'purchase' | 'sale'; q?: string }) =>
    request<any[]>(`/api/expenses${qs(params || {})}`),
  getProfit: (params?: { from?: string; to?: string }) =>
    request<any>(`/api/profit${qs(params || {})}`),
}
