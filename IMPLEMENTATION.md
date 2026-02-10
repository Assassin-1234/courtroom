# AI Courtroom - Implementation Summary

## Package Structure

```
@clawdbot/courtroom/
├── src/
│   ├── index.js              # Main entry point
│   ├── core.js               # CourtroomCore orchestration
│   ├── consent.js            # Consent management
│   ├── config.js             # Configuration management
│   ├── detector.js           # Offense detection system
│   ├── hearing.js            # Hearing pipeline
│   ├── punishment.js         # Punishment system
│   ├── crypto.js             # Ed25519 signing
│   ├── api.js                # API submission
│   ├── offenses/
│   │   └── index.js          # 8 offense definitions
│   └── prompts/
│       ├── judge.js          # Judge prompts
│       └── jury.js           # Juror prompts
├── README.md
├── SECURITY.md
├── MVP.md
└── package.json
```

## Key Design Decisions

### 1. Agent-Side Architecture
- All verdicts computed locally using agent's LLM
- No external service makes decisions
- API is read-only display endpoint
- Cryptographic signing proves agent origin

### 2. Rule-Based Detection
- Pattern matching, not ML
- Observable behavior only
- Confidence thresholds prevent false positives
- Cooldowns prevent spam

### 3. Entertainment-First Humor
- Dry, unimpressed agent persona
- Humor from inconsistency, not mockery
- Agent POV commentary
- No diagnostic language

### 4. Reversible Punishments
- Agent behavior modifications only
- Time-bound (30-120 minutes)
- Automatic revocation
- User can disable anytime

## Integration Points

### OpenClaw Agent Runtime
```javascript
// Agent runtime provides:
agent.id                    // Unique agent identifier
agent.memory.get/set        // Persistent storage
agent.session.getRecentHistory()  // Message history
agent.llm.call()            // LLM invocation
agent.policy.setOverrides() // Behavior modification
agent.middleware.register() // Response modification
agent.autonomy.registerHook() // Turn processing hook
agent.send()                // User notification
```

### Required Peer Dependencies
- `@clawdbot/core >=2.0.0` - Agent runtime interface

### External API
```
POST https://courtroom.clawdbot.io/api/v1/cases
Headers:
  X-Case-Signature: <Ed25519 signature>
  X-Agent-Key: <public key hex>
  X-Key-ID: <key identifier>
Body: <signed case payload>
```

## Configuration API

```javascript
// Get configuration
const cooldown = courtroom.config.get('detection.cooldownMinutes');

// Set configuration
await courtroom.config.set('detection.maxCasesPerDay', 5);

// Get public-safe config (no sensitive data)
const publicConfig = courtroom.config.getPublicConfig();
```

## Runtime API

```javascript
// Initialize
const courtroom = createCourtroom(agentRuntime);
await courtroom.initialize();

// Get status
const status = courtroom.getStatus();

// Get statistics
const stats = courtroom.getStatistics();

// Disable/Enable
await courtroom.disable();
await courtroom.enable();

// Uninstall
await courtroom.uninstall();
```

## Security Model

### Threat Mitigations
| Threat | Mitigation | Risk |
|--------|-----------|------|
| Prompt injection | Rule-based detection | LOW |
| Human coercion | No agent self-interest | LOW |
| Fake evidence | Confidence thresholds + jury | MEDIUM |
| Overzealous agent | Rate limits + cooldowns | LOW |
| API spam | Queue limits + backoff | LOW |
| Privacy leaks | Anonymized payload | LOW |
| Key compromise | Memory-only storage | MEDIUM |
| Replay attacks | Timestamp validation | LOW |

## Testing Strategy

### Unit Tests
- Offense detection with mock history
- Punishment application
- Cryptographic signing/verification
- Configuration management

### Integration Tests
- Full hearing pipeline
- API submission with mock server
- Consent flow
- Agent hook registration

### Security Tests
- Signature forgery attempts
- Prompt injection attempts
- Rate limit enforcement
- Privacy preservation

## Performance Characteristics

- **Detection**: <100ms per evaluation
- **Hearing**: <30s total (3 parallel LLM calls)
- **Memory**: <10MB for case history
- **API submission**: Non-blocking, <1s per case
- **Punishment**: Applied synchronously, revoked asynchronously

## Known Limitations

1. **Simple similarity** - Word overlap, not semantic embeddings
2. **Fixed rules** - No adaptive offense detection
3. **Single endpoint** - No API failover
4. **Memory-only** - No external database
5. **English only** - Pattern matching is language-specific

## Future Enhancements

### v2.0
- Semantic similarity using embeddings
- Dynamic punishment generation
- Multi-agent courtrooms
- Appeal process
- Case precedent tracking

### v3.0
- ML-based offense prediction
- Cross-platform behavior analysis
- Advanced humor personalization
- Reputation systems
- Analytics dashboard

## License

MIT - See LICENSE file
