import electron from 'electron'
const { app, BrowserWindow, ipcMain } = electron
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow = null
let serverApp = null
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

    serverApp.listen(5000, () => {
      console.log('Server started on port 5000')
    })
  } catch (err) {
    console.error('Failed to start server:', err)
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.mjs')
    },
    icon: path.join(__dirname, 'public', 'favicon.svg'),
    title: 'Steel ERP'
  })

  // Load the app from the built Vite dist folder
  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
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

  await startServer()

  // Wait a bit for server to start before creating window
  setTimeout(() => {
    createWindow()
  }, 2000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverApp) {
      serverApp.close()
    }
    app.quit()
  }
})

app.on('before-quit', () => {
  if (serverApp) {
    serverApp.close()
  }
})

// Handle IPC for database operations if needed
ipcMain.handle('get-data-path', () => {
  return dataDir
})
