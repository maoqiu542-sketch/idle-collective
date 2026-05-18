const fs = require('node:fs')
const path = require('node:path')
const { paths, readJson } = require('./shared')

const API_BASE_URL = 'http://127.0.0.1:4318'

const queuePath = path.join(paths.reportsDir, 'review-queue.json')
const dashboardPath = path.join(paths.reportsDir, 'review-dashboard.html')

function toRelativeHref(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) {
    return null
  }

  return path.relative(paths.reportsDir, targetPath).replace(/\\/g, '/')
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildCard(entry, mode) {
  const runtimeHref = toRelativeHref(entry.runtime_source_path)
  const candidateHref = toRelativeHref(entry.candidate_path)
  const previewHref = toRelativeHref(entry.preview_path)
  const recommendationClass = `recommendation--${entry.recommendation}`
  const usesFinalReviewActions = mode === 'final' || mode === 'manual'
  const approveAction = usesFinalReviewActions ? 'final-approve' : 'approve'
  const rejectAction = usesFinalReviewActions ? 'final-reject' : 'reject'
  const approveLabel = usesFinalReviewActions ? 'Promote To Live' : 'Stage Approve'
  const rejectLabel = usesFinalReviewActions ? 'Reject Final' : 'Reject'
  const approveCommand = usesFinalReviewActions
    ? `npm run art:final-review -- --action=approve --asset=${entry.asset_id}`
    : `npm run art:review -- --action=approve --asset=${entry.asset_id} --variant=${entry.candidate_variant}`
  const rejectCommand = usesFinalReviewActions
    ? `npm run art:final-review -- --action=reject --asset=${entry.asset_id}`
    : `npm run art:review -- --action=reject --asset=${entry.asset_id} --variant=${entry.candidate_variant}`
  const subtitle = mode === 'final'
    ? 'final review pending'
    : mode === 'manual'
      ? 'manual review ready'
      : `candidate ${entry.candidate_variant}`

  return `
    <article class="card" data-asset-id="${entry.asset_id}" data-variant="${entry.candidate_variant}">
      <div class="card__header">
        <div>
          <h2>${entry.asset_id}</h2>
          <p>${entry.category} · ${mode === 'final' ? 'final review pending' : `candidate ${entry.candidate_variant}`}</p>
        </div>
        <div class="card__badges">
          <span class="badge">${entry.runtime_source_kind}</span>
          <span class="recommendation ${recommendationClass}">${entry.recommendation}</span>
        </div>
      </div>
      <div class="card__images">
        <figure>
          <figcaption>Current Runtime</figcaption>
          ${runtimeHref ? `<img src="${runtimeHref}" alt="${entry.asset_id} current runtime" />` : '<div class="empty">No runtime source</div>'}
        </figure>
        <figure>
          <figcaption>${mode === 'final' ? 'Staged Asset' : 'Candidate'}</figcaption>
          ${candidateHref ? `<img src="${candidateHref}" alt="${entry.asset_id} candidate" />` : '<div class="empty">No candidate image</div>'}
        </figure>
        <figure>
          <figcaption>${mode === 'final' ? 'Staged Preview' : 'Export Preview'}</figcaption>
          ${previewHref ? `<img src="${previewHref}" alt="${entry.asset_id} preview" />` : '<div class="empty">No preview</div>'}
        </figure>
      </div>
      <p class="card__rationale">${escapeHtml(entry.rationale)}</p>
      <p class="card__meta">Review method: ${escapeHtml(entry.review_method || 'unknown')} | Semantic checked: ${entry.semantic_checked ? 'yes' : 'no'}</p>
      <div class="card__commands">
        <div class="button-row">
          <button class="button button--approve" data-action="${approveAction}" data-asset="${entry.asset_id}" data-variant="${entry.candidate_variant}">${approveLabel}</button>
          <button class="button button--reject" data-action="${rejectAction}" data-asset="${entry.asset_id}" data-variant="${entry.candidate_variant}">${rejectLabel}</button>
        </div>
        <code>${approveCommand}</code>
        <code>${rejectCommand}</code>
      </div>
      <p class="card__status" id="status-${mode}-${entry.asset_id}">Ready for review.</p>
      <p class="card__meta">Updated at ${entry.updated_at}</p>
    </article>
  `
}

function loadMonitorSnapshot() {
  const heartbeatPath = path.join(paths.reportsDir, 'monitor-session-heartbeat.json')
  return {
    session: fs.existsSync(paths.monitorSessionPath) ? readJson(paths.monitorSessionPath) : null,
    heartbeat: fs.existsSync(heartbeatPath) ? readJson(heartbeatPath) : null
  }
}

function buildSummary(session, heartbeat, queue) {
  const autoScreenPassed = session?.autoScreenPassedCount ?? (queue.autoScreenPassed || []).length
  const semanticApproved = session?.semanticApprovedCount ?? 0
  const target = session?.targetAssetCount ?? 0
  const finalPending = session?.finalPendingCount ?? (queue.finalPending || []).length
  const pending = session?.pendingReviewCount ?? (queue.pending || []).length
  const percent = target > 0 ? Math.round((autoScreenPassed / target) * 100) : 0
  const elapsedHours = session?.elapsedMs ? (session.elapsedMs / 3600000).toFixed(2) : '0.00'
  const lastTickAt = session?.lastTickAt ?? 'n/a'
  const nextAction = session?.nextAction ?? 'idle'
  const heartbeatStatus = heartbeat?.status ?? 'unknown'
  const heartbeatUpdatedAt = heartbeat?.updatedAt ?? 'n/a'
  const heartbeatNextRunAt = heartbeat?.nextRunAt ?? 'n/a'

  return `
    <section class="hero">
      <div class="hero__copy">
        <p class="eyebrow">Live session monitor</p>
        <h1>Idle Collective Art Pipeline</h1>
        <p class="lead">This page shows what is running, what only passed auto-screening, and what is still waiting for your final decision.</p>
      </div>
      <div class="hero__stats">
        <div class="stat">
          <span class="stat__label">Auto-Screen Passed</span>
          <strong>${autoScreenPassed}/${target}</strong>
          <span class="stat__meta">${percent}% of target assets currently passed heuristic screening</span>
        </div>
        <div class="stat">
          <span class="stat__label">Semantic Approved</span>
          <strong>${semanticApproved}/${target}</strong>
          <span class="stat__meta">Actually passed semantic AI review</span>
        </div>
        <div class="stat">
          <span class="stat__label">Final Pending</span>
          <strong>${finalPending}</strong>
          <span class="stat__meta">Awaiting your review</span>
        </div>
        <div class="stat">
          <span class="stat__label">Pending Review</span>
          <strong>${pending}</strong>
          <span class="stat__meta">AI queue</span>
        </div>
        <div class="stat">
          <span class="stat__label">Uptime</span>
          <strong>${elapsedHours}h</strong>
          <span class="stat__meta">Last tick ${lastTickAt}</span>
        </div>
      </div>
      <div class="progress-panel">
        <div class="progress-panel__row">
          <span>Completion</span>
          <strong>${percent}%</strong>
        </div>
        <div class="progress-bar"><span style="width:${percent}%"></span></div>
        <div class="progress-panel__foot">
          <span>Next action: ${nextAction}</span>
          <span>Heartbeat: ${heartbeatStatus} @ ${heartbeatUpdatedAt}${heartbeatNextRunAt !== 'n/a' ? `, next tick ${heartbeatNextRunAt}` : ''}</span>
        </div>
      </div>
    </section>
  `
}

function buildFeedbackSection(reviewFeedback) {
  const categories = Object.entries(reviewFeedback?.categories || {})
  const cards = categories.map(([category, entry]) => {
    const failures = Object.entries(entry?.observed_failures || {})
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4)
      .map(([tag, count]) => `<li><strong>${escapeHtml(tag)}</strong> x${count}</li>`)
      .join('')

    const notes = (entry?.enforced_additions?.notes || [])
      .slice(0, 4)
      .map(note => `<li>${escapeHtml(note)}</li>`)
      .join('')

    const mustAvoid = (entry?.enforced_additions?.must_avoid || [])
      .slice(0, 4)
      .map(note => `<li>${escapeHtml(note)}</li>`)
      .join('')

    return `
      <article class="feedback-card">
        <h3>${escapeHtml(category)}</h3>
        <p class="feedback-card__label">Recent failure patterns</p>
        <ul>${failures || '<li>No repeated failures yet.</li>'}</ul>
        <p class="feedback-card__label">What the system tightened</p>
        <ul>${notes || '<li>No extra feedback rules yet.</li>'}</ul>
        <p class="feedback-card__label">Now strongly avoiding</p>
        <ul>${mustAvoid || '<li>No extra avoid rules yet.</li>'}</ul>
      </article>
    `
  }).join('\n')

  return `
    <section class="section">
      <div>
        <h2>Failure Feedback</h2>
        <p class="section-lead">These are the repeated problems the pipeline has learned from recent rejects, and the extra constraints now added to the next generation rounds.</p>
      </div>
      <div class="feedback-grid">
        ${cards || '<p>No review feedback available yet.</p>'}
      </div>
    </section>
  `
}

function main() {
  if (!fs.existsSync(queuePath)) {
    throw new Error('Missing review queue report. Run npm run art:review-queue first.')
  }

  const queue = readJson(queuePath)
  const monitor = loadMonitorSnapshot()
  const reviewFeedbackPath = paths.reviewFeedbackPath
  const reviewFeedback = fs.existsSync(reviewFeedbackPath) ? readJson(reviewFeedbackPath) : { categories: {} }
  const pendingCards = queue.pending.map(entry => buildCard(entry, 'ai')).join('\n')
  const autoScreenCards = (queue.autoScreenPassed || []).map(entry => buildCard(entry, 'final')).join('\n')
  const finalCards = (queue.finalPending || []).map(entry => buildCard(entry, 'final')).join('\n')
  const summary = buildSummary(monitor.session, monitor.heartbeat, queue)
  const feedbackSection = buildFeedbackSection(reviewFeedback)

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Idle Collective Art Review</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4efe6;
      --panel: #fffaf2;
      --ink: #2b261f;
      --muted: #7b6d5a;
      --line: #decfb9;
      --accent: #8ab66b;
      --accent-soft: #e7f2dd;
      --danger: #b4574a;
      --danger-soft: #f8e5e0;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", "PingFang SC", sans-serif;
      background: radial-gradient(circle at top, #fff8ec, var(--bg) 55%);
      color: var(--ink);
    }
    main {
      max-width: 1380px;
      margin: 0 auto;
      padding: 32px 24px 64px;
    }
    h1, h2, h3 { margin: 0; }
    .lead, .section-lead { color: var(--muted); }
    .hero {
      display: grid;
      gap: 20px;
      padding: 24px;
      border-radius: 28px;
      border: 1px solid var(--line);
      background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,250,242,0.92));
      box-shadow: 0 22px 48px rgba(70, 48, 18, 0.09);
    }
    .hero__copy {
      display: grid;
      gap: 8px;
    }
    .eyebrow {
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 12px;
      font-weight: 800;
      color: #6c8551;
    }
    .hero__copy h1 {
      font-size: clamp(28px, 4vw, 46px);
      line-height: 1.04;
    }
    .hero__stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
    }
    .stat {
      border-radius: 18px;
      border: 1px solid var(--line);
      background: #fff;
      padding: 14px 16px;
      display: grid;
      gap: 6px;
    }
    .stat__label {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }
    .stat strong {
      font-size: 28px;
      line-height: 1;
    }
    .stat__meta {
      color: var(--muted);
      font-size: 13px;
    }
    .progress-panel {
      border-radius: 20px;
      background: #fff;
      border: 1px solid var(--line);
      padding: 16px;
      display: grid;
      gap: 12px;
    }
    .progress-panel__row,
    .progress-panel__foot {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      color: var(--muted);
      font-size: 13px;
      flex-wrap: wrap;
    }
    .progress-bar {
      height: 14px;
      border-radius: 999px;
      background: #efe5d5;
      overflow: hidden;
    }
    .progress-bar span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #7ca856, #b4d897);
    }
    .section {
      margin-top: 28px;
      display: grid;
      gap: 18px;
    }
    .grid {
      display: grid;
      gap: 20px;
    }
    .feedback-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }
    .feedback-card {
      border: 1px solid var(--line);
      border-radius: 18px;
      background: #fff;
      padding: 16px;
      display: grid;
      gap: 10px;
    }
    .feedback-card h3 {
      font-size: 18px;
      text-transform: capitalize;
    }
    .feedback-card__label {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }
    .feedback-card ul {
      margin: 0;
      padding-left: 18px;
      color: var(--muted);
      font-size: 13px;
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 20px;
      background: rgba(255, 250, 242, 0.94);
      padding: 18px;
      box-shadow: 0 18px 40px rgba(70, 48, 18, 0.08);
    }
    .card__header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: start;
      margin-bottom: 16px;
    }
    .card__header p {
      margin: 6px 0 0;
      color: var(--muted);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      background: var(--accent-soft);
      color: #3e5e29;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .card__badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .recommendation {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .recommendation--reject { background: var(--danger-soft); color: var(--danger); }
    .recommendation--approve { background: var(--accent-soft); color: #3e5e29; }
    .recommendation--manual_review { background: #efe8da; color: #705f48; }
    .card__images {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 16px;
    }
    figure {
      margin: 0;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: #fff;
      padding: 12px;
    }
    figcaption {
      margin-bottom: 8px;
      color: var(--muted);
      font-size: 13px;
      font-weight: 600;
    }
    img {
      width: 100%;
      aspect-ratio: 1;
      object-fit: contain;
      border-radius: 12px;
      background: linear-gradient(135deg, #f7f2e7, #fbfaf6);
    }
    .empty {
      display: grid;
      place-items: center;
      min-height: 220px;
      border-radius: 12px;
      background: linear-gradient(135deg, #f7f2e7, #fbfaf6);
      color: var(--muted);
      text-align: center;
      padding: 12px;
    }
    .card__commands {
      display: grid;
      gap: 8px;
      margin-bottom: 12px;
    }
    .button-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .button {
      border: 0;
      border-radius: 12px;
      padding: 12px 16px;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .button:disabled { opacity: 0.55; cursor: wait; }
    .button--approve { background: #567d3a; color: #fff; }
    .button--reject { background: #a75548; color: #fff; }
    code {
      display: block;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid var(--line);
      background: #fff;
      color: #5b4130;
      overflow-x: auto;
      white-space: nowrap;
    }
    .card__meta, .card__rationale, .card__status {
      margin: 0 0 12px;
      color: var(--muted);
      font-size: 13px;
    }
    @media (max-width: 960px) {
      .hero__stats {
        grid-template-columns: 1fr 1fr;
      }
      .feedback-grid {
        grid-template-columns: 1fr;
      }
      .card__images {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 640px) {
      .hero__stats {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main>
    ${summary}
    ${feedbackSection}

    <section class="section">
      <div>
        <h2>AI Review Queue</h2>
        <p class="section-lead">Candidates waiting for QC and heuristic auto-screening.</p>
      </div>
      <div class="grid">
        ${pendingCards || '<p>No pending AI review assets.</p>'}
      </div>
    </section>

    <section class="section">
      <div>
        <h2>Auto-Screen Passed</h2>
        <p class="section-lead">These assets only passed heuristic screening. They are not semantic AI approvals and should not be promoted as final-ready.</p>
      </div>
      <div class="grid">
        ${autoScreenCards || '<p>No heuristic auto-screen passes waiting.</p>'}
      </div>
    </section>

    <section class="section">
      <div>
        <h2>Final Review Queue</h2>
        <p class="section-lead">Only assets with actual semantic AI review may appear here before your final approval.</p>
      </div>
      <div class="grid">
        ${finalCards || '<p>No final review pending assets.</p>'}
      </div>
    </section>
  </main>
  <script>
    async function refreshMonitor() {
      try {
        const response = await fetch('http://127.0.0.1:4318/monitor')
        if (!response.ok) {
          return
        }

        const payload = await response.json()
        const session = payload.monitorSession || {}
        const heartbeat = payload.heartbeat || {}
        const approved = session.autoScreenPassedCount ?? 0
        const semanticApproved = session.semanticApprovedCount ?? 0
        const target = session.targetAssetCount ?? 0
        const percent = target > 0 ? Math.round((approved / target) * 100) : 0

        const statNodes = document.querySelectorAll('.stat strong')
        if (statNodes[0]) statNodes[0].textContent = approved + '/' + target
        if (statNodes[1]) statNodes[1].textContent = semanticApproved + '/' + target
        if (statNodes[2]) statNodes[2].textContent = session.finalPendingCount ?? (payload.queue?.finalPending || []).length
        if (statNodes[3]) statNodes[3].textContent = session.pendingReviewCount ?? (payload.queue?.pending || []).length
        if (statNodes[4]) statNodes[4].textContent = ((session.elapsedMs || 0) / 3600000).toFixed(2) + 'h'

        const progressValue = document.querySelector('.progress-panel__row strong')
        const bar = document.querySelector('.progress-bar span')
        const foot = document.querySelector('.progress-panel__foot')
        if (progressValue) progressValue.textContent = percent + '%'
        if (bar) bar.style.width = percent + '%'
        if (foot) {
          const nextRunAt = heartbeat.nextRunAt ? ', next tick ' + heartbeat.nextRunAt : ''
          foot.innerHTML = '<span>Next action: ' + (session.nextAction || 'idle') + '</span><span>Heartbeat: ' + (heartbeat.status || 'unknown') + ' @ ' + (heartbeat.updatedAt || 'n/a') + nextRunAt + '</span>'
        }

        const feedbackPayload = payload.reviewFeedback || { categories: {} }
        const feedbackGrid = document.querySelector('.feedback-grid')
        if (feedbackGrid) {
          const entries = Object.entries(feedbackPayload.categories || {})
          feedbackGrid.innerHTML = entries.map(([category, entry]) => {
            const failures = Object.entries(entry?.observed_failures || {})
              .sort((left, right) => right[1] - left[1])
              .slice(0, 4)
              .map(([tag, count]) => '<li><strong>' + tag + '</strong> x' + count + '</li>')
              .join('')
            const notes = (entry?.enforced_additions?.notes || [])
              .slice(0, 4)
              .map(note => '<li>' + note + '</li>')
              .join('')
            const mustAvoid = (entry?.enforced_additions?.must_avoid || [])
              .slice(0, 4)
              .map(note => '<li>' + note + '</li>')
              .join('')
            return '<article class="feedback-card"><h3>' + category + '</h3><p class="feedback-card__label">Recent failure patterns</p><ul>' + (failures || '<li>No repeated failures yet.</li>') + '</ul><p class="feedback-card__label">What the system tightened</p><ul>' + (notes || '<li>No extra feedback rules yet.</li>') + '</ul><p class="feedback-card__label">Now strongly avoiding</p><ul>' + (mustAvoid || '<li>No extra avoid rules yet.</li>') + '</ul></article>'
          }).join('')
        }
      } catch (error) {
        console.warn(error)
      }
    }

    async function submitReview(button) {
      const asset = button.dataset.asset
      const action = button.dataset.action
      const variant = button.dataset.variant
      const article = button.closest('.card')
      const prefix = action.startsWith('final') ? 'final' : 'ai'
      const statusNode = document.getElementById('status-' + prefix + '-' + asset)
      const buttons = article.querySelectorAll('button')

      buttons.forEach(node => { node.disabled = true })
      statusNode.textContent = 'Submitting ' + action + '...'

      try {
        const response = await fetch(action.startsWith('final') ? '${API_BASE_URL}/final-review' : '${API_BASE_URL}/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ asset, action, variant })
        })

        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error || 'Request failed.')
        }

        statusNode.textContent = payload.message || 'Updated.'
        article.style.opacity = '0.55'
      } catch (error) {
        statusNode.textContent = error.message
        buttons.forEach(node => { node.disabled = false })
      }
    }

    document.querySelectorAll('button[data-action]').forEach(button => {
      button.addEventListener('click', () => submitReview(button))
    })

    refreshMonitor()
    setInterval(refreshMonitor, 60000)
  </script>
</body>
</html>`

  fs.writeFileSync(dashboardPath, html, 'utf8')
  console.log(`[art:review-dashboard] wrote ${path.relative(paths.projectRoot, dashboardPath)}`)
}

try {
  main()
} catch (error) {
  console.error('[art:review-dashboard] failed', error)
  process.exitCode = 1
}
