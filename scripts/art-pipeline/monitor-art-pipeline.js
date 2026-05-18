const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const {
  loadSpecs,
  parseArgs,
  paths,
  readJson,
  readAssetMeta,
  writeJson
} = require('./shared')

const args = parseArgs(process.argv.slice(2))
const comfyUiBaseUrl = typeof args.url === 'string' ? args.url : 'http://127.0.0.1:8188'
const requestedCategory = typeof args.category === 'string' ? args.category : 'terrain'
const skipDashboard = Boolean(args.skipDashboard)

function runNodeScript(scriptPath, scriptArgs = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...scriptArgs], {
    cwd: paths.projectRoot,
    encoding: 'utf8'
  })

  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  }
}

async function fetchQueueStatus() {
  const response = await fetch(`${comfyUiBaseUrl}/queue`)
  if (!response.ok) {
    throw new Error(`ComfyUI queue request failed with ${response.status}`)
  }

  const payload = await response.json()
  const running = Array.isArray(payload.queue_running) ? payload.queue_running : []
  const pending = Array.isArray(payload.queue_pending) ? payload.queue_pending : []

  return {
    runningCount: running.length,
    pendingCount: pending.length,
    runningAsset: running[0]?.[2]?.['7']?.inputs?.filename_prefix ?? null,
    pendingAssets: pending
      .map(entry => entry?.[2]?.['7']?.inputs?.filename_prefix ?? null)
      .filter(Boolean)
  }
}

function countPendingReviewAssets(category) {
  const { catalog } = loadSpecs()
  const pendingAssets = []

  for (const asset of catalog.assets) {
    if (category && asset.category !== category) {
      continue
    }

    const meta = readAssetMeta(asset)
    if (meta?.review_queue?.status === 'pending_review') {
      pendingAssets.push({
        asset_id: asset.asset_id,
        candidate_variant: meta.review_queue.candidate_variant ?? null,
        updated_at: meta.review_queue.updated_at ?? null
      })
    }
  }

  return pendingAssets
}

function buildNextAction(queueStatus, pendingReviewAssets, importSummary) {
  if (!queueStatus.ok) {
    return 'check_comfyui'
  }

  if (queueStatus.pendingCount > 0 || queueStatus.runningCount > 0) {
    return 'continue_monitoring'
  }

  if (pendingReviewAssets.length > 0) {
    return importSummary.importedCount > 0 ? 'manual_review_ready' : 'manual_review_pending'
  }

  return 'prompt_adjustment_needed'
}

function parseImportedCount(stdout) {
  const match = stdout.match(/\[art:import\] imported (\d+) generated files/i)
  return match ? Number(match[1]) : 0
}

function readExistingHistory(filePath) {
  if (!fs.existsSync(filePath)) {
    return []
  }

  try {
    return readJson(filePath)
  } catch {
    return []
  }
}

async function main() {
  const startedAt = new Date()
  const queueStatus = {
    ok: true,
    runningCount: 0,
    pendingCount: 0,
    runningAsset: null,
    pendingAssets: []
  }

  try {
    Object.assign(queueStatus, await fetchQueueStatus())
  } catch (error) {
    queueStatus.ok = false
    queueStatus.error = error.message
  }

  const importSummary = runNodeScript('scripts/art-pipeline/import-comfyui-output.js', [`--category=${requestedCategory}`])
  const importedCount = parseImportedCount(importSummary.stdout)

  const queueRefresh = runNodeScript('scripts/art-pipeline/list-review-queue.js')
  const dashboardRefresh = skipDashboard
    ? { ok: true, status: 0, stdout: '', stderr: '' }
    : runNodeScript('scripts/art-pipeline/build-review-dashboard.js')

  const pendingReviewAssets = countPendingReviewAssets(requestedCategory)
  const nextAction = buildNextAction(queueStatus, pendingReviewAssets, { importedCount })

  const report = {
    generatedAt: new Date().toISOString(),
    category: requestedCategory,
    comfyui: queueStatus,
    imports: {
      ok: importSummary.ok,
      importedCount,
      stdout: importSummary.stdout.trim(),
      stderr: importSummary.stderr.trim()
    },
    reviewQueue: {
      ok: queueRefresh.ok,
      pendingCount: pendingReviewAssets.length,
      pendingAssets: pendingReviewAssets
    },
    dashboard: {
      ok: dashboardRefresh.ok,
      updated: !skipDashboard
    },
    nextAction,
    durationMs: Date.now() - startedAt.getTime()
  }

  const statusPath = path.join(paths.reportsDir, 'monitor-status.json')
  const historyPath = path.join(paths.reportsDir, 'monitor-history.json')
  const history = readExistingHistory(historyPath)
  history.push(report)

  const trimmedHistory = history.slice(-72)
  writeJson(statusPath, report)
  writeJson(historyPath, trimmedHistory)

  console.log(`[art:monitor] category=${requestedCategory} queue=${queueStatus.runningCount}/${queueStatus.pendingCount} imported=${importedCount} pendingReview=${pendingReviewAssets.length} next=${nextAction}`)
  console.log(`[art:monitor] wrote ${path.relative(paths.projectRoot, statusPath)}`)
}

main().catch(error => {
  console.error('[art:monitor] failed', error)
  process.exitCode = 1
})
