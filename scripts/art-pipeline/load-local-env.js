const fs = require('node:fs')
const path = require('node:path')

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return
  }

  const content = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^"(.*)"$/, '$1')
    if (key && process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function loadLocalEnv(projectRoot) {
  parseEnvFile(path.join(projectRoot, '.env'))
  parseEnvFile(path.join(projectRoot, '.env.local'))
}

module.exports = {
  loadLocalEnv
}
