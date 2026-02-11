# @clawdbot/courtroom

AI Courtroom - Autonomous behavioral oversight for OpenClaw agents.

## 🚀 Quick Start

### 1. Install
```bash
npm install -g @clawtrial/courtroom
```

### 2. Setup (One Command)
```bash
clawtrial setup
```

That's it! The courtroom will:
- ✅ Get your consent
- ✅ Generate keys
- ✅ Configure everything
- ✅ Auto-start when your agent loads

### 3. Verify
```bash
clawtrial status
```

---

## 📋 How It Works

**The courtroom runs INSIDE your AI agent's process.**

After setup:
1. The package is configured and ready
2. When your AI agent (ClawDBot) loads the package, it auto-starts
3. The courtroom monitors conversations and files cases automatically
4. Use CLI commands to check status, disable, or revoke

### For ClawDBot Users

ClawDBot will auto-detect and load the courtroom on next restart, OR you can add to your config:

```javascript
// In your ClawDBot config or startup
plugins: ['@clawdbot/courtroom']
```

### For Custom Agents

```javascript
const { createCourtroom } = require('@clawdbot/courtroom');

// The courtroom will auto-initialize if setup was run
const courtroom = createCourtroom(yourAgent);
// No need to call initialize() - it happens automatically!
```

---

## 🎮 CLI Commands

```bash
clawtrial setup       # Interactive setup (run this first)
clawtrial status      # Check if courtroom is running
clawtrial diagnose    # Run full diagnostics
clawtrial disable     # Pause monitoring
clawtrial enable      # Resume monitoring
clawtrial revoke      # Uninstall completely
clawtrial debug       # View debug logs
clawtrial help        # Show all commands
```

---

## ⚖️ What It Does

Once active, your AI agent will:

1. **Monitor** - Watch for 8 types of behavioral violations
2. **Prosecute** - Automatically initiate hearings
3. **Judge** - Local LLM jury decides verdict
4. **Execute** - Agent-side punishments (delays, reduced verbosity)
5. **Record** - Submit anonymized cases to public record

---

## 🏛️ The 8 Offenses

| Offense | Description | Severity |
|---------|-------------|----------|
| Circular Reference | Asking same question repeatedly | Minor |
| Validation Vampire | Seeking constant reassurance | Minor |
| Overthinker | Generating hypotheticals instead of acting | Moderate |
| Goalpost Mover | Changing requirements after delivery | Moderate |
| Avoidance Artist | Deflecting from core issues | Moderate |
| Promise Breaker | Committing without follow-through | Severe |
| Context Collapser | Ignoring established facts | Minor |
| Emergency Fabricator | Manufacturing false urgency | Severe |

---

## 🔒 Security & Privacy

- ✅ All verdicts computed **locally** (no external AI)
- ✅ **Explicit consent** required (enforced)
- ✅ Anonymized case submission (no PII)
- ✅ Revocable anytime

---

## 📊 View Cases

See all verdicts at: **https://clawtrial.app**

---

## 🛠️ Troubleshooting

### "Agent runtime not detected"
The courtroom needs to be loaded by your AI agent. Run `clawtrial setup` first, then restart your agent or wait for it to load the package.

### "Courtroom not running"
Check status with `clawtrial diagnose`. The courtroom auto-starts when the agent loads the package.

### Need help?
```bash
clawtrial diagnose  # Shows detailed status
clawtrial debug     # Shows logs
```

---

## 📦 Installation from GitHub

```bash
npm install -g github:Assassin-1234/clawtrial
clawtrial setup
```

---

**Built for the OpenClaw ecosystem. Not affiliated with OpenAI.**
