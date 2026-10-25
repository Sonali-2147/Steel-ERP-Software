export const BUSINESS_NAME = 'Krishna Steel Corporation'
export const BUSINESS_PHONE = '+91 8329531313'

export function whatsappShareUrl(recipient: { phone?: string }, message: string): string | null {
  const digits = (recipient.phone || '').replace(/\D/g, '')
  const phone = digits.length === 10
    ? `91${digits}`
    : digits.length === 11 && digits.startsWith('0')
      ? `91${digits.slice(1)}`
      : digits
  if (phone.length < 10 || phone.length > 15) return null
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
