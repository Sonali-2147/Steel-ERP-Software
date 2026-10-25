import { spawn, exec } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

console.log('Starting Steel ERP Server...')
console.log('This may take a few seconds...')
console.log('')

// Start the server
const serverProcess = spawn('node', ['server/index.js'], {
  cwd: __dirname,
  env: { ...process.env, PORT: '5000' },
  shell: true,
  stdio: 'inherit'
})

let browserOpened = false

// Open browser after a delay (server should be ready by then)
setTimeout(() => {
  if (!browserOpened) {
    console.log('Opening application in browser...')
    browserOpened = true
    const url = 'http://localhost:5000'
    
    // Platform-specific open command
    const openCmd = process.platform === 'darwin' ? 'open' :
                   process.platform === 'win32' ? 'start' : 'xdg-open'
    
    exec(`${openCmd} ${url}`, (err) => {
      if (err) {
        console.error('Could not open browser automatically.')
        console.log(`Please open your browser and go to: ${url}`)
      } else {
        console.log('Browser opened successfully!')
      }
    })
  }
}, 3000) // Wait 3 seconds for server to start

serverProcess.on('close', (code) => {
  console.log('')
  console.log('Server stopped.')
  console.log('Press any key to close this window...')
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
