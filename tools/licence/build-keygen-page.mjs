#!/usr/bin/env node
// Builds Krishna-Key-Generator.html: the private key, encrypted with a passphrase, inside the page.
//   node build-keygen-page.mjs "my passphrase" [output.html]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const passphrase = process.argv[2]
const out = process.argv[3] || path.join(here, 'Krishna-Key-Generator.html')
if (!passphrase || passphrase.length < 8) { console.error('Usage: node build-keygen-page.mjs "passphrase of 8+ characters" [output.html]'); process.exit(1) }

const template = fs.readFileSync(path.join(here, 'keygen-template.html'), 'utf8')
const core = template.split('// CORE-START')[1].split('// CORE-END')[0]
const { encryptVault } = new Function(`${core}; return { encryptVault }`)()

const jwk = fs.readFileSync(path.join(here, 'private.jwk.json'), 'utf8')
const vault = await encryptVault(jwk, passphrase)
fs.writeFileSync(out, template.replace('__VAULT__', () => vault))
console.log(`Written ${out}`)
