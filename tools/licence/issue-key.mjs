#!/usr/bin/env node
// Issues a licence key for one computer. Keep this folder private: private.jwk.json can create keys.
//   node issue-key.mjs --client "Krishna Steel" --machine ABCD-1234-EF56-7890 --expires 2027-10-31
//   node issue-key.mjs --client "Krishna Steel" --machine ABCD-1234-EF56-7890 --months 12
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []))
const fail = (msg) => { console.error(`\nError: ${msg}\n`); process.exit(1) }

if (!args.client || !args.machine) fail('Usage: node issue-key.mjs --client "Name" --machine XXXX-XXXX-XXXX-XXXX (--expires YYYY-MM-DD | --months N | --lifetime yes)')
const machine = args.machine.trim().toUpperCase()
if (!/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/.test(machine)) fail('Machine ID must look like ABCD-1234-EF56-7890 (copy it from the activation screen).')

let expires = null
if (args.expires) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.expires) || Number.isNaN(Date.parse(args.expires))) fail('--expires must be a date like 2027-10-31')
  expires = args.expires
} else if (args.months) {
  const months = Number(args.months)
  if (!Number.isInteger(months) || months < 1) fail('--months must be a whole number, e.g. 12')
  const d = new Date()
  d.setUTCMonth(d.getUTCMonth() + months)
  expires = d.toISOString().slice(0, 10)
} else if (args.lifetime !== 'yes') {
  fail('Choose the validity: --expires YYYY-MM-DD, --months N, or --lifetime yes')
}

const here = path.dirname(fileURLToPath(import.meta.url))
const jwk = JSON.parse(fs.readFileSync(path.join(here, 'private.jwk.json'), 'utf8'))
const privateKey = crypto.createPrivateKey({ key: jwk, format: 'jwk' })
const payload = Buffer.from(JSON.stringify({ client: args.client, machine, expires, issued: new Date().toISOString().slice(0, 10) }))
const signature = crypto.sign('sha256', payload, { key: privateKey, dsaEncoding: 'ieee-p1363' })
const key = `${payload.toString('base64url')}.${signature.toString('base64url')}`

console.log(`\nClient : ${args.client}\nMachine: ${machine}\nExpires: ${expires || 'never (lifetime)'}\n\nLICENCE KEY (send this to the client):\n\n${key}\n`)
