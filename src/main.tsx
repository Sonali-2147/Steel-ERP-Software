import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { AuthProvider, useAuth } from './lib/auth'
import { StoreProvider } from './lib/store'
import Login from './pages/Login'

function Root() {
  const { user, checking } = useAuth()
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
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>,
)
