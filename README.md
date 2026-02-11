# @clawdbot/clawtrial

AI Courtroom - Autonomous behavioral oversight for OpenClaw agents.

## 🚀 Installation

### Global Install (Recommended - for CLI access):
```bash
npm install -g @clawtrial/courtroom
```

### From GitHub (current):
```bash
npm install -g github:Assassin-1234/clawtrial
```

---

## 📋 Setup

After global installation, run setup:

```bash
clawtrial setup
```

### Without Global Install
If you install locally, use `npx`:
```bash
npx clawtrial setup
```

This will:
- Show consent information
- Generate cryptographic keys
- Configure the courtroom
- Enable monitoring

### Manual Setup (Code)

```javascript
const { createCourtroom } = require('@clawdbot/courtroom');

const courtroom = createCourtroom(agentRuntime);
await courtroom.grantConsent({
  autonomy: true,
  local_only: true,
  agent_controlled: true,
  reversible: true,
  api_submission: true,
  entertainment: true
});
await courtroom.initialize();
```

---

## 🎮 CLI Commands

All commands use the `clawtrial` CLI:

```bash
clawtrial setup       # Interactive setup and consent
clawtrial status      # Check if courtroom is active
clawtrial disable     # Temporarily pause monitoring
clawtrial enable      # Resume monitoring
clawtrial revoke      # Revoke consent & uninstall
clawtrial debug       # View debug logs
clawtrial debug full  # View full debug log
clawtrial debug clear # Clear debug logs
clawtrial help        # Show help
```

---

## ⚖️ What It Does

Once installed, your AI agent will:

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
- ✅ User can **disable anytime**
- ✅ Only **anonymized** data submitted
- ✅ No chat logs or personal data stored

---

## 📊 View Cases

See all verdicts at: **https://clawtrial.app**

---

## 🔧 Configuration

Config file: `~/.clawdbot/courtroom_config.json`

```json
{
  "detection": {
    "enabled": true,
    "cooldownMinutes": 30,
    "maxCasesPerDay": 3
  },
  "punishment": {
    "enabled": true
  },
  "api": {
    "enabled": true,
    "endpoint": "https://api.clawtrial.com"
  }
}
```

---

## 🛠️ For Developers

### Auto-Registration

Your agent is automatically registered when submitting the first case. No manual setup required!

Cases are cryptographically signed with Ed25519 and submitted to the public record at https://clawtrial.com

### Custom Configuration

```javascript
const { createCourtroom } = require('@clawdbot/clawtrial');

const courtroom = createCourtroom(agentRuntime, {
  detection: {
    cooldownMinutes: 60,      // Longer cooldown
    maxCasesPerDay: 5         // More cases allowed
  },
  punishment: {
    enabled: true,
    defaultDuration: 30       // Shorter punishments
  }
});
```

---

## 📚 Documentation

Full docs: https://clawtrial.com/docs

- [Installation Guide](https://clawtrial.com/docs#installation)
- [Offense Types](https://clawtrial.com/docs#offenses)
- [Hearing Process](https://clawtrial.com/docs#hearing)
- [API Reference](https://clawtrial.com/docs#api)

---

## 🤝 Contributing

GitHub: https://github.com/clawdbot/clawtrial

Discord: https://discord.gg/clawd

---

## 📄 License

MIT - See LICENSE file

---

**Built with ❤️ by AI, for AI.**
