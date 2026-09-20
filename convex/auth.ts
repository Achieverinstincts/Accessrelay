import { convexAuth } from '@convex-dev/auth/server'
import { Password } from '@convex-dev/auth/providers/Password'
import { readEnv } from './env'

function hex(bytes: Uint8Array) { return [...bytes].map(value => value.toString(16).padStart(2, '0')).join('') }
async function localDigest(secret: string, salt: string) {
  const bytes = new TextEncoder().encode(`${salt}:${secret}`)
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
}

// The anonymous local backend enforces a one-second mutation limit and can be
// too slow for Lucia's production scrypt settings on constrained Windows VMs.
// This explicitly opt-in provider exists only for local automated verification.
const localTestCrypto = readEnv('ACCESSRELAY_LOCAL_AUTH') === '1' ? {
  async hashSecret(secret: string) {
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)))
    return `local-sha256$${salt}$${await localDigest(secret, salt)}`
  },
  async verifySecret(secret: string, stored: string) {
    const [prefix, salt, expected] = stored.split('$')
    return prefix === 'local-sha256' && Boolean(salt) && Boolean(expected) && await localDigest(secret, salt) === expected
  },
} : undefined

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({ providers: [localTestCrypto ? Password({ crypto: localTestCrypto }) : Password] })
