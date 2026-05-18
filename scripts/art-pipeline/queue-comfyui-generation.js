const path = require('node:path')
const {
  ensureDir,
  loadSpecs,
  loadPipelineConfig,
  parseArgs,
  paths,
  readAssetMeta,
  writeAssetMeta,
  writeJson
} = require('./shared')

const args = parseArgs(process.argv.slice(2))
const shouldExecute = Boolean(args.execute)
const requestedCategory = typeof args.category === 'string' ? args.category : null
const requestedAssetId = typeof args.asset === 'string' ? args.asset : null
const limit = typeof args.limit === 'string' ? Number(args.limit) : Number.POSITIVE_INFINITY
const requestedCandidates = typeof args.candidates === 'string' ? Number(args.candidates) : null
const startIndex = typeof args.startIndex === 'string' ? Number(args.startIndex) : 1
const requestedStrategy = typeof args.strategy === 'string' ? args.strategy : 'comfyui_generated'
const promptAppend = typeof args.promptAppend === 'string' ? args.promptAppend : ''
const negativeAppend = typeof args.negativeAppend === 'string' ? args.negativeAppend : ''
const strategyNote = typeof args.note === 'string' ? args.note : ''
const configuredBaseUrl = typeof args.url === 'string' ? args.url : loadPipelineConfig().comfyui.baseUrl
const comfyUiUrl = `${configuredBaseUrl.replace(/\/$/, '')}/prompt`

const { catalog, recipeMap, styleMap, generationStandards, reviewFeedback } = loadSpecs()
ensureDir(paths.requestsDir)

function categoryGenerationStandard(asset) {
  const common = {
    output_goal: 'single shippable game asset candidate',
    general_rules: [
      'respect the assigned palette and style profile',
      'avoid decorative borders and text',
      'optimize for in-game readability at target size',
      'keep composition simple enough for downstream review'
    ]
  }

  const categoryStandard = generationStandards?.categories?.[asset.category]
  if (!categoryStandard) {
    return common
  }

  const feedbackAdditions = reviewFeedback?.categories?.[asset.category]?.enforced_additions ?? {}

  return {
    ...common,
    composition: categoryStandard.composition ?? common.composition ?? 'single game asset composition',
    must_include: [
      ...(Array.isArray(categoryStandard.must_include) ? categoryStandard.must_include : []),
      ...(Array.isArray(feedbackAdditions.must_include) ? feedbackAdditions.must_include : [])
    ],
    must_avoid: [
      ...(Array.isArray(categoryStandard.must_avoid) ? categoryStandard.must_avoid : []),
      ...(Array.isArray(feedbackAdditions.must_avoid) ? feedbackAdditions.must_avoid : [])
    ],
    acceptance_checks: [
      ...(Array.isArray(categoryStandard.acceptance_checks) ? categoryStandard.acceptance_checks : []),
      ...(Array.isArray(feedbackAdditions.acceptance_checks) ? feedbackAdditions.acceptance_checks : [])
    ],
    feedback_notes: Array.isArray(feedbackAdditions.notes) ? feedbackAdditions.notes : []
  }
}

function buildStructuredPrompt(asset, recipe, styleProfile, promptAppend, negativeAppend) {
  const standard = categoryGenerationStandard(asset)
  const positiveSections = [
    `asset goal: ${asset.display_name}`,
    `category: ${asset.category}`,
    `subject: ${asset.prompt_template}`,
    `composition: ${standard.composition}`,
    `must include: ${standard.must_include.join(', ')}`,
    `general rules: ${standard.general_rules.join(', ')}`,
    standard.feedback_notes?.length ? `feedback adjustments: ${standard.feedback_notes.join(', ')}` : '',
    promptAppend
  ].filter(Boolean)

  const negativeSections = [
    asset.negative_prompt,
    `must avoid: ${standard.must_avoid.join(', ')}`,
    negativeAppend
  ].filter(Boolean)

  return {
    prompt: positiveSections.join('. '),
    negativePrompt: negativeSections.join(', ')
  }
}

function workflowTemplatePath(recipe) {
  return path.join(paths.workflowsDir, `${recipe.workflow}.json`)
}

function buildComfyPrompt(payload) {
  return {
    prompt: {
      '1': {
        class_type: 'CheckpointLoaderSimple',
        inputs: {
          ckpt_name: payload.checkpoint
        }
      },
      '2': {
        class_type: 'CLIPTextEncode',
        inputs: {
          text: payload.prompt,
          clip: ['1', 1]
        }
      },
      '3': {
        class_type: 'CLIPTextEncode',
        inputs: {
          text: payload.negative_prompt,
          clip: ['1', 1]
        }
      },
      '4': {
        class_type: 'EmptyLatentImage',
        inputs: {
          width: payload.width,
          height: payload.height,
          batch_size: 1
        }
      },
      '5': {
        class_type: 'KSampler',
        inputs: {
          seed: payload.seed,
          steps: payload.steps,
          cfg: payload.cfg,
          sampler_name: payload.sampler,
          scheduler: payload.scheduler,
          denoise: 1,
          model: ['1', 0],
          positive: ['2', 0],
          negative: ['3', 0],
          latent_image: ['4', 0]
        }
      },
      '6': {
        class_type: 'VAEDecode',
        inputs: {
          samples: ['5', 0],
          vae: ['1', 2]
        }
      },
      '7': {
        class_type: 'SaveImage',
        inputs: {
          images: ['6', 0],
          filename_prefix: payload.filename_prefix
        }
      }
    }
  }
}

async function queuePayload(requestPath, requestPayload) {
  if (!shouldExecute) {
    return { queued: false }
  }

  const response = await fetch(comfyUiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestPayload)
  })

  const responseBody = await response.json()
  const responsePath = requestPath.replace('__request.json', '__response.json')
  writeJson(responsePath, responseBody)

  return {
    queued: response.ok,
    status: response.status,
    responsePath
  }
}

async function main() {
  let emitted = 0

  for (const asset of catalog.assets) {
    if (requestedAssetId && asset.asset_id !== requestedAssetId) {
      continue
    }
    if (requestedCategory && asset.category !== requestedCategory) {
      continue
    }
    if (emitted >= limit) {
      break
    }

    const recipe = recipeMap.get(asset.recipe_id)
    const styleProfile = styleMap.get(asset.style_profile)
    const standard = categoryGenerationStandard(asset)

    const candidateCount = Number.isFinite(requestedCandidates) && requestedCandidates > 0
      ? Math.min(recipe.candidate_count, requestedCandidates)
      : recipe.candidate_count

    for (let index = 0; index < candidateCount; index += 1) {
      if (emitted >= limit) {
        break
      }

      const variantIndex = startIndex + index
      const seed = asset.seed_policy.suggested_seed + variantIndex - 1
      const variant = `cand${String(variantIndex).padStart(2, '0')}`
      const promptBundle = buildStructuredPrompt(asset, recipe, styleProfile, promptAppend, negativeAppend)
      const requestPayload = buildComfyPrompt({
        checkpoint: styleProfile.model.checkpoint,
        prompt: promptBundle.prompt,
        negative_prompt: promptBundle.negativePrompt,
        width: recipe.source_resolution.width,
        height: recipe.source_resolution.height,
        steps: styleProfile.model.steps,
        cfg: styleProfile.model.cfg,
        sampler: styleProfile.model.sampler,
        scheduler: styleProfile.model.scheduler,
        seed,
        filename_prefix: `${asset.asset_id}__${variant}__${asset.version}`
      })

      const requestBody = {
        asset_id: asset.asset_id,
        category: asset.category,
        variant,
        workflow: recipe.workflow,
        workflow_template_path: workflowTemplatePath(recipe),
        seed,
        prompt_template: asset.prompt_template,
        prompt: promptBundle.prompt,
        negative_prompt: promptBundle.negativePrompt,
        strategy: requestedStrategy,
        note: strategyNote,
        generation_brief: {
          asset_id: asset.asset_id,
          display_name: asset.display_name,
          category: asset.category,
          target_key: asset.target_key,
          workflow: recipe.workflow,
          source_resolution: recipe.source_resolution,
          export_presets: recipe.export_presets,
          style_profile: {
            id: styleProfile.id,
            palette: styleProfile.palette,
            checkpoint: styleProfile.model.checkpoint,
            sampler: styleProfile.model.sampler,
            scheduler: styleProfile.model.scheduler
          },
          standard,
          acceptance_summary: standard.acceptance_checks,
          feedback_notes: standard.feedback_notes ?? []
        },
        request: requestPayload
      }

      const requestPath = path.join(paths.requestsDir, `${asset.asset_id}__${variant}__request.json`)
      writeJson(requestPath, requestBody)
      const queueResult = await queuePayload(requestPath, requestPayload)
      const now = new Date().toISOString()
      const existingMeta = readAssetMeta(asset)
      const existingHistory = [...(existingMeta?.attempt_history ?? [])]
      const nextAttemptNumber = existingHistory.length + 1

      writeAssetMeta(asset, {
        ...existingMeta,
        attempt_count: nextAttemptNumber,
        attempt_history: [
          ...existingHistory,
          {
            attempt: nextAttemptNumber,
            variant,
            strategy: requestedStrategy,
            queued_at: now,
            imported_at: null,
            source_file: requestPath,
            imported_file: null,
            outcome: queueResult.queued ? 'queued' : 'prepared',
            note: strategyNote
          }
        ],
        pipeline_state: queueResult.queued ? 'queued' : existingMeta?.pipeline_state ?? 'idle',
        generated_at: now
      })

      console.log(
        `[art:queue] ${asset.asset_id} ${variant} seed=${seed} ${queueResult.queued ? 'queued' : 'prepared'}`
      )
      emitted += 1
    }
  }
}

main().catch(error => {
  console.error('[art:queue] failed', error)
  process.exitCode = 1
})
