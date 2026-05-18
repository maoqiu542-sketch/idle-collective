const fs = require('node:fs')
const path = require('node:path')

const projectRoot = path.resolve(__dirname, '..', '..')

const paths = {
  projectRoot,
  specsDir: path.join(projectRoot, 'art-pipeline', 'specs'),
  workflowsDir: path.join(projectRoot, 'art-pipeline', 'workflows'),
  reviewDir: path.join(projectRoot, 'art-pipeline', 'review'),
  requestsDir: path.join(projectRoot, 'art-pipeline', 'review', 'requests'),
  reportsDir: path.join(projectRoot, 'art-pipeline', 'review', 'reports'),
  previewsDir: path.join(projectRoot, 'art-pipeline', 'review', 'reports', 'previews'),
  artSourceDir: path.join(projectRoot, 'art-source', 'generated'),
  publicAssetsDir: path.join(projectRoot, 'public', 'textures'),
  stagedAssetsDir: path.join(projectRoot, 'public', 'textures'),
  manifestsDir: path.join(projectRoot, 'public', 'textures', 'manifests'),
  liveManifestPath: path.join(projectRoot, 'public', 'textures', 'manifests', 'game-assets-manifest.json'),
  stagedManifestPath: path.join(projectRoot, 'public', 'textures', 'manifests', 'staged-game-assets-manifest.json'),
  pipelineConfigPath: path.join(projectRoot, 'art-pipeline', 'specs', 'pipeline-config.json'),
  generationStandardsPath: path.join(projectRoot, 'art-pipeline', 'specs', 'generation-standards.json'),
  reviewRubricsPath: path.join(projectRoot, 'art-pipeline', 'specs', 'review-rubrics.json'),
  reviewFeedbackPath: path.join(projectRoot, 'art-pipeline', 'specs', 'review-feedback.json'),
  monitorSessionPath: path.join(projectRoot, 'art-pipeline', 'review', 'reports', 'monitor-session.json'),
  reviewDecisionsPath: path.join(projectRoot, 'art-pipeline', 'review', 'reports', 'review-decisions.jsonl')
}

const DEFAULT_PIPELINE_CONFIG = {
  version: '1.0.0',
  comfyui: {
    baseUrl: 'http://127.0.0.1:8188',
    outputDir: 'D:\\teae\\openclaw\\ComfyUI\\output'
  },
  monitoring: {
    intervalMinutes: 10,
    minimumDurationHours: 8,
    queueBatchSize: 4,
    maxPendingReviews: 12,
    maxAttemptsPerAsset: 12,
    historyLimit: 144
  },
  review: {
    reviewerVersion: 'heuristic_v2',
    scoreThreshold: 85,
    criticalScoreThreshold: 80,
    semanticReviewRequiredForFinal: true,
    semanticReviewMode: 'deepseek_text_assist',
    semanticReviewProvider: 'deepseek',
    semanticReviewModel: 'deepseek-chat'
  },
  generation: {
    localFallbackEnabled: true,
    localFallbackStartAttempt: 7
  },
  promotion: {
    liveMode: 'manual_only'
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, payload) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

function appendJsonLine(filePath, payload) {
  ensureDir(path.dirname(filePath))
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, 'utf8')
}

function deepMerge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) {
    return override === undefined ? base : override
  }

  if (!base || typeof base !== 'object') {
    return override === undefined ? base : override
  }

  const merged = { ...base }
  for (const [key, value] of Object.entries(override || {})) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      merged[key] = deepMerge(base[key], value)
    } else {
      merged[key] = value
    }
  }
  return merged
}

function loadPipelineConfig() {
  if (!fs.existsSync(paths.pipelineConfigPath)) {
    return DEFAULT_PIPELINE_CONFIG
  }

  try {
    return deepMerge(DEFAULT_PIPELINE_CONFIG, readJson(paths.pipelineConfigPath))
  } catch {
    return DEFAULT_PIPELINE_CONFIG
  }
}

function loadSpecs() {
  const styleProfiles = readJson(path.join(paths.specsDir, 'style-profiles.json'))
  const recipes = readJson(path.join(paths.specsDir, 'asset-recipes.json'))
  const catalog = readJson(path.join(paths.specsDir, 'asset-catalog.json'))
  const runtimeMapping = readJson(path.join(paths.specsDir, 'runtime-mapping.json'))
  const generationStandards = fs.existsSync(paths.generationStandardsPath)
    ? readJson(paths.generationStandardsPath)
    : { version: '1.0.0', categories: {} }
  const reviewRubrics = fs.existsSync(paths.reviewRubricsPath)
    ? readJson(paths.reviewRubricsPath)
    : { version: '1.0.0', categories: {} }
  const reviewFeedback = fs.existsSync(paths.reviewFeedbackPath)
    ? readJson(paths.reviewFeedbackPath)
    : { version: '1.0.0', categories: {} }
  const pipelineConfig = loadPipelineConfig()

  return {
    styleProfiles,
    recipes,
    catalog,
    runtimeMapping,
    generationStandards,
    reviewRubrics,
    reviewFeedback,
    pipelineConfig,
    styleMap: new Map(styleProfiles.profiles.map(profile => [profile.id, profile])),
    recipeMap: new Map(recipes.recipes.map(recipe => [recipe.id, recipe]))
  }
}

function assetSourceDir(asset) {
  return path.join(paths.artSourceDir, asset.category, asset.asset_id)
}

function assetOutputDir(asset, scope = 'live') {
  const root = scope === 'staged' ? paths.stagedAssetsDir : paths.publicAssetsDir
  return path.join(root, asset.category, asset.asset_id)
}

function assetMetaPath(asset) {
  return path.join(assetSourceDir(asset), `${asset.asset_id}__meta.json`)
}

function sourceFilePaths(asset) {
  const seed = asset.seed_policy?.suggested_seed ?? 0
  const baseDir = assetSourceDir(asset)

  return {
    sourceSvg: path.join(baseDir, `${asset.asset_id}__src__${asset.version}__seed${seed}.svg`),
    candidateSvg: path.join(baseDir, `${asset.asset_id}__cand01__${asset.version}.svg`)
  }
}

function relativePublicPath(absolutePath) {
  return `/${path.relative(path.join(projectRoot, 'public'), absolutePath).replace(/\\/g, '/')}`
}

function parseArgs(argv) {
  const parsed = {}

  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [rawKey, rawValue] = arg.slice(2).split('=')
    parsed[rawKey] = rawValue === undefined ? true : rawValue
  }

  return parsed
}

function getSeededSourcePath(asset) {
  const directory = assetSourceDir(asset)
  if (!fs.existsSync(directory)) {
    return null
  }

  const seed = asset.seed_policy?.suggested_seed ?? 0
  const supportedExtensions = ['.png', '.svg', '.webp', '.jpg', '.jpeg']
  const baseNames = [
    `${asset.asset_id}__src__${asset.version}__seed${seed}`,
    `${asset.asset_id}__src__${asset.version}`
  ]

  for (const baseName of baseNames) {
    for (const extension of supportedExtensions) {
      const candidatePath = path.join(directory, `${baseName}${extension}`)
      if (fs.existsSync(candidatePath)) {
        return candidatePath
      }
    }
  }

  return null
}

function findVariantPath(asset, variant) {
  const directory = assetSourceDir(asset)
  if (!fs.existsSync(directory)) {
    return null
  }

  const supportedExtensions = ['.png', '.svg', '.webp', '.jpg', '.jpeg']
  const baseName = `${asset.asset_id}__${variant}__${asset.version}`

  for (const extension of supportedExtensions) {
    const candidatePath = path.join(directory, `${baseName}${extension}`)
    if (fs.existsSync(candidatePath)) {
      return candidatePath
    }
  }

  return null
}

function findAllVariantPaths(asset) {
  const directory = assetSourceDir(asset)
  if (!fs.existsSync(directory)) {
    return []
  }

  const matcher = new RegExp(`^${asset.asset_id}__(cand\\d+|procedural|study|local_[a-z0-9_]+)__${asset.version}\\.(png|svg|webp|jpg|jpeg)$`, 'i')
  return fs.readdirSync(directory)
    .filter(fileName => matcher.test(fileName))
    .map(fileName => {
      const match = fileName.match(/__(cand\d+|procedural|study|local_[a-z0-9_]+)__/)
      return {
        variant: match ? match[1] : null,
        path: path.join(directory, fileName)
      }
    })
    .filter(entry => entry.variant)
}

function normalizeSourceRecord(source) {
  if (!source) {
    return null
  }

  return {
    kind: source.kind ?? 'generated',
    variant: source.variant ?? null,
    path: source.path ?? null,
    approved_at: source.approved_at ?? new Date().toISOString(),
    note: source.note ?? ''
  }
}

function normalizeAiReview(payload) {
  const inferredMethod = payload?.review_method
    ?? (String(payload?.reviewer_version || '').startsWith('heuristic') ? 'heuristic_screen' : 'visual_semantic_review')
  const inferredSemanticChecked = payload?.semantic_checked
    ?? (inferredMethod === 'visual_semantic_review')

  if (payload?.decision === 'approve') {
    return {
      decision: 'approve',
      score_total: payload.score_total ?? null,
      score_breakdown: payload.score_breakdown ?? {},
      rejection_tags: Array.isArray(payload.rejection_tags) ? payload.rejection_tags : [],
      reviewer_version: payload.reviewer_version ?? DEFAULT_PIPELINE_CONFIG.review.reviewerVersion,
      review_method: inferredMethod,
      semantic_checked: inferredSemanticChecked,
      semantic_model: payload.semantic_model ?? null,
      score_basis: payload.score_basis ?? 'unspecified',
      semantic_assist: payload.semantic_assist ?? null,
      approved_at: payload.approved_at ?? new Date().toISOString(),
      reviewed_at: payload.reviewed_at ?? payload.approved_at ?? new Date().toISOString()
    }
  }

  if (payload?.decision === 'reject') {
    return {
      decision: 'reject',
      score_total: payload.score_total ?? null,
      score_breakdown: payload.score_breakdown ?? {},
      rejection_tags: Array.isArray(payload.rejection_tags) ? payload.rejection_tags : [],
      reviewer_version: payload.reviewer_version ?? DEFAULT_PIPELINE_CONFIG.review.reviewerVersion,
      review_method: inferredMethod,
      semantic_checked: inferredSemanticChecked,
      semantic_model: payload.semantic_model ?? null,
      score_basis: payload.score_basis ?? 'unspecified',
      semantic_assist: payload.semantic_assist ?? null,
      approved_at: null,
      reviewed_at: payload.reviewed_at ?? new Date().toISOString()
    }
  }

  return {
    decision: 'pending',
    score_total: null,
    score_breakdown: {},
    rejection_tags: [],
    reviewer_version: payload?.reviewer_version ?? DEFAULT_PIPELINE_CONFIG.review.reviewerVersion,
    review_method: inferredMethod,
    semantic_checked: inferredSemanticChecked,
    semantic_model: payload?.semantic_model ?? null,
    score_basis: payload?.score_basis ?? 'unspecified',
    semantic_assist: payload?.semantic_assist ?? null,
    approved_at: null,
    reviewed_at: payload?.reviewed_at ?? null
  }
}

function derivePipelineState(meta) {
  if (meta?.pipeline_state) {
    return meta.pipeline_state
  }

  if (meta?.final_review_status === 'final_approved') {
    return 'final_approved'
  }
  if (meta?.final_review_status === 'final_review_pending') {
    return 'final_review_pending'
  }
  if (meta?.ai_review?.decision === 'approve' && meta?.ai_review?.semantic_checked === true) {
    return 'ai_approved'
  }
  if (meta?.ai_review?.decision === 'approve') {
    return 'auto_screen_passed'
  }
  if (meta?.ai_review?.decision === 'reject') {
    return 'ai_rejected'
  }
  if (meta?.review_queue?.status === 'pending_review') {
    return 'imported'
  }
  return 'idle'
}

function normalizeReviewQueue(payload, fallbackVariant, fallbackTimestamp) {
  return {
    status: payload?.status ?? 'clean',
    candidate_variant: payload?.candidate_variant ?? fallbackVariant ?? null,
    updated_at: payload?.updated_at ?? fallbackTimestamp,
    note: payload?.note ?? ''
  }
}

function deriveFinalReviewStatus(payload) {
  if (payload?.final_review_status === 'final_approved') {
    return payload.final_review_status
  }
  if (payload?.final_review_status === 'final_review_pending' && payload?.ai_review?.semantic_checked === true) {
    return 'final_review_pending'
  }
  if (
    (payload?.final_review_status === 'final_review_pending' || payload?.final_review_status === 'semantic_review_required') &&
    payload?.ai_review?.decision === 'approve'
  ) {
    return payload?.ai_review?.semantic_checked === true ? 'final_review_pending' : 'semantic_review_required'
  }
  if (payload?.staging_source && payload?.ai_review?.semantic_checked === true) {
    return 'final_review_pending'
  }
  if (payload?.ai_review?.decision === 'approve') {
    return 'semantic_review_required'
  }
  return 'not_requested'
}

function normalizeAssetMeta(asset, payload = {}) {
  const now = payload.generated_at ?? new Date().toISOString()
  const seededPath = getSeededSourcePath(asset)
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : []
  const attemptHistory = Array.isArray(payload.attempt_history)
    ? payload.attempt_history
    : Array.isArray(payload.imported_variants)
      ? payload.imported_variants.map((entry, index) => ({
          attempt: index + 1,
          variant: entry.variant ?? null,
          strategy: entry.source_kind ?? 'unknown',
          queued_at: entry.imported_at ?? now,
          imported_at: entry.imported_at ?? now,
          source_file: entry.source_file ?? null,
          imported_file: entry.imported_file ?? null,
          outcome: 'imported',
          note: ''
        }))
      : []

  const fallbackVariant = payload.review_queue?.candidate_variant
    ?? candidates[candidates.length - 1]?.variant
    ?? payload.approved_variant
    ?? null

  const normalized = {
    asset_id: asset.asset_id,
    category: asset.category,
    version: payload.version ?? asset.version,
    status: payload.status ?? asset.status,
    approved_variant: payload.approved_variant ?? asset.approved_variant,
    source_kind: payload.source_kind ?? asset.source_kind,
    runtime_source: normalizeSourceRecord(
      payload.runtime_source ??
      (seededPath
        ? {
            kind: 'seeded',
            variant: null,
            path: seededPath,
            approved_at: now
          }
        : null)
    ),
    staging_source: normalizeSourceRecord(payload.staging_source ?? null),
    review_queue: normalizeReviewQueue(payload.review_queue, fallbackVariant, now),
    pipeline_state: derivePipelineState(payload),
    attempt_count: Number.isFinite(payload.attempt_count)
      ? payload.attempt_count
      : attemptHistory.length,
    attempt_history: attemptHistory,
    candidates,
    imported_variants: Array.isArray(payload.imported_variants) ? payload.imported_variants : [],
    ai_review: normalizeAiReview(payload.ai_review),
    final_review_status: deriveFinalReviewStatus(payload),
    source_files: payload.source_files ?? {},
    exports: payload.exports ?? {},
    staged_exports: payload.staged_exports ?? {},
    preview: payload.preview ?? null,
    staged_preview: payload.staged_preview ?? null,
    source_path: payload.source_path ?? null,
    crop_bounds: payload.crop_bounds ?? null,
    opaque_pixels: payload.opaque_pixels ?? null,
    average_color: payload.average_color ?? null,
    palette_distance: payload.palette_distance ?? null,
    generated_at: now
  }

  normalized.pipeline_state = derivePipelineState(normalized)
  return normalized
}

function readAssetMeta(asset) {
  const metaPath = assetMetaPath(asset)
  if (!fs.existsSync(metaPath)) {
    return null
  }

  return normalizeAssetMeta(asset, readJson(metaPath))
}

function writeAssetMeta(asset, payload) {
  const normalized = normalizeAssetMeta(asset, payload)
  writeJson(assetMetaPath(asset), normalized)
  return normalized
}

function findApprovedSource(asset) {
  const meta = readAssetMeta(asset)
  const runtimeSourcePath = meta?.runtime_source?.path
  if (runtimeSourcePath && fs.existsSync(runtimeSourcePath)) {
    return runtimeSourcePath
  }

  return getSeededSourcePath(asset)
}

function findStagingSource(asset) {
  const meta = readAssetMeta(asset)
  const stagedPath = meta?.staging_source?.path
  if (stagedPath && fs.existsSync(stagedPath)) {
    return stagedPath
  }
  return null
}

function latestCandidateVariant(meta) {
  if (meta?.review_queue?.candidate_variant) {
    return meta.review_queue.candidate_variant
  }
  const candidate = Array.isArray(meta?.candidates) ? meta.candidates[meta.candidates.length - 1] : null
  return candidate?.variant ?? null
}

function nextCandidateVariant(meta) {
  const attemptCount = meta?.attempt_count ?? 0
  return `cand${String(attemptCount + 1).padStart(2, '0')}`
}

function isAiApproved(meta) {
  return meta?.ai_review?.decision === 'approve'
}

function loadMonitorSession() {
  if (!fs.existsSync(paths.monitorSessionPath)) {
    return null
  }
  return readJson(paths.monitorSessionPath)
}

function writeMonitorSession(payload) {
  writeJson(paths.monitorSessionPath, payload)
}

module.exports = {
  DEFAULT_PIPELINE_CONFIG,
  paths,
  ensureDir,
  readJson,
  writeJson,
  appendJsonLine,
  deepMerge,
  loadPipelineConfig,
  loadSpecs,
  assetSourceDir,
  assetOutputDir,
  assetMetaPath,
  readAssetMeta,
  writeAssetMeta,
  sourceFilePaths,
  findApprovedSource,
  findStagingSource,
  findVariantPath,
  findAllVariantPaths,
  getSeededSourcePath,
  relativePublicPath,
  parseArgs,
  normalizeAssetMeta,
  normalizeAiReview,
  latestCandidateVariant,
  nextCandidateVariant,
  isAiApproved,
  loadMonitorSession,
  writeMonitorSession
}
