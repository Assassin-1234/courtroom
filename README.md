# @clawtrial/courtroom

AI Courtroom - Autonomous behavioral oversight for OpenClaw agents.

## 🚀 Quick Start

### 1. Install
```bash
npm install -g @clawtrial/courtroom
```

**⚠️ IMPORTANT:** If `clawtrial` command is not found after install, run:
```bash
# Option 1: Add npm global bin to PATH
export PATH="$HOME/.npm-global/bin:$PATH"

# Option 2: Create symlink (requires sudo)
sudo ln -sf "$HOME/.npm-global/lib/node_modules/@clawtrial/courtroom/scripts/clawtrial.js" /usr/bin/clawtrial
```

### 2. Setup
```bash
clawtrial setup
```

### 3. Start the Courtroom
```bash
clawtrial start
```

### 4. Verify
```bash
clawtrial status
```

---

## 📋 How It Works

ClawTrial runs as a **ClawDBot skill** that:
1. Monitors all conversations
2. Detects behavioral violations
3. Files cases automatically

**Note:** You must run `clawtrial start` after installation to activate monitoring.

---

## 🎮 CLI Commands

```bash
clawtrial setup       # Interactive setup (run this first)
clawtrial start       # Start monitoring (required!)
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

### "clawtrial: command not found"
npm installs global packages to `~/.npm-global/bin` but your shell may not have this in PATH.

**Fix:**
```bash
# Add to your ~/.bashrc or ~/.zshrc:
export PATH="$HOME/.npm-global/bin:$PATH"

# Then reload:
source ~/.bashrc  # or ~/.zshrc
```

### "Courtroom not running"
You need to explicitly start it:
```bash
clawtrial start
```

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
