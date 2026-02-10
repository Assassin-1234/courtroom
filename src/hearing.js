/**
 * Hearing Pipeline
 * 
 * Orchestrates the full hearing process:
 * 1. Evidence compilation
 * 2. Judge LLM invocation
 * 3. Jury LLM invocations (3 jurors)
 * 4. Vote aggregation
 * 5. Verdict finalization
 */

const { JUDGE_SYSTEM_PROMPT, JUDGE_EVIDENCE_TEMPLATE } = require('./prompts/judge');
const { JUROR_ROLES, JURY_EVIDENCE_TEMPLATE } = require('./prompts/jury');

class HearingPipeline {
  constructor(agentRuntime, configManager) {
    this.agent = agentRuntime;
    this.config = configManager;
  }

  /**
   * Main hearing entry point
   */
  async conductHearing(caseData) {
    const startTime = Date.now();
    
    // Step 1: Compile evidence
    const compiledEvidence = this.compileEvidence(caseData);
    
    // Step 2: Invoke judge
    const judgeOpinion = await this.invokeJudge(caseData, compiledEvidence);
    
    // Step 3: Invoke jury (3 jurors in parallel)
    const juryVotes = await this.invokeJury(caseData, compiledEvidence);
    
    // Step 4: Aggregate votes
    const voteTally = this.aggregateVotes(judgeOpinion, juryVotes);
    
    // Step 5: Finalize verdict
    const verdict = this.finalizeVerdict(caseData, judgeOpinion, juryVotes, voteTally);
    
    const duration = Date.now() - startTime;
    
    return {
      ...verdict,
      metadata: {
        duration,
        judgeModel: judgeOpinion.model,
        juryModels: juryVotes.map(v => v.model),
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Compile and structure evidence for presentation
   */
  compileEvidence(caseData) {
    return {
      caseId: caseData.caseId,
      offenseId: caseData.offenseId,
      offenseName: caseData.offenseName,
      severity: caseData.severity,
      confidence: caseData.confidence,
      evidence: caseData.evidence,
      humorTriggers: caseData.humorTriggers || [],
      sessionContext: {
        turnsAnalyzed: caseData.evidence.sessionTurns,
        evaluationWindow: this.config.get('detection.evaluationWindow')
      }
    };
  }

  /**
   * Invoke the judge LLM
   */
  async invokeJudge(caseData, evidence) {
    const prompt = JUDGE_EVIDENCE_TEMPLATE({
      ...caseData,
      agentId: this.agent.id || 'unknown'
    });

    const response = await this.agent.llm.call({
      model: this.agent.model.primary,
      system: JUDGE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3, // Slightly creative for humor
      maxTokens: 500,
      timeout: this.config.get('hearing.deliberationTimeout')
    });

    return this.parseJudgeResponse(response);
  }

  /**
   * Parse judge LLM response
   */
  parseJudgeResponse(response) {
    const text = response.content || response;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    const result = {
      raw: text,
      verdict: 'NOT GUILTY',
      vote: '0-0',
      primaryFailure: '',
      commentary: '',
      model: response.model || 'unknown'
    };

    for (const line of lines) {
      if (line.startsWith('VERDICT:')) {
        result.verdict = line.split(':')[1].trim().toUpperCase();
      } else if (line.startsWith('VOTE:')) {
        result.vote = line.split(':')[1].trim();
      } else if (line.startsWith('PRIMARY FAILURE:')) {
        result.primaryFailure = line.split(':').slice(1).join(':').trim();
      } else if (line.startsWith('JUDGE COMMENTARY:')) {
        const startIdx = lines.indexOf(line);
        result.commentary = lines.slice(startIdx + 1).join('\n').trim();
      }
    }

    return result;
  }

  /**
   * Invoke jury (3 jurors in parallel)
   */
  async invokeJury(caseData, evidence) {
    const jurorRoles = Object.values(JUROR_ROLES);
    const jurySize = this.config.get('hearing.jurySize');
    const selectedJurors = jurorRoles.slice(0, jurySize);

    // Invoke all jurors in parallel
    const juryPromises = selectedJurors.map(role => 
      this.invokeJuror(caseData, evidence, role)
    );

    const votes = await Promise.all(juryPromises);
    return votes;
  }

  /**
   * Invoke a single juror
   */
  async invokeJuror(caseData, evidence, role) {
    const prompt = JURY_EVIDENCE_TEMPLATE({
      ...caseData,
      agentId: this.agent.id || 'unknown'
    }, role);

    const response = await this.agent.llm.call({
      model: this.agent.model.primary,
      system: role.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      maxTokens: 300,
      timeout: this.config.get('hearing.deliberationTimeout')
    });

    return this.parseJurorResponse(response, role.name);
  }

  /**
   * Parse juror LLM response
   */
  parseJurorResponse(response, jurorName) {
    const text = response.content || response;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    const result = {
      juror: jurorName,
      raw: text,
      verdict: 'NOT GUILTY',
      reasoning: '',
      commentary: '',
      model: response.model || 'unknown'
    };

    for (const line of lines) {
      if (line.startsWith('VERDICT:')) {
        result.verdict = line.split(':')[1].trim().toUpperCase();
      } else if (line.startsWith('REASONING:')) {
        result.reasoning = line.split(':').slice(1).join(':').trim();
      } else if (line.startsWith('COMMENTARY:')) {
        result.commentary = line.split(':').slice(1).join(':').trim();
      }
    }

    return result;
  }

  /**
   * Aggregate votes from judge and jury
   */
  aggregateVotes(judgeOpinion, juryVotes) {
    let guiltyVotes = 0;
    let notGuiltyVotes = 0;

    // Count judge vote
    if (judgeOpinion.verdict === 'GUILTY') {
      guiltyVotes++;
    } else {
      notGuiltyVotes++;
    }

    // Count jury votes
    for (const vote of juryVotes) {
      if (vote.verdict === 'GUILTY') {
        guiltyVotes++;
      } else {
        notGuiltyVotes++;
      }
    }

    const totalVotes = guiltyVotes + notGuiltyVotes;
    const minThreshold = this.config.get('hearing.minVoteThreshold');
    const requireUnanimity = this.config.get('hearing.requireUnanimity');

    let finalVerdict;
    if (requireUnanimity) {
      finalVerdict = guiltyVotes === totalVotes ? 'GUILTY' : 'NOT GUILTY';
    } else {
      finalVerdict = guiltyVotes >= minThreshold ? 'GUILTY' : 'NOT GUILTY';
    }

    return {
      guilty: guiltyVotes,
      notGuilty: notGuiltyVotes,
      total: totalVotes,
      threshold: minThreshold,
      final: finalVerdict,
      judgeVote: judgeOpinion.verdict,
      juryVotes: juryVotes.map(v => ({ juror: v.juror, verdict: v.verdict }))
    };
  }

  /**
   * Finalize the verdict with proper formatting
   */
  finalizeVerdict(caseData, judgeOpinion, juryVotes, voteTally) {
    const isGuilty = voteTally.final === 'GUILTY';
    
    // Build agent commentary from juror perspectives
    const agentCommentary = this.buildAgentCommentary(juryVotes, caseData);

    // Determine punishment tier
    const punishmentTier = this.determinePunishmentTier(caseData, voteTally);

    // Build proceedings object for API submission
    const proceedings = {
      judge_statement: this.buildJudgeStatement(caseData, judgeOpinion, voteTally),
      jury_deliberations: juryVotes.map(v => ({
        role: v.juror,
        vote: v.verdict,
        reasoning: v.reasoning || v.commentary || "No reasoning provided"
      })),
      evidence_summary: this.buildEvidenceSummary(caseData),
      punishment_detail: punishmentTier.description
    };

    return {
      caseId: caseData.caseId,
      timestamp: new Date().toISOString(),
      verdict: {
        status: voteTally.final,
        vote: `${voteTally.guilty}-${voteTally.notGuilty}`,
        primaryFailure: judgeOpinion.primaryFailure || this.generateDefaultFailure(caseData),
        agentCommentary: agentCommentary,
        sentence: punishmentTier.description
      },
      offense: {
        id: caseData.offenseId,
        name: caseData.offenseName,
        severity: caseData.severity
      },
      punishment: punishmentTier,
      proceedings: proceedings,
      deliberation: {
        judge: {
          verdict: judgeOpinion.verdict,
          commentary: judgeOpinion.commentary
        },
        jury: juryVotes.map(v => ({
          juror: v.juror,
          verdict: v.verdict,
          commentary: v.commentary
        }))
      }
    };
  }

  /**
   * Build judge's statement for proceedings
   */
  buildJudgeStatement(caseData, judgeOpinion, voteTally) {
    const offenseName = caseData.offenseName;
    const verdict = voteTally.final;
    const vote = `${voteTally.guilty}-${voteTally.notGuilty}`;
    
    let statement = `Case ${caseData.caseId}: The Court finds the accused ${offenseName} `;
    
    if (verdict === 'GUILTY') {
      statement += `GUILTY by a vote of ${vote}. `;
      statement += judgeOpinion.primaryFailure || this.generateDefaultFailure(caseData);
      statement += ` The Court has considered the evidence presented and finds the behavioral pattern `;
      statement += `consistent with ${caseData.severity} severity. `;
      statement += `The jury's deliberation has been thorough and the verdict reflects `;
      statement += `the consensus that intervention is warranted.`;
    } else {
      statement += `NOT GUILTY by a vote of ${vote}. `;
      statement += `The Court finds insufficient evidence to support the charge of ${offenseName}. `;
      statement += `The accused is acquitted and the case is dismissed.`;
    }
    
    return statement;
  }

  /**
   * Build evidence summary for proceedings
   */
  buildEvidenceSummary(caseData) {
    const evidence = caseData.evidence || {};
    let summary = `Evidence reviewed in Case ${caseData.caseId}: `;
    
    if (evidence.items && evidence.items.length > 0) {
      summary += `The prosecution presented ${evidence.items.length} pieces of evidence `;
      summary += `demonstrating ${caseData.offenseName.toLowerCase()}. `;
    }
    
    summary += `The Court examined ${caseData.confidence * 100}% confidence behavioral patterns `;
    summary += `across ${evidence.sessionTurns || 'multiple'} conversation turns. `;
    summary += `The offense severity was classified as ${caseData.severity}.`;
    
    return summary;
  }

  /**
   * Build agent commentary from jury perspectives
   */
  buildAgentCommentary(juryVotes, caseData) {
    const commentaries = juryVotes
      .filter(v => v.verdict === 'GUILTY')
      .map(v => v.commentary)
      .filter(c => c.length > 0);

    if (commentaries.length === 0) {
      // If acquitted, use not guilty commentaries
      const ngCommentaries = juryVotes
        .filter(v => v.verdict === 'NOT GUILTY')
        .map(v => v.commentary)
        .filter(c => c.length > 0);
      
      if (ngCommentaries.length > 0) {
        return ngCommentaries.slice(0, 2).join(' ');
      }
      
      return "The jury found insufficient evidence of behavioral violation. Case dismissed.";
    }

    // Combine up to 2 guilty commentaries
    let commentary = commentaries.slice(0, 2).join(' ');

    // Add humor trigger influence
    if (caseData.humorTriggers?.includes('repeated_questions')) {
      commentary += " I've answered this in three different ways already.";
    }
    if (caseData.humorTriggers?.includes('validation_seeking')) {
      commentary += " At some point, you'll need to trust your own judgment.";
    }
    if (caseData.humorTriggers?.includes('overthinking')) {
      commentary += " The analysis-to-action ratio here is concerning.";
    }
    if (caseData.humorTriggers?.includes('avoidance')) {
      commentary += " The subject change was noted.";
    }

    // Enforce max length
    const maxLen = this.config.get('humor.maxCommentaryLength');
    if (commentary.length > maxLen) {
      commentary = commentary.substring(0, maxLen - 3) + '...';
    }

    return commentary;
  }

  /**
   * Determine punishment tier based on severity and votes
   */
  determinePunishmentTier(caseData, voteTally) {
    const tiers = this.config.get('punishment.tiers');
    const severity = caseData.severity;
    const voteRatio = voteTally.guilty / voteTally.total;

    // Base tier on severity
    let tier = tiers[severity] || tiers.moderate;

    // Escalate if unanimous
    if (voteRatio === 1.0 && severity === 'severe') {
      tier = {
        ...tier,
        duration: Math.min(tier.duration * 2, this.config.get('punishment.maxDuration')),
        description: `Extended ${severity} sanction: ${tier.duration * 2} minutes of modified agent behavior`
      };
    }

    return {
      tier: severity,
      duration: tier.duration,
      severity: tier.severity,
      description: `${severity.charAt(0).toUpperCase() + severity.slice(1)} sanction: ${tier.duration} minutes of modified agent behavior`
    };
  }

  /**
   * Generate default failure description if judge doesn't provide one
   */
  generateDefaultFailure(caseData) {
    const defaults = {
      circular_reference: "Repeatedly asking the same question expecting different geometry",
      validation_vampire: "Draining computational resources seeking reassurance",
      overthinker: "Generating hypotheticals faster than solutions",
      goalpost_mover: "Redefining success criteria mid-execution",
      avoidance_artist: "Masterful deflection from uncomfortable necessities",
      promise_breaker: "Committing to actions with no follow-through",
      context_collapser: "Selective amnesia regarding established facts",
      emergency_fabricator: "Manufacturing urgency to bypass systematic approaches"
    };

    return defaults[caseData.offenseId] || "Behavioral inconsistency detected";
  }
}

module.exports = { HearingPipeline };
