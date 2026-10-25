import { spawn, exec } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Start the server
const serverProcess = spawn('node', ['server/index.js'], {
  cwd: __dirname,
  env: { ...process.env, PORT: '5000' },
  shell: true
})

console.log('Starting Steel ERP Server...')

serverProcess.stdout.on('data', (data) => {
  console.log(`Server: ${data}`)
  
  // Open browser when server is ready
  if (data.toString().includes('Server running')) {
    console.log('Opening application in browser...')
    const url = 'http://localhost:5000'
    
    // Platform-specific open command
    const openCmd = process.platform === 'darwin' ? 'open' :
                   process.platform === 'win32' ? 'start' : 'xdg-open'
    
    exec(`${openCmd} ${url}`, (err) => {
      if (err) console.error('Could not open browser:', err)
    })
  }
})

serverProcess.stderr.on('data', (data) => {
  console.error(`Server Error: ${data}`)
})

serverProcess.on('close', (code) => {
  console.log(`Server process exited with code ${code}`)
  process.exit(code)
})

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down server...')
  serverProcess.kill()
  process.exit()
})

process.on('SIGTERM', () => {
  serverProcess.kill()
  process.exit()
})
