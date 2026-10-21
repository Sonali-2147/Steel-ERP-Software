import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Items from './pages/Items'
import StockEntries from './pages/StockEntries'
import Parties from './pages/Parties'
import Quotations from './pages/Quotations'
import PurchaseBills from './pages/PurchaseBills'
import SalesInvoices from './pages/SalesInvoices'
import Payments from './pages/Payments'
import Reports from './pages/Reports'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="items" element={<Items />} />
        <Route path="stock-in" element={<StockEntries key="IN" type="IN" />} />
        <Route path="stock-out" element={<StockEntries key="OUT" type="OUT" />} />
        <Route path="quotations" element={<Quotations />} />
        <Route path="purchase-bills" element={<PurchaseBills />} />
        <Route path="sales-invoices" element={<SalesInvoices />} />
        <Route path="payment-in" element={<Payments type="IN" />} />
        <Route path="payment-out" element={<Payments type="OUT" />} />
        <Route path="suppliers" element={<Parties key="supplier" type="supplier" />} />
        <Route path="customers" element={<Parties key="customer" type="customer" />} />
        <Route path="reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
