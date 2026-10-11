// Example 2 - a Contact Us form with an Australian address, a server-validated
// non-empty message, and a prefilled message.
//
// This exercises FOUR MCP tools end to end:
//   1. create_form                 - AU address + message element.
//                                     The `message` element is NOT required on
//                                     the form (that check is the SERVER's job).
//   2. set_form_server_validation  - source:"deploy" deploys the validation-api
//                                     project (POST /validate, rejects an empty
//                                     message) THEN points the form's
//                                     serverValidation at it, in one call.
//   3. set_form_personalisation    - prefills the `message` element with
//                                     "OneBlink is awesome!" on form load.
//
// Prereqs:
//   - MCP server running: (in oneblink-mcp) npm run start:http
//   - .env filled in, including ONEBLINK_VALIDATION_API_SCOPE pointing at an
//     API Hosting entry you created in the Console.
//   - A CLI deploy credential: either ONEBLINK_CLI_* in .env, or the SDK key
//     reused (the server does that when the CLI pair is blank). Deploy also
//     needs the `oneblink` CLI logged in on the SERVER host.
//
//   npm run example:2
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { connect, callTool } from './mcp.mjs'
import { resolveEnvironmentId } from './discover.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VALIDATION_API_DIR = resolve(__dirname, '..', 'validation-api')

// AU-address contact form. Element names are derived snake_case of the labels:
//   Full name -> full_name, Email -> email, Street address -> street_address,
//   Suburb -> suburb, State -> state, Postcode -> postcode, Message -> message.
// IMPORTANT: Message required=false. The non-empty check is enforced by the
// hosted-API server validation, not by the form.
const AU_CONTACT_CSV = `label,type,required,options
Full name,text,true,
Email,email,true,
Street address,text,true,
Suburb,text,true,
State,select,true,New South Wales:NSW|Victoria:VIC|Queensland:QLD|South Australia:SA|Western Australia:WA|Tasmania:TAS|Australian Capital Territory:ACT|Northern Territory:NT
Postcode,text,true,
Message,textarea,false,`

async function main() {
  const { client, cfg, close } = await connect()
  try {
    if (!cfg.validationApiScope) {
      throw new Error(
        'ONEBLINK_VALIDATION_API_SCOPE is not set in .env. Set it to the API Hosting scope domain you created in the OneBlink Console.',
      )
    }
    const formsAppEnvironmentId = await resolveEnvironmentId(client, cfg)

    // --- 1. Create the form (message NOT required) ---------------------------
    console.log(`Creating "Contact Us (AU)" in environment ${formsAppEnvironmentId}...`)
    const create = await callTool(client, 'create_form', {
      name: 'Contact Us (AU)',
      description: 'Demo: AU address + server-validated non-empty message, message prefilled (example 2).',
      formsAppEnvironmentId,
      elementsCsv: AU_CONTACT_CSV,
    })
    console.log('create_form result:\n' + create.text)
    const formId = create.parsed?.formId
    if (typeof formId !== 'number') {
      throw new Error('create_form did not return a numeric formId; cannot continue.')
    }
    console.log(`[OK] Form created. formId=${formId}`)

    // --- 2. Deploy the validation API and wire serverValidation --------------
    // source:"deploy" deploys validation-api/ to cfg.validationApiEnv, then sets
    // the form's serverValidation to that API's /validate route. apiId is the
    // full scope domain and is REQUIRED (deploy does not return it).
    console.log(`\nDeploying validation API (${cfg.validationApiScope}, env=${cfg.validationApiEnv}) and wiring serverValidation...`)
    const validation = await callTool(client, 'set_form_server_validation', {
      source: 'deploy',
      formId,
      projectDir: VALIDATION_API_DIR,
      scope: cfg.validationApiScope,
      apiId: cfg.validationApiScope,
      env: cfg.validationApiEnv,
      apiEnvironmentRoute: '/validate',
      // confirmProduction only needed when env=prod; the deploy branch fails
      // closed on prod without it.
      confirmProduction: cfg.validationApiEnv === 'prod',
    })
    console.log('set_form_server_validation result:\n' + validation.text)
    console.log('[OK] Server validation wired: empty `message` will now be rejected at submit.')

    // --- 3. Prefill the message element via personalisation ------------------
    // Personalisation runs on form LOAD. We point it at the same API's /prefill
    // route, which returns { submission: { message: "OneBlink is awesome!" } }.
    console.log('\nSetting personalisation to prefill `message` = "OneBlink is awesome!"...')
    const personalisation = await callTool(client, 'set_form_personalisation', {
      formId,
      apiId: cfg.validationApiScope,
      apiEnvironment: cfg.validationApiEnv,
      apiEnvironmentRoute: '/prefill',
    })
    console.log('set_form_personalisation result:\n' + personalisation.text)
    console.log('[OK] Message element will prefill with "OneBlink is awesome!" on load.')

    console.log(`\n[DONE] Contact Us (AU) form ${formId}: AU address, server-validated non-empty message, prefilled message.`)
  } finally {
    await close()
  }
}

main().catch((err) => {
  console.error('\n[FAILED]', err.message)
  process.exit(1)
})
