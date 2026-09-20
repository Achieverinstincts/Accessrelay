export function canonicalEmail(value: string): string | null {
  const trimmed = value.trim()
  const bracketed = trimmed.match(/<([^<>]+)>\s*$/)?.[1] ?? trimmed
  const email = bracketed.trim().toLowerCase()
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

export function sameMailbox(sender: string, approvedRecipient: string): boolean {
  const left = canonicalEmail(sender)
  const right = canonicalEmail(approvedRecipient)
  return left !== null && right !== null && left === right
}
