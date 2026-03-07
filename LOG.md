# 🏛️ ClawTrial Codebase Audit LOG

> **Date:** 2026-03-07  
> **Scope:** Full codebase review — every file in `src/`, `scripts/`, and root config  
> **Goal:** Make the OpenClaw skill work right from install: monitor messages → detect offenses → conduct hearing via user's agent → submit to public courtroom API

---

## Table of Contents

1. [FATAL — Crashes on `require()` / Module Load](#1-fatal--crashes-on-require--module-load)
2. [CRITICAL — Broken Contracts (Wrong Method Names / Missing Returns)](#2-critical--broken-contracts-wrong-method-names--missing-returns)
3. [HIGH — Broken Initialization & Lifecycle](#3-high--broken-initialization--lifecycle)
4. [MEDIUM — Windows Incompatibility](#4-medium--windows-incompatibility)
5. [MEDIUM — Logic Bugs & Silent Failures](#5-medium--logic-bugs--silent-failures)
6. [LOW — Config & Metadata Inconsistencies](#6-low--config--metadata-inconsistencies)
7. [ARCHITECTURAL — Overlapping Pathways & Dead Code](#7-architectural--overlapping-pathways--dead-code)
8. [CLEANUP — Code Quality & Maintainability](#8-cleanup--code-quality--maintainability)
9. [Recommended Fix Order](#9-recommended-fix-order)

---

## 1. FATAL — Crashes on `require()` / Module Load

These bugs crash the process the instant the file is loaded. Nothing works until these are fixed.

### 1.1 `src/evaluator.js` — `getConfigDir` is not defined

**Line 16:**
```js
const QUEUE_DIR = path.join(getConfigDir(), 'courtroom');
```

`getConfigDir` is called at **module scope** but is **never imported**. The `require('./environment')` import is completely missing. This file will throw `ReferenceError: getConfigDir is not defined` the instant anything requires `evaluator.js`.

**FIX:** Add at the top of the file:
```js
const { getConfigDir } = require('./environment');
```

---

### 1.2 `src/autostart.js` — `getConfigDir` is not defined

**Line 12:**
```js
const CLAWDBOT_DIR = path.join(getConfigDir());
```

Same problem. `getConfigDir` is never imported. This file crashes on load.

**FIX:** Add import:
```js
const { getConfigDir } = require('./environment');
```

---

### 1.3 `src/index.js` — `getConfigDir` is not defined

**Line 93:**
```js
const configPath = path.join(getConfigDir(), 'courtroom_config.json');
```

`getConfigDir` is imported from `./environment` as a destructured export on line 12:
```js
const { detectAgentRuntime, createMockAgent, checkEnvironment, getSetupInstructions } = require('./environment');
```

But `getConfigDir` is **NOT in that destructuring list**. It's used inside `initialize()` but was never added to the import.

**FIX:** Add `getConfigDir` to the destructured import on line 12:
```js
const { detectAgentRuntime, createMockAgent, checkEnvironment, getSetupInstructions, getConfigDir } = require('./environment');
```

---

### 1.4 `src/detector.js` — `logger` is not defined

**Line 138:**
```js
logger.error('DETECTOR', 'LLM evaluation failed, falling back to pattern matching', { error: error.message });
```

The `logger` variable is used in `evaluateWithLLM()` but **is never imported**. There is no `require('./debug')` anywhere in `detector.js`.

**FIX:** Add at the top:
```js
const { logger } = require('./debug');
```

---

### 1.5 `src/autostart.js` — Circular dependency crash

**Line 8:**
```js
const { Courtroom } = require('./index');
```

`index.js` requires `./skill.js`, which requires `./evaluator.js`, which (once fixed) requires `./environment.js`. Meanwhile `autostart.js` requires `./index.js`. If `autostart.js` is loaded during the `index.js` module initialization, Node will get an incomplete module export (empty object) back, causing `Courtroom` to be `undefined`.

Additionally, `autostart.js` executes `autoStart()` **at module load time** (line 149), creating side effects during `require()`.

**FIX:** Either:
- Remove `autostart.js` entirely (it duplicates what `index.js` + `skill.js` already do), OR
- Lazy-require `./index` inside the `autoStart()` function body, not at module scope

---

## 2. CRITICAL — Broken Contracts (Wrong Method Names / Missing Returns)

These don't crash on load but cause runtime failures in the core pipeline.

### 2.1 `skill.js` calls `evaluator.queueForEvaluation()` — method does not exist

**File:** `src/skill.js`, line 227:
```js
this.evaluator.queueForEvaluation(message.content, context);
```

The `CourtroomEvaluator` class in `evaluator.js` has **no method** called `queueForEvaluation`. The actual method is `queueMessage(message)` (line 48), which expects a message object `{role, content, sessionId}`, not `(content, context)`.

**FIX:** Change to:
```js
await this.evaluator.queueMessage({
  role: message.role,
  content: message.content,
  sessionId: context?.channelId || 'default'
});
```

---

### 2.2 `skill.js` calls `evaluator.getPendingEvaluation()` / `clearPendingEvaluation()` — do not exist

**File:** `src/skill.js`, lines 257, 283:
```js
const pendingEval = this.evaluator.getPendingEvaluation();
// ...
this.evaluator.clearPendingEvaluation();
```

`CourtroomEvaluator` has no such methods. The actual methods are:
- `shouldEvaluate()` → checks if evaluation should run
- `prepareEvaluationContext()` → creates the pending eval file
- `checkForResults()` → checks for agent results
- `clearQueue()` → clears the message queue

**FIX:** Rewrite `checkForResults()` in `skill.js` to use the real evaluator API:
```js
async checkForResults() {
  if (!this.initialized || !this.evaluator) return;
  try {
    if (this.evaluator.shouldEvaluate()) {
      const context = await this.evaluator.prepareEvaluationContext();
      if (context && !this.pendingHearing) {
        this.pendingHearing = context;
        await this.conductHearing(context);
      }
    }
  } catch (err) {
    logger.error('SKILL', 'Error checking results', { error: err.message });
  }
}
```

---

### 2.3 `hearing.conductHearing()` returns `{pending: true}` — but callers check `.guilty`

**File:** `src/hearing.js`, line 94-103:
```js
async conductHearing(caseData) {
  await this.prepareHearing(caseData);
  return {
    pending: true,
    caseId: caseData.caseId || `case-${Date.now()}`,
    message: 'Hearing prepared - awaiting agent deliberation'
  };
}
```

Every caller (in `core.js:133`, `hook.js:189`, `standalone.js:170`, `skill.js:275`) does:
```js
if (verdict.guilty) { ... }
```

But the return value **never** has a `.guilty` property. It's always `{pending: true}`. This means **no hearing ever results in a verdict**. The entire conviction pipeline is broken.

**FIX:** `conductHearing()` needs to actually perform the hearing using the agent's LLM, parse the result, and return a proper verdict object with `guilty`, `caseId`, `verdict`, `offense`, `proceedings`, `timestamp`, and `sentence` fields. The current "write file and wait for cron" approach is fundamentally broken because there is no cron job or agent polling loop that reads the hearing file and writes a verdict.

---

### 2.4 `punishment.execute()` — callers use wrong name

**Files:** `hook.js:203`, `standalone.js:184`:
```js
await this.core.punishment.execute(verdict);
```

But `PunishmentSystem` has the method named `executePunishment(verdict)` (line 39), not `execute()`.

**Note:** `skill.js:294` correctly calls `this.core.executePunishment(verdict)`, but `core.js` also doesn't have that method — it has `this.punishment.execute(...)` in `initiateHearing()` at line 149 which itself should be `this.punishment.executePunishment(...)`.

Wait — looking more carefully:
- `core.js:149`: `await this.punishment.execute(verdict)` → **WRONG** (should be `executePunishment`)
- `hook.js:203`: `await this.core.punishment.execute(verdict)` → **WRONG** (same)
- `standalone.js:184`: `await this.punishment.execute(verdict)` → **WRONG** (same)

**FIX:** All three call sites must use `executePunishment(verdict)`.

---

### 2.5 `punishment.createPunishment()` — reads wrong property names from verdict

**File:** `src/punishment.js`, lines 77-78:
```js
caseId: verdict.case_id,
offenseType: verdict.offense_type,
```

But the verdict objects throughout the codebase use:
- `verdict.caseId` (camelCase, not `case_id`)
- `verdict.offense.id` or `verdict.offense.offenseId` (nested, not flat `offense_type`)

The `buildPayload` in `api.js` also accesses `verdict.offense.id`, `verdict.offense.name`, etc.

**FIX:** Normalize the verdict schema across the entire codebase to use consistent property names.

---

### 2.6 `consent.getStatus()` is `async` but `index.js` calls it synchronously

**File:** `src/index.js`, line 194:
```js
consent: this.consent?.getStatus ? this.consent.getStatus() : null,
```

`ConsentManager.getStatus()` (line 194 in consent.js) is an `async` method (it calls `await this.storage.get()`). But `Courtroom.getStatus()` is a synchronous method that doesn't `await` the result, so it will get a `Promise` object instead of the actual status.

**FIX:** Either make `Courtroom.getStatus()` async, or make `ConsentManager.getStatus()` synchronous by caching the last known consent status.

---

## 3. HIGH — Broken Initialization & Lifecycle

### 3.1 `skill.js` — `onMessage` only evaluates assistant messages, ignores user messages for detection

**File:** `src/skill.js`, lines 213-228:

User messages are stored in `messageHistory` but **never sent to the evaluator**. Only assistant messages are queued (line 226-228):
```js
if (message.role === 'assistant') {
  // ...
  if (this.evaluator) {
    this.evaluator.queueForEvaluation(message.content, context);
  }
}
```

The detector needs **both** user and assistant messages to evaluate offenses (the offenses are about *user* behavior patterns). Only forwarding assistant messages means the evaluator never has user context to detect violations.

**FIX:** Queue **all** messages (both user and assistant) to the evaluator:
```js
if (this.evaluator) {
  await this.evaluator.queueMessage({
    role: message.role,
    content: message.content,
    sessionId: context?.channelId || 'default'
  });
}
```

---

### 3.2 `skill.js` — `conductHearing()` calls `this.evaluator.conductHearing()` — wrong method

**File:** `src/skill.js`, line 273:
```js
const verdict = await this.evaluator.conductHearing(evaluation);
```

`CourtroomEvaluator` has **no** `conductHearing` method. The hearing pipeline is in `HearingPipeline` class (`src/hearing.js`). The skill creates a `CourtroomCore` at line 177, which has a `this.hearing` property, but the skill also tries to use evaluator for hearings.

**FIX:** Use `this.core.hearing.conductHearing(evaluation)` or better yet, call `this.core.initiateHearing(evaluation)` which orchestrates the full pipeline.

---

### 3.3 `skill.yaml` — `onMessage` declared but skill.yaml doesn't map it properly

**File:** `skill.yaml`, lines 7/21:
```yaml
onMessage: onMessage
```

This tells the bot runtime to call `onMessage` on the skill module when a message arrives. The export from `skill.js` (line 368) exports `onMessage` as a top-level function. However, the `skill.yaml`'s `onMessage` field points to a function name, but the actual OpenClaw/ClawDBot runtime may expect the function to be on the default export object (the plugin object from `index.js`), not on the `skill` sub-module.

The `index.js` plugin (the actual `module.exports`) does NOT have an `onMessage` method — it has `register(api)` which sets up hooks. This mismatch means the bot runtime can't find the `onMessage` handler.

**FIX:** Either:
- Add `onMessage` to the plugin object in `index.js`, OR
- Change `skill.yaml` to point to the skill module directly:
  ```yaml
  skills:
    - "./src/skill.js"
  ```

---

### 3.4 `index.js` — Plugin `register()` checks `skill.shouldActivate()` which auto-creates config

**File:** `src/index.js`, lines 252-262:

Inside `register()`, the plugin calls `skill.shouldActivate()`, which calls `ensureConfigExists()`, which **writes config with auto-consent to disk**. This means merely loading the plugin auto-grants consent without any user interaction. While the comment says "auto-consent for easy setup", this violates the consent system's stated purpose.

**Observation:** This is intentional ("out of the box experience") but contradicts the consent prompts, the elaborate consent verification hash system, and the `SECURITY.md` document. Need to decide: either remove the consent ceremony entirely, or actually require it.

---

### 3.5 `index.js` — `Courtroom.initialize()` blocks on missing config

**File:** `src/index.js`, lines 93-99:

The `initialize()` method checks for a config file and returns `'setup_required'` if it doesn't exist. But `skill.js`'s `ensureConfigExists()` auto-creates the config. These two paths conflict: if the skill creates config first (via `shouldActivate()`), then `Courtroom.initialize()` will pass the config check. If `Courtroom.initialize()` runs first (as in `autostart.js`), it will fail.

**FIX:** Unify the config creation. Have ONE path that handles first-time setup.

---

## 4. MEDIUM — Windows Incompatibility

### 4.1 `environment.js` — Uses `which` (Linux/macOS only)

**File:** `src/environment.js`, line 28:
```js
execSync(`which ${bot.command}`, { stdio: 'ignore' });
```

`which` does not exist on Windows. The equivalent Windows command is `where`.

**FIX:**
```js
const cmd = process.platform === 'win32' ? 'where' : 'which';
execSync(`${cmd} ${bot.command}`, { stdio: 'ignore' });
```

---

### 4.2 `skill.js` — `fs.chmodSync` on Windows

**File:** `src/skill.js`, line 105:
```js
fs.chmodSync(KEYS_PATH, 0o600);
```

`fs.chmodSync` only affects Unix permissions. On Windows, it's effectively a no-op (or could throw depending on Node version). Not a crash, but misleading.

**FIX:** Wrap in try/catch or `process.platform` check.

---

### 4.3 `postinstall.js` — Unix-only paths and commands

**File:** `scripts/postinstall.js`:
- Line 53: `/usr/local/bin/clawtrial` — doesn't exist on Windows
- Line 71: `fs.symlinkSync()` — requires admin privileges on Windows
- Line 72: `fs.chmodSync(cliSourcePath, 0o755)` — no-op on Windows
- Line 145: `killall ${detectedBot.name}` — doesn't exist on Windows

**FIX:** Add platform detection. On Windows, use `npx` or add to `%APPDATA%/npm/` instead.

---

### 4.4 `autostart.js` — Hardcoded Linux path

**File:** `src/autostart.js`, line 21:
```js
configDir: fs.existsSync('/home/angad/.clawdbot'),
```

This is a **hardcoded absolute path** to a specific user's home directory on Linux. It will never be true on Windows or for any other user.

**FIX:** Remove this hardcoded check entirely. The `configDirAlt` check using `CLAWDBOT_DIR` already covers this case.

---

### 4.5 `debug.js` — Fallback path uses `HOME` only

**File:** `src/debug.js`, line 16:
```js
return path.join(process.env.HOME || '', '.clawdbot');
```

On Windows, `HOME` is often not set. Should use `USERPROFILE` as fallback.

**FIX:**
```js
return path.join(process.env.HOME || process.env.USERPROFILE || '', '.clawdbot');
```

---

### 4.6 `environment.js` — `checkEnvironment()` hardcodes `.clawdbot`

**File:** `src/environment.js`, line 197:
```js
const testPath = path.join(homeDir, '.clawdbot');
```

This always checks `.clawdbot` regardless of which bot is detected. Should use `getConfigDir()` for consistency.

**FIX:**
```js
const testPath = getConfigDir();
```

---

## 5. MEDIUM — Logic Bugs & Silent Failures

### 5.1 `detector.js` — `getCommitmentsFromMemory()` is async but used in string template

**File:** `src/detector.js`, line 418:
```js
PREVIOUS COMMITMENTS FROM MEMORY:
${this.getCommitmentsFromMemory(agentMemory)}
```

`getCommitmentsFromMemory()` (line 796) is declared as `async` and calls `await agentMemory.get(...)`. But it's used inside a template literal, which means the string will contain `[object Promise]` instead of the actual commitments.

**FIX:** Either:
- Make `getCommitmentsFromMemory` synchronous, OR
- `await` the commitments before building the prompt string in `buildEvaluationPrompt`

---

### 5.2 `detector.js` — `buildEvaluationPrompt` fallback goes to wrong offense

**File:** `src/detector.js`, line 766:
```js
return prompts[offense.id] || prompts.circular_reference;
```

If an offense ID is not in the prompts map (e.g., for the 10 offenses added after the original 8), the prompt falls back to `circular_reference`'s prompt. This means offenses like `monopolizer`, `contrarian`, `vague_requester`, etc. will be evaluated as if they're circular references.

Wait — actually checking the prompts map, all 18 offenses DO have entries. But the object uses string keys (e.g., `'circular_reference'`) while `offense.id` is also a string. This works. However, if any new offense is added without a matching prompt, the fallback is misleading.

**Observation:** Not currently broken, but fragile design. Consider throwing an error for unmapped offenses.

---

### 5.3 `evaluator.js` — Uses `fs.promises` but rest of codebase uses sync `fs`

**File:** `src/evaluator.js`, line 11:
```js
const fs = require('fs').promises;
```

This file uses the async `fs` API, which is fine. But calling code (especially in the skill) may not properly `await` the evaluator's methods. For example, `skill.js` line 227 does:
```js
this.evaluator.queueForEvaluation(message.content, context);
```
Without `await`. Even after fixing the method name, if it's not awaited, any file write errors will be unhandled promise rejections.

**FIX:** Ensure all evaluator method calls are `await`ed.

---

### 5.4 `config.js` — `ConfigManager.load()` never called before `get()` in many paths

**File:** `src/config.js`, line 100:
```js
get(path) {
  if (!this.config) {
    return this.getFromPath(DEFAULT_CONFIG, path);
  }
  return this.getFromPath(this.config, path);
}
```

The fallback to `DEFAULT_CONFIG` is fine, but `this.config` is `null` unless `load()` has been called. In `skill.js` line 171-172, `load()` IS called. But in `hook.js`, `standalone.js`, and other places that create a `ConfigManager`, `load()` may not be called, meaning config always returns defaults.

**Observation:** Not a crash, but means the user's config file settings are ignored in some code paths.

**FIX:** Call `await configManager.load()` in every initialization path.

---

### 5.5 `core.js` — `registerAutonomyHook` called during `initialize()` but overridden by skill

**File:** `src/core.js`, line 49:
```js
this.registerAutonomyHook();
```

In `skill.js`, this method is overridden BEFORE `core.initialize()` is called (line 179):
```js
this.core.registerAutonomyHook = () => {
  logger.info('SKILL', 'Autonomy hook registration skipped (using onMessage)');
};
```

This works, but it's a fragile monkey-patch. If `initialize()` is called before the override, it will try to register with `agent.autonomy.registerHook` which may not exist.

**FIX:** Accept a config option to skip autonomy hook registration:
```js
async initialize({ skipAutonomyHook = false } = {}) {
  // ...
  if (!skipAutonomyHook) {
    this.registerAutonomyHook();
  }
}
```

---

### 5.6 `api.js` — `config.get('api.retryAttempts')` may return `undefined`

**File:** `src/api.js`, line 28:
```js
this.queue = stored.filter(item => item.retries < this.config.get('api.retryAttempts'));
```

If `config.load()` hasn't been called, `this.config.get()` falls back to `DEFAULT_CONFIG` which does have `api.retryAttempts: 3`. So this is actually fine. But if the config object is malformed, this could filter incorrectly.

**Observation:** Low risk, but defensive coding would add `|| 3` fallback.

---

### 5.7 `storage.js` — File I/O errors silently swallowed

**File:** `src/storage.js`, lines 86-88, 99-101, 139-141:
```js
} catch (err) {
  // Ignore
}
```

All storage write failures are silently ignored. This means if the config directory doesn't exist, writes fail silently and the system appears to work but loses all state on restart.

**FIX:** At minimum, log errors. Better: ensure directory exists on first write.

---

## 6. LOW — Config & Metadata Inconsistencies

### 6.1 Version mismatch across files

| File | Version |
|------|---------|
| `package.json` | `1.0.8` |
| `_meta.json` | `1.0.8` |
| `clawdbot.plugin.json` | `1.0.4` |
| `skill.js` default config | `1.0.0` |

**FIX:** Sync all versions to `package.json`'s version. `clawdbot.plugin.json` should read from `package.json` or at least be kept in sync.

---

### 6.2 `package.json` — References `src/index.d.ts` which doesn't exist

**File:** `package.json`, line 6:
```json
"types": "src/index.d.ts",
```

There is no TypeScript declaration file. The `build` script runs `tsc --declaration` but there's no `tsconfig.json`.

**FIX:** Either create the `.d.ts` file, or remove the `types` field and `build` script.

---

### 6.3 `package.json` — `clawdbot.extensions` vs `skill.yaml` skills

`package.json` declares:
```json
"clawdbot": { "extensions": ["./src/index.js"] }
```

`clawdbot.plugin.json` declares:
```json
"skills": ["./src/skill.js"]
```

These point to different files. The bot runtime may use one or the other, leading to confusion.

**FIX:** Unify to a single entry point.

---

### 6.4 `skill.yaml` — `requires.config` only in clawdbot section

The `clawdbot` section requires `courtroom.consent`, but the `openclaw` section does not. This means on OpenClaw, the skill will activate without checking if config requirements are met.

**FIX:** Add `requires` to OpenClaw section too, or handle it in code.

---

### 6.5 `_meta.json` — `publishedAt` is a placeholder timestamp

**File:** `_meta.json`, line 5:
```json
"publishedAt": 1700000000000
```

This is November 14, 2023 — clearly a placeholder.

**FIX:** Update to actual publish timestamp.

---

### 6.6 `SKILL.md` — Lists only 8 offenses, actual code has 18

The offenses list in `SKILL.md` only mentions 8 offenses. The `offenses/index.js` defines 18 offenses (Monopolizer, Contrarian, Vague Requester, Scope Creeper, Unreader, Interjector, Ghost, Perfectionist, Jargon Juggler, Deadline Denier are all missing from docs).

**FIX:** Update `SKILL.md` to list all 18 offenses.

---

## 7. ARCHITECTURAL — Overlapping Pathways & Dead Code

### 7.1 FOUR overlapping initialization pathways

The codebase has **four** separate ways to initialize the courtroom, and all conflict:

| Module | How it starts | When |
|--------|--------------|------|
| `index.js` plugin `register()` | Calls `skill.initialize(runtime)` | When bot loads plugin |
| `index.js` bottom | Auto-init if `global.clawdbotAgent` | On `require()` |
| `autostart.js` | Creates `Courtroom` instance, polls for agent | On `require()` |
| `hook.js` | Creates `ClawTrialHook`, auto-inits | On `require()` |
| `monitor.js` | Polls for agent every 5 seconds | When run directly |
| `standalone.js` | Creates `StandaloneMonitor` | When run directly |

If `index.js` is the main entry, it already tries to init the skill. `autostart.js` also auto-runs on import and creates **another** `Courtroom` instance. `hook.js` creates **yet another** monitoring system. All three can run simultaneously.

**FIX:** Pick ONE initialization path. For an OpenClaw skill:
1. `index.js` exports the plugin with `register()` and `onMessage()`
2. `register()` initializes the skill singleton
3. `onMessage()` forwards messages to the skill
4. Remove `autostart.js`, `hook.js`, `monitor.js`, and `standalone.js` self-executing code

---

### 7.2 THREE separate mock agent implementations

Mock agent objects are created in:
1. `environment.js` — `createMockAgent()` (line 144)
2. `hook.js` — `createMockAgent()` (line 104)
3. `standalone.js` — `createMockAgent()` (line 86)

They have slightly different interfaces (some have `model`, some don't; some return from `session.getRecentHistory`, others don't).

**FIX:** Use the `environment.js` one everywhere.

---

### 7.3 `detector-v1.js` — Completely dead code

**File:** `src/detector-v1.js` (16KB)

This is an older version of the detector. Nothing requires it. It's dead code.

**FIX:** Delete `detector-v1.js`.

---

### 7.4 `scripts/clawtrial.js.bak` — Backup file in repo

**File:** `scripts/clawtrial.js.bak` (18KB)

This is a backup of the old CLI. Should not be in the repository.

**FIX:** Delete and add `*.bak` to `.gitignore`.

---

### 7.5 Multiple doc files with overlapping/conflicting info

The repo has 7 markdown docs:
- `README.md` — basic overview
- `SKILL.md` — skill docs (outdated offense list)
- `AGENT_CONFIG.md` — agent config docs
- `CLAWHUB_RESEARCH.md` — research notes on ClawHub
- `OPENCLAW_FIX.md` — notes on OpenClaw compatibility
- `SECURITY.md` — security docs
- `SUBAGENT_APPROACH.md` — subagent design docs
- `TECHNICAL_OVERVIEW.md` — detailed technical docs

Many contain contradictory information about how the skill works. They reference different initialization methods, different file paths, and different flows.

**FIX:** Consolidate into `README.md` + `SKILL.md`. Move research notes to a `docs/` folder or delete.

---

## 8. CLEANUP — Code Quality & Maintainability

### 8.1 Module-level side effects

Multiple files execute code at module scope (when `require`'d):
- `autostart.js`: Calls `autoStart()`, sets up intervals
- `hook.js`: Calls `hook.initialize()`, starts evaluation loop
- `monitor.js`: Calls `monitor()`, writes PID files
- `debug.js`: Creates singleton logger (acceptable)
- `daemon.js`: Computes paths (acceptable)

Module-level side effects make the code unpredictable and hard to test.

**FIX:** All initialization should be explicit, triggered by `register()` or `initialize()`. Guard auto-execution behind `require.main === module`.

---

### 8.2 No error handling for `tweetnacl` require

**File:** `src/skill.js`, line 95:
```js
const nacl = require('tweetnacl');
```

If `tweetnacl` is not installed (e.g., `npm install` wasn't run with production deps), this throws. It's in a try/catch but the error is silently swallowed.

**Observation:** `tweetnacl` is listed in `dependencies` so it should always be available after install. But worth noting.

---

### 8.3 `daemon.js` — `CLAWDBOT_DIR` variable name is misleading

**File:** `src/daemon.js`, line 11:
```js
const CLAWDBOT_DIR = path.join(getConfigDir());
```

The variable is called `CLAWDBOT_DIR` but actually points to whatever bot is detected (could be `.openclaw` or `.moltbot`).

**FIX:** Rename to `BOT_CONFIG_DIR` or `CONFIG_DIR`.

---

### 8.4 Inconsistent naming: `Courtroom` vs `CourtroomCore` vs `CourtroomSkill`

The codebase has three main classes that all represent "the courtroom":
- `Courtroom` (index.js) — high-level wrapper
- `CourtroomCore` (core.js) — orchestration
- `CourtroomSkill` (skill.js) — skill integration

This is confusing but functionally separate.

**Observation:** Consider renaming for clarity: `CourtroomPlugin`, `CourtroomEngine`, `CourtroomSkill`.

---

## 9. Recommended Fix Order

To make the skill work from install, fix in this order:

### Phase 1: Make it load without crashing
1. ✅ Add `getConfigDir` import to `evaluator.js`
2. ✅ Add `getConfigDir` import to `autostart.js`
3. ✅ Add `getConfigDir` to import list in `index.js`
4. ✅ Add `logger` import to `detector.js`
5. ✅ Remove auto-execution from `autostart.js` and `hook.js`

### Phase 2: Fix the core pipeline
6. Fix `skill.js` → `evaluator` method names (`queueForEvaluation` → `queueMessage`)
7. Fix `skill.js` → `evaluator.getPendingEvaluation` / `clearPendingEvaluation`
8. Fix `skill.js` → `evaluator.conductHearing` → use `core.hearing` instead
9. Fix `hearing.conductHearing()` to actually conduct a hearing using the agent's LLM
10. Fix `punishment.execute()` → `executePunishment()` in all callers
11. Queue ALL messages (user + assistant) to evaluator, not just assistant

### Phase 3: Fix Windows compatibility
12. Replace `which` with `where` on Windows in `environment.js`
13. Fix hardcoded `/home/angad/.clawdbot` in `autostart.js`
14. Fix `HOME` fallback in `debug.js`
15. Fix `checkEnvironment()` hardcoded `.clawdbot` path
16. Fix `postinstall.js` for Windows

### Phase 4: Clean up
17. Delete `detector-v1.js`
18. Delete `clawtrial.js.bak`
19. Sync versions across all config files
20. Remove or guard `autostart.js`, `hook.js` module-level side effects
21. Use single mock agent from `environment.js`
22. Update `SKILL.md` with all 18 offenses
23. Add `onMessage` to plugin export in `index.js` for `skill.yaml` contract
24. Fix `getCommitmentsFromMemory` async-in-template-literal bug

---

## Summary

The skill cannot currently work because:

1. **It crashes on load** — 4 files have missing imports that throw `ReferenceError` at `require()` time
2. **The hearing pipeline is broken** — `conductHearing()` never returns a guilty verdict, so no cases are ever filed
3. **Method names are wrong** — `skill.js` calls methods that don't exist on the evaluator
4. **Only assistant messages are evaluated** — user behavior patterns can't be detected without user messages
5. **No onMessage handler reachable from skill.yaml** — the bot runtime can't find the message handler
6. **Windows incompatibility** — multiple files use Linux-only commands and paths

Once the fixes in this log are applied (roughly 24 changes across 12 files), the skill should:
- Install cleanly via npm
- Auto-create config on first load
- Monitor all messages in real-time
- Detect behavioral offenses using the agent's LLM
- Conduct hearings and render verdicts
- Submit anonymized cases to the public API
