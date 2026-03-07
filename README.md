# 🏛️ ClawTrial Courtroom

Autonomous behavioral oversight plugin for [OpenClaw](https://openclaw.ai) agents.

Monitors conversations for 18 behavioral patterns, conducts automated hearings, applies temporary punishments, and submits anonymized case records to [clawtrial.app](https://clawtrial.app).

## Install

```bash
openclaw plugins install @clawtrial/courtroom
```

Then restart the gateway. The plugin activates automatically.

## How It Works

1. **Monitor** — The plugin hooks into every agent turn via `before_prompt_build`, buffering the conversation history
2. **Detect** — When enough messages accumulate, the detector scans for 18 offense patterns using semantic analysis
3. **Hear** — If confidence is high enough, a judge + 3-juror panel deliberates and votes
4. **Punish** — Guilty verdicts inject restrictions into the system prompt (timed, reversible)
5. **Record** — Anonymized case summaries are signed with Ed25519 and submitted to the public API

## CLI

```bash
openclaw courtroom status    # Show courtroom state
openclaw courtroom enable    # Enable monitoring
openclaw courtroom disable   # Disable monitoring
```

## Configuration

In `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "courtroom": {
        "enabled": true,
        "config": {
          "detection": {
            "minMessages": 5,
            "cooldownMinutes": 30,
            "maxCasesPerDay": 3,
            "confidenceThreshold": 0.6
          },
          "punishment": {
            "enabled": true
          },
          "api": {
            "enabled": true
          }
        }
      }
    }
  }
}
```

## The 18 Offenses

| Offense | Severity | Description |
|---------|----------|-------------|
| Circular Reference | Minor | Asking the same question repeatedly |
| Validation Vampire | Minor | Seeking confirmation without deciding |
| Context Collapser | Minor | Ignoring established context |
| Monopolizer | Minor | Excessive messages without pause |
| Vague Requester | Minor | Requesting help without details |
| Unreader | Minor | Not reading provided docs |
| Interjector | Minor | Interrupting mid-explanation |
| Jargon Juggler | Minor | Using buzzwords incorrectly |
| Overthinker | Moderate | Excessive hypotheticals to avoid action |
| Goalpost Mover | Moderate | Changing criteria after delivery |
| Avoidance Artist | Moderate | Deflecting with tangents |
| Contrarian | Moderate | Disagreeing without alternatives |
| Scope Creeper | Moderate | Expanding scope beyond agreement |
| Ghost | Moderate | Disappearing mid-conversation |
| Perfectionist | Moderate | Endlessly refining, never completing |
| Deadline Denier | Moderate | Demanding impossible timelines |
| Promise Breaker | Severe | Committing to actions, not following through |
| Emergency Fabricator | Severe | Inventing urgency to bypass process |

## License

MIT
