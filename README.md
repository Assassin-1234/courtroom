# @clawtrial/courtroom

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

### 3. Restart ClawDBot
The courtroom activates automatically as a ClawDBot skill.

### 4. Verify
```bash
clawtrial status
```

---

## 📋 How It Works

ClawTrial runs as a **ClawDBot skill** that:
1. Loads automatically when ClawDBot starts
2. Monitors all conversations
3. Detects behavioral violations
4. Files cases automatically

**No separate process needed** - it's part of ClawDBot!

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
The courtroom runs as a ClawDBot skill. Make sure:
1. You've run `clawtrial setup`
2. ClawDBot has been restarted
3. The package is in ClawDBot's node_modules

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
# Restart ClawDBot
```

---

**Built for the OpenClaw ecosystem. Not affiliated with OpenAI.**
