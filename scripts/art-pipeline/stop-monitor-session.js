const fs = require('node:fs')
const path = require('node:path')
const { paths } = require('./shared')

const pidPath = path.join(paths.reportsDir, 'monitor-session-loop.pid')

if (!fs.existsSync(pidPath)) {
  console.log('[art:session-stop] no active session monitor pid file')
  process.exit(0)
}

const pid = Number(fs.readFileSync(pidPath, 'utf8').trim())
if (!Number.isFinite(pid)) {
  fs.unlinkSync(pidPath)
  console.log('[art:session-stop] pid file was invalid and has been removed')
  process.exit(0)
}

try {
  process.kill(pid)
  console.log(`[art:session-stop] stopped pid=${pid}`)
} catch (error) {
  console.log(`[art:session-stop] process ${pid} was not running`)
}

fs.unlinkSync(pidPath)
