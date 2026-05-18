const fs = require('node:fs')
const { paths, readJson } = require('./shared')

if (!fs.existsSync(paths.monitorSessionPath)) {
  console.log('[art:session-status] no monitor session report found')
  process.exit(0)
}

const session = readJson(paths.monitorSessionPath)
console.log(JSON.stringify(session, null, 2))
