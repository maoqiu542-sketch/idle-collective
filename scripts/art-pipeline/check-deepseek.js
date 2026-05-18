const path = require('node:path')
const { writeJson, paths } = require('./shared')
const { runDeepSeekHealthCheck, getDeepSeekConfig } = require('./deepseek-client')

async function main() {
  const result = await runDeepSeekHealthCheck()
  const outputPath = path.join(paths.reportsDir, 'deepseek-status.json')

  writeJson(outputPath, {
    checkedAt: new Date().toISOString(),
    provider: 'deepseek',
    model: getDeepSeekConfig().model,
    ...result
  })

  if (!result.ok) {
    console.error('[art:deepseek-check] unavailable')
    console.error(result.error)
    process.exitCode = 1
    return
  }

  console.log(`[art:deepseek-check] connected using ${result.model}`)
  console.log(`[art:deepseek-check] wrote ${path.relative(paths.projectRoot, outputPath)}`)
}

main().catch(error => {
  console.error('[art:deepseek-check] failed', error)
  process.exitCode = 1
})
