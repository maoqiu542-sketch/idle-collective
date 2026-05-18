const fs = require('node:fs')
const path = require('node:path')
const { execFileSync, spawn } = require('node:child_process')
const { loadPipelineConfig, parseArgs, paths } = require('./shared')

const args = parseArgs(process.argv.slice(2))
const config = loadPipelineConfig()
const intervalMinutes = typeof args.interval === 'string'
  ? Number(args.interval)
  : config.monitoring.intervalMinutes
const pidPath = path.join(paths.reportsDir, 'monitor-session-loop.pid')
const heartbeatPath = path.join(paths.reportsDir, 'monitor-session-heartbeat.json')
const outPath = path.join(paths.reportsDir, 'monitor-session-loop.stdout.log')
const errPath = path.join(paths.reportsDir, 'monitor-session-loop.stderr.log')

function isRunning(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function getProcessCommandLine(pid) {
  try {
    return execFileSync('powershell.exe', [
      '-NoProfile',
      '-Command',
      `(Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" | Select-Object -ExpandProperty CommandLine)`
    ], {
      encoding: 'utf8',
      windowsHide: true
    }).trim()
  } catch {
    return ''
  }
}

function isExpectedSessionProcess(pid) {
  const commandLine = getProcessCommandLine(pid)
  return commandLine.includes('monitor-session-loop.js')
}

function hasFreshHeartbeat(maxAgeMs) {
  const heartbeat = readJsonIfExists(heartbeatPath)
  if (!heartbeat?.updatedAt) {
    return false
  }

  const updatedAt = new Date(heartbeat.updatedAt).getTime()
  return Number.isFinite(updatedAt) && (Date.now() - updatedAt) <= maxAgeMs
}

if (fs.existsSync(pidPath)) {
  const existingPid = Number(fs.readFileSync(pidPath, 'utf8').trim())
  const heartbeatFresh = hasFreshHeartbeat(intervalMinutes * 60 * 1000 * 3)
  if (
    Number.isFinite(existingPid) &&
    isRunning(existingPid) &&
    isExpectedSessionProcess(existingPid) &&
    heartbeatFresh
  ) {
    console.log(`[art:session-start] already running pid=${existingPid}`)
    process.exit(0)
  }
}

fs.mkdirSync(path.dirname(pidPath), { recursive: true })
const out = fs.openSync(outPath, 'a')
const err = fs.openSync(errPath, 'a')

const child = spawn(process.execPath, [
  path.join(paths.projectRoot, 'scripts', 'art-pipeline', 'monitor-session-loop.js'),
  `--interval=${intervalMinutes}`
], {
  cwd: paths.projectRoot,
  detached: true,
  stdio: ['ignore', out, err]
})

fs.writeFileSync(pidPath, `${child.pid}\n`, 'utf8')
child.unref()

console.log(`[art:session-start] started pid=${child.pid} interval=${intervalMinutes}m`)
