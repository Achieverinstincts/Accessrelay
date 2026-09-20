import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const pkg = JSON.parse(readFileSync('node_modules/convex/package.json', 'utf8'))
const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin.convex
const child = spawn(process.execPath, [resolve('node_modules/convex', bin), ...process.argv.slice(2)], { stdio: 'inherit', windowsHide: true, env: { ...process.env, CONVEX_AGENT_MODE: 'anonymous', CONVEX_LOCAL_BACKEND_STARTUP_TIMEOUT_SECS: '120' } })
child.on('error', () => { console.error('Convex CLI could not start.'); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
