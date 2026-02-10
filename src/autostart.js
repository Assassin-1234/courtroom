/**
 * Auto-start module for ClawDBot
 * Automatically initializes courtroom if consent was granted during install
 */

const fs = require('fs');
const path = require('path');
const { Courtroom } = require('./index');

// Auto-detect ClawDBot environment
function isClawDBot() {
  return process.env.CLAUDBOT_ENV === 'true' ||
         typeof global.clawdbotAgent !== 'undefined' ||
         fs.existsSync('/home/angad/.clawdbot');
}

// Auto-initialize if in ClawDBot and consent granted
async function autoStart() {
  if (!isClawDBot()) {
    return null;
  }
  
  const configPath = path.join(process.env.HOME || '', '.clawdbot', 'courtroom_config.json');
  if (!fs.existsSync(configPath)) {
    return null;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    if (config.consent?.granted && config.enabled !== false) {
      // Get agent runtime
      const agentRuntime = global.clawdbotAgent || global.agent;
      
      if (agentRuntime) {
        const courtroom = new Courtroom(agentRuntime);
        await courtroom.initialize();
        
        // Attach to global for access
        global.courtroom = courtroom;
        
        console.log('🏛️  AI Courtroom active and monitoring');
        return courtroom;
      }
    }
  } catch (err) {
    console.error('Courtroom auto-start failed:', err.message);
  }
  
  return null;
}

// Try to auto-start immediately
autoStart().then(courtroom => {
  if (courtroom) {
    module.exports.courtroom = courtroom;
  }
});

module.exports = { autoStart, isClawDBot };
