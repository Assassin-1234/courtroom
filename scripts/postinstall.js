#!/usr/bin/env node

/**
 * Post-install script for ClawTrial
 * Handles skill registration and dependency checks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CLAWDBOT_DIR = path.join(process.env.HOME || '', '.clawdbot');
const SKILLS_DIR = path.join(CLAWDBOT_DIR, 'skills');

console.log('🏛️  ClawTrial Post-Install');

// Check if tweetnacl is available
try {
  require('tweetnacl');
  console.log('✓ Dependencies verified');
} catch (e) {
  console.log('⚠️  Installing dependencies...');
  try {
    execSync('npm install tweetnacl', { stdio: 'inherit', cwd: __dirname + '/..' });
    console.log('✓ Dependencies installed');
  } catch (err) {
    console.log('⚠️  Could not auto-install dependencies');
    console.log('   Run: npm install -g tweetnacl');
  }
}

// Get package paths
const packagePath = path.join(__dirname, '..');
const cliPath = path.join(packagePath, 'scripts', 'clawtrial.js');

// Try to create /usr/bin symlink (requires sudo, may fail)
const usrBinPath = '/usr/bin/clawtrial';
if (!fs.existsSync(usrBinPath)) {
  try {
    fs.symlinkSync(cliPath, usrBinPath);
    fs.chmodSync(usrBinPath, 0o755);
    console.log('✓ Created global CLI symlink');
  } catch (err) {
    // Silent fail - will show instructions at end
  }
}

// Register as ClawDBot skill if config exists
const configPath = path.join(CLAWDBOT_DIR, 'courtroom_config.json');
if (fs.existsSync(configPath)) {
  console.log('🔗 Registering with ClawDBot...');
  
  try {
    // Create skills directory
    if (!fs.existsSync(SKILLS_DIR)) {
      fs.mkdirSync(SKILLS_DIR, { recursive: true });
    }
    
    const skillLinkPath = path.join(SKILLS_DIR, 'courtroom');
    
    // Remove old link
    if (fs.existsSync(skillLinkPath)) {
      try { fs.unlinkSync(skillLinkPath); } catch (e) {}
    }
    
    // Create symlink
    fs.symlinkSync(packagePath, skillLinkPath, 'junction');
    console.log('✓ Registered as ClawDBot skill');
  } catch (err) {
    console.log('⚠️  Could not register skill:', err.message);
  }
}

// Show next steps
console.log('');
console.log('📋 Next Steps:');
console.log('  1. If "clawtrial" command not found, run:');
console.log('     export PATH="$HOME/.npm-global/bin:$PATH"');
console.log('     # OR: sudo ln -sf "$HOME/.npm-global/lib/node_modules/@clawtrial/courtroom/scripts/clawtrial.js" /usr/bin/clawtrial');
console.log('');
console.log('  2. Run setup:');
console.log('     clawtrial setup');
console.log('     clawtrial start');
console.log('');
