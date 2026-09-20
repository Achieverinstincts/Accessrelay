import fs from 'node:fs'
import path from 'node:path'
const logPath = path.join(process.env.LOCALAPPDATA, 'npm-cache', '_logs')
for (const name of fs.readdirSync(logPath).filter(n => n.endsWith('debug-0.log')).sort().slice(-2)) {
  console.log(name)
  console.log(fs.readFileSync(path.join(logPath, name), 'utf8').split('\n').slice(-25).join('\n'))
}
console.log('Installed binaries:', fs.existsSync('node_modules/.bin') ? fs.readdirSync('node_modules/.bin') : [])
