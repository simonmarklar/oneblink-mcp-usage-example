# oneblink-mcp-demo

A runnable demo of the **OneBlink MCP server** and its **companion skills**. It
is an MCP *client* that connects to the server over its HTTP transport, passes a
OneBlink Developer Key as **per-session request headers**, and drives the
workflow tools to build two forms.

| Example | What it shows | Tools used |
|---|---|---|
| `example:1` | A simple **Contact Us** form (name, email, message) | `create_form` |
| `example:2` | A **Contact Us (AU)** form: Australian address + a `message` element **not required on the form**, **server-side validation** rejecting an empty message, and the message **prefilled** with `"OneBlink is awesome!"` | `create_form`, `set_form_server_validation`, `set_form_personalisation` |

## Prerequisites

- **Node.js 20+** and **git** on PATH.
- The **OneBlink MCP server** running locally (HTTP transport, `127.0.0.1:3000`
  by default). In the `oneblink-mcp` project: `npm install && npm run build && npm run start:http`.
- A **OneBlink Developer Key** (Console → Developer Keys).
- For example 2's deploy: the **`oneblink` CLI logged in** on the server host
  (`oneblink login`), and an **API Hosting entry** created in the Console whose
  scope domain you put in `ONEBLINK_VALIDATION_API_SCOPE`.

## Setup

```bash
npm install                 # client deps (@modelcontextprotocol/sdk, dotenv)
npm run install:skills      # install the OneBlink companion skills (see below)
cp .env.example .env        # then edit .env with your keys + server URL
```

### `.env`

Credentials are **request headers, never tool arguments** — they are read from
`.env` here and attached to the HTTP session. See `.env.example` for every
value; the required ones are:

```ini
ONEBLINK_MCP_URL=http://127.0.0.1:3000/mcp
ONEBLINK_ACCESS_KEY=<your Developer Key access key>
ONEBLINK_SECRET_KEY=<your Developer Key secret key>
ONEBLINK_VALIDATION_API_SCOPE=<your-api-hosting-scope.api.oneblink.io>  # example 2
```

### Install the skills

`npm run install:skills` runs the deterministic local-install path from the
pack's [INSTALL.md](https://raw.githubusercontent.com/simonmarklar/oneblink-mcp-skills/main/INSTALL.md):
it shallow-clones `simonmarklar/oneblink-mcp-skills` and runs the pack's bundled
`scripts/install.mjs`, copying the six skills into your Kiro Crew skills
directory (`~/.kiro/crew/skills/`). Options:

```bash
npm run install:skills -- --dry-run        # show what would be copied
npm run install:skills -- --target <dir>   # install into a specific dir
```

The six skills: `oneblink-mcp-connect`, `oneblink-form-authoring`,
`oneblink-submission-events`, `oneblink-personalisation`,
`oneblink-approval-flows`, `oneblink-deploy`.

> The pack's own `INSTALL.md` is **agent-driven** (you ask your coding agent to
> install it). This script is the no-agent shortcut for a local dev checkout.

## Run the examples

```bash
npm run discover      # list forms-app environments + the id the examples use
npm run example:1     # simple Contact Us form
npm run example:2     # AU address + server validation + prefill
npm run examples      # both, in order
```

## Example 2, in detail

1. **`create_form`** builds *Contact Us (AU)* from a CSV. The `State` element is
   a select of the 8 AU state codes; `Message` is a `textarea` with
   **`required=false`** — the form does **not** force a message.
2. **`set_form_server_validation`** (`source: "deploy"`) deploys the
   `validation-api/` project to your environment, then points the form's
   `serverValidation` at `POST /validate`. That handler
   (`validation-api/src/validate-submission.js`) **rejects an empty `message`**
   (and validates the AU address) — so a blank message passes the browser form
   but is **rejected at submit time by the server**. This is the check the task
   asks the server to enforce.
3. **`set_form_personalisation`** points the form at `POST /prefill`
   (`validation-api/src/prefill.js`), which returns
   `{ submission: { message: "OneBlink is awesome!" } }`, so the message element
   is **prefilled on load**.

### The hosted API (`validation-api/`)

A standard OneBlink hosted-API project (`.blinkmrc.json` + CommonJS `{ post }`
handlers). Pure validation logic is unit-tested:

```bash
cd validation-api
npm test        # node:test — covers the non-empty message rule, AU state, postcode
```

Deploy it on its own (without re-running example 2):

```bash
npm run deploy:validation-api
npm run deploy:validation-api -- --env prod   # prod requires confirmProduction
```

> **Element-name contract:** prefill and server validation key off the form
> **element names** (`full_name`, `email`, `street_address`, `suburb`, `state`,
> `postcode`, `message` — the snake_case of the labels). If you rename a label,
> update `REQUIRED_NON_EMPTY` in `validation-api/src/validate-submission.js` and
> the key in `validation-api/src/prefill.js` to match.

## Layout

```
oneblink-mcp-demo/
  package.json              # client deps + npm run scripts
  .env.example              # per-session header credentials + server URL
  scripts/
    install-skills.mjs      # npm run install:skills
    deploy-validation-api.mjs
  src/
    mcp.mjs                 # MCP client + credential headers (one place)
    discover.mjs            # resolve a formsAppEnvironmentId
    example1-contact-us.mjs
    example2-contact-us-au.mjs
  validation-api/           # OneBlink hosted API (server validation + prefill)
    .blinkmrc.json
    src/validate.js         # POST /validate  (req/res wrapper)
    src/validate-submission.js  # pure rules: non-empty message, AU address
    src/prefill.js          # POST /prefill   (message = "OneBlink is awesome!")
    test/validate-submission.test.js
```

## Security notes

- The OneBlink key never leaves this process as a tool argument; it rides the
  HTTP session as `X-OneBlink-Access-Key` / `X-OneBlink-Secret-Key`.
- `.env` is gitignored. Keep real keys out of version control and shell history.
- The server binds loopback only; a hosted deployment must terminate TLS in
  front so the credential headers never travel in the clear.
