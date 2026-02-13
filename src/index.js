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
const { detectAgentRuntime, createMockAgent, checkEnvironment, getSetupInstructions } = require('./environment');
const { logger } = require('./debug');
const { skill } = require('./skill');
const fs = require('fs');
const path = require('path');

class Courtroom {
  constructor(agentRuntime, options = {}) {
    this.agent = agentRuntime;
    this.options = options;
    this.config = agentRuntime ? new ConfigManager(agentRuntime) : null;
    this.consent = agentRuntime ? new ConsentManager(agentRuntime, this.config) : null;
    this.core = null;
    this.enabled = false;
    this.version = version;
  }
  
  /**
   * Quick start - auto-detect agent and initialize if possible
   */
  static async quickStart(options = {}) {
    logger.info('COURTROOM', 'Starting quickStart');
    
    // Check environment first
    const env = checkEnvironment();
    if (!env.valid) {
      logger.error('COURTROOM', 'Environment check failed', { issues: env.issues });
      return {
        success: false,
        status: 'environment_error',
        issues: env.issues,
        message: 'Environment issues detected. Run "clawtrial setup" for details.'
      };
    }
    
    // Try to detect agent runtime
    let agentRuntime = options.agent || detectAgentRuntime()?.agent;
    
    // If no agent and mock requested, create one
    if (!agentRuntime && options.useMock) {
      logger.info('COURTROOM', 'Creating mock agent');
      agentRuntime = createMockAgent(options.mockOptions);
    }
    
    if (!agentRuntime) {
      logger.warn('COURTROOM', 'No agent runtime available');
      const instructions = getSetupInstructions();
      return {
        success: false,
        status: 'no_agent',
        message: instructions.message,
        instructions: instructions.instructions
      };
    }
    
    // Create and initialize courtroom
    const courtroom = new Courtroom(agentRuntime, options);
    const result = await courtroom.initialize();
    
    return {
      success: result.status === 'initialized',
      courtroom: result.status === 'initialized' ? courtroom : null,
      ...result
    };
  }

  /**
   * Initialize the courtroom system
   */
  async initialize() {
    logger.info('COURTROOM', 'Initializing courtroom');
    
    if (!this.agent) {
      logger.error('COURTROOM', 'No agent runtime provided');
      return {
        status: 'no_agent',
        message: 'No agent runtime available. Pass an agent to createCourtroom(agent) or use Courtroom.quickStart()'
      };
    }

    // Check if this is first run (no config exists)
    const configPath = path.join(process.env.HOME || '', '.clawdbot', 'courtroom_config.json');
    if (!fs.existsSync(configPath)) {
      logger.info('COURTROOM', 'First run detected');
      return {
        status: 'setup_required',
        message: 'First time setup required. Run: clawtrial setup'
      };
    }
    
    // Check if consent has been granted
    const hasConsent = await this.consent.verifyConsent();
    if (!hasConsent) {
      logger.warn('COURTROOM', 'Consent not granted');
      return {
        status: 'consent_required',
        message: 'Consent required. Run: clawtrial setup'
      };
    }

    // Initialize core systems
    try {
      this.core = new CourtroomCore(this.agent, this.config);
      await this.core.initialize();
      this.enabled = true;
      
      logger.info('COURTROOM', 'Courtroom initialized successfully');
      
      return {
        status: 'initialized',
        version: this.version,
        config: this.config.getPublicConfig()
      };
    } catch (err) {
      logger.error('COURTROOM', 'Initialization failed', { error: err.message });
      return {
        status: 'initialization_error',
        message: err.message
      };
    }
  }

  /**
   * Request consent from the user
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
      hasAgent: !!this.agent,
      hasCore: !!this.core,
      consent: this.consent?.getStatus ? this.consent.getStatus() : null,
      core: this.core?.getStatus ? this.core.getStatus() : null
    };
  }

  /**
   * Uninstall courtroom completely
   */
  async uninstall() {
    if (this.core) {
      await this.core.shutdown();
    }
    if (this.consent) {
      await this.consent.clearAllData();
    }
    this.enabled = false;
    return { status: 'uninstalled' };
  }
}

// Factory function for creating courtroom instances
function createCourtroom(agentRuntime, options = {}) {
  // If no agent provided, try to detect one
  if (!agentRuntime) {
    const detected = detectAgentRuntime();
    if (detected) {
      agentRuntime = detected.agent;
    } else if (options.useMock) {
      agentRuntime = createMockAgent(options.mockOptions);
    }
  }
  
  return new Courtroom(agentRuntime, options);
}

// Export environment utilities
const environment = {
  detectAgentRuntime,
  createMockAgent,
  checkEnvironment,
  getSetupInstructions
};

// Create the ClawDBot plugin object
const plugin = {
  id: 'courtroom',
  name: 'ClawTrial - AI Courtroom',
  description: 'Autonomous behavioral oversight that monitors conversations and files cases for behavioral violations',
  version: version,
  
  // Plugin registration function required by ClawDBot
  register(api) {
    logger.info('PLUGIN', 'Registering courtroom plugin');
    
    // Get runtime from API
    const runtime = api.runtime;
    
    // ALWAYS try to initialize the skill if it should activate
    if (skill && typeof skill.initialize === 'function') {
      if (skill.shouldActivate()) {
        logger.info('PLUGIN', 'Skill should activate, initializing now');
        skill.initialize(runtime).then(() => {
          logger.info('PLUGIN', 'Skill initialized successfully');
        }).catch(err => {
          logger.error('PLUGIN', 'Skill initialization failed', { error: err.message });
        });
      } else {
        logger.info('PLUGIN', 'Skill shouldActivate returned false, not initializing');
      }
    }
    
    logger.info('PLUGIN', 'Courtroom plugin registered successfully');
  },
  
  // Optional: activation function
  activate(api) {
    logger.info('PLUGIN', 'Activating courtroom plugin');
  },
  
  // Register hooks for message monitoring
  hooks: [
    {
      hookName: 'message_received',
      pluginId: 'courtroom',
      priority: 100,
      handler: async (event, ctx) => {
        logger.info('HOOK', 'message_received hook called', { 
          messageId: event.message?.id,
          role: event.message?.role,
          hasContent: !!event.message?.content
        });
        
        // Forward to skill's onMessage
        if (skill && skill.initialized) {
          try {
            await skill.onMessage(event.message, ctx);
            logger.info('HOOK', 'Message forwarded to skill');
          } catch (err) {
            logger.error('HOOK', 'Error forwarding message to skill', { error: err.message });
          }
        } else {
          logger.warn('HOOK', 'Skill not initialized, message not forwarded');
        }
      }
    },
    {
      hookName: 'message_sent',
      pluginId: 'courtroom',
      priority: 100,
      handler: async (event, ctx) => {
        logger.info('HOOK', 'message_sent hook called', {
          messageId: event.message?.id,
          role: event.message?.role
        });
        
        // Forward to skill's onMessage for assistant messages
        if (skill && skill.initialized && event.message?.role === 'assistant') {
          try {
            await skill.onMessage(event.message, ctx);
            logger.info('HOOK', 'Assistant message forwarded to skill');
          } catch (err) {
            logger.error('HOOK', 'Error forwarding assistant message to skill', { error: err.message });
          }
        }
      }
    }
  ]
};

// Export both the plugin (default) and the Courtroom class (named exports)
module.exports = plugin;
module.exports.Courtroom = Courtroom;
module.exports.createCourtroom = createCourtroom;
module.exports.quickStart = Courtroom.quickStart;
module.exports.environment = environment;
module.exports.skill = skill;

// Auto-initialize skill if loaded by ClawDBot (legacy support)
if (typeof global !== 'undefined' && global.clawdbotAgent) {
  logger.info('INDEX', 'Detected ClawDBot environment, auto-initializing skill');
  skill.initialize(global.clawdbotAgent).catch(err => {
    logger.error('INDEX', 'Auto-initialization failed', { error: err.message });
  });
}
