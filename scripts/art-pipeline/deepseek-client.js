const { loadLocalEnv } = require('./load-local-env')
const { paths } = require('./shared')

loadLocalEnv(paths.projectRoot)

const DEFAULT_BASE_URL = 'https://api.deepseek.com'
const DEFAULT_MODEL = 'deepseek-chat'

function getDeepSeekConfig() {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL,
    model: process.env.DEEPSEEK_MODEL || DEFAULT_MODEL
  }
}

function hasDeepSeekCredentials() {
  return Boolean(getDeepSeekConfig().apiKey)
}

async function deepseekChat(messages, options = {}) {
  const config = getDeepSeekConfig()
  if (!config.apiKey) {
    throw new Error('Missing DEEPSEEK_API_KEY')
  }

  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: options.model || config.model,
      temperature: options.temperature ?? 0.2,
      response_format: options.response_format,
      messages
    })
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`DeepSeek request failed with ${response.status}: ${body}`)
  }

  return response.json()
}

async function runDeepSeekHealthCheck() {
  const config = getDeepSeekConfig()
  if (!config.apiKey) {
    return {
      ok: false,
      provider: 'deepseek',
      model: config.model,
      error: 'missing_api_key'
    }
  }

  try {
    const payload = await deepseekChat([
      {
        role: 'system',
        content: 'Reply with a compact JSON object only.'
      },
      {
        role: 'user',
        content: 'Return {"ok":true,"service":"deepseek"}'
      }
    ], {
      temperature: 0,
      response_format: { type: 'json_object' }
    })

    return {
      ok: true,
      provider: 'deepseek',
      model: config.model,
      id: payload.id ?? null
    }
  } catch (error) {
    return {
      ok: false,
      provider: 'deepseek',
      model: config.model,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

async function requestDeepSeekReviewAssist(payload) {
  const config = getDeepSeekConfig()
  if (!config.apiKey) {
    return null
  }

  const systemPrompt = [
    'You are assisting a game art pipeline reviewer.',
    'You do not have direct image pixels or image vision in this call.',
    'You must only reason from the supplied asset brief, rubric, scores, and QC results.',
    'Do not claim to have seen the image.',
    'Return compact JSON with keys: summary, recommendation, concerns.'
  ].join(' ')

  const userPrompt = JSON.stringify(payload)

  try {
    const response = await deepseekChat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })

    const content = response.choices?.[0]?.message?.content
    if (!content) {
      return null
    }

    const parsed = JSON.parse(content)
    return {
      provider: 'deepseek',
      model: config.model,
      method: 'text_assist',
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      recommendation: typeof parsed.recommendation === 'string' ? parsed.recommendation : '',
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns : []
    }
  } catch {
    return null
  }
}

module.exports = {
  getDeepSeekConfig,
  hasDeepSeekCredentials,
  deepseekChat,
  runDeepSeekHealthCheck,
  requestDeepSeekReviewAssist
}
