export function isPublicHotelUrl(value: string): boolean {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/\.$/, '')
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return false
    if (!host.includes('.') || /^[\d.]+$/.test(host) || host.includes(':') || host.startsWith('[')) return false
    if (/(^|\.)(localhost|local|internal|test|invalid|example)$/.test(host)) return false
    return true
  } catch {
    return false
  }
}
