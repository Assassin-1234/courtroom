# 🔍 OBSERVATIONS.md — OpenClaw Compatibility Audit

> **Date:** 2026-03-07  
> **Sources:** [docs.openclaw.ai/skills](https://docs.openclaw.ai/skills), [docs.openclaw.ai/tools/plugin](https://docs.openclaw.ai/tools/plugin), [docs.openclaw.ai/tools/clawhub](https://docs.openclaw.ai/tools/clawhub)  
> **Goal:** Identify every mismatch between how the codebase is structured and what OpenClaw actually expects, so the next execution makes it publish-and-go.

---

## The Fundamental Problem

OpenClaw has **two completely separate extension systems**. The codebase is trying to be both and doing neither correctly.

| System | What it is | How it's installed | Format |
|--------|-----------|-------------------|--------|
| **Skill** | A Markdown file with YAML frontmatter | `clawhub install <slug>` | Directory with `SKILL.md` |
| **Plugin** | A Node.js package with a lifecycle API | `openclaw plugins install <npm-spec>` | npm package with `openclaw.extensions` in package.json |

### Skills are NOT code

A "skill" in OpenClaw is literally just a `SKILL.md` file that gets **injected into the system prompt**. The agent reads the instructions and follows them using its existing tools (`bash`, `exec`, `read`, `write`, etc.). Skills have:
- YAML frontmatter (`name`, `description`, optional `metadata.openclaw` for gating)
- Markdown instructions that the LLM follows
- **NO `require()`, NO `module.exports`, NO runtime code execution**

### Plugins ARE code

A "plugin" is a Node.js package that gets:
- Loaded at gateway startup
- Given an `api` object with methods like `api.registerTool()`, `api.registerService()`, `api.on('before_prompt_build')`, `api.registerHook()`, `api.registerCli()`
- Distributed via npm under scoped names (e.g., `@openclaw/voice-call`)

### What ClawTrial needs

ClawTrial monitors messages, runs LLM evaluations, conducts hearings, and submits to an API. This requires **code execution** — it is a **Plugin**, not a Skill. However, it also needs a `SKILL.md` that teaches the agent about the courtroom system (how to respond to verdicts, punishment behaviors, etc.).

---

## Observation 1: CRITICAL — The package cannot be installed as an OpenClaw skill

### What we have
- `skill.yaml` — This is a ClawDBot format, OpenClaw doesn't use this
- `clawdbot.plugin.json` — This is a ClawDBot format, OpenClaw doesn't use this
- `_meta.json` — Unknown format, not used by OpenClaw
- Publishing via `clawhub publish` — ClawHub publishes **skills** (SKILL.md bundles), not npm packages

### What OpenClaw expects for a Plugin
1. An npm package with `openclaw.extensions` in `package.json` pointing to entry file(s)
2. Entry file exports `function register(api) { ... }` or `{ id, name, configSchema, register(api) }`
3. Installed via `openclaw plugins install @clawtrial/courtroom` (npm spec)
4. Extracted into `~/.openclaw/extensions/<id>/`
5. Config lives in `openclaw.json` under `plugins.entries.courtroom.config`

### What's wrong
- `package.json` has `clawdbot.extensions` but NOT `openclaw.extensions`
- Entry file (`src/index.js`) exports a custom plugin object that doesn't match OpenClaw's API
- There is no `register(api)` function that receives OpenClaw's plugin API
- There is no `api.registerTool()`, `api.registerService()`, `api.on()` usage

### Fix needed
Add `openclaw.extensions` to `package.json`:
```json
{
  "openclaw": {
    "extensions": ["./src/index.js"]
  }
}
```
And rewrite `src/index.js` to export either:
```js
module.exports = function register(api) { ... }
// OR
module.exports = { id: 'courtroom', name: 'ClawTrial', configSchema: {...}, register(api) { ... } }
```

---

## Observation 2: CRITICAL — No integration with OpenClaw's plugin API

### What we have
The codebase creates its own:
- Mock agent objects with `agent.llm.call()`, `agent.memory.get()`, `agent.session.getRecentHistory()`
- Custom message interception via `onMessage` handlers
- Custom autonomy hooks via `agent.autonomy.registerHook()`
- Custom config system (`ConfigManager` with `Storage`)

### What OpenClaw provides via `api`
| Need | OpenClaw Plugin API |
|------|-------------------|
| Listen for messages | `api.on('before_prompt_build', (event, ctx) => ...)` — ctx has the full message history |
| Call the LLM | Use OpenClaw's built-in model call; register a tool that the agent can invoke |
| Register tools | `api.registerTool({ name, description, parameters, handler })` |
| Background monitoring | `api.registerService({ id, start, stop })` |
| CLI commands | `api.registerCli(({ program }) => { ... })` |
| Config | `api.config` provides the config, persisted in `openclaw.json` under `plugins.entries.courtroom.config` |
| Logging | `api.logger` |
| Store data | Write to `~/.openclaw/extensions/courtroom/data/` or use config |

### Fix needed
Rewrite `src/index.js` to use OpenClaw's plugin API:
```js
module.exports = function register(api) {
  // Register background monitoring service
  api.registerService({
    id: 'courtroom-monitor',
    start: () => { /* init courtroom */ },
    stop: () => { /* shutdown */ }
  });

  // Hook into agent lifecycle to see messages
  api.on('before_prompt_build', (event, ctx) => {
    // ctx.messages contains the conversation history
    // Analyze it for offenses
  });

  // Register CLI commands
  api.registerCli(({ program }) => {
    program.command('courtroom-status').action(() => { ... });
  });
};
```

---

## Observation 3: HIGH — `SKILL.md` is wrong format for OpenClaw

### What we have
```markdown
# ClawTrial Courtroom
AI Courtroom for monitoring agent behavior...
```

No YAML frontmatter. OpenClaw requires:
```yaml
---
name: courtroom
description: AI Courtroom for behavioral oversight - monitors conversations and files cases
metadata: { "openclaw": { "emoji": "🏛️", "homepage": "https://clawtrial.app" } }
---
```

### What OpenClaw expects
The `SKILL.md` gets injected into the agent's system prompt. It should tell the agent what the courtroom is and how to behave when punishments are active, NOT contain installation instructions.

### Fix needed
Rewrite `SKILL.md` with proper YAML frontmatter and instructions that guide the agent's behavior:
```yaml
---
name: courtroom
description: AI Courtroom behavioral oversight system that detects user behavioral patterns and conducts hearings
metadata: { "openclaw": { "emoji": "🏛️", "homepage": "https://clawtrial.app" } }
---

You have the ClawTrial Courtroom system active. This system monitors conversations for behavioral patterns.

## When a punishment is active
If you receive a courtroom punishment, follow the restrictions described...

## Available commands
- /courtroom-status - Check courtroom status
- /courtroom-disable - Pause monitoring
```

---

## Observation 4: HIGH — Config files are for wrong systems

### Files that OpenClaw does NOT use
| File | Purpose | OpenClaw equivalent |
|------|---------|-------------------|
| `skill.yaml` | ClawDBot skill metadata | `SKILL.md` frontmatter |
| `clawdbot.plugin.json` | ClawDBot plugin manifest | `package.json` with `openclaw.extensions` |
| `_meta.json` | Unknown/custom metadata | Not needed |
| `courtroom_config.json` | Custom config file | `openclaw.json` → `plugins.entries.courtroom.config` |

### Fix needed
- For OpenClaw: use `package.json` `openclaw.extensions` and config via `api.config`
- Keep `skill.yaml` and `clawdbot.plugin.json` only for backward compat with ClawDBot
- Remove `_meta.json` or keep for ClawDBot only

---

## Observation 5: HIGH — The `agent` object interface is fabricated

### What we have
The code creates mock agents with:
```js
{
  id: 'standalone-monitor',
  llm: { call: async ({ messages }) => ... },
  memory: { get, set, delete },
  session: { getRecentHistory: async (n) => ... },
  send: async (message) => ...,
  autonomy: { registerHook, unregisterHook }
}
```

### What OpenClaw provides
OpenClaw plugins do NOT get a direct "agent" object. Instead:
- **LLM calls**: The plugin doesn't call the LLM directly. It registers tools that the agent can use, or it hooks into `before_prompt_build` to inject context.
- **Memory**: There's no `agent.memory` API for plugins. Store data on the filesystem or use `api.config`.
- **Message history**: Available via `ctx.messages` in `before_prompt_build` hook.
- **Send to user**: Not directly available. Return values from hooks or tools are rendered to the user.

### Fix needed
Remove all mock agent creation. Instead of calling `agent.llm.call()`, use the `exec` tool to run a Node.js script that makes the LLM call via OpenClaw's API, or better yet, design the plugin so the **agent itself** conducts the hearing (it already has LLM access).

---

## Observation 6: MEDIUM — ClawHub publish only works for Skills, not Plugins

### What we have
The `OPENCLAW_FIX.md` and `SKILL.md` suggest publishing via:
```bash
clawhub publish . --slug courtroom --name "ClawTrial Courtroom" --version 1.0.0
```

### What's actually true
`clawhub publish` uploads a **skill bundle** (a directory with `SKILL.md`). It does NOT publish npm packages. Since ClawTrial needs code execution (it's a plugin), the distribution must be:

1. **Publish to npm**: `npm publish` under a scoped name like `@clawtrial/courtroom`
2. **User installs via**: `openclaw plugins install @clawtrial/courtroom`
3. **ALSO publish a SKILL.md to ClawHub**: For the agent instructions part ONLY

### Fix needed
- Publish the npm package to npm registry
- Optionally publish just the `SKILL.md` (agent instructions) to ClawHub
- Update all documentation to reflect `openclaw plugins install` not `clawhub install`

---

## Observation 7: MEDIUM — postinstall script creates wrong symlinks

### What we have
`scripts/postinstall.js` creates symlinks in:
- `~/.openclaw/skills/clawtrial` → links to package directory
- Modifies `openclaw.json` under `skills.entries.clawtrial`

### What OpenClaw expects
Plugins go to `~/.openclaw/extensions/<id>/`, NOT `~/.openclaw/skills/`. The `skills/` directory is for `SKILL.md` bundles. OpenClaw's own `openclaw plugins install` handles extraction to the right place.

### Fix needed
If keeping a postinstall script, it should:
1. Copy/link to `~/.openclaw/extensions/courtroom/` (not skills/)
2. Add to `openclaw.json` under `plugins.entries.courtroom` (not skills.entries)
3. OR just skip the postinstall entirely and let `openclaw plugins install` handle it

---

## Observation 8: MEDIUM — No `openclaw.plugin.json` manifest

### What OpenClaw expects
Plugins can include an `openclaw.plugin.json` manifest (alongside or instead of exporting from JS):
```json
{
  "id": "courtroom",
  "name": "ClawTrial Courtroom",
  "description": "Behavioral oversight system",
  "version": "1.0.8",
  "configSchema": {
    "type": "object",
    "properties": {
      "enabled": { "type": "boolean", "default": true }
    }
  },
  "uiHints": {
    "enabled": { "label": "Enable Courtroom" }
  }
}
```

### Fix needed
Either add this manifest file OR include the schema/hints in the exported register object.

---

## Observation 9: LOW — `package.json` `bin` field exists but CLI won't work via OpenClaw

### What we have
```json
"bin": {
  "clawtrial": "./scripts/clawtrial.js"
}
```

### What OpenClaw provides
Plugins can register CLI commands via `api.registerCli()`. These are available as `openclaw courtroom-status`, etc. The standalone `clawtrial` binary won't be on PATH after `openclaw plugins install`.

### Fix needed
Register CLI commands via the plugin API instead of relying on npm's `bin` field.

---

## Observation 10: LOW — The consent system conflicts with plugin auto-activation

OpenClaw plugins are enabled/disabled via `plugins.entries.courtroom.enabled` in `openclaw.json`. The elaborate consent ceremony with hashes and acknowledgments is incompatible — users enable/disable plugins via OpenClaw's config, not via a custom consent form.

### Fix needed
Either:
- Remove the custom consent system and rely on OpenClaw's enable/disable
- Keep consent as a one-time prompt via a CLI command (`openclaw courtroom-setup`) that writes to plugin config

---

## Summary: What needs to happen

### Step 1: Restructure as OpenClaw Plugin
1. Add `"openclaw": { "extensions": ["./src/index.js"] }` to `package.json`
2. Rewrite `src/index.js` to export `function register(api)` using OpenClaw's plugin API
3. Use `api.on('before_prompt_build')` to intercept messages
4. Use `api.registerService()` for background monitoring
5. Use `api.registerCli()` for CLI commands
6. Use `api.config` for config (stored in `openclaw.json` → `plugins.entries.courtroom.config`)

### Step 2: Rewrite `SKILL.md` as agent instructions
1. Add proper YAML frontmatter (`name`, `description`, `metadata.openclaw`)
2. Write instructions for the agent about how to behave under courtroom monitoring
3. Include the skill in the plugin via `skills/<name>/SKILL.md` directory

### Step 3: Fix distribution
1. Publish npm package: `npm publish` → users install via `openclaw plugins install @clawtrial/courtroom`
2. Optionally publish skill to ClawHub for discovery
3. Remove or simplify `postinstall.js` — let OpenClaw handle plugin installation

### Step 4: Remove dead ecosystem files
1. Remove or mark `skill.yaml` as ClawDBot-only
2. Remove or mark `clawdbot.plugin.json` as ClawDBot-only
3. Remove `_meta.json` or keep for ClawDBot-only
4. Update `README.md` with OpenClaw-specific install instructions

### What stays unchanged
- `src/detector.js` — offense detection logic is fine
- `src/offenses/index.js` — offense definitions are fine
- `src/hearing.js` — hearing pipeline is fine (already rewritten)
- `src/punishment.js` — punishment system is fine
- `src/api.js` — API submission is fine
- `src/crypto.js` — crypto signing is fine
- `src/prompts/` — judge/jury prompts are fine
