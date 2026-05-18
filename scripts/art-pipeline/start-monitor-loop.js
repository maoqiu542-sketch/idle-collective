const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { parseArgs, paths } = require('./shared')

const args = parseArgs(process.argv.slice(2))
const intervalMinutes = typeof args.interval === 'string' ? Number(args.interval) : 10
const category = typeof args.category === 'string' ? args.category : 'terrain'
const pidPath = path.join(paths.reportsDir, 'monitor-loop.pid')
const outPath = path.join(paths.reportsDir, 'monitor-loop.stdout.log')
const errPath = path.join(paths.reportsDir, 'monitor-loop.stderr.log')

function isRunning(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

if (fs.existsSync(pidPath)) {
  const existingPid = Number(fs.readFileSync(pidPath, 'utf8').trim())
  if (Number.isFinite(existingPid) && isRunning(existingPid)) {
    console.log(`[art:monitor-start] already running pid=${existingPid}`)
    process.exit(0)
  }
}

fs.mkdirSync(path.dirname(pidPath), { recursive: true })
const out = fs.openSync(outPath, 'a')
const err = fs.openSync(errPath, 'a')

const child = spawn(process.execPath, [
  path.join(paths.projectRoot, 'scripts', 'art-pipeline', 'monitor-loop.js'),
  `--interval=${intervalMinutes}`,
  `--category=${category}`
], {
  cwd: paths.projectRoot,
  detached: true,
  stdio: ['ignore', out, err]
})

fs.writeFileSync(pidPath, `${child.pid}\n`, 'utf8')
child.unref()

console.log(`[art:monitor-start] started pid=${child.pid} interval=${intervalMinutes}m category=${category}`)
