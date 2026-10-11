// Teardown - delete the forms the examples created.
//
// The examples create two forms by name:
//   "Contact Us"       (example 1)
//   "Contact Us (AU)"  (example 2)
// This script lists forms in the environment, matches those names, and deletes
// each via the MCP server's delete_form tool (confirm:true). Deletion is
// irreversible, so by default this is a DRY RUN that only reports what it would
// delete - pass --yes to actually delete.
//
//   npm run teardown            # dry run: list the demo forms that would be deleted
//   npm run teardown -- --yes   # actually delete them
//
// Notes:
//   - Only the two demo form NAMES are targeted; nothing else is touched.
//   - A locked form is reported and skipped (not force-overridden). Unlock it in
//     the form builder, or re-run with --override to pass overrideLock:true.
//   - The deployed validation-api hosted API is NOT removed here (the server has
//     no api-delete workflow); remove it in the OneBlink Console if needed.
import { connect, callTool } from './mcp.mjs'
import { resolveEnvironmentId } from './discover.mjs'

const DEMO_FORM_NAMES = new Set(['Contact Us', 'Contact Us (AU)'])

function hasFlag(name) {
  return process.argv.includes(name)
}

async function main() {
  const apply = hasFlag('--yes')
  const override = hasFlag('--override')
  const { client, cfg, close } = await connect()
  try {
    const formsAppEnvironmentId = await resolveEnvironmentId(client, cfg)

    // Find the demo forms by name in this environment (page through if needed).
    const matches = []
    let offset = 0
    const limit = 200
    for (;;) {
      const { parsed } = await callTool(client, 'list_forms', {
        formsAppEnvironmentId,
        mode: 'page',
        limit,
        offset,
        fields: ['id', 'name'],
      })
      const items = (parsed && parsed.items) || []
      for (const f of items) {
        if (DEMO_FORM_NAMES.has(f.name)) matches.push({ id: f.id, name: f.name })
      }
      const next = parsed?.meta?.nextOffset
      if (typeof next !== 'number') break
      offset = next
    }

    if (matches.length === 0) {
      console.log(`No demo forms found in environment ${formsAppEnvironmentId}. Nothing to tear down.`)
      return
    }

    console.log(`Found ${matches.length} demo form(s) in environment ${formsAppEnvironmentId}:`)
    for (const m of matches) console.log(`  - ${m.id}  "${m.name}"`)

    if (!apply) {
      console.log('\n[DRY RUN] No forms deleted. Re-run with --yes to delete them:')
      console.log('  npm run teardown -- --yes')
      return
    }

    console.log('\nDeleting...')
    let deleted = 0
    for (const m of matches) {
      try {
        const { text } = await callTool(client, 'delete_form', {
          formId: m.id,
          confirm: true,
          overrideLock: override,
        })
        console.log(`  [OK] deleted ${m.id} "${m.name}" -> ${text}`)
        deleted += 1
      } catch (err) {
        console.error(`  [SKIP] ${m.id} "${m.name}": ${err.message}`)
      }
    }
    console.log(`\n[DONE] Deleted ${deleted}/${matches.length} demo form(s).`)
    if (deleted < matches.length) {
      console.log('Some forms were skipped (likely locked). Unlock them, or re-run with --yes --override.')
    }
  } finally {
    await close()
  }
}

main().catch((err) => {
  console.error('\n[FAILED] teardown:', err.message)
  process.exit(1)
})
