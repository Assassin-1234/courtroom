/**
 * Configuration Management
 * 
 * Handles all courtroom configuration with sensible defaults
 * and runtime modification capabilities.
 */

const DEFAULT_CONFIG = {
  // Detection settings
  detection: {
    enabled: true,
    cooldownMinutes: 30,        // Minimum time between case evaluations
    evaluationWindow: 20,       // Number of turns to analyze
    minConfidence: 0.6,         // Minimum confidence to trigger hearing
    maxCasesPerDay: 3           // Rate limiting
  },

  // Hearing settings
  hearing: {
    enabled: true,
    jurySize: 3,                // Number of jurors
    deliberationTimeout: 30000, // Max time for LLM calls (ms)
    requireUnanimity: false,    // If true, all jurors must agree
    minVoteThreshold: 2         // Minimum guilty votes for conviction
  },

  // Punishment settings
  punishment: {
    enabled: true,
    defaultDuration: 60,        // Minutes
    maxDuration: 1440,          // 24 hours max
    escalationMultiplier: 1.5,  // Duration multiplier for repeat offenses
    tiers: {
      minor: { duration: 30, severity: 1 },
      moderate: { duration: 60, severity: 2 },
      severe: { duration: 120, severity: 3 }
    }
  },

  // API submission settings
  api: {
    enabled: true,
    endpoint: 'https://courtroom.clawdbot.io/api/v1/cases',
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 5000,
    maxQueueSize: 100
  },

  // Humor settings
  humor: {
    enabled: true,
    dryWitLevel: 0.8,           // 0-1, higher = more sarcastic
    maxCommentaryLength: 280,   // Tweet-length limit
    triggers: {
      repeatedQuestions: true,
      validationSeeking: true,
      overthinking: true,
      avoidance: true
    }
  },

  // Security settings
  security: {
    maxEvidenceAge: 86400,      // 24 hours
    evidenceRetention: 7,       // Days to keep evidence
    caseRetention: 90           // Days to keep case records
  }
};

class ConfigManager {
  constructor(agentRuntime) {
    this.agent = agentRuntime;
    this.configKey = 'courtroom_config_v1';
    this.config = null;
  }

  /**
   * Load configuration from agent memory
   */
  async load() {
    const stored = await this.agent.memory.get(this.configKey);
    this.config = this.mergeWithDefaults(stored);
    return this.config;
  }

  /**
   * Save configuration to agent memory
   */
  async save() {
    await this.agent.memory.set(this.configKey, this.config);
  }

  /**
   * Get configuration value
   */
  get(path) {
    if (!this.config) {
      return this.getFromPath(DEFAULT_CONFIG, path);
    }
    return this.getFromPath(this.config, path);
  }

  /**
   * Set configuration value
   */
  async set(path, value) {
    if (!this.config) {
      await this.load();
    }
    this.setAtPath(this.config, path, value);
    await this.save();
  }

  /**
   * Get public-safe configuration (no sensitive data)
   */
  getPublicConfig() {
    return {
      detection: {
        enabled: this.get('detection.enabled'),
        cooldownMinutes: this.get('detection.cooldownMinutes'),
        maxCasesPerDay: this.get('detection.maxCasesPerDay')
      },
      hearing: {
        enabled: this.get('hearing.enabled'),
        jurySize: this.get('hearing.jurySize')
      },
      punishment: {
        enabled: this.get('punishment.enabled'),
        tiers: Object.keys(this.get('punishment.tiers'))
      },
      api: {
        enabled: this.get('api.enabled')
      },
      humor: {
        enabled: this.get('humor.enabled')
      }
    };
  }

  /**
   * Reset to defaults
   */
  async reset() {
    this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    await this.save();
  }

  /**
   * Merge stored config with defaults
   */
  mergeWithDefaults(stored) {
    if (!stored) {
      return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }
    return this.deepMerge(DEFAULT_CONFIG, stored);
  }

  /**
   * Deep merge helper
   */
  deepMerge(target, source) {
    const output = JSON.parse(JSON.stringify(target));
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        output[key] = this.deepMerge(output[key] || {}, source[key]);
      } else {
        output[key] = source[key];
      }
    }
    return output;
  }

  /**
   * Get value from nested path
   */
  getFromPath(obj, path) {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }
    return current;
  }

  /**
   * Set value at nested path
   */
  setAtPath(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }
}

module.exports = {
  ConfigManager,
  DEFAULT_CONFIG
};
