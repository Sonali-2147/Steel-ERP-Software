// CommonJS main process: Electron 22 (last Windows 7 release) cannot load an ESM main file.
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { pathToFileURL } = require('url')

let mainWindow = null
let httpServer = null
let dataDir = null

async function startServer() {
  process.env.PORT = '5000'
  process.env.DATA_DIR = dataDir
  try {
    const serverModule = await import(pathToFileURL(path.join(__dirname, 'server', 'index.js')).href)
    const serverApp = serverModule.default
    const express = require('express')
    const distDir = path.join(__dirname, 'dist')
    serverApp.use(express.static(distDir))
    serverApp.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')))
    await new Promise((resolve, reject) => {
      httpServer = serverApp.listen(5000, '127.0.0.1', resolve)
      httpServer.on('error', reject)
    })
    return true
  } catch (err) {
    console.error('Failed to start server:', err)
    dialog.showErrorBox('Steel ERP server failed to start', String(err && err.stack ? err.stack : err))
    return false
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js') },
    title: 'Steel ERP',
  })
  mainWindow.setMenuBarVisibility(false)
  mainWindow.loadURL('http://localhost:5000')
  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(async () => {
  dataDir = path.join(app.getPath('userData'), 'data')
  fs.mkdirSync(dataDir, { recursive: true })
  if (await startServer()) createWindow()
  else app.quit()
})

app.on('window-all-closed', () => app.quit())
app.on('before-quit', () => { if (httpServer) { httpServer.close(); httpServer = null } })
ipcMain.handle('get-data-path', () => dataDir)

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
