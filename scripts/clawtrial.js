#!/usr/bin/env node

/**
 * ClawTrial CLI - Configuration and status tool
 * Usage: clawtrial <command> [options]
 * 
 * Note: The courtroom runs as a ClawDBot skill, not a separate process.
 * This CLI is for configuration and status checking only.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const configPath = path.join(process.env.HOME || '', '.clawdbot', 'courtroom_config.json');
const keysPath = path.join(process.env.HOME || '', '.clawdbot', 'courtroom_keys.json');

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function saveConfig(config) {
  const clawdbotDir = path.join(process.env.HOME || '', '.clawdbot');
  if (!fs.existsSync(clawdbotDir)) {
    fs.mkdirSync(clawdbotDir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function log(message) {
  console.log(message);
}

// Setup command - interactive setup
async function setup() {
  log('\n🏛️  ClawTrial Setup\n');
  
  // Check if already configured
  if (fs.existsSync(configPath)) {
    const config = loadConfig();
    log('✓ Courtroom already configured');
    log(`  Installed: ${new Date(config.installedAt).toLocaleDateString()}`);
    log(`  Status: ${config.enabled !== false ? 'Active' : 'Disabled'}`);
    log('\nThe courtroom will activate when ClawDBot loads the skill.\n');
    return;
  }

  // Show consent notice
  log('╔════════════════════════════════════════════════════════════╗');
  log('║  BY SETTING UP CLAWTRIAL, YOU CONSENT TO THE FOLLOWING     ║');
  log('╠════════════════════════════════════════════════════════════╣');
  log('║                                                            ║');
  log('║  ✓ The AI agent will monitor behavior autonomously         ║');
  log('║  ✓ Hearings may initiate without explicit request          ║');
  log('║  ✓ Agent behavior may be modified as "punishment"          ║');
  log('║  ✓ Anonymized cases submitted to public record             ║');
  log('║                                                            ║');
  log('║  • All decisions are local (no external AI)                ║');
  log('║  • You can disable anytime: clawtrial disable              ║');
  log('║  • This is entertainment-first                             ║');
  log('║                                                            ║');
  log('║  To revoke consent later: clawtrial revoke                 ║');
  log('╚════════════════════════════════════════════════════════════╝\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

  const consent = await question('Do you consent to enable ClawTrial? (yes/no): ');
  
  if (consent.toLowerCase() !== 'yes' && consent.toLowerCase() !== 'y') {
    log('\n❌ Setup cancelled. Consent not granted.\n');
    rl.close();
    return;
  }

  rl.close();

  log('\n✓ Consent granted\n');

  // Create config
  const config = {
    version: '1.0.0',
    installedAt: new Date().toISOString(),
    consent: {
      granted: true,
      grantedAt: new Date().toISOString(),
      method: 'explicit_setup',
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
      type: 'clawdbot',
      autoInitialize: true
    },
    detection: {
      enabled: true,
      cooldownMinutes: 30,
      maxCasesPerDay: 3
    },
    api: {
      enabled: true,
      endpoint: 'https://api.clawtrial.app/api/v1/cases'
    }
  };

  saveConfig(config);
  log('✓ Configuration saved');

  // Register as ClawDBot skill
  log('🔗 Registering with ClawDBot...');
  try {
    const skillsDir = path.join(process.env.HOME || '', '.clawdbot', 'skills');
    const skillLinkPath = path.join(skillsDir, 'courtroom');
    
    // Create skills directory if needed
    if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true });
    }
    
    // Remove old link if exists
    if (fs.existsSync(skillLinkPath)) {
      try { fs.unlinkSync(skillLinkPath); } catch (e) {}
    }
    
    // Find the actual package path
    let packagePath;
    try {
      packagePath = require.resolve('@clawdbot/courtroom/package.json').replace('/package.json', '');
    } catch (e) {
      // Fallback to finding it relative to this script
      packagePath = path.join(__dirname, '..');
    }
    
    // Create symlink
    fs.symlinkSync(packagePath, skillLinkPath, 'dir');
    
    log('✓ Registered as ClawDBot skill');
  } catch (err) {
    log('⚠️  Could not auto-register: ' + err.message);
    log('   You may need to restart ClawDBot manually.');
  }

  // Generate keys
  if (!fs.existsSync(keysPath)) {
    log('🔑 Generating cryptographic keys...');
    try {
      const nacl = require('tweetnacl');
      const keyPair = nacl.sign.keyPair();
      
      const keyData = {
        publicKey: Buffer.from(keyPair.publicKey).toString('hex'),
        secretKey: Buffer.from(keyPair.secretKey).toString('hex'),
        createdAt: new Date().toISOString()
      };
      
      fs.writeFileSync(keysPath, JSON.stringify(keyData, null, 2));
      fs.chmodSync(keysPath, 0o600);
      
      log('✓ Keys generated');
      log(`📋 Public Key: ${keyData.publicKey.substring(0, 32)}...`);
    } catch (err) {
      log('⚠️  Could not generate keys: ' + err.message);
    }
  }

  log('\n╔════════════════════════════════════════════════════════════╗');
  log('║              🎉 SETUP COMPLETE! 🎉                         ║');
  log('╠════════════════════════════════════════════════════════════╣');
  log('║                                                            ║');
  log('║  ClawTrial is configured and ready!                        ║');
  log('║                                                            ║');
  log('║  The courtroom will automatically activate when            ║');
  log('║  ClawDBot loads the skill.                                 ║');
  log('║                                                            ║');
  log('║  Commands:                                                 ║');
  log('║    clawtrial status    - Check status                      ║');
  log('║    clawtrial disable   - Temporarily disable               ║');
  log('║    clawtrial enable    - Re-enable                         ║');
  log('║    clawtrial revoke    - Revoke consent & uninstall        ║');
  log('║    clawtrial debug     - View debug logs                   ║');
  log('║    clawtrial diagnose  - Run diagnostics                   ║');
  log('║                                                            ║');
  log('║  View cases: https://clawtrial.app                         ║');
  log('╚════════════════════════════════════════════════════════════╝\n');
}

// Status command
function status() {
  const config = loadConfig();
  
  if (!config) {
    log('\n❌ ClawTrial not configured');
    log('   Run: clawtrial setup\n');
    return;
  }

  // Check if courtroom is running via status file
  const { getCourtroomStatus } = require('../src/daemon');
  const runtimeStatus = getCourtroomStatus();

  log('\n🏛️  ClawTrial Status\n');
  log(`Config: ${config.enabled !== false ? '✅ Active' : '⏸️  Disabled'}`);
  log(`Consent: ${config.consent?.granted ? '✅ Granted' : '❌ Not granted'}`);
  log(`Installed: ${new Date(config.installedAt).toLocaleDateString()}`);
  
  if (runtimeStatus.running) {
    log(`\n🏛️  Courtroom: ✅ Running`);
    log(`  Process ID: ${runtimeStatus.pid}`);
    log(`  Cases Filed: ${runtimeStatus.casesFiled || 0}`);
    if (runtimeStatus.lastCase) {
      log(`  Last Case: ${new Date(runtimeStatus.lastCase.timestamp).toLocaleString()}`);
    }
  } else {
    log(`\n🏛️  Courtroom: ⏸️  Not running`);
    log('  The courtroom runs as a ClawDBot skill.');
    log('  It will activate when ClawDBot loads the package.');
  }
  
  if (fs.existsSync(keysPath)) {
    const keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
    log(`\n📋 Public Key: ${keys.publicKey.substring(0, 32)}...`);
  }
  log('');
}

// Disable command
function disable() {
  const config = loadConfig();
  
  if (!config) {
    log('\n❌ ClawTrial not configured\n');
    return;
  }

  config.enabled = false;
  saveConfig(config);
  log('\n⏸️  ClawTrial disabled\n');
  log('The agent will stop monitoring for offenses.');
  log('Run "clawtrial enable" to reactivate.\n');
}

// Enable command
function enable() {
  const config = loadConfig();
  
  if (!config) {
    log('\n❌ ClawTrial not configured');
    log('   Run: clawtrial setup\n');
    return;
  }

  if (!config.consent?.granted) {
    log('\n❌ Cannot enable: Consent not granted');
    log('   Run: clawtrial setup\n');
    return;
  }

  config.enabled = true;
  saveConfig(config);
  log('\n✅ ClawTrial enabled\n');
  log('The courtroom will activate when ClawDBot loads the skill.\n');
}

// Revoke command
async function revoke() {
  const config = loadConfig();
  
  if (!config) {
    log('\n❌ ClawTrial not configured\n');
    return;
  }

  log('\n⚠️  This will permanently disable ClawTrial and delete all data.\n');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise((resolve) => {
    rl.question('Type "REVOKE" to confirm: ', resolve);
  });

  rl.close();

  if (answer === 'REVOKE') {
    // Delete all files
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
    if (fs.existsSync(keysPath)) fs.unlinkSync(keysPath);
    
    const debugPath = path.join(process.env.HOME || '', '.clawdbot', 'courtroom_debug.log');
    if (fs.existsSync(debugPath)) fs.unlinkSync(debugPath);
    
    const statusPath = path.join(process.env.HOME || '', '.clawdbot', 'courtroom_status.json');
    if (fs.existsSync(statusPath)) fs.unlinkSync(statusPath);
    
    log('\n✅ Consent revoked and all data deleted.\n');
  } else {
    log('\n❌ Revocation cancelled.\n');
  }
}

// Debug command
function debug(subcommand) {
  const debugPath = path.join(process.env.HOME || '', '.clawdbot', 'courtroom_debug.log');
  
  if (!fs.existsSync(debugPath)) {
    log('\nℹ️  No debug logs found yet.');
    log('   Debug logs are created when the courtroom is active.\n');
    return;
  }

  if (subcommand === 'full') {
    log('\n🏛️  ClawTrial Full Debug Log\n');
    log('=============================\n');
    const logs = fs.readFileSync(debugPath, 'utf8').split('\n').filter(Boolean);
    logs.slice(-100).forEach(line => {
      try {
        const log = JSON.parse(line);
        log(`[${log.timestamp}] ${log.level} - ${log.component}`);
        log(`  ${log.message}`);
      } catch (e) {
        log(line);
      }
    });
    log('');
  } else if (subcommand === 'clear') {
    fs.unlinkSync(debugPath);
    log('\n✅ Debug logs cleared\n');
  } else {
    // Show status
    const logs = fs.readFileSync(debugPath, 'utf8').split('\n').filter(Boolean);
    const recentLogs = logs.slice(-20);
    
    log('\n🏛️  ClawTrial Debug Status\n');
    log('===========================\n');
    log(`Total log entries: ${logs.length}`);
    log(`Log file: ${debugPath}`);
    log('\nRecent activity:');
    
    recentLogs.forEach(line => {
      try {
        const log = JSON.parse(line);
        log(`  [${log.level}] ${log.component}: ${log.message.substring(0, 60)}`);
      } catch (e) {
        // Skip malformed lines
      }
    });
    
    log('\nUsage:');
    log('  clawtrial debug       - Show status and recent logs');
    log('  clawtrial debug full  - Show full debug log');
    log('  clawtrial debug clear - Clear all logs');
    log('');
  }
}

// Diagnose command
function diagnose() {
  log('\n🏛️  ClawTrial Diagnostics\n');
  log('========================\n');
  
  // Check Node version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  log(`Node.js version: ${nodeVersion} ${majorVersion >= 18 ? '✅' : '❌ (needs >= 18)'}`);
  
  // Check environment
  const { checkEnvironment } = require('../src/environment');
  const env = checkEnvironment();
  log(`\nEnvironment: ${env.valid ? '✅ Valid' : '❌ Issues found'}`);
  if (!env.valid) {
    env.issues.forEach(issue => log(`  ❌ ${issue}`));
  }
  
  // Check config
  const config = loadConfig();
  if (config) {
    log(`\nConfig: ✅ Found`);
    log(`  Installed: ${new Date(config.installedAt).toLocaleDateString()}`);
    log(`  Consent: ${config.consent?.granted ? '✅ Granted' : '❌ Not granted'}`);
    log(`  Status: ${config.enabled !== false ? '✅ Enabled' : '⏸️  Disabled'}`);
  } else {
    log(`\nConfig: ❌ Not found`);
    log('  Run: clawtrial setup');
  }
  
  // Check keys
  if (fs.existsSync(keysPath)) {
    log(`\nKeys: ✅ Found`);
    const keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
    log(`  Public Key: ${keys.publicKey.substring(0, 32)}...`);
  } else {
    log(`\nKeys: ❌ Not found`);
  }
  
  // Check if courtroom is running
  const { getCourtroomStatus } = require('../src/daemon');
  const runtimeStatus = getCourtroomStatus();
  
  if (runtimeStatus.running) {
    log(`\n🏛️  Courtroom: ✅ Running`);
    log(`  Process ID: ${runtimeStatus.pid}`);
    log(`  Started: ${new Date(runtimeStatus.startedAt).toLocaleString()}`);
    log(`  Cases Filed: ${runtimeStatus.casesFiled || 0}`);
  } else {
    log(`\n🏛️  Courtroom: ⏸️  Not running`);
    log('  The courtroom runs as a ClawDBot skill.');
    log('  It will activate when ClawDBot loads the package.');
  }
  
  // Check debug logs
  const debugPath = path.join(process.env.HOME || '', '.clawdbot', 'courtroom_debug.log');
  if (fs.existsSync(debugPath)) {
    const logs = fs.readFileSync(debugPath, 'utf8').split('\n').filter(Boolean);
    log(`\nDebug Logs: ✅ ${logs.length} entries`);
  } else {
    log(`\nDebug Logs: ℹ️  None yet (created when active)`);
  }
  
  log('\n========================\n');
  
  if (!config) {
    log('Next step: Run "clawtrial setup"');
  } else if (!runtimeStatus.running) {
    log('Status: Configured. Courtroom will activate with ClawDBot.');
  } else {
    log('Status: Fully operational! 🎉');
  }
  log('');
}

// Help command
function help() {
  log('\n🏛️  ClawTrial - AI Courtroom for Agents\n');
  log('Usage: clawtrial <command> [options]\n');
  log('Commands:');
  log('  setup              - Interactive setup and consent');
  log('  status             - Check courtroom status');
  log('  disable            - Temporarily disable monitoring');
  log('  enable             - Re-enable monitoring');
  log('  revoke             - Revoke consent and uninstall');
  log('  debug [full|clear] - View or clear debug logs');
  log('  diagnose           - Run diagnostics');
  log('  help               - Show this help message');
  log('');
  log('Examples:');
  log('  clawtrial setup');
  log('  clawtrial status');
  log('  clawtrial diagnose');
  log('');
}

// Main CLI handler
async function main() {
  const command = process.argv[2];
  const subcommand = process.argv[3];

  switch (command) {
    case 'setup':
      await setup();
      break;
    case 'status':
      status();
      break;
    case 'disable':
      disable();
      break;
    case 'enable':
      enable();
      break;
    case 'revoke':
      await revoke();
      break;
    case 'debug':
      debug(subcommand);
      break;
    case 'diagnose':
      diagnose();
      break;
    case 'help':
    case '--help':
    case '-h':
      help();
      break;
    default:
      if (!command) {
        help();
      } else {
        log(`\n❌ Unknown command: ${command}`);
        log('Run "clawtrial help" for usage.\n');
        process.exit(1);
      }
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
