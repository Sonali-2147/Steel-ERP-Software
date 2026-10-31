import type { PaymentMode } from './types'

export const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
]

export const paymentModeLabel = (mode: string) => PAYMENT_MODES.find((m) => m.value === mode)?.label || '-'
