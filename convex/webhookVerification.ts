const textEncoder = new TextEncoder()

function decodeBase64(value: string): Uint8Array | null {
  try {
    const binary = atob(value)
    return Uint8Array.from(binary, character => character.charCodeAt(0))
  } catch {
    return null
  }
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index]
  return difference === 0
}

export async function verifySvixWebhook(args: {
  secret: string
  payload: string
  id: string | null
  timestamp: string | null
  signature: string | null
  nowSeconds?: number
}): Promise<boolean> {
  if (!args.id || !args.timestamp || !args.signature) return false
  if (!/^\d{10}$/.test(args.timestamp)) return false
  const timestamp = Number(args.timestamp)
  const now = args.nowSeconds ?? Math.floor(Date.now() / 1000)
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > 300) return false

  const encodedSecret = args.secret.startsWith('whsec_') ? args.secret.slice(6) : args.secret
  const secret = decodeBase64(encodedSecret)
  if (!secret || secret.length < 16) return false
  const secretBuffer = new ArrayBuffer(secret.byteLength)
  new Uint8Array(secretBuffer).set(secret)
  const key = await crypto.subtle.importKey('raw', secretBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, textEncoder.encode(`${args.id}.${args.timestamp}.${args.payload}`)))
  return args.signature.split(/\s+/).some(part => {
    const [version, encoded] = part.split(',', 2)
    const candidate = version === 'v1' && encoded ? decodeBase64(encoded) : null
    return candidate ? equalBytes(digest, candidate) : false
  })
}
