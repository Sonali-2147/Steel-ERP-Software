import electron from 'electron'
const { app, BrowserWindow, ipcMain, dialog, shell } = electron
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow = null
let serverApp = null
let httpServer = null
let dataDir = null

async function startServer() {
  // Set environment variables for the server
  process.env.PORT = '5000'
  process.env.DATA_DIR = dataDir

  try {
    // Import and start the server directly in the main process
    const serverModule = await import('./server/index.js')
    serverApp = serverModule.default

    // Serve the built frontend
    const distDir = path.join(__dirname, 'dist')
    const express = await import('express')
    serverApp.use(express.default.static(distDir))
    serverApp.get(/^\/(?!api\/).*/, (req, res) => {
      res.sendFile(path.join(distDir, 'index.html'))
    })

    // Start listening
    await new Promise((resolve, reject) => {
      httpServer = serverApp.listen(5000, () => {
        console.log('Server started on port 5000')
        resolve()
      })
      httpServer.on('error', reject)
    })
    return true
  } catch (err) {
    console.error('Failed to start server:', err)
    console.error('Error details:', err.message)
    console.error('Stack trace:', err.stack)
    dialog.showErrorBox('Steel ERP server failed to start', String(err && err.stack ? err.stack : err))
    return false
  }
}

function createWindow(useServer = true) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'public', 'favicon.svg'),
    title: 'Steel ERP'
  })

  // Load the app from the local server or file as fallback
  if (useServer) {
    mainWindow.loadURL('http://localhost:5000')
  } else {
    const indexPath = path.join(__dirname, 'dist', 'index.html')
    console.log('Loading from file:', indexPath)
    mainWindow.loadFile(indexPath)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Open DevTools in development or if server failed
  if (process.env.NODE_ENV === 'development' || !useServer) {
    mainWindow.webContents.openDevTools()
  }
}

app.whenReady().then(async () => {
  // Ensure data directory exists
  const userDataPath = app.getPath('userData')
  dataDir = path.join(userDataPath, 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const serverStarted = await startServer()

  if (!serverStarted) {
    console.error('Server failed to start, falling back to static file')
  }

  // Create window with appropriate URL based on server status
  setTimeout(() => {
    createWindow(serverStarted)
  }, serverStarted ? 1000 : 500)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(serverStarted)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (httpServer) {
    httpServer.close()
    httpServer = null
  }
})

// Handle IPC for database operations if needed
ipcMain.handle('get-data-path', () => {
  return dataDir
})

// Native "Save as" dialog; resolves false if the user cancels, so the caller can stop before opening WhatsApp.
ipcMain.handle('save-pdf', async (_event, name, data) => {
  const safeName = path.basename(String(name || 'document.pdf'))
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: path.join(app.getPath('documents'), safeName),
    filters: [{ name: 'PDF document', extensions: ['pdf'] }],
  })
  if (canceled || !filePath) return false
  fs.writeFileSync(filePath, Buffer.from(data))
  return true
})

// Only WhatsApp links may be opened in the system browser/app.
ipcMain.handle('open-external', async (_event, url) => {
  const parsed = new URL(String(url))
  if (parsed.protocol !== 'https:' || !['wa.me', 'api.whatsapp.com', 'web.whatsapp.com'].includes(parsed.hostname)) {
    throw new Error('Blocked external URL')
  }
  await shell.openExternal(parsed.href)
})
