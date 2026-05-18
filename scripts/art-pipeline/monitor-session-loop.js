const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { loadPipelineConfig, paths, parseArgs, readJson } = require('./shared')

const config = loadPipelineConfig()
const args = parseArgs(process.argv.slice(2))
const intervalMinutes = typeof args.interval === 'string'
  ? Number(args.interval)
  : config.monitoring.intervalMinutes

const logPath = path.join(paths.reportsDir, 'monitor-session-loop.log')
const heartbeatPath = path.join(paths.reportsDir, 'monitor-session-heartbeat.json')

if (!Number.isFinite(intervalMinutes) || intervalMinutes < 1) {
  console.error('[art:session-loop] invalid --interval value')
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
    ...details
  }, null, 2)}\n`, 'utf8')
}

async function loop() {
  appendLog(`[start] interval=${intervalMinutes}m`)

  while (true) {
    const startedAt = Date.now()
    writeHeartbeat('running')

    const result = spawnSync(process.execPath, [
      path.join(paths.projectRoot, 'scripts', 'art-pipeline', 'monitor-session-tick.js')
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

    if (fs.existsSync(paths.monitorSessionPath)) {
      const session = readJson(paths.monitorSessionPath)
      if (session.completed) {
        appendLog('[complete] session requirements satisfied, stopping loop')
        writeHeartbeat('completed', {
          lastRunOk: result.status === 0,
          durationMs,
          completedAt: new Date().toISOString()
        })
        break
      }
    }

    const nextRunAt = new Date(Date.now() + intervalMinutes * 60 * 1000)
    appendLog(`[sleep] nextRunAt=${nextRunAt.toISOString()}`)
    writeHeartbeat('sleeping_until_next_tick', {
      lastRunOk: result.status === 0,
      durationMs,
      nextRunAt: nextRunAt.toISOString()
    })
    await sleep(intervalMinutes * 60 * 1000)
  }
}

loop().catch(error => {
  appendLog(`[fatal] ${error.stack || error.message}`)
  writeHeartbeat('stopped', { lastRunOk: false, error: error.message })
  process.exitCode = 1
})
