const {
  loadSpecs,
  paths,
  readJson,
  writeJson
} = require('./shared')

function loadDecisionLines() {
  try {
    const raw = require('node:fs').readFileSync(paths.reviewDecisionsPath, 'utf8')
    return raw
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => JSON.parse(line))
  } catch {
    return []
  }
}

function emptyCategoryFeedback() {
  return {
    observed_failures: {},
    enforced_additions: {
      must_include: [],
      must_avoid: [],
      acceptance_checks: [],
      notes: []
    }
  }
}

function unique(items) {
  return [...new Set(items.filter(Boolean))]
}

function additionsForTag(category, tag) {
  const base = {
    must_include: [],
    must_avoid: [],
    acceptance_checks: [],
    notes: []
  }

  switch (tag) {
    case 'terrain_not_natural':
      if (category === 'terrain') {
        return {
          must_include: ['continuous natural ground material', 'no isolated scene subject'],
          must_avoid: ['board-game floor look', 'small scenic island', 'cutaway terrain illustration'],
          acceptance_checks: ['must read as terrain material before decoration'],
          notes: ['Repeated failures showed terrain drifting into scene illustration instead of ground texture.']
        }
      }
      return base
    case 'subject_touching_edge':
      return {
        must_include: ['safe margin around the main subject'],
        must_avoid: ['cropped subject touching frame edge'],
        acceptance_checks: ['main subject must fit inside the export frame'],
        notes: ['Subjects repeatedly touched the export edge and became hard to read.']
      }
    case 'low_readability_32px':
      return {
        must_include: ['large readable primary shapes'],
        must_avoid: ['micro details that disappear at 32px'],
        acceptance_checks: ['asset remains recognizable at 32px preview'],
        notes: ['Small-size readability failed repeatedly and is now an enforced rule.']
      }
    case 'palette_drift':
      return {
        must_include: ['stay inside approved palette family'],
        must_avoid: ['off-palette accents'],
        acceptance_checks: ['overall color family must match style profile'],
        notes: ['Color drift appeared repeatedly and now tightens palette guidance.']
      }
    case 'weak_silhouette':
      return {
        must_include: ['clear outer silhouette'],
        must_avoid: ['mushy outline'],
        acceptance_checks: ['shape must remain readable when reduced'],
        notes: ['Silhouette clarity failed repeatedly.']
      }
    case 'portrait_crop_or_scale':
      return {
        must_include: ['stable face crop', 'clear face size in frame'],
        must_avoid: ['tiny face', 'off-center bust crop'],
        acceptance_checks: ['face must remain legible in portrait UI sizes'],
        notes: ['Portrait crop and scale failed repeatedly.']
      }
    case 'duplicate_candidate':
      return {
        must_include: ['more local variation between candidates'],
        must_avoid: ['near-identical candidate structure'],
        acceptance_checks: ['candidate must add useful variation within category'],
        notes: ['Too many near-duplicate candidates were produced.']
      }
    default:
      return base
  }
}

function mergeFeedback(current, additions) {
  return {
    observed_failures: current.observed_failures,
    enforced_additions: {
      must_include: unique([...(current.enforced_additions?.must_include || []), ...(additions.must_include || [])]),
      must_avoid: unique([...(current.enforced_additions?.must_avoid || []), ...(additions.must_avoid || [])]),
      acceptance_checks: unique([...(current.enforced_additions?.acceptance_checks || []), ...(additions.acceptance_checks || [])]),
      notes: unique([...(current.enforced_additions?.notes || []), ...(additions.notes || [])])
    }
  }
}

function main() {
  const { generationStandards, reviewFeedback } = loadSpecs()
  const decisions = loadDecisionLines().slice(-400)
  const nextFeedback = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    categories: {}
  }

  for (const category of Object.keys(generationStandards.categories || {})) {
    nextFeedback.categories[category] = emptyCategoryFeedback()
  }

  for (const decision of decisions) {
    if (decision.decision !== 'reject' || !decision.category) {
      continue
    }

    const categoryEntry = nextFeedback.categories[decision.category] || emptyCategoryFeedback()
    const tags = Array.isArray(decision.rejection_tags) ? decision.rejection_tags : []
    for (const tag of tags) {
      categoryEntry.observed_failures[tag] = (categoryEntry.observed_failures[tag] || 0) + 1
    }
    nextFeedback.categories[decision.category] = categoryEntry
  }

  for (const [category, categoryEntry] of Object.entries(nextFeedback.categories)) {
    let merged = mergeFeedback(
      reviewFeedback?.categories?.[category] || emptyCategoryFeedback(),
      { must_include: [], must_avoid: [], acceptance_checks: [], notes: [] }
    )
    merged.observed_failures = categoryEntry.observed_failures

    for (const [tag, count] of Object.entries(categoryEntry.observed_failures || {})) {
      if (count < 2) {
        continue
      }
      merged = mergeFeedback(merged, additionsForTag(category, tag))
    }

    nextFeedback.categories[category] = merged
  }

  writeJson(paths.reviewFeedbackPath, nextFeedback)
  console.log('[art:review-feedback] updated review-feedback.json')
}

main()
