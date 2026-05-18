const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { paths } = require('./shared')

const port = 4318

function runScript(scriptPath, extraArgs = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...extraArgs], {
    cwd: paths.projectRoot,
    encoding: 'utf8'
  })

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? ''
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  })
  response.end(JSON.stringify(payload))
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function parseBody(request) {
  return new Promise((resolve, reject) => {
    let raw = ''
    request.on('data', chunk => {
      raw += chunk
    })
    request.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch (error) {
        reject(error)
      }
    })
    request.on('error', reject)
  })
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 200, { ok: true })
    return
  }

  if (request.method === 'GET' && request.url === '/status') {
    sendJson(response, 200, { ok: true, port })
    return
  }

  if (request.method === 'GET' && request.url === '/monitor') {
    sendJson(response, 200, {
      ok: true,
      monitorSession: readJsonIfExists(paths.monitorSessionPath),
      heartbeat: readJsonIfExists(path.join(paths.reportsDir, 'monitor-session-heartbeat.json')),
      queue: readJsonIfExists(path.join(paths.reportsDir, 'review-queue.json')),
      reviewFeedback: readJsonIfExists(paths.reviewFeedbackPath)
    })
    return
  }

  if (request.method === 'POST' && request.url === '/review') {
    try {
      const body = await parseBody(request)
      const asset = typeof body.asset === 'string' ? body.asset : null
      const action = typeof body.action === 'string' ? body.action : null
      const variant = typeof body.variant === 'string' ? body.variant : 'cand01'

      if (!asset || !action) {
        sendJson(response, 400, { error: 'Missing asset or action.' })
        return
      }

      const result = runScript('scripts/art-pipeline/review-asset.js', [
        `--asset=${asset}`,
        `--action=${action}`,
        `--variant=${variant}`
      ])

      if (result.status !== 0) {
        sendJson(response, 500, {
          error: result.stderr || result.stdout || 'Review command failed.'
        })
        return
      }

      runScript('scripts/art-pipeline/list-review-queue.js')
      runScript('scripts/art-pipeline/build-review-dashboard.js')

      sendJson(response, 200, {
        ok: true,
        message: `${action} applied to ${asset}.`
      })
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : 'Unexpected review error.'
      })
    }
    return
  }

  if (request.method === 'POST' && request.url === '/final-review') {
    try {
      const body = await parseBody(request)
      const asset = typeof body.asset === 'string' ? body.asset : null
      const action = body.action === 'final-approve' ? 'approve' : body.action === 'final-reject' ? 'reject' : null

      if (!asset || !action) {
        sendJson(response, 400, { error: 'Missing asset or final-review action.' })
        return
      }

      const result = runScript('scripts/art-pipeline/finalize-staged-asset.js', [
        `--asset=${asset}`,
        `--action=${action}`
      ])

      if (result.status !== 0) {
        sendJson(response, 500, {
          error: result.stderr || result.stdout || 'Final review command failed.'
        })
        return
      }

      runScript('scripts/art-pipeline/list-review-queue.js')
      runScript('scripts/art-pipeline/build-review-dashboard.js')

      sendJson(response, 200, {
        ok: true,
        message: `${action} applied to ${asset}.`
      })
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : 'Unexpected final review error.'
      })
    }
    return
  }

  sendJson(response, 404, { error: 'Not found.' })
})

server.listen(port, '127.0.0.1', () => {
  console.log(`[art:review-api] listening on http://127.0.0.1:${port}`)
})
