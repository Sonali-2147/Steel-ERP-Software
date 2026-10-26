const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getVersions: () => process.versions,
  savePdf: (name, data) => ipcRenderer.invoke('save-pdf', name, data),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
})
