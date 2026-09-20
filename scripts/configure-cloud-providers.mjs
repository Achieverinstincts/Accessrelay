// Configure only reviewed server-side values on the Convex production deployment.
// Secrets are read locally, passed directly to the Convex CLI, and never printed.
import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const values = {}
for (const line of readFileSync('env.txt', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_]+)\s*=\s*(.*?)\s*$/)
  if (match) values[match[1].toUpperCase()] = match[2].replace(/^['"]|['"]$/g, '')
}
const agentMailKeyFile = process.argv[2]
if (agentMailKeyFile) {
  if (!existsSync(agentMailKeyFile)) throw new Error('The AgentMail key file does not exist.')
  const raw = readFileSync(agentMailKeyFile, 'utf8').trim()
  values.AGENTMAIL_API_KEY = raw.includes('=') ? raw.slice(raw.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '') : raw
}
const pkg = JSON.parse(readFileSync('node_modules/convex/package.json', 'utf8'))
const cli = resolve('node_modules/convex', typeof pkg.bin === 'string' ? pkg.bin : pkg.bin.convex)
const allowlist = [
  ['LITEAPI_SANDBOX_PRIVATE_KEY', 'LITEAPI_SANDBOX_PRIVATE_KEY'],
  ['GROQ_API_KEY', 'GROQCLOUD_API_KEY'],
  ['FIRECRAWL_API_KEY', 'FIRECRAWL_API_KEY'],
  ...(agentMailKeyFile ? [['AGENTMAIL_API_KEY', 'AGENTMAIL_API_KEY']] : []),
]
for (const [target, source] of allowlist) {
  const value = values[source]
  if (!value) throw new Error(`${source} is missing from env.txt.`)
  const result = spawnSync(process.execPath, [cli, 'env', 'set', '--prod', target, value], {
    encoding: 'utf8', timeout: 240_000, windowsHide: true,
  })
  if (result.status !== 0) throw new Error(`${target} configuration failed (${result.error?.code ?? `exit ${result.status}`}).`)
  console.log(`${target}: configured on the Convex production deployment.`)
}
