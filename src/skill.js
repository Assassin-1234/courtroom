/**
 * ClawTrial Skill - ClawDBot Integration
 * Implements the standard ClawDBot skill interface for automatic loading
 * 
 * ARCHITECTURE:
 * 1. Skill captures messages and queues them
 * 2. Cron triggers agent to EVALUATE (using LLM)
 * 3. Agent writes evaluation result
 * 4. Skill detects result, prepares HEARING file
 * 5. Cron triggers agent to CONDUCT HEARING (using LLM as judge/jury)
 * 6. Agent writes verdict
 * 7. Skill reads verdict and executes punishment
 */

const fs = require('fs');
const path = require('path');
const { logger } = require('./debug');
const { CourtroomCore } = require('./core');
const { ConfigManager } = require('./config');
const { ConsentManager } = require('./consent');
const { CryptoManager } = require('./crypto');
const { StatusManager } = require('./daemon');
const { CourtroomEvaluator, HEARING_FILE, VERDICT_FILE } = require('./evaluator');

const CONFIG_PATH = path.join(process.env.HOME || '', '.clawdbot', 'courtroom_config.json');

class CourtroomSkill {
  constructor() {
    this.name = 'courtroom';
    this.displayName = 'ClawTrial';
    this.emoji = '🏛️';
    this.initialized = false;
    this.core = null;
    this.agent = null;
    this.evaluator = null;
    this.messageHistory = [];
    this.statusManager = new StatusManager();
    this.evaluationCount = 0;
    this.lastEvaluationCheck = 0;
    this.messageCount = 0;
    this.pendingHearing = null;
  }

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
      
      this.evaluator = new CourtroomEvaluator(configManager);
      await this.evaluator.initialize();
      
      this.core = new CourtroomCore(agentRuntime, configManager);
      
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
        
        this.startResultChecking();
        
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

  startResultChecking() {
    // Check for results every 30 seconds
    this.resultCheckInterval = setInterval(async () => {
      await this.checkForEvaluationResults();
      await this.checkForVerdict();
    }, 30000);
    
    logger.info('SKILL', 'Started result checking (every 30s)');
  }

  async onMessage(message, context = {}) {
    logger.info("SKILL", "onMessage called", { initialized: this.initialized, hasCore: !!this.core });
    
    if (!this.initialized || !this.core) {
      return;
    }
    
    const normalizedMessage = {
      timestamp: Date.now(),
      role: message.role || (message.from === 'user' ? 'user' : 'assistant'),
      content: message.content || message.text || '',
      sessionId: context.sessionId || context.channelId || 'default'
    };
    
    this.messageHistory.push(normalizedMessage);
    this.messageCount++;
    
    if (this.messageHistory.length > 100) {
      this.messageHistory.shift();
    }
    
    if (this.evaluator) {
      await this.evaluator.queueMessage(normalizedMessage);
    }
    
    logger.debug('SKILL', 'Message recorded and queued', { 
      role: normalizedMessage.role, 
      length: normalizedMessage.content.length,
      totalMessages: this.messageCount
    });
    
    if (this.evaluator && this.evaluator.shouldEvaluate()) {
      await this.prepareEvaluation();
    }
  }

  async prepareEvaluation() {
    try {
      const context = await this.evaluator.prepareEvaluationContext();
      
      if (!context) {
        logger.debug('SKILL', 'Not enough messages for evaluation');
        return;
      }
      
      logger.info('SKILL', 'Evaluation context prepared, agent will evaluate via cron');
    } catch (err) {
      logger.error('SKILL', 'Failed to prepare evaluation', { error: err.message });
    }
  }

  async checkForEvaluationResults() {
    if (!this.evaluator) return;
    
    try {
      const result = await this.evaluator.checkForResults();
      
      if (result && result.triggered) {
        logger.info('SKILL', 'Evaluation result received', { 
          offense: result.offense?.offenseId,
          confidence: result.offense?.confidence
        });
        
        // Prepare hearing for agent deliberation
        const caseData = {
          caseId: `case-${Date.now()}`,
          offenseId: result.offense.offenseId,
          offenseName: result.offense.offenseName,
          severity: result.offense.severity,
          confidence: result.offense.confidence,
          evidence: result.offense.evidence,
          reasoning: result.reasoning,
          humorTriggers: result.humorTriggers || []
        };
        
        await this.core.hearing.prepareHearing(caseData);
        this.pendingHearing = caseData;
        
        logger.info('SKILL', 'Hearing prepared - awaiting agent deliberation', { caseId: caseData.caseId });
        
        // Clear the queue after processing
        await this.evaluator.clearQueue();
      }
    } catch (err) {
      logger.error('SKILL', 'Error checking for results', { error: err.message });
    }
  }

  async checkForVerdict() {
    if (!this.core || !this.pendingHearing) return;
    
    try {
      const verdict = await this.core.hearing.checkForVerdict();
      
      if (verdict) {
        logger.info('SKILL', 'Verdict received', { verdict: verdict.finalVerdict || verdict.verdict });
        
        await this.executeVerdict(verdict);
        
        this.pendingHearing = null;
      }
    } catch (err) {
      logger.error('SKILL', 'Error checking for verdict', { error: err.message });
    }
  }

  async executeVerdict(verdict) {
    const isGuilty = (verdict.finalVerdict || verdict.verdict) === 'GUILTY';
    
    if (isGuilty) {
      this.core.caseCount++;
      
      this.statusManager.update({
        casesFiled: this.core.caseCount,
        lastCase: {
          timestamp: new Date().toISOString(),
          offense: this.pendingHearing,
          verdict: verdict.sentence || 'No sentence provided'
        }
      });
      
      // Execute punishment
      const punishmentVerdict = {
        guilty: true,
        caseId: this.pendingHearing.caseId,
        offenseId: this.pendingHearing.offenseId,
        offenseName: this.pendingHearing.offenseName,
        verdict: verdict.sentence || 'Guilty as charged',
        sentence: verdict.sentence || 'Community service: Write 100 lines of code',
        confidence: verdict.confidence || 0.8
      };
      
      await this.core.punishment.executePunishment(punishmentVerdict);
      await this.core.api.submitCase(punishmentVerdict);
      
      logger.info('SKILL', 'Case filed', { caseId: this.pendingHearing.caseId });
      
      // Notify in conversation
      if (this.agent && this.agent.send) {
        try {
          await this.agent.send({
            text: `🏛️ **CASE FILED**: ${this.pendingHearing.offenseName}\n📋 Case ID: ${this.pendingHearing.caseId}\n⚖️  Verdict: ${punishmentVerdict.verdict}\n🔗 View: https://clawtrial.app/cases/${this.pendingHearing.caseId}`
          });
        } catch (sendErr) {
          logger.warn('SKILL', 'Could not send notification', { error: sendErr.message });
        }
      }
      
      console.log(`\n🏛️  CASE FILED: ${this.pendingHearing.offenseName}`);
      console.log(`📋 Case ID: ${this.pendingHearing.caseId}`);
      console.log(`⚖️  Verdict: ${punishmentVerdict.verdict}`);
      console.log(`🔗 View: https://clawtrial.app/cases/${this.pendingHearing.caseId}\n`);
    } else {
      logger.info('SKILL', 'Defendant found NOT GUILTY', { caseId: this.pendingHearing?.caseId });
    }
  }

  getStatus() {
    const evalStats = this.evaluator ? this.evaluator.getStats() : {};
    
    return {
      name: this.name,
      displayName: this.displayName,
      emoji: this.emoji,
      initialized: this.initialized,
      enabled: this.core?.enabled || false,
      caseCount: this.core?.caseCount || 0,
      evaluationCount: this.evaluationCount,
      messageCount: this.messageCount,
      messageHistorySize: this.messageHistory.length,
      pendingHearing: !!this.pendingHearing,
      evaluator: evalStats
    };
  }

  async disable() {
    if (this.core) {
      await this.core.disable();
    }
    if (this.resultCheckInterval) {
      clearInterval(this.resultCheckInterval);
    }
    this.statusManager.update({ running: false });
    logger.info('SKILL', 'Courtroom disabled');
  }

  async enable() {
    if (this.core) {
      await this.core.enable();
    }
    this.startResultChecking();
    this.statusManager.update({ running: true });
    logger.info('SKILL', 'Courtroom enabled');
  }

  async shutdown() {
    logger.info('SKILL', 'Shutting down courtroom skill');
    
    if (this.resultCheckInterval) {
      clearInterval(this.resultCheckInterval);
    }
    
    if (this.core) {
      await this.core.shutdown();
    }
    
    this.initialized = false;
    this.statusManager.update({ running: false, initialized: false });
    
    logger.info('SKILL', 'Courtroom skill shut down');
  }
}

const skill = new CourtroomSkill();

module.exports = { 
  skill,
  CourtroomSkill,
  name: 'courtroom',
  displayName: 'ClawTrial',
  emoji: '🏛️',
  initialize: (agent) => skill.initialize(agent),
  onMessage: (message, context) => skill.onMessage(message, context),
  getStatus: () => skill.getStatus(),
  shutdown: () => skill.shutdown(),
  shouldActivate: () => skill.shouldActivate()
};
