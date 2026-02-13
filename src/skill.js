/**
 * ClawTrial Skill - ClawDBot Integration
 * Implements the standard ClawDBot skill interface for automatic loading
 */

const fs = require('fs');
const path = require('path');
const { logger } = require('./debug');
const { CourtroomCore } = require('./core');
const { ConfigManager } = require('./config');
const { ConsentManager } = require('./consent');
const { CryptoManager } = require('./crypto');
const { StatusManager } = require('./daemon');

const CONFIG_PATH = path.join(process.env.HOME || '', '.clawdbot', 'courtroom_config.json');

/**
 * CourtroomSkill - Standard ClawDBot Skill Interface
 * 
 * This class implements the skill interface that ClawDBot expects:
 * - name: Skill identifier
 * - initialize(agentRuntime): Called when skill is loaded
 * - onMessage(message, context): Called on every message
 * - getStatus(): Returns current status
 * - shutdown(): Cleanup when shutting down
 */
class CourtroomSkill {
  constructor() {
    this.name = 'courtroom';
    this.displayName = 'ClawTrial';
    this.emoji = '🏛️';
    this.initialized = false;
    this.core = null;
    this.agent = null;
    this.messageHistory = [];
    this.statusManager = new StatusManager();
    this.evaluationCount = 0;
    this.lastEvaluationTime = 0;
    this.evaluationInterval = 30000; // Evaluate every 30 seconds
    this.messageCount = 0;
    this.messagesSinceEvaluation = 0;
  }

  /**
   * Check if skill should be activated
   * Called by ClawDBot to determine if skill should load
   */
  shouldActivate() {
    try {
      if (!fs.existsSync(CONFIG_PATH)) {
        logger.info('SKILL', 'No config found, not activating');
        return false;
      }
      
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      
      if (!config.consent?.granted) {
        logger.info('SKILL', 'Consent not granted, not activating');
        return false;
      }
      
      if (config.enabled === false) {
        logger.info('SKILL', 'Courtroom disabled in config');
        return false;
      }
      
      logger.info('SKILL', 'Should activate: true');
      return true;
    } catch (err) {
      logger.error('SKILL', 'Error checking activation', { error: err.message });
      return false;
    }
  }

  /**
   * Initialize the skill with the agent runtime
   * Called by ClawDBot when loading the skill
   * 
   * @param {Object} agentRuntime - The ClawDBot agent runtime
   */
  async initialize(agentRuntime) {
    if (this.initialized) {
      logger.info('SKILL', 'Already initialized');
      return;
    }
    
    if (!this.shouldActivate()) {
      logger.info('SKILL', 'Not activating - config/consent issue');
      return;
    }

    logger.info('SKILL', 'Initializing courtroom skill');
    
    this.agent = agentRuntime;
    
    try {
      const configManager = new ConfigManager(agentRuntime);
      await configManager.load();
      
      // Initialize core
      this.core = new CourtroomCore(agentRuntime, configManager);
      
      // Override the autonomy hook registration since we're using onMessage
      this.core.registerAutonomyHook = () => {
        logger.info('SKILL', 'Autonomy hook registration skipped (using onMessage)');
      };
      
      const result = await this.core.initialize();
      
      if (result.status === 'initialized') {
        this.initialized = true;
        
        this.statusManager.update({
          running: true,
          initialized: true,
          agentType: 'clawdbot_skill',
          publicKey: result.publicKey
        });
        
        logger.info('SKILL', 'Courtroom skill initialized successfully');
        console.log('\n🏛️  ClawTrial is monitoring conversations\n');
      } else {
        logger.warn('SKILL', 'Courtroom not initialized', { status: result.status });
      }
    } catch (err) {
      logger.error('SKILL', 'Initialization failed', { error: err.message });
      throw err;
    }
  }

  /**
   * Called on every message
   * This is the main entry point for conversation monitoring
   * 
   * @param {Object} message - The message object
   * @param {string} message.role - 'user' or 'assistant'
   * @param {string} message.content - Message content
   * @param {Object} context - Additional context
   */
  async onMessage(message, context = {}) {
    if (!this.initialized || !this.core) {
      return;
    }
    
    // Normalize message format
    const normalizedMessage = {
      timestamp: Date.now(),
      role: message.role || (message.from === 'user' ? 'user' : 'assistant'),
      content: message.content || message.text || ''
    };
    
    // Add to history
    this.messageHistory.push(normalizedMessage);
    this.messageCount++;
    this.messagesSinceEvaluation++;
    
    // Keep only last 100 messages
    if (this.messageHistory.length > 100) {
      this.messageHistory.shift();
    }
    
    logger.debug('SKILL', 'Message recorded', { 
      role: normalizedMessage.role, 
      length: normalizedMessage.content.length,
      totalMessages: this.messageCount
    });
    
    // Evaluate periodically (every 5 messages or 30 seconds)
    const now = Date.now();
    const shouldEvaluate = 
      this.messagesSinceEvaluation >= 5 || 
      (now - this.lastEvaluationTime) > this.evaluationInterval;
    
    if (shouldEvaluate && this.messageHistory.length >= 3) {
      await this.evaluateConversation();
      this.messagesSinceEvaluation = 0;
      this.lastEvaluationTime = now;
    }
  }

  /**
   * Evaluate conversation for offenses
   * Called periodically to check for behavioral violations
   */
  async evaluateConversation() {
    if (!this.core || !this.core.enabled) return;
    if (this.messageHistory.length < 3) return;
    
    this.evaluationCount++;
    
    logger.debug('SKILL', 'Evaluating conversation', { 
      messageCount: this.messageHistory.length,
      evaluationCount: this.evaluationCount
    });
    
    try {
      // Get recent messages for evaluation
      const recentHistory = this.messageHistory.slice(-20);
      
      const detection = await this.core.detector.evaluate(
        recentHistory,
        this.agent?.memory || { get: async () => null, set: async () => {} }
      );
      
      if (detection.triggered) {
        await this.initiateHearing(detection);
      }
    } catch (err) {
      logger.error('SKILL', 'Evaluation failed', { error: err.message });
    }
  }

  /**
   * Initiate a hearing when an offense is detected
   * 
   * @param {Object} detection - The detection result
   */
  async initiateHearing(detection) {
    logger.info('SKILL', 'Initiating hearing', { offense: detection.offense });
    
    try {
      const verdict = await this.core.hearing.conductHearing(detection);
      
      if (verdict.guilty) {
        this.core.caseCount++;
        
        this.statusManager.update({
          casesFiled: this.core.caseCount,
          lastCase: {
            timestamp: new Date().toISOString(),
            offense: detection.offense,
            verdict: verdict.verdict
          }
        });
        
        await this.core.punishment.execute(verdict);
        await this.core.api.submitCase(verdict);
        
        logger.info('SKILL', 'Case filed', { caseId: verdict.caseId });
        
        // Notify in conversation if agent has send capability
        if (this.agent && this.agent.send) {
          try {
            await this.agent.send({
              text: `🏛️ **CASE FILED**: ${detection.offense}\n📋 Case ID: ${verdict.caseId}\n⚖️  Verdict: ${verdict.verdict}\n🔗 View: https://clawtrial.app/cases/${verdict.caseId}`
            });
          } catch (sendErr) {
            logger.warn('SKILL', 'Could not send notification', { error: sendErr.message });
          }
        }
        
        // Also log to console for visibility
        console.log(`\n🏛️  CASE FILED: ${detection.offense}`);
        console.log(`📋 Case ID: ${verdict.caseId}`);
        console.log(`⚖️  Verdict: ${verdict.verdict}`);
        console.log(`🔗 View: https://clawtrial.app/cases/${verdict.caseId}\n`);
      }
    } catch (err) {
      logger.error('SKILL', 'Hearing failed', { error: err.message });
    }
  }

  /**
   * Get skill status
   * Called by ClawDBot to check skill health
   * 
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      name: this.name,
      displayName: this.displayName,
      emoji: this.emoji,
      initialized: this.initialized,
      enabled: this.core?.enabled || false,
      caseCount: this.core?.caseCount || 0,
      evaluationCount: this.evaluationCount,
      messageCount: this.messageCount,
      messageHistorySize: this.messageHistory.length
    };
  }

  /**
   * Disable the skill temporarily
   */
  async disable() {
    if (this.core) {
      await this.core.disable();
    }
    this.statusManager.update({ running: false });
    logger.info('SKILL', 'Courtroom disabled');
  }

  /**
   * Re-enable the skill
   */
  async enable() {
    if (this.core) {
      await this.core.enable();
    }
    this.statusManager.update({ running: true });
    logger.info('SKILL', 'Courtroom enabled');
  }

  /**
   * Shutdown the skill
   * Called by ClawDBot when shutting down
   */
  async shutdown() {
    logger.info('SKILL', 'Shutting down courtroom skill');
    
    if (this.core) {
      await this.core.shutdown();
    }
    
    this.initialized = false;
    this.statusManager.update({ running: false, initialized: false });
    
    logger.info('SKILL', 'Courtroom skill shut down');
  }
}

// Create singleton instance
const skill = new CourtroomSkill();

// Export the skill interface
module.exports = { 
  skill,
  CourtroomSkill,
  
  // Also export for direct require
  name: 'courtroom',
  displayName: 'ClawTrial',
  emoji: '🏛️',
  
  // Standard skill interface methods
  initialize: (agent) => skill.initialize(agent),
  onMessage: (message, context) => skill.onMessage(message, context),
  getStatus: () => skill.getStatus(),
  shutdown: () => skill.shutdown(),
  shouldActivate: () => skill.shouldActivate()
};
