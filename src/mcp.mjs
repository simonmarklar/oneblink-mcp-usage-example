// Shared MCP client helper for the demo.
//
// Loads .env, builds a Streamable HTTP MCP client pointed at the OneBlink MCP
// server, and attaches the OneBlink Developer Key as PER-SESSION REQUEST
// HEADERS (never as tool arguments). This is the one place credentials are
// read; every example imports connect() from here.
import 'dotenv/config'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

export function loadConfig() {
  const url = process.env.ONEBLINK_MCP_URL || 'http://127.0.0.1:3000/mcp'
  const accessKey = process.env.ONEBLINK_ACCESS_KEY
  const secretKey = process.env.ONEBLINK_SECRET_KEY
  if (!accessKey || !secretKey) {
    throw new Error(
      'Missing ONEBLINK_ACCESS_KEY / ONEBLINK_SECRET_KEY. Copy .env.example to .env and fill in your OneBlink Developer Key.',
    )
  }
  return {
    url,
    accessKey,
    secretKey,
    cliAccessKey: process.env.ONEBLINK_CLI_ACCESS_KEY || '',
    cliSecretKey: process.env.ONEBLINK_CLI_SECRET_KEY || '',
    validationApiScope: resolveValidationApiScope(),
    validationApiEnv: process.env.ONEBLINK_VALIDATION_API_ENV || 'dev',
    formsAppEnvironmentId: process.env.ONEBLINK_FORMS_APP_ENVIRONMENT_ID
      ? Number(process.env.ONEBLINK_FORMS_APP_ENVIRONMENT_ID)
      : undefined,
  }
}

// A OneBlink hosted-API scope domain follows the convention:
//   <organisation-name>-<api-name>.api.oneblink.io
// Compose it from ONEBLINK_ORG_NAME + ONEBLINK_VALIDATION_API_NAME, unless a
// full ONEBLINK_VALIDATION_API_SCOPE override is given. Returns '' when neither
// is usable (callers that need it throw with a clear message).
const SCOPE_SUFFIX = '.api.oneblink.io'

export function resolveValidationApiScope() {
  const override = (process.env.ONEBLINK_VALIDATION_API_SCOPE || '').trim()
  if (override) {
    if (!override.endsWith(SCOPE_SUFFIX)) {
      throw new Error(
        `ONEBLINK_VALIDATION_API_SCOPE must be a full "<org>-<api>${SCOPE_SUFFIX}" domain, got "${override}".`,
      )
    }
    return override
  }
  const org = (process.env.ONEBLINK_ORG_NAME || '').trim()
  const api = (process.env.ONEBLINK_VALIDATION_API_NAME || '').trim()
  if (!org || !api) return ''
  // <organisation-name>-<api-name>.api.oneblink.io
  return `${org}-${api}${SCOPE_SUFFIX}`
}

// Build the credential headers. The CLI deploy pair is only attached when set.
function credentialHeaders(cfg) {
  const headers = {
    'X-OneBlink-Access-Key': cfg.accessKey,
    'X-OneBlink-Secret-Key': cfg.secretKey,
  }
  if (cfg.cliAccessKey && cfg.cliSecretKey) {
    headers['X-OneBlink-CLI-Access-Key'] = cfg.cliAccessKey
    headers['X-OneBlink-CLI-Secret-Key'] = cfg.cliSecretKey
  }
  return headers
}

// Connect to the MCP server. Returns { client, cfg, close() }.
export async function connect() {
  const cfg = loadConfig()
  const transport = new StreamableHTTPClientTransport(new URL(cfg.url), {
    requestInit: { headers: credentialHeaders(cfg) },
  })
  const client = new Client({ name: 'oneblink-mcp-demo', version: '0.1.0' })
  await client.connect(transport)
  return {
    client,
    cfg,
    close: () => client.close(),
  }
}

// Call a tool and return its parsed result. Throws on an MCP-level error
// result (isError) with the server's own message, so examples fail loudly.
export async function callTool(client, name, args) {
  const res = await client.callTool({ name, arguments: args })
  const text = (res.content || [])
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n')
  if (res.isError) {
    throw new Error(`Tool ${name} returned an error:\n${text}`)
  }
  // Most workflow tools return a single JSON text block; parse when possible.
  try {
    return { parsed: JSON.parse(text), text }
  } catch {
    return { parsed: undefined, text }
  }
}
