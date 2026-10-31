import { useState } from 'react'
import { Copy, KeyRound, ShieldAlert } from 'lucide-react'
import { Button, Field, Textarea } from '@/components/ui'
import { COPYRIGHT } from '@/lib/copyright'
import { useLicence } from '@/lib/licence'

const REASON_TEXT: Record<string, string> = {
  missing: 'This copy is not activated yet.',
  invalid: 'The saved licence key is not valid.',
  machine: 'The saved licence key was issued for a different computer.',
  expired: 'Your licence has expired.',
  clock: 'The date on this computer looks wrong. Set the correct date and time, then restart the app.',
}

export default function Activate() {
  const { status, activate } = useLicence()
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const machineId = status?.machineId || ''
  const clockProblem = status?.reason === 'clock'

  const copyId = async () => {
    await navigator.clipboard.writeText(machineId)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await activate(key)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-100 p-5">
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-100 text-amber-700"><ShieldAlert size={22} /></div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Activation required</h1>
            <p className="text-sm text-slate-500">{status?.reason ? REASON_TEXT[status.reason] : 'Checking licence…'}</p>
          </div>
        </div>

        {!clockProblem && (
          <>
            <ol className="mb-5 list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
              <li>Send the <b>Machine ID</b> below to the software provider.</li>
              <li>You will receive a <b>licence key</b>.</li>
              <li>Paste the key in the box and press <b>Activate</b>.</li>
            </ol>

            <div className="mb-4">
              <div className="mb-1 text-sm font-medium text-slate-700">Machine ID</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-base font-semibold tracking-wider text-slate-900">{machineId || '…'}</code>
                <Button type="button" variant="secondary" onClick={copyId} disabled={!machineId}><Copy size={14} /> {copied ? 'Copied' : 'Copy'}</Button>
              </div>
            </div>

            <Field label="Licence key">
              <Textarea value={key} onChange={(e) => setKey(e.target.value)} rows={4} placeholder="Paste the licence key here" className="font-mono text-xs" />
            </Field>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <Button type="submit" className="mt-4 w-full" disabled={busy || !key.trim()}><KeyRound size={16} /> {busy ? 'Checking…' : 'Activate'}</Button>
          </>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">{COPYRIGHT}</p>
      </form>
    </div>
  )
}
