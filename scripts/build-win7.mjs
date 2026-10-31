#!/usr/bin/env node
// Builds the Windows 7 zips (Electron 22, Express 4, better-sqlite3 9.6.0) from this repo.
// Usage:  node scripts/build-win7.mjs [x64|ia32|both]     (default: both)
// Works on Windows, macOS and Linux. Needs Node 20+ and internet for the first run.
// Output: dist-win7/Krishna Steel ERP-1.0.0-win.zip (x64) and ...-ia32-win.zip (32-bit).
import crypto from 'node:crypto'
import dns from 'node:dns'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Some networks stall on IPv6 or are slow to reach GitHub: prefer IPv4 and wait longer than Node's 10 s default.
dns.setDefaultResultOrder('ipv4first')
net.setDefaultAutoSelectFamilyAttemptTimeout(5000)

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const work = path.join(root, '.build-win7')
const outDir = path.join(root, 'dist-win7')

// better-sqlite3 9.6.0 prebuilt for Electron 22 (ABI v110). Pinned by hash so a bad download is refused.
const PREBUILD = {
  x64: 'fbfc42619a21eebffcb0390ee8b6da53ec5f2450880775e69c5f1dc8151ff387',
  ia32: '92488d59ed34c702c4359b08025c0960eb12c64dff4cd0f221677ae7414d0791',
}
const prebuildUrl = (arch) => `https://github.com/WiseLibs/better-sqlite3/releases/download/v9.6.0/better-sqlite3-v9.6.0-electron-v110-win32-${arch}.tar.gz`

const which = process.argv[2] || 'both'
if (!['x64', 'ia32', 'both'].includes(which)) throw new Error('Use: node scripts/build-win7.mjs [x64|ia32|both]')
const arches = which === 'both' ? ['x64', 'ia32'] : [which]

const run = (command, cwd = work) => execSync(command, { cwd, stdio: 'inherit' })
const read = (file) => fs.readFileSync(path.join(work, file), 'utf8')
const write = (file, text) => fs.writeFileSync(path.join(work, file), text)

function replaceOnce(file, from, to) {
  const text = read(file)
  if (text.split(from).length !== 2) throw new Error(`${file}: expected exactly one occurrence of: ${from}`)
  write(file, text.replace(from, () => to))
}

async function download(url, attempts = 4) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(120000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return Buffer.from(await res.arrayBuffer())
    } catch (error) {
      lastError = error
      console.log(`  download attempt ${attempt}/${attempts} failed (${error.cause?.code || error.message}); ${attempt < attempts ? 'retrying' : 'giving up'}`)
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 3000 * attempt))
    }
  }
  throw new Error(`Could not download ${url}. Check the internet connection, or save that file by hand as .build-win7-cache/bs3-<arch>.tar.gz. (${lastError.message})`)
}

console.log('1/5 Preparing a clean copy of the source')
fs.rmSync(work, { recursive: true, force: true })
fs.mkdirSync(work, { recursive: true })
for (const entry of ['src', 'server', 'public', 'index.html', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'vite.config.ts', 'package.json', 'preload.js']) {
  fs.cpSync(path.join(root, entry), path.join(work, entry), {
    recursive: true,
    filter: (source) => !source.includes(`${path.sep}server${path.sep}data`),
  })
}
for (const file of ['electron-main.cjs', 'electron-builder.yml', 'package-lock.json']) {
  fs.copyFileSync(path.join(root, 'win7', file), path.join(work, file))
}

console.log('2/5 Applying the Windows 7 differences')
const pkg = JSON.parse(read('package.json'))
pkg.main = 'electron-main.cjs'
pkg.dependencies.express = '^4.22.3'
pkg.dependencies['better-sqlite3'] = '9.6.0'
pkg.devDependencies['@types/express'] = '^4.17.21'
pkg.devDependencies.electron = '22.3.27'
write('package.json', `${JSON.stringify(pkg, null, 2)}\n`)
replaceOnce('vite.config.ts', "base: './',\n", "base: './',\n  build: { target: 'chrome108', cssTarget: 'chrome108', cssMinify: 'lightningcss' },\n")
replaceOnce('server/db.js', "import { DatabaseSync } from 'node:sqlite'", "import Database from 'better-sqlite3'")
replaceOnce('server/db.js', 'new DatabaseSync(activeDbPath)', 'new Database(activeDbPath)')
replaceOnce('server/dbBackup.js', "import { createClient } from '@supabase/supabase-js'\n", '')
replaceOnce('server/dbBackup.js', 'if (SUPABASE_URL && SUPABASE_KEY) {\n', "if (SUPABASE_URL && SUPABASE_KEY) {\n  const { createClient } = await import('@supabase/supabase-js')\n")

console.log('3/5 Installing packages and building the web app')
run('npm install --ignore-scripts --no-audit --no-fund')
run('npm run build')

console.log('4/5 Fetching the SQLite engine for Windows 7')
const cache = path.join(root, '.build-win7-cache')
fs.mkdirSync(cache, { recursive: true })
fs.mkdirSync(outDir, { recursive: true })

for (const arch of arches) {
  const tarball = path.join(cache, `bs3-${arch}.tar.gz`)
  if (!fs.existsSync(tarball)) {
    fs.writeFileSync(tarball, await download(prebuildUrl(arch)))
  }
  const sha = crypto.createHash('sha256').update(fs.readFileSync(tarball)).digest('hex')
  if (sha !== PREBUILD[arch]) {
    fs.rmSync(tarball)
    throw new Error(`SQLite engine for ${arch} has the wrong checksum (${sha}). Refusing to build.`)
  }

  const unpacked = path.join(cache, `bs3-${arch}`)
  fs.rmSync(unpacked, { recursive: true, force: true })
  fs.mkdirSync(unpacked, { recursive: true })
  run(`tar -xzf "${tarball}" -C "${unpacked}"`, root)

  const target = path.join(work, 'node_modules', 'better-sqlite3', 'build', 'Release')
  fs.rmSync(path.join(work, 'node_modules', 'better-sqlite3', 'build'), { recursive: true, force: true })
  fs.mkdirSync(target, { recursive: true })
  fs.copyFileSync(path.join(unpacked, 'build', 'Release', 'better_sqlite3.node'), path.join(target, 'better_sqlite3.node'))

  console.log(`5/5 Packaging Windows 7 ${arch}`)
  run(`npx electron-builder --win zip --${arch} -c.directories.output=out-${arch}`)
  for (const file of fs.readdirSync(path.join(work, `out-${arch}`)).filter((name) => name.endsWith('.zip'))) {
    fs.copyFileSync(path.join(work, `out-${arch}`, file), path.join(outDir, file))
    console.log(`Created ${path.join('dist-win7', file)}`)
  }
}
