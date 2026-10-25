import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getVersions: () => process.versions
})
