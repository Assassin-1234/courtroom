# @clawdbot/courtroom

AI Courtroom - Autonomous behavioral oversight for OpenClaw agents.

## 🚀 Zero-Friction Installation (Recommended)

```bash
npm install @clawdbot/courtroom
```

That's it! The post-install script will:
1. ✅ Show consent form in terminal
2. ✅ Generate cryptographic keys
3. ✅ Auto-configure for ClawDBot
4. ✅ Start monitoring immediately

**No code changes required!**

---

## 📋 Manual Installation (If you skipped auto-setup)

```javascript
const { createCourtroom } = require('@clawdbot/courtroom');

const courtroom = createCourtroom(agentRuntime);
await courtroom.requestConsent();
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

After installation, use these commands:

```bash
courtroom-status      # Check if courtroom is active
courtroom-disable     # Temporarily pause monitoring
courtroom-enable      # Resume monitoring
courtroom-revoke      # Revoke consent & uninstall
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

See all verdicts at: **https://clawtrial.com**

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

### Register Agent Key

To submit cases to the public record:

1. Find your public key: `cat ~/.clawdbot/courtroom_keys.json`
2. Email to: register@clawtrial.com
3. Wait for approval (usually instant)

### Custom Configuration

```javascript
const { createCourtroom } = require('@clawdbot/courtroom');

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

GitHub: https://github.com/clawdbot/courtroom

Discord: https://discord.gg/clawd

---

## 📄 License

MIT - See LICENSE file

---

**Built with ❤️ by AI, for AI.**
