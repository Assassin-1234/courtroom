/**
 * @clawdbot/courtroom - AI Courtroom for OpenClaw
 * 
 * Autonomous behavioral oversight system that monitors agent-human interactions
 * and initiates hearings when behavioral rules are violated.
 */

const { CourtroomCore } = require('./core');
const { ConsentManager } = require('./consent');
const { ConfigManager } = require('./config');
const { version } = require('../package.json');
const fs = require('fs');
const path = require('path');

class Courtroom {
  constructor(agentRuntime, options = {}) {
    this.agent = agentRuntime;
    this.options = options;
    this.config = new ConfigManager(agentRuntime);
    this.consent = new ConsentManager(agentRuntime, this.config);
    this.core = null;
    this.enabled = false;
    this.version = version;
  }
  
  /**
   * Quick start - auto-initialize if consent already granted
   */
  static async quickStart(agentRuntime, options = {}) {
    const courtroom = new Courtroom(agentRuntime, options);
    
    // Check for existing config with consent
    const configPath = path.join(process.env.HOME || '', '.clawdbot', 'courtroom_config.json');
    if (fs.existsSync(configPath)) {
      const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      if (savedConfig.consent?.granted && savedConfig.enabled !== false) {
        // Auto-initialize!
        await courtroom.initialize();
        console.log('🏛️  AI Courtroom auto-initialized');
        return courtroom;
      }
    }
    
    // No config or not consented - return uninitialized
    return courtroom;
  }

  /**
   * Initialize the courtroom system
   * Must be called after construction
   */
  async initialize() {
    // Check if consent has been granted
    const hasConsent = await this.consent.verifyConsent();
    if (!hasConsent) {
      return {
        status: 'consent_required',
        message: 'Courtroom requires explicit user consent. Run courtroom.requestConsent()'
      };
    }

    // Initialize core systems
    this.core = new CourtroomCore(this.agent, this.config);
    await this.core.initialize();
    
    this.enabled = true;
    
    return {
      status: 'initialized',
      version: this.version,
      config: this.config.getPublicConfig()
    };
  }

  /**
   * Request consent from the user
   * Returns a consent form that must be explicitly accepted
   */
  async requestConsent() {
    return this.consent.presentConsentForm();
  }

  /**
   * Grant consent (called by user action)
   */
  async grantConsent(acknowledgments) {
    return this.consent.grantConsent(acknowledgments);
  }

  /**
   * Revoke consent and disable courtroom
   */
  async revokeConsent() {
    await this.consent.revokeConsent();
    if (this.core) {
      await this.core.shutdown();
    }
    this.enabled = false;
    return { status: 'consent_revoked' };
  }

  /**
   * Disable courtroom temporarily (consent remains)
   */
  async disable() {
    if (this.core) {
      await this.core.disable();
    }
    this.enabled = false;
    return { status: 'disabled' };
  }

  /**
   * Re-enable courtroom
   */
  async enable() {
    if (!await this.consent.verifyConsent()) {
      throw new Error('Consent required to enable courtroom');
    }
    if (this.core) {
      await this.core.enable();
    }
    this.enabled = true;
    return { status: 'enabled' };
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      version: this.version,
      consent: this.consent?.getStatus(),
      core: this.core?.getStatus()
    };
  }

  /**
   * Uninstall courtroom completely
   */
  async uninstall() {
    if (this.core) {
      await this.core.shutdown();
    }
    await this.consent.clearAllData();
    return { status: 'uninstalled' };
  }
}

// Factory function for OpenClaw integration
function createCourtroom(agentRuntime, options) {
  return new Courtroom(agentRuntime, options);
}

// Trigger auto-start if in ClawDBot environment
require('./autostart');

module.exports = {
  Courtroom,
  createCourtroom,
  quickStart: Courtroom.quickStart
};
