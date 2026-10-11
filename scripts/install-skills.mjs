#!/usr/bin/env node
// Install the OneBlink MCP companion skills.
//
// The authoritative install flow is the agent-driven INSTALL.md at:
//   https://raw.githubusercontent.com/simonmarklar/oneblink-mcp-skills/main/INSTALL.md
// This script is the DETERMINISTIC, no-agent path for a local dev setup: it
// shallow-clones the skills pack and runs the pack's own bundled installer
// (scripts/install.mjs), which copies the six skills into the target skills
// directory. (INSTALL.md's "Optional deterministic path (local installs only)".)
//
//   npm run install:skills                 # auto-detect target (Kiro Crew user dir)
//   npm run install:skills -- --target DIR # install into DIR
//   npm run install:skills -- --dry-run    # print what would be copied
//
// Requires git and Node.js on PATH.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { join, resolve } from 'node:path'

const REPO = 'https://github.com/simonmarklar/oneblink-mcp-skills.git'

function arg(name) {
  const i = process.argv.indexOf(name)
  return i >= 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : undefined
}

// Default target: the Kiro Crew USER skills dir (this agent's own skills home).
function defaultTarget() {
  return resolve(homedir(), '.kiro', 'crew', 'skills')
}

function run(cmd, args, opts = {}) {
  console.log(`$ ${cmd} ${args.join(' ')}`)
  execFileSync(cmd, args, { stdio: 'inherit', ...opts })
}

async function main() {
  const dryRun = Boolean(arg('--dry-run'))
  const target = typeof arg('--target') === 'string' ? resolve(String(arg('--target'))) : defaultTarget()

  const scratch = process.env.KIROCREW_SCRATCH || tmpdir()
  const work = mkdtempSync(join(scratch, 'oneblink-skills-'))
  try {
    console.log(`Cloning ${REPO} ...`)
    run('git', ['clone', '--depth', '1', REPO, work])

    const installer = join(work, 'scripts', 'install.mjs')
    if (!existsSync(installer)) {
      throw new Error(`Bundled installer not found at ${installer}. The pack layout may have changed; follow INSTALL.md manually.`)
    }

    const installerArgs = [installer, '--target', target]
    if (dryRun) installerArgs.push('--dry-run')
    console.log(`\nInstalling skills into: ${target}${dryRun ? ' (dry run)' : ''}`)
    run(process.execPath, installerArgs)

    console.log('\n[OK] Skills install step complete.')
    console.log('Installed: oneblink-mcp-connect, oneblink-form-authoring, oneblink-submission-events,')
    console.log('           oneblink-personalisation, oneblink-approval-flows, oneblink-deploy')
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error('\n[FAILED] install:skills:', err.message)
  console.error('Fallback: run the agent-driven INSTALL.md from the repo, or clone it and run scripts/install.mjs --target <dir> by hand.')
  process.exit(1)
})
