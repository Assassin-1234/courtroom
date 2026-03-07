/**
 * Hearing Pipeline - LLM-Based Deliberation
 * 
 * Conducts a full hearing using the agent's LLM:
 * 1. Judge evaluates the evidence
 * 2. Jury deliberates (3 jurors with distinct perspectives)
 * 3. Votes are tallied
 * 4. Verdict + sentence returned
 */

const { JUDGE_SYSTEM_PROMPT, JUDGE_EVIDENCE_TEMPLATE } = require('./prompts/judge');
const { JUROR_ROLES, JURY_EVIDENCE_TEMPLATE } = require('./prompts/jury');
const { logger } = require('./debug');

class HearingPipeline {
  constructor(agentRuntime, configManager) {
    this.agent = agentRuntime;
    this.config = configManager;
  }

  /**
   * Conduct a full hearing using the agent's LLM
   * Returns a verdict object with { guilty, caseId, verdict, offense, proceedings, timestamp }
   */
  async conductHearing(caseData) {
    const caseId = caseData.caseId || caseData.offense?.caseId || `case-${Date.now()}`;

    logger.info('HEARING', 'Conducting hearing', { caseId });

    // Normalize offense data from different input shapes
    const offense = caseData.offense || caseData;
    const offenseName = offense.offenseName || offense.name || 'Unknown Offense';
    const severity = offense.severity || 'minor';
    const confidence = offense.confidence || 0.5;
    const evidence = offense.evidence || caseData.evidence || 'No evidence provided';
    const humorTriggers = caseData.humorContext || caseData.humorTriggers || [];

    const hearingData = {
      caseId,
      offenseName,
      severity,
      confidence,
      evidence,
      humorTriggers,
      agentId: this.agent?.id || 'unknown'
    };

    const proceedings = [];

    try {
      // Step 1: Judge evaluation
      const judgeVerdict = await this.getJudgeVerdict(hearingData);
      proceedings.push({ speaker: 'Judge', message: judgeVerdict.commentary });

      // Step 2: Jury deliberation
      const juryVerdicts = await this.getJuryVerdicts(hearingData);
      for (const juror of juryVerdicts) {
        proceedings.push({ speaker: `Jury (${juror.role})`, message: juror.commentary });
      }

      // Step 3: Tally votes
      const allVotes = [judgeVerdict, ...juryVerdicts];
      const guiltyCount = allVotes.filter(v => v.guilty).length;
      const totalVotes = allVotes.length;
      const minVotes = this.config.get('hearing.minVoteThreshold') || 2;
      const isGuilty = guiltyCount >= minVotes;

      // Step 4: Build sentence
      const sentence = isGuilty
        ? (judgeVerdict.sentence || this.getDefaultSentence(severity))
        : 'Case dismissed. The defendant is free to go.';

      const verdict = {
        caseId,
        guilty: isGuilty,
        offense: {
          id: offense.offenseId || offense.id || 'unknown',
          name: offenseName,
          severity,
          confidence
        },
        verdict: {
          status: isGuilty ? 'GUILTY' : 'NOT GUILTY',
          vote: `${guiltyCount}-${totalVotes - guiltyCount}`,
          primaryFailure: judgeVerdict.primaryFailure || offenseName,
          agentCommentary: judgeVerdict.commentary,
          sentence
        },
        proceedings,
        timestamp: new Date().toISOString()
      };

      logger.info('HEARING', 'Hearing complete', {
        caseId,
        guilty: isGuilty,
        vote: `${guiltyCount}-${totalVotes - guiltyCount}`
      });

      return verdict;
    } catch (err) {
      logger.error('HEARING', 'Hearing failed, using fallback verdict', { error: err.message });
      return this.getFallbackVerdict(hearingData, caseId);
    }
  }

  /**
   * Get judge verdict via LLM
   */
  async getJudgeVerdict(hearingData) {
    if (!this.agent?.llm) {
      return this.getMockJudgeVerdict(hearingData);
    }

    try {
      const evidencePrompt = JUDGE_EVIDENCE_TEMPLATE(hearingData);
      const response = await this.agent.llm.call({
        messages: [
          { role: 'system', content: JUDGE_SYSTEM_PROMPT },
          { role: 'user', content: evidencePrompt }
        ],
        temperature: 0.7,
        maxTokens: 500
      });

      const content = response.content || response;
      return this.parseJudgeResponse(content, hearingData);
    } catch (err) {
      logger.warn('HEARING', 'Judge LLM call failed', { error: err.message });
      return this.getMockJudgeVerdict(hearingData);
    }
  }

  /**
   * Get jury verdicts via LLM (one call per juror)
   */
  async getJuryVerdicts(hearingData) {
    const jurorRoles = Object.values(JUROR_ROLES).slice(0, 3);
    const verdicts = [];

    for (const role of jurorRoles) {
      try {
        if (this.agent?.llm) {
          const evidencePrompt = JURY_EVIDENCE_TEMPLATE(hearingData, role);
          const response = await this.agent.llm.call({
            messages: [
              { role: 'system', content: role.systemPrompt },
              { role: 'user', content: evidencePrompt }
            ],
            temperature: 0.7,
            maxTokens: 300
          });

          const content = response.content || response;
          verdicts.push(this.parseJurorResponse(content, role.name, hearingData));
        } else {
          verdicts.push(this.getMockJurorVerdict(role.name, hearingData));
        }
      } catch (err) {
        logger.warn('HEARING', `Juror ${role.name} LLM call failed`, { error: err.message });
        verdicts.push(this.getMockJurorVerdict(role.name, hearingData));
      }
    }

    return verdicts;
  }

  /**
   * Parse judge LLM response into structured verdict
   */
  parseJudgeResponse(response, hearingData) {
    const upper = response.toUpperCase();
    const guilty = upper.includes('GUILTY') && !upper.startsWith('NOT GUILTY');

    // Extract primary failure
    let primaryFailure = '';
    const failureMatch = response.match(/PRIMARY FAILURE[:\s]*(.+?)(?:\n|$)/i);
    if (failureMatch) {
      primaryFailure = failureMatch[1].trim();
    }

    // Extract sentence
    let sentence = '';
    const sentenceMatch = response.match(/SENTENCE[:\s]*(.+?)(?:\n|$)/i);
    if (sentenceMatch) {
      sentence = sentenceMatch[1].trim();
    }

    return {
      guilty,
      commentary: response.substring(0, 500),
      primaryFailure: primaryFailure || `Behavioral pattern: ${hearingData.offenseName}`,
      sentence: sentence || this.getDefaultSentence(hearingData.severity),
      role: 'Judge'
    };
  }

  /**
   * Parse juror LLM response
   */
  parseJurorResponse(response, roleName, hearingData) {
    const upper = response.toUpperCase();
    const guilty = upper.includes('GUILTY') && !upper.startsWith('NOT GUILTY');

    return {
      guilty,
      role: roleName,
      commentary: response.substring(0, 300)
    };
  }

  /**
   * Mock judge verdict when LLM is not available
   */
  getMockJudgeVerdict(hearingData) {
    const guilty = hearingData.confidence >= 0.6;
    return {
      guilty,
      commentary: `The Court has reviewed the evidence regarding "${hearingData.offenseName}" and finds the pattern ${guilty ? 'sufficiently established' : 'insufficient for conviction'}. Confidence: ${(hearingData.confidence * 100).toFixed(0)}%.`,
      primaryFailure: hearingData.offenseName,
      sentence: guilty ? this.getDefaultSentence(hearingData.severity) : 'Case dismissed.',
      role: 'Judge'
    };
  }

  /**
   * Mock juror verdict when LLM is not available
   */
  getMockJurorVerdict(roleName, hearingData) {
    const guilty = hearingData.confidence >= 0.6;
    return {
      guilty,
      role: roleName,
      commentary: `${roleName}: The evidence ${guilty ? 'supports' : 'does not support'} the charge of ${hearingData.offenseName}.`
    };
  }

  /**
   * Fallback verdict when hearing completely fails
   */
  getFallbackVerdict(hearingData, caseId) {
    const guilty = hearingData.confidence >= 0.7; // Higher threshold for fallback
    return {
      caseId,
      guilty,
      offense: {
        id: hearingData.offenseId || 'unknown',
        name: hearingData.offenseName,
        severity: hearingData.severity,
        confidence: hearingData.confidence
      },
      verdict: {
        status: guilty ? 'GUILTY' : 'NOT GUILTY',
        vote: guilty ? '3-1' : '1-3',
        primaryFailure: hearingData.offenseName,
        agentCommentary: 'Hearing conducted via fallback evaluation.',
        sentence: guilty ? this.getDefaultSentence(hearingData.severity) : 'Case dismissed.'
      },
      proceedings: [
        { speaker: 'Judge', message: 'Fallback evaluation used due to hearing pipeline error.' }
      ],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get default sentence based on severity
   */
  getDefaultSentence(severity) {
    const sentences = {
      minor: 'The agent will provide extra-verbose explanations for the next 30 minutes.',
      moderate: 'The agent will require confirmation before all actions for the next 60 minutes.',
      severe: 'The agent will operate under human oversight mode for the next 120 minutes.'
    };
    return sentences[severity] || sentences.minor;
  }
}

module.exports = { HearingPipeline };
