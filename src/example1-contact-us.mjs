// Example 1 - the simplest possible form.
//
// Creates a basic "Contact Us" form via the create_form workflow tool, using a
// human-authored CSV element source. Three fields: name, email, message.
//
//   npm run example:1
import { connect, callTool } from './mcp.mjs'
import { resolveEnvironmentId } from './discover.mjs'

// label,type,required  -> create_form compiles the CSV into SDK FormElement[].
const CONTACT_US_CSV = `label,type,required
Full name,text,true
Email,email,true
Message,textarea,true`

async function main() {
  const { client, cfg, close } = await connect()
  try {
    const formsAppEnvironmentId = await resolveEnvironmentId(client, cfg)
    console.log(`Creating "Contact Us" in environment ${formsAppEnvironmentId}...`)

    const { parsed, text } = await callTool(client, 'create_form', {
      name: 'Contact Us',
      description: 'Demo: a simple contact form (example 1).',
      formsAppEnvironmentId,
      elementsCsv: CONTACT_US_CSV,
    })

    console.log('\ncreate_form result:')
    console.log(text)
    if (parsed?.formId) {
      console.log(`\n[OK] Form created. formId=${parsed.formId}, elements=${parsed.elementCount}`)
    }
  } finally {
    await close()
  }
}

main().catch((err) => {
  console.error('\n[FAILED]', err.message)
  process.exit(1)
})
