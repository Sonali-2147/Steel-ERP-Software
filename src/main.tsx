import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { AuthProvider, useAuth } from './lib/auth'
import { StoreProvider } from './lib/store'
import { LicenceProvider, useLicence } from './lib/licence'
import Activate from './pages/Activate'
import Login from './pages/Login'

function Root() {
  const { user, checking } = useAuth()
  const { status } = useLicence()
  if (!status) return null
  if (!status.valid) return <Activate />
  if (checking) return null
  if (!user) return <Login />
  return (
    <StoreProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </StoreProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LicenceProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </LicenceProvider>
  </StrictMode>,
)
