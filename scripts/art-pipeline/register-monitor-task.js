const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { parseArgs, paths } = require('./shared')

const args = parseArgs(process.argv.slice(2))
const taskName = typeof args.name === 'string' ? args.name : 'IdleCollectiveArtMonitor'
const category = typeof args.category === 'string' ? args.category : 'terrain'
const intervalMinutes = typeof args.interval === 'string' ? Number(args.interval) : 10

if (!Number.isFinite(intervalMinutes) || intervalMinutes < 1) {
  console.error('[art:monitor-schedule] invalid --interval value')
  process.exit(1)
}

const nodeExe = process.execPath
const monitorScript = path.join(paths.projectRoot, 'scripts', 'art-pipeline', 'monitor-art-pipeline.js')
const command = `"${nodeExe}" "${monitorScript}" --category=${category}`

const result = spawnSync('schtasks.exe', [
  '/Create',
  '/F',
  '/SC', 'MINUTE',
  '/MO', String(intervalMinutes),
  '/TN', taskName,
  '/TR', command
], {
  cwd: paths.projectRoot,
  encoding: 'utf8'
})

if (result.status !== 0) {
  console.error(result.stdout || '')
  console.error(result.stderr || '')
  process.exit(result.status ?? 1)
}

console.log(`[art:monitor-schedule] registered ${taskName} every ${intervalMinutes} minutes`)
console.log(`[art:monitor-schedule] command: ${command}`)
