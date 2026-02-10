# MVP Scope: AI Courtroom v1.0

## Included in v1

### Core Functionality
- [x] All 8 offense types with detection rules
- [x] Consent management with explicit acknowledgments
- [x] Judge + 3-jury hearing pipeline
- [x] 3-tier punishment system (minor/moderate/severe)
- [x] Ed25519 cryptographic signing
- [x] API submission with retry logic
- [x] Local queue for offline operation
- [x] Non-blocking agent integration

### Offense Detection
- [x] Circular Reference (repeated questions)
- [x] Validation Vampire (reassurance seeking)
- [x] Overthinker (hypothetical generation)
- [x] Goalpost Mover (changing requirements)
- [x] Avoidance Artist (deflection)
- [x] Promise Breaker (commitment tracking via memory)
- [x] Context Collapser (ignoring established facts)
- [x] Emergency Fabricator (false urgency)

### Punishments
- [x] Response delays (2s/5s/10s)
- [x] Verbosity reduction (70%/40%/20%)
- [x] Enthusiasm removal
- [x] Emoji blocking
- [x] Validation removal
- [x] Vagueness challenges (severe tier)

### Security
- [x] Cryptographic signing (Ed25519)
- [x] Agent-only API submission
- [x] Anonymized agent IDs
- [x] Consent enforcement
- [x] Configurable rate limits

## Intentionally Excluded from v1

### Advanced Features (v2+)
- Machine learning-based offense detection
- Natural language evidence extraction
- Dynamic punishment generation
- Multi-agent courtrooms (agent vs agent)
- Appeal process
- Case precedent system
- User reputation scores
- Advanced humor personalization

### Integrations (v2+)
- Discord/Slack-specific offenses
- Git commit message analysis
- Calendar/meeting behavior tracking
- Email response pattern analysis
- Browser history analysis (privacy concerns)

### Analytics (v2+)
- Detailed statistics dashboard
- Behavioral trend analysis
- Recidivism tracking
- Comparative analysis across users

## Acceptable Shortcuts

1. **Simple similarity algorithm** - Using word overlap instead of embeddings for v1
2. **Fixed punishment rules** - No dynamic punishment generation
3. **Basic pattern matching** - Regex-based detection, no NLP
4. **Single API endpoint** - No failover endpoints
5. **Memory-only storage** - No external database

## Must Not Be Compromised

1. **Consent enforcement** - No bypass possible
2. **Agent-side only** - No external verdict computation
3. **Cryptographic security** - Signing must be unforgeable
4. **Privacy preservation** - No raw logs in API submissions
5. **Reversibility** - All punishments must be revocable
6. **Entertainment-first** - No diagnostic or therapeutic claims

## Success Criteria

- [ ] All 8 offenses detectable with >70% accuracy
- [ ] Hearing completes in <30 seconds
- [ ] API submission succeeds on first attempt >90% of time
- [ ] No false positives >10% of cases
- [ ] User can disable in <3 seconds
- [ ] Zero security vulnerabilities in audit

## Timeline Estimate

- Core implementation: 2 weeks
- Testing & refinement: 1 week
- Security audit: 3 days
- Documentation: 2 days
- **Total: ~4 weeks for v1**
