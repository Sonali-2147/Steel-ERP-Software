import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
const BACKUP_BUCKET = 'steel-erp-backup'
const BACKUP_FILE = 'erp.db'

let supabase = null
let backupInterval = null
let pendingBackup = false

if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  console.log('Supabase backup initialized')
} else {
  console.log('Supabase backup disabled (missing SUPABASE_URL or SUPABASE_KEY)')
}

async function uploadBackup(dbPath) {
  if (!supabase) return false

  try {
    const fileBuffer = fs.readFileSync(dbPath)
    const fileName = `${BACKUP_FILE}-${Date.now()}.db`

    const { data, error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .upload(fileName, fileBuffer, {
        upsert: true,
        contentType: 'application/x-sqlite3'
      })

    if (error) {
      console.error('Backup upload failed:', error)
      return false
    }

    // Delete old backups (keep only latest 5)
    const { data: files } = await supabase.storage
      .from(BACKUP_BUCKET)
      .list('', { limit: 100 })

    if (files && files.length > 5) {
      const sorted = files.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      const toDelete = sorted.slice(0, files.length - 5)
      for (const file of toDelete) {
        await supabase.storage.from(BACKUP_BUCKET).remove([file.name])
      }
    }

    // Update the latest backup
    await supabase.storage
      .from(BACKUP_BUCKET)
      .move(fileName, BACKUP_FILE, { destination: BACKUP_FILE })

    console.log('Database backup uploaded successfully')
    return true
  } catch (error) {
    console.error('Backup error:', error)
    return false
  }
}

async function downloadBackup(dbPath) {
  if (!supabase) return false

  try {
    const { data, error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .download(BACKUP_FILE)

    if (error) {
      console.log('No backup found or download failed:', error.message)
      return false
    }

    // Ensure directory exists
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(dbPath, data)
    console.log('Database restored from backup')
    return true
  } catch (error) {
    console.error('Restore error:', error)
    return false
  }
}

export async function initBackup(dbPath) {
  if (!supabase) return

  // Check if local database exists
  const localExists = fs.existsSync(dbPath) && fs.statSync(dbPath).size > 0

  if (!localExists) {
    console.log('Local database not found, attempting to restore from backup...')
    const restored = await downloadBackup(dbPath)
    if (restored) {
      console.log('Successfully restored database from backup')
    } else {
      console.log('No backup available, starting with fresh database')
    }
  }

  // Start periodic backups every 5 minutes
  if (!backupInterval) {
    backupInterval = setInterval(() => {
      if (!pendingBackup) {
        pendingBackup = true
        uploadBackup(dbPath).finally(() => {
          pendingBackup = false
        })
      }
    }, 5 * 60 * 1000) // 5 minutes
    console.log('Periodic backups scheduled (every 5 minutes)')
  }
}

export async function backupDatabase(dbPath) {
  if (!supabase) return { success: false, message: 'Backup not configured' }
  const success = await uploadBackup(dbPath)
  return { success, message: success ? 'Backup completed' : 'Backup failed' }
}

export function stopBackup() {
  if (backupInterval) {
    clearInterval(backupInterval)
    backupInterval = null
    console.log('Periodic backups stopped')
  }
}
