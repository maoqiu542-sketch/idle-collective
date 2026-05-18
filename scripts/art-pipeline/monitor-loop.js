const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { parseArgs, paths } = require('./shared')

const args = parseArgs(process.argv.slice(2))
const intervalMinutes = typeof args.interval === 'string' ? Number(args.interval) : 10
const category = typeof args.category === 'string' ? args.category : 'terrain'
const logPath = path.join(paths.reportsDir, 'monitor-loop.log')
const heartbeatPath = path.join(paths.reportsDir, 'monitor-heartbeat.json')

if (!Number.isFinite(intervalMinutes) || intervalMinutes < 1) {
  console.error('[art:monitor-loop] invalid --interval value')
  process.exit(1)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function appendLog(message) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true })
  fs.appendFileSync(logPath, `${new Date().toISOString()} ${message}\n`, 'utf8')
}

function writeHeartbeat(status, details = {}) {
  fs.mkdirSync(path.dirname(heartbeatPath), { recursive: true })
  fs.writeFileSync(heartbeatPath, `${JSON.stringify({
    updatedAt: new Date().toISOString(),
    status,
    intervalMinutes,
    category,
    ...details
  }, null, 2)}\n`, 'utf8')
}

async function loop() {
  appendLog(`[start] category=${category} interval=${intervalMinutes}m`)

  while (true) {
    const startedAt = Date.now()
    writeHeartbeat('running')

    const result = spawnSync(process.execPath, [
      path.join(paths.projectRoot, 'scripts', 'art-pipeline', 'monitor-art-pipeline.js'),
      `--category=${category}`
    ], {
      cwd: paths.projectRoot,
      encoding: 'utf8'
    })

    const durationMs = Date.now() - startedAt
    if (result.status === 0) {
      appendLog(`[ok] durationMs=${durationMs} ${result.stdout.trim()}`)
      writeHeartbeat('idle', { lastRunOk: true, durationMs })
    } else {
      appendLog(`[error] durationMs=${durationMs} ${result.stderr.trim() || result.stdout.trim()}`)
      writeHeartbeat('idle', { lastRunOk: false, durationMs })
    }

    await sleep(intervalMinutes * 60 * 1000)
  }
}

loop().catch(error => {
  appendLog(`[fatal] ${error.stack || error.message}`)
  writeHeartbeat('stopped', { lastRunOk: false, error: error.message })
  process.exitCode = 1
})
