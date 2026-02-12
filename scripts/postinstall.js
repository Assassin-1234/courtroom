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



// Fix clawtrial CLI symlink if needed
const packagePath = path.join(__dirname, '..');
const cliPath = path.join(packagePath, 'scripts', 'clawtrial.js');
const globalBinPath = '/usr/bin/clawtrial';

if (fs.existsSync(globalBinPath)) {
  try {
    const currentTarget = fs.readlinkSync(globalBinPath);
    const expectedTarget = cliPath;
    
    if (currentTarget !== expectedTarget && !currentTarget.includes('@clawtrial')) {
      console.log('🔗 Fixing clawtrial CLI symlink...');
      try {
        fs.unlinkSync(globalBinPath);
        fs.symlinkSync(cliPath, globalBinPath);
        fs.chmodSync(globalBinPath, 0o755);
        console.log('✓ CLI symlink fixed');
      } catch (err) {
        console.log('⚠️  Could not fix CLI symlink (may need sudo)');
        console.log('   Run: sudo ln -sf ' + cliPath + ' ' + globalBinPath);
      }
    }
  } catch (e) {
    // Not a symlink, ignore
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
    
    // Get package path
    const packagePath = path.join(__dirname, '..');
    const skillLinkPath = path.join(SKILLS_DIR, 'courtroom');
    
    // Remove old link
    if (fs.existsSync(skillLinkPath)) {
      try { fs.unlinkSync(skillLinkPath); } catch (e) {}
    }
    
    // Create symlink
    fs.symlinkSync(packagePath, skillLinkPath, 'junction');
    console.log('✓ Registered as ClawDBot skill');
    console.log('  Restart ClawDBot to activate');
  } catch (err) {
    console.log('⚠️  Could not register skill:', err.message);
  }
}

console.log('');
