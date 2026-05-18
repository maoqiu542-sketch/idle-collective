const fs = require('node:fs')
const path = require('node:path')
const { paths } = require('./shared')

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`)
  }
  return response.json()
}

async function main() {
  const statusPath = path.join(paths.reportsDir, 'comfyui-status.json')
  const pidPath = path.join(paths.reportsDir, 'comfyui.pid')
  const baseUrl = 'http://127.0.0.1:8188'

  const state = {
    checkedAt: new Date().toISOString(),
    configuredBaseUrl: baseUrl,
    queue: null,
    process: null,
    note: ''
  }

  try {
    state.queue = await fetchJson(`${baseUrl}/queue`)
    state.note = 'ComfyUI queue endpoint responded successfully.'
  } catch (error) {
    state.note = `ComfyUI queue endpoint failed: ${error.message}`
  }

  if (fs.existsSync(pidPath)) {
    const pid = Number(fs.readFileSync(pidPath, 'utf8').trim())
    state.process = Number.isFinite(pid) ? { pid, running: true } : { pid: null, running: false }
  } else {
    state.process = { pid: null, running: false }
  }

  fs.mkdirSync(path.dirname(statusPath), { recursive: true })
  fs.writeFileSync(statusPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
  console.log(`[art:comfyui-check] wrote ${path.relative(paths.projectRoot, statusPath)}`)
  console.log(state.note)
}

main().catch(error => {
  console.error('[art:comfyui-check] failed', error)
  process.exitCode = 1
})
