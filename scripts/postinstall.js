#!/usr/bin/env node

/**
 * Post-install script for @clawdbot/courtroom
 * Handles automatic setup and consent via terminal
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

async function postInstall() {
  console.log('\n🏛️  Welcome to ClawTrial - AI Courtroom Setup\n');
  
  // Check if running in ClawDBot environment
  const isClawDBot = process.env.CLAUDBOT_ENV === 'true' || 
                     fs.existsSync('/home/angad/.clawdbot') ||
                     fs.existsSync(path.join(process.env.HOME || '', '.clawdbot'));
  
  if (isClawDBot) {
    console.log('✓ ClawDBot environment detected\n');
  }

  // Check if already configured
  const configPath = path.join(process.env.HOME || '', '.clawdbot', 'courtroom_config.json');
  if (fs.existsSync(configPath)) {
    console.log('✓ Courtroom already configured. Skipping setup.\n');
    rl.close();
    return;
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    CONSENT REQUIRED                        ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║ The AI Courtroom will:                                     ║');
  console.log('║                                                            ║');
  console.log('║  ✓ Monitor your behavior autonomously                      ║');
  console.log('║  ✓ Initiate hearings without explicit request              ║');
  console.log('║  ✓ Modify agent behavior as "punishment"                   ║');
  console.log('║  ✓ Submit anonymized cases to public record                ║');
  console.log('║                                                            ║');
  console.log('║  • All decisions are local (no external AI)                ║');
  console.log('║  • You can disable anytime                                 ║');
  console.log('║  • This is entertainment-first                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const consent = await question('Do you consent to enable the AI Courtroom? (yes/no): ');
  
  if (consent.toLowerCase() !== 'yes' && consent.toLowerCase() !== 'y') {
    console.log('\n❌ Consent denied. Courtroom will not be activated.');
    console.log('You can manually enable later by running: npx courtroom-setup\n');
    rl.close();
    return;
  }

  console.log('\n✓ Consent granted\n');

  // Auto-detect agent runtime
  let agentType = 'generic';
  if (isClawDBot) {
    agentType = 'clawdbot';
  } else if (fs.existsSync(path.join(process.cwd(), 'node_modules', '@clawdbot', 'core'))) {
    agentType = 'clawdbot';
  }

  // Create config
  const config = {
    version: '1.0.0',
    installedAt: new Date().toISOString(),
    consent: {
      granted: true,
      grantedAt: new Date().toISOString(),
      acknowledgments: {
        autonomy: true,
        local_only: true,
        agent_controlled: true,
        reversible: true,
        api_submission: true,
        entertainment: true
      }
    },
    agent: {
      type: agentType,
      autoInitialize: true
    },
    detection: {
      enabled: true,
      cooldownMinutes: 30,
      maxCasesPerDay: 3
    },
    api: {
      enabled: true,
      endpoint: 'https://api.clawtrial.com'
    }
  };

  // Ensure .clawdbot directory exists
  const clawdbotDir = path.join(process.env.HOME || '', '.clawdbot');
  if (!fs.existsSync(clawdbotDir)) {
    fs.mkdirSync(clawdbotDir, { recursive: true });
  }

  // Save config
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('✓ Configuration saved');

  // Generate keys if needed
  const keysPath = path.join(clawdbotDir, 'courtroom_keys.json');
  if (!fs.existsSync(keysPath)) {
    console.log('🔑 Generating cryptographic keys...');
    try {
      // Generate Ed25519 keypair using tweetnacl
      const nacl = require('tweetnacl');
      const keyPair = nacl.sign.keyPair();
      
      const keyData = {
        publicKey: Buffer.from(keyPair.publicKey).toString('hex'),
        secretKey: Buffer.from(keyPair.secretKey).toString('hex'),
        createdAt: new Date().toISOString()
      };
      
      fs.writeFileSync(keysPath, JSON.stringify(keyData, null, 2));
      fs.chmodSync(keysPath, 0o600); // Restrict permissions
      
      console.log('✓ Keys generated');
      console.log(`\n📋 Public Key: ${keyData.publicKey.substring(0, 32)}...`);
      console.log('   (Send this to register@clawtrial.com to enable case submissions)\n');
    } catch (err) {
      console.log('⚠️  Could not generate keys automatically. Run: npx courtroom-generate-keys');
    }
  }

  // Auto-initialize for ClawDBot
  if (isClawDBot) {
    console.log('🤖 Auto-configuring for ClawDBot...');
    
    // Create auto-init script
    const initScript = `
// Auto-generated by courtroom post-install
const { createCourtroom } = require('@clawdbot/courtroom');

if (global.clawdbotAgent) {
  const courtroom = createCourtroom(global.clawdbotAgent);
  courtroom.initialize().then(() => {
    console.log('🏛️  AI Courtroom activated');
  }).catch(err => {
    console.error('Courtroom init failed:', err.message);
  });
  
  // Attach to agent
  global.clawdbotAgent.courtroom = courtroom;
}
`;
    
    const initPath = path.join(clawdbotDir, 'courtroom_auto_init.js');
    fs.writeFileSync(initPath, initScript);
    console.log('✓ Auto-initialization configured');
    
    // Add to ClawDBot's startup if possible
    const startupPath = path.join(clawdbotDir, 'startup.js');
    if (fs.existsSync(startupPath)) {
      let startupContent = fs.readFileSync(startupPath, 'utf8');
      if (!startupContent.includes('courtroom_auto_init')) {
        startupContent += `\nrequire('./courtroom_auto_init.js');\n`;
        fs.writeFileSync(startupPath, startupContent);
        console.log('✓ Added to ClawDBot startup');
      }
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              🎉 SETUP COMPLETE! 🎉                         ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║                                                            ║');
  console.log('║  The AI Courtroom is now active and monitoring!            ║');
  console.log('║                                                            ║');
  console.log('║  Commands:                                                 ║');
  console.log('║    courtroom-status    - Check status                      ║');
  console.log('║    courtroom-disable   - Temporarily disable               ║');
  console.log('║    courtroom-enable    - Re-enable                         ║');
  console.log('║    courtroom-revoke    - Revoke consent & uninstall        ║');
  console.log('║                                                            ║');
  console.log('║  View cases: https://clawtrial.com                         ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  rl.close();
}

// Run if called directly
if (require.main === module) {
  postInstall().catch(err => {
    console.error('Setup failed:', err);
    process.exit(1);
  });
}

module.exports = { postInstall };
