const fs = require('node:fs')
const path = require('node:path')
const { paths } = require('./shared')

const pidPath = path.join(paths.reportsDir, 'monitor-loop.pid')

if (!fs.existsSync(pidPath)) {
  console.log('[art:monitor-stop] no pid file found')
  process.exit(0)
}

const pid = Number(fs.readFileSync(pidPath, 'utf8').trim())
if (!Number.isFinite(pid)) {
  fs.unlinkSync(pidPath)
  console.log('[art:monitor-stop] removed invalid pid file')
  process.exit(0)
}

try {
  process.kill(pid)
  console.log(`[art:monitor-stop] stopped pid=${pid}`)
} catch (error) {
  console.log(`[art:monitor-stop] process not running pid=${pid}: ${error.message}`)
}

fs.unlinkSync(pidPath)
