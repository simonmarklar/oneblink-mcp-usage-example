// Discover a formsAppEnvironmentId to create forms in.
//
// create_form REQUIRES a formsAppEnvironmentId. The skills say: never guess an
// id - discover it with list_forms_app_environments. Honour an explicit pin
// (ONEBLINK_FORMS_APP_ENVIRONMENT_ID) when set, otherwise take the first
// environment the tenant returns.
import { connect, callTool } from './mcp.mjs'

export async function resolveEnvironmentId(client, cfg) {
  if (cfg.formsAppEnvironmentId) {
    return cfg.formsAppEnvironmentId
  }
  const { parsed, text } = await callTool(client, 'list_forms_app_environments', {
    mode: 'page',
    limit: 50,
    offset: 0,
  })
  const list =
    (parsed && (parsed.formsAppEnvironments || parsed.environments || parsed.items || parsed.results)) || []
  const first = Array.isArray(list) ? list[0] : undefined
  const id = first && (first.id ?? first.formsAppEnvironmentId)
  if (typeof id !== 'number') {
    throw new Error(
      `Could not discover a formsAppEnvironmentId from list_forms_app_environments. Raw response:\n${text}\n` +
        'Set ONEBLINK_FORMS_APP_ENVIRONMENT_ID in .env to pin one.',
    )
  }
  return id
}

// Allow running standalone: `npm run discover` prints the environments.
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const { client, cfg, close } = await connect()
  try {
    const { text } = await callTool(client, 'list_forms_app_environments', { mode: 'page', limit: 50, offset: 0 })
    console.log('Forms-app environments:\n' + text)
    const id = await resolveEnvironmentId(client, cfg)
    console.log(`\nResolved formsAppEnvironmentId = ${id}`)
  } finally {
    await close()
  }
}
