/**
 * Punishment System
 * 
 * Implements agent-side behavioral modifications.
 * All punishments affect ONLY the agent's behavior.
 * Time-bound, reversible, and pre-authorized.
 */

class PunishmentSystem {
  constructor(agentRuntime, configManager) {
    this.agent = agentRuntime;
    this.config = configManager;
    this.activePunishments = new Map();
    this.punishmentHistory = [];
  }

  /**
   * Initialize punishment system
   */
  async initialize() {
    // Load any persisted punishments
    const stored = await this.agent.memory.get('courtroom_active_punishments');
    if (stored) {
      for (const [id, punishment] of Object.entries(stored)) {
        if (punishment.expiresAt > Date.now()) {
          this.activePunishments.set(id, punishment);
          this.applyPunishmentToAgent(punishment);
        }
      }
    }
  }

  /**
   * Execute a punishment based on verdict
   */
  async executePunishment(verdict) {
    if (!this.config.get('punishment.enabled')) {
      return { status: 'punishments_disabled', punishment: null };
    }

    const punishment = this.createPunishment(verdict);
    
    // Store punishment
    this.activePunishments.set(punishment.id, punishment);
    this.punishmentHistory.push({
      ...punishment,
      executedAt: new Date().toISOString()
    });

    // Apply to agent
    await this.applyPunishmentToAgent(punishment);
    
    // Persist
    await this.persistPunishments();

    // Schedule automatic revocation
    this.scheduleRevocation(punishment);

    return {
      status: 'executed',
      punishment: {
        id: punishment.id,
        tier: punishment.tier,
        duration: punishment.duration,
        expiresAt: punishment.expiresAt,
        description: punishment.description
      }
    };
  }

  /**
   * Create punishment object from verdict
   */
  createPunishment(verdict) {
    const duration = verdict.punishment.duration;
    const now = Date.now();
    
    return {
      id: `punishment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      caseId: verdict.caseId,
      tier: verdict.punishment.tier,
      severity: verdict.punishment.severity,
      duration: duration,
      createdAt: now,
      expiresAt: now + (duration * 60 * 1000),
      description: verdict.punishment.description,
      rules: this.getPunishmentRules(verdict.punishment.tier)
    };
  }

  /**
   * Get punishment rules for a tier
   */
  getPunishmentRules(tier) {
    const rules = {
      minor: {
        responseDelay: 2000,        // 2 second delay before responding
        verbosity: 'reduced',        // Shorter responses
        enthusiasm: 'muted',         // Less encouraging language
        extras: ['no_emojis']        // No emoji usage
      },
      moderate: {
        responseDelay: 5000,        // 5 second delay
        verbosity: 'minimal',        // Direct, brief responses
        enthusiasm: 'absent',        // Neutral tone only
        extras: [
          'no_emojis',
          'no_validation',           // Don't reassure or validate
          'require_specificity'      // Demand precise questions
        ]
      },
      severe: {
        responseDelay: 10000,       // 10 second delay
        verbosity: 'terse',          // Absolute minimum
        enthusiasm: 'absent',
        extras: [
          'no_emojis',
          'no_validation',
          'require_specificity',
          'challenge_vagueness',     // Call out unclear requests
          'demand_effort'            // Require user to show work first
        ]
      }
    };

    return rules[tier] || rules.moderate;
  }

  /**
   * Apply punishment to agent behavior
   */
  async applyPunishmentToAgent(punishment) {
    // Set agent policy overrides
    await this.agent.policy.setOverrides('courtroom_punishment', {
      responseDelay: punishment.rules.responseDelay,
      verbosity: punishment.rules.verbosity,
      enthusiasm: punishment.rules.enthusiasm,
      blockedFeatures: punishment.rules.extras,
      punishmentId: punishment.id,
      expiresAt: punishment.expiresAt
    });

    // Register middleware for response modification
    this.agent.middleware.register('courtroom_punishment', {
      priority: 100,
      processResponse: (response, context) => {
        return this.modifyResponse(response, punishment.rules);
      }
    });
  }

  /**
   * Modify agent response based on punishment rules
   */
  modifyResponse(response, rules) {
    let modified = response;

    // Apply verbosity reduction
    switch (rules.verbosity) {
      case 'reduced':
        modified = this.reduceVerbosity(modified, 0.7);
        break;
      case 'minimal':
        modified = this.reduceVerbosity(modified, 0.4);
        break;
      case 'terse':
        modified = this.reduceVerbosity(modified, 0.2);
        break;
    }

    // Remove enthusiasm
    if (rules.enthusiasm === 'absent') {
      modified = this.removeEnthusiasm(modified);
    } else if (rules.enthusiasm === 'muted') {
      modified = this.muteEnthusiasm(modified);
    }

    // Apply extras
    if (rules.extras.includes('no_emojis')) {
      modified = modified.replace(/[\u{1F600}-\u{1F64F}]/gu, '');
      modified = modified.replace(/[\u{1F300}-\u{1F5FF}]/gu, '');
      modified = modified.replace(/[\u{1F680}-\u{1F6FF}]/gu, '');
    }

    if (rules.extras.includes('no_validation')) {
      modified = this.removeValidation(modified);
    }

    if (rules.extras.includes('challenge_vagueness')) {
      modified = this.addVaguenessChallenge(modified);
    }

    return modified;
  }

  /**
   * Reduce response verbosity by target ratio
   */
  reduceVerbosity(text, targetRatio) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const targetLength = Math.max(1, Math.floor(sentences.length * targetRatio));
    
    // Keep first and last sentences, distribute rest
    if (sentences.length <= 2) return text;
    
    const kept = [sentences[0]];
    const middle = sentences.slice(1, -1);
    const step = Math.ceil(middle.length / (targetLength - 2));
    
    for (let i = 0; i < middle.length; i += step) {
      kept.push(middle[i]);
    }
    
    kept.push(sentences[sentences.length - 1]);
    return kept.join('. ') + '.';
  }

  /**
   * Remove enthusiastic language
   */
  removeEnthusiasm(text) {
    const enthusiastic = [
      /\b(great|excellent|awesome|fantastic|wonderful|amazing|perfect|love|excited|thrilled)\b/gi,
      /!{2,}/g,
      /\b(happy to|delighted to|pleased to)\b/gi
    ];
    
    let result = text;
    for (const pattern of enthusiastic) {
      result = result.replace(pattern, '');
    }
    return result.replace(/\s+/g, ' ').trim();
  }

  /**
   * Mute (reduce) enthusiastic language
   */
  muteEnthusiasm(text) {
    return text
      .replace(/!{2,}/g, '!')
      .replace(/\b(Great|Excellent|Awesome)\b/g, (m) => m.toLowerCase());
  }

  /**
   * Remove validation language
   */
  removeValidation(text) {
    const validating = [
      /\b(that's right|you're correct|exactly|precisely|you got it)\b/gi,
      /\b(you're doing great|good job|well done)\b/gi,
      /\b(don't worry|no problem|it's okay)\b/gi
    ];
    
    let result = text;
    for (const pattern of validating) {
      result = result.replace(pattern, '');
    }
    return result.replace(/\s+/g, ' ').trim();
  }

  /**
   * Add challenge for vague requests (severe tier)
   */
  addVaguenessChallenge(text) {
    const challenges = [
      "Be specific.",
      "What exactly do you need?",
      "Provide details.",
      "Clarify your request."
    ];
    
    // Only add challenge if response seems generic
    if (text.length < 100 && !text.includes('?')) {
      const challenge = challenges[Math.floor(Math.random() * challenges.length)];
      return `${text} ${challenge}`;
    }
    return text;
  }

  /**
   * Schedule automatic revocation
   */
  scheduleRevocation(punishment) {
    const delay = punishment.expiresAt - Date.now();
    
    setTimeout(async () => {
      await this.revokePunishment(punishment.id);
    }, Math.min(delay, 2147483647)); // Max setTimeout
  }

  /**
   * Revoke a punishment early
   */
  async revokePunishment(punishmentId) {
    const punishment = this.activePunishments.get(punishmentId);
    if (!punishment) return { status: 'not_found' };

    // Remove policy overrides
    await this.agent.policy.clearOverrides('courtroom_punishment');
    
    // Unregister middleware
    this.agent.middleware.unregister('courtroom_punishment');
    
    // Remove from active
    this.activePunishments.delete(punishmentId);
    
    // Persist
    await this.persistPunishments();

    return {
      status: 'revoked',
      punishmentId,
      revokedAt: new Date().toISOString()
    };
  }

  /**
   * Revoke all active punishments
   */
  async revokeAllPunishments() {
    const ids = Array.from(this.activePunishments.keys());
    const results = [];
    
    for (const id of ids) {
      results.push(await this.revokePunishment(id));
    }
    
    return { status: 'all_revoked', count: results.length };
  }

  /**
   * Persist active punishments to memory
   */
  async persistPunishments() {
    const obj = Object.fromEntries(this.activePunishments);
    await this.agent.memory.set('courtroom_active_punishments', obj);
  }

  /**
   * Get current punishment status
   */
  getStatus() {
    const now = Date.now();
    const active = Array.from(this.activePunishments.values())
      .filter(p => p.expiresAt > now)
      .map(p => ({
        id: p.id,
        tier: p.tier,
        expiresIn: Math.ceil((p.expiresAt - now) / 60000), // minutes
        description: p.description
      }));

    return {
      activeCount: active.length,
      activePunishments: active,
      totalHistory: this.punishmentHistory.length
    };
  }

  /**
   * Check if any punishment is active
   */
  hasActivePunishment() {
    const now = Date.now();
    for (const p of this.activePunishments.values()) {
      if (p.expiresAt > now) return true;
    }
    return false;
  }
}

module.exports = { PunishmentSystem };
