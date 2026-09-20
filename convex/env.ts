/** Read a server-side Convex environment variable without adding Node globals
 * to the browser-facing TypeScript graph generated from Convex modules. */
export function readEnv(name: string): string | undefined {
  const runtime = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }
  return runtime.process?.env?.[name]
}
