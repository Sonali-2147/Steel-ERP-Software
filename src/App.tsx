import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Items from './pages/Items'
import StockEntries from './pages/StockEntries'
import Parties from './pages/Parties'
import Reports from './pages/Reports'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="items" element={<Items />} />
        <Route path="stock-in" element={<StockEntries key="IN" type="IN" />} />
        <Route path="stock-out" element={<StockEntries key="OUT" type="OUT" />} />
        <Route path="suppliers" element={<Parties key="supplier" type="supplier" />} />
        <Route path="customers" element={<Parties key="customer" type="customer" />} />
        <Route path="reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
