const fs = require('node:fs')
const path = require('node:path')
const { spawn, spawnSync } = require('node:child_process')
const { paths } = require('./shared')

const dashboardPath = path.join(paths.reportsDir, 'review-dashboard.html')
const apiStatusUrl = 'http://127.0.0.1:4318/status'

function runBuildStep(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: paths.projectRoot,
    stdio: 'inherit'
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function openFile(targetPath) {
  if (process.platform === 'win32') {
    spawnSync('cmd', ['/c', 'start', '', targetPath], {
      cwd: paths.projectRoot,
      stdio: 'ignore'
    })
    return
  }

  if (process.platform === 'darwin') {
    spawnSync('open', [targetPath], {
      cwd: paths.projectRoot,
      stdio: 'ignore'
    })
    return
  }

  spawnSync('xdg-open', [targetPath], {
    cwd: paths.projectRoot,
    stdio: 'ignore'
  })
}

function ensureReviewApi() {
  try {
    const probe = spawnSync('powershell', [
      '-NoProfile',
      '-Command',
      `try { (Invoke-WebRequest ${JSON.stringify(apiStatusUrl)} -UseBasicParsing -TimeoutSec 3).Content | Out-Null; exit 0 } catch { exit 1 }`
    ], {
      cwd: paths.projectRoot,
      timeout: 4000,
      encoding: 'utf8'
    })

    if (probe.status === 0) {
      return
    }
  } catch {
    // fall through to start server
  }

  const child = spawn(process.execPath, ['scripts/art-pipeline/serve-review-api.js'], {
    cwd: paths.projectRoot,
    detached: true,
    stdio: 'ignore'
  })
  child.unref()

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const probe = spawnSync('powershell', [
      '-NoProfile',
      '-Command',
      `try { (Invoke-WebRequest ${JSON.stringify(apiStatusUrl)} -UseBasicParsing -TimeoutSec 3).Content | Out-Null; exit 0 } catch { Start-Sleep -Milliseconds 300; exit 1 }`
    ], {
      cwd: paths.projectRoot,
      timeout: 5000
    })

    if (probe.status === 0) {
      return
    }
  }
}

ensureReviewApi()
runBuildStep('scripts/art-pipeline/list-review-queue.js')
runBuildStep('scripts/art-pipeline/build-review-dashboard.js')

if (!fs.existsSync(dashboardPath)) {
  console.error('[art:review-open] review dashboard was not generated')
  process.exit(1)
}

openFile(dashboardPath)
console.log(`[art:review-open] opened ${path.relative(paths.projectRoot, dashboardPath)}`)
