// Explicit allowlist; never prints credentials or puts them in frontend variables.
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
const values = {}
if (!/^CONVEX_DEPLOYMENT=anonymous:/m.test(readFileSync('.env.local', 'utf8'))) throw new Error('This helper only configures an anonymous local backend.')
for (const line of readFileSync('env.txt', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)
  if (match) values[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
}
const pkg = JSON.parse(readFileSync('node_modules/convex/package.json', 'utf8'))
const cli = resolve('node_modules/convex', typeof pkg.bin === 'string' ? pkg.bin : pkg.bin.convex)
for (const [target, source, literal] of [['LITEAPI_SANDBOX_PRIVATE_KEY', 'LITEAPI_SANDBOX_PRIVATE_KEY', ''], ['GROQ_API_KEY', 'GROQCLOUD_API_KEY', ''], ['ACCESSRELAY_LOCAL_AUTH', '', '1']]) {
  const value = source ? values[source] : literal
  if (!value) continue
  const result = spawnSync(process.execPath, [cli, 'env', 'set', target, value], { encoding: 'utf8', timeout: 240000, windowsHide: true })
  if (result.status !== 0) { console.error(`${target}: configuration failed (exit ${result.status}, ${result.error?.code ?? 'CLI failure'}).`); process.exitCode = 1; break }
  console.log(`${target}: configured on the selected local development backend.`)
}
