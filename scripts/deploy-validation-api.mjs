#!/usr/bin/env node
// Deploy the validation-api hosted API on its own, via the MCP deploy_hosted_api
// tool - handy when you want to (re)deploy the server-validation + prefill
// routes without re-running the full example 2 wiring.
//
//   npm run deploy:validation-api
//   npm run deploy:validation-api -- --env prod   # requires confirmProduction
//
// Prereqs: MCP server running, .env filled, oneblink CLI logged in on the
// server host, and a validation API scope resolvable from ONEBLINK_ORG_NAME +
// ONEBLINK_VALIDATION_API_NAME ("<org>-<api>.api.oneblink.io") or the full
// ONEBLINK_VALIDATION_API_SCOPE override.
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { connect, callTool } from '../src/mcp.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VALIDATION_API_DIR = resolve(__dirname, '..', 'validation-api')

function argEnv() {
  const i = process.argv.indexOf('--env')
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : undefined
}

async function main() {
  const { client, cfg, close } = await connect()
  try {
    const env = argEnv() || cfg.validationApiEnv
    if (!cfg.validationApiScope) {
      throw new Error(
        'No validation API scope resolved. Set ONEBLINK_ORG_NAME + ONEBLINK_VALIDATION_API_NAME in .env ' +
          '(scope = "<org>-<api>.api.oneblink.io"), or set ONEBLINK_VALIDATION_API_SCOPE to the full domain.',
      )
    }
    console.log(`Deploying ${cfg.validationApiScope} (env=${env}) from ${VALIDATION_API_DIR} ...`)
    const res = await callTool(client, 'deploy_hosted_api', {
      projectDir: VALIDATION_API_DIR,
      scope: cfg.validationApiScope,
      env,
      confirmProduction: env === 'prod',
    })
    console.log('deploy_hosted_api result:\n' + res.text)
    console.log('[OK] Deploy step complete.')
  } finally {
    await close()
  }
}

main().catch((err) => {
  console.error('\n[FAILED] deploy:validation-api:', err.message)
  process.exit(1)
})
