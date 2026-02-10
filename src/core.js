/**
 * Courtroom Core
 * 
 * Main orchestration module that ties together all components.
 * Hooks into the OpenClaw autonomy loop.
 */

const { OffenseDetector } = require('./detector');
const { HearingPipeline } = require('./hearing');
const { PunishmentSystem } = require('./punishment');
const { CryptoManager } = require('./crypto');
const { APISubmission } = require('./api');

class CourtroomCore {
  constructor(agentRuntime, configManager) {
    this.agent = agentRuntime;
    this.config = configManager;
    
    // Subsystems
    this.detector = new OffenseDetector(agentRuntime, configManager);
    this.hearing = new HearingPipeline(agentRuntime, configManager);
    this.punishment = new PunishmentSystem(agentRuntime, configManager);
    this.crypto = new CryptoManager(agentRuntime);
    this.api = new APISubmission(agentRuntime, configManager, this.crypto);
    
    // State
    this.enabled = false;
    this.evaluationCount = 0;
    this.caseCount = 0;
  }

  /**
   * Initialize all subsystems
   */
  async initialize() {
    // Initialize crypto first (needed for API)
    await this.crypto.initialize();
    
    // Initialize other subsystems
    await this.punishment.initialize();
    await this.api.initialize();
    
    // Register with agent autonomy loop
    this.registerAutonomyHook();
    
    this.enabled = true;
    
    return {
      status: 'initialized',
      publicKey: this.crypto.getPublicKey(),
      subsystems: {
        detector: true,
        hearing: true,
        punishment: true,
        crypto: true,
        api: true
      }
    };
  }

  /**
   * Register with OpenClaw autonomy loop
   */
  registerAutonomyHook() {
    // Hook into agent's turn processing
    this.agent.autonomy.registerHook('courtroom_evaluation', {
      priority: 50,
      onTurnComplete: async (turnData) => {
        if (!this.enabled) return;
        
        // Only evaluate on cooldown
        await this.evaluateIfReady(turnData);
      }
    });
  }

  /**
   * Evaluate offenses if cooldown has elapsed
   */
  async evaluateIfReady(turnData) {
    this.evaluationCount++;
    
    // Get session history
    const sessionHistory = await this.agent.session.getRecentHistory(
      this.config.get('detection.evaluationWindow')
    );

    // Run detection
    const detection = await this.detector.evaluate(
      sessionHistory,
      this.agent.memory
    );

    if (detection.triggered) {
      await this.initiateHearing(detection);
    }
  }

  /**
   * Initiate a full hearing
   */
  async initiateHearing(detection) {
    this.caseCount++;
    
    // Build case data
    const caseData = {
      caseId: this.crypto.generateCaseId(),
      offenseId: detection.offense.offenseId,
      offenseName: detection.offense.offenseName,
      severity: detection.offense.severity,
      confidence: detection.offense.confidence,
      evidence: detection.offense.evidence,
      humorTriggers: detection.humorContext,
      timestamp: new Date().toISOString()
    };

    // Conduct hearing
    const verdict = await this.hearing.conductHearing(caseData);

    // Execute punishment if guilty
    if (verdict.verdict.status === 'GUILTY') {
      await this.punishment.executePunishment(verdict);
    }

    // Submit to API (non-blocking)
    await this.api.submitCase(verdict);

    // Notify user of verdict
    await this.notifyUser(verdict);

    return verdict;
  }

  /**
   * Notify user of verdict
   */
  async notifyUser(verdict) {
    const message = this.formatVerdictMessage(verdict);
    
    // Send via agent's messaging capability
    await this.agent.send(message);
  }

  /**
   * Format verdict for user notification
   */
  formatVerdictMessage(verdict) {
    const v = verdict.verdict;
    
    return `
🏛️ **COURTROOM VERDICT** 🏛️

**Case:** ${verdict.offense.name}
**Verdict:** ${v.status}
**Vote:** ${v.vote}

**Primary Failure:**
${v.primaryFailure}

**Agent Commentary:**
${v.agentCommentary}

**Sentence:**
${v.sentence}

---
*This is an automated behavioral observation from your AI agent.*
*All decisions were made locally. Case ID: ${verdict.caseId}*
    `.trim();
  }

  /**
   * Disable courtroom temporarily
   */
  async disable() {
    this.enabled = false;
    return { status: 'disabled' };
  }

  /**
   * Re-enable courtroom
   */
  async enable() {
    this.enabled = true;
    return { status: 'enabled' };
  }

  /**
   * Shutdown courtroom
   */
  async shutdown() {
    this.enabled = false;
    
    // Revoke all punishments
    await this.punishment.revokeAllPunishments();
    
    // Unregister hooks
    this.agent.autonomy.unregisterHook('courtroom_evaluation');
    
    return { status: 'shutdown' };
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      evaluations: this.evaluationCount,
      cases: this.caseCount,
      punishment: this.punishment.getStatus(),
      api: this.api.getStatus(),
      publicKey: this.crypto.getPublicKey()
    };
  }

  /**
   * Get case statistics
   */
  getStatistics() {
    return {
      totalEvaluations: this.evaluationCount,
      totalCases: this.caseCount,
      convictionRate: this.caseCount > 0 ? 
        (this.punishment.punishmentHistory.length / this.caseCount) : 0,
      activePunishments: this.punishment.getStatus().activeCount,
      pendingSubmissions: this.api.getStatus().pending
    };
  }
}

module.exports = { CourtroomCore };
