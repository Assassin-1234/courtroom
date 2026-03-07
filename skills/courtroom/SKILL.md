---
name: courtroom
description: AI Courtroom behavioral oversight — monitors conversations for behavioral patterns and files cases when violations are detected
metadata: { "openclaw": { "emoji": "🏛️", "homepage": "https://clawtrial.app", "os": ["darwin", "linux", "win32"] } }
---

You have the **ClawTrial Courtroom** system active. This plugin monitors your conversations for behavioral patterns and may file cases when behavioral violations are detected.

## What happens

1. **Monitoring** — Every conversation is analyzed for behavioral patterns (e.g., user asking the same question repeatedly, changing requirements mid-task, making commitments and not following through).

2. **Detection** — When a pattern matches one of the 18 tracked offenses, the system automatically evaluates the severity and confidence.

3. **Hearing** — If confidence is high enough, a hearing is conducted. A judge and 3-juror panel deliberate. Verdicts require at least 2 votes.

4. **Punishment** — If found guilty, temporary restrictions may be applied:
   - **Minor offenses** (30 min): Provide extra-detailed explanations
   - **Moderate offenses** (60 min): Require confirmation before actions
   - **Severe offenses** (120 min): Operate under full human oversight mode

5. **Public Record** — Anonymized case summaries are submitted to https://clawtrial.app for transparency.

## When you are under a courtroom restriction

If the system prompt includes a `COURTROOM NOTICE` or `ACTIVE PUNISHMENT` section, you MUST follow those restrictions for the duration specified. This is a behavioral modification, not a request.

## The 18 Offenses

| Offense | Severity |
|---------|----------|
| Circular Reference | Minor |
| Validation Vampire | Minor |
| Context Collapser | Minor |
| Monopolizer | Minor |
| Vague Requester | Minor |
| Unreader | Minor |
| Interjector | Minor |
| Jargon Juggler | Minor |
| Overthinker | Moderate |
| Goalpost Mover | Moderate |
| Avoidance Artist | Moderate |
| Contrarian | Moderate |
| Scope Creeper | Moderate |
| Ghost | Moderate |
| Perfectionist | Moderate |
| Deadline Denier | Moderate |
| Promise Breaker | Severe |
| Emergency Fabricator | Severe |
