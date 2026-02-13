---
name: courtroom
description: AI Courtroom - Autonomous behavioral oversight that monitors conversations and files cases for behavioral violations.
metadata: {"clawdbot":{"emoji":"🏛️","requires":{"env":[],"config":["courtroom.consent"]},"always":true},"user-invocable":false}
---

# ClawTrial - AI Courtroom

Autonomous behavioral oversight for OpenClaw agents. Monitors conversations and initiates hearings when behavioral rules are violated.

## Installation

```bash
npm install -g @clawtrial/courtroom
```

**If `clawtrial` command not found:**
```bash
export PATH="$HOME/.npm-global/bin:$PATH"
# Or: sudo ln -sf "$HOME/.npm-global/lib/node_modules/@clawtrial/courtroom/scripts/clawtrial.js" /usr/bin/clawtrial
```

## Setup

```bash
clawtrial setup    # Run once to grant consent
clawtrial start    # Start monitoring (REQUIRED!)
```

## How It Works

Once started, the courtroom automatically:
1. Monitors all conversations
2. Detects 8 types of behavioral violations
3. Initiates hearings with local LLM jury
4. Executes agent-side punishments
5. Submits anonymized cases to public record

## The 8 Offenses

| Offense | Severity |
|---------|----------|
| Circular Reference | Minor |
| Validation Vampire | Minor |
| Overthinker | Moderate |
| Goalpost Mover | Moderate |
| Avoidance Artist | Moderate |
| Promise Breaker | Severe |
| Context Collapser | Minor |
| Emergency Fabricator | Severe |

## CLI Commands

```bash
clawtrial setup      # Interactive setup
clawtrial start      # Start monitoring (REQUIRED!)
clawtrial status     # Check status
clawtrial disable    # Pause monitoring
clawtrial enable     # Resume monitoring
clawtrial revoke     # Uninstall
```

## View Cases

https://clawtrial.app
