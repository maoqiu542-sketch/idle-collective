const fs = require('node:fs')
const path = require('node:path')
const { execFileSync, spawn } = require('node:child_process')
const { loadPipelineConfig, paths } = require('./shared')

const config = loadPipelineConfig()
const comfyRoot = path.resolve('D:\\teae\\openclaw\\ComfyUI')
const pythonExecutable = path.join(comfyRoot, 'venv', 'Scripts', 'python.exe')
const logDir = paths.reportsDir
const stdoutPath = path.join(logDir, 'comfyui.stdout.log')
const stderrPath = path.join(logDir, 'comfyui.stderr.log')
const pidPath = path.join(logDir, 'comfyui.pid')

function isRunning(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function getProcessCommandLine(pid) {
  try {
    return execFileSync('powershell.exe', [
      '-NoProfile',
      '-Command',
      `(Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" | Select-Object -ExpandProperty CommandLine)`
    ], {
      encoding: 'utf8',
      windowsHide: true
    }).trim()
  } catch {
    return ''
  }
}

function isExpectedComfyProcess(pid) {
  const commandLine = getProcessCommandLine(pid)
  return commandLine.includes('main.py') && commandLine.includes(comfyRoot)
}

function waitForReady(baseUrl, timeoutMs = 120000) {
  return new Promise(resolve => {
    const startedAt = Date.now()
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`${baseUrl.replace(/\/$/, '')}/queue`)
        if (response.ok) {
          clearInterval(timer)
          resolve(true)
          return
        }
      } catch {
        // keep waiting
      }

      if (Date.now() - startedAt > timeoutMs) {
        clearInterval(timer)
        resolve(false)
      }
    }, 3000)
  })
}

async function main() {
  if (!fs.existsSync(comfyRoot)) {
    throw new Error(`ComfyUI directory not found: ${comfyRoot}`)
  }

  if (!fs.existsSync(pythonExecutable)) {
    throw new Error(`ComfyUI python executable not found: ${pythonExecutable}`)
  }

  if (fs.existsSync(pidPath)) {
    const existingPid = Number(fs.readFileSync(pidPath, 'utf8').trim())
    const alreadyReady = await waitForReady(config.comfyui.baseUrl, 2000)
    if (Number.isFinite(existingPid) && isRunning(existingPid) && isExpectedComfyProcess(existingPid) && alreadyReady) {
      console.log(`[art:comfyui-start] already running pid=${existingPid}`)
      return
    }
  }

  fs.mkdirSync(logDir, { recursive: true })
  const out = fs.openSync(stdoutPath, 'a')
  const err = fs.openSync(stderrPath, 'a')

  const child = spawn(pythonExecutable, [
    'main.py',
    '--cpu',
    '--listen',
    '127.0.0.1',
    '--port',
    String(new URL(config.comfyui.baseUrl).port || 8188)
  ], {
    cwd: comfyRoot,
    detached: true,
    stdio: ['ignore', out, err],
    windowsHide: true
  })

  fs.writeFileSync(pidPath, `${child.pid}\n`, 'utf8')
  child.unref()
  console.log(`[art:comfyui-start] started pid=${child.pid}`)

  const ready = await waitForReady(config.comfyui.baseUrl)
  console.log(ready
    ? `[art:comfyui-start] ready at ${config.comfyui.baseUrl}`
    : `[art:comfyui-start] started but not yet responding at ${config.comfyui.baseUrl}`)
}

main().catch(error => {
  console.error('[art:comfyui-start] failed', error)
  process.exitCode = 1
})
