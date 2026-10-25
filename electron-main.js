const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')

let mainWindow = null
let serverProcess = null

// Ensure data directory exists
const userDataPath = app.getPath('userData')
const dataDir = path.join(userDataPath, 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

function startServer() {
  const serverPath = path.join(__dirname, 'server', 'index.js')
  
  serverProcess = spawn('node', [serverPath], {
    cwd: __dirname,
    env: { 
      ...process.env, 
      PORT: '5000',
      DATA_DIR: dataDir
    },
    stdio: 'pipe'
  })

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`)
  })

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`)
  })

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
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

app.whenReady().then(() => {
  startServer()
  
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
    if (serverProcess) {
      serverProcess.kill()
    }
    app.quit()
  }
})

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill()
  }
})

// Handle IPC for database operations if needed
ipcMain.handle('get-data-path', () => {
  return dataDir
})
