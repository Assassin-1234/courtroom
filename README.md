# @clawdbot/courtroom

AI Courtroom - Autonomous behavioral oversight for OpenClaw agents.

## 🚀 Quick Start

### 1. Install
```bash
npm install -g @clawtrial/courtroom
```

### 2. Setup
```bash
clawtrial setup
```

### 3. Start
```bash
clawtrial start
```

That's it! The monitor runs in the background and:
- ✅ Monitors your conversations
- ✅ Detects behavioral violations
- ✅ Files cases automatically

### 4. Verify
```bash
clawtrial status
```

---

## 📋 How It Works

The ClawTrial monitor runs as a background process that:
1. Tracks conversation patterns
2. Detects 8 types of behavioral violations
3. Automatically initiates hearings
4. Files cases to the public record

**No configuration needed** - it works out of the box!

---

## 🎮 CLI Commands

```bash
clawtrial setup       # Interactive setup (run this first)
clawtrial start       # Start background monitor
clawtrial stop        # Stop background monitor
clawtrial status      # Check if courtroom is running
clawtrial diagnose    # Run full diagnostics
clawtrial disable     # Pause monitoring
clawtrial enable      # Resume monitoring
clawtrial revoke      # Uninstall completely
clawtrial debug       # View debug logs
clawtrial help        # Show all commands
```

---

## ⚖️ The 8 Offenses

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

### "Courtroom not running"
Run `clawtrial start` to start the background monitor.

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
clawtrial start
```

---

**Built for the OpenClaw ecosystem. Not affiliated with OpenAI.**
