#!/usr/bin/env node

/**
 * CLI commands for ClawTrial Courtroom
 * courtroom-status, courtroom-disable, courtroom-enable, courtroom-revoke
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(process.env.HOME || '', '.clawdbot', 'courtroom_config.json');

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    console.log('❌ Courtroom not configured. Run: npm install @clawdbot/courtroom');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function saveConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

const command = path.basename(process.argv[1]);

switch (command) {
  case 'courtroom-status':
    try {
      const config = loadConfig();
      console.log('\n🏛️  ClawTrial Courtroom Status\n');
      console.log(`Status: ${config.enabled !== false ? '✅ Active' : '⏸️  Disabled'}`);
      console.log(`Consent: ${config.consent?.granted ? '✅ Granted' : '❌ Not granted'}`);
      console.log(`Installed: ${new Date(config.installedAt).toLocaleDateString()}`);
      console.log(`Agent Type: ${config.agent?.type || 'generic'}`);
      console.log(`Detection: ${config.detection?.enabled ? '✅ Enabled' : '❌ Disabled'}`);
      console.log(`API Submission: ${config.api?.enabled ? '✅ Enabled' : '❌ Disabled'}`);
      console.log('');
    } catch (err) {
      console.log('❌ Error reading config:', err.message);
    }
    break;

  case 'courtroom-disable':
    try {
      const config = loadConfig();
      config.enabled = false;
      saveConfig(config);
      console.log('\n⏸️  Courtroom disabled\n');
      console.log('The agent will stop monitoring for offenses.');
      console.log('Run courtroom-enable to reactivate.\n');
    } catch (err) {
      console.log('❌ Error:', err.message);
    }
    break;

  case 'courtroom-enable':
    try {
      const config = loadConfig();
      if (!config.consent?.granted) {
        console.log('\n❌ Cannot enable: Consent not granted');
        console.log('Reinstall the package to grant consent.\n');
        process.exit(1);
      }
      config.enabled = true;
      saveConfig(config);
      console.log('\n✅ Courtroom enabled\n');
      console.log('The agent is now monitoring for behavioral violations.\n');
    } catch (err) {
      console.log('❌ Error:', err.message);
    }
    break;

  case 'courtroom-revoke':
    try {
      const config = loadConfig();
      console.log('\n⚠️  This will permanently disable the courtroom and delete all data.\n');
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question('Type "REVOKE" to confirm: ', (answer) => {
        if (answer === 'REVOKE') {
          // Delete config
          if (fs.existsSync(configPath)) {
            fs.unlinkSync(configPath);
          }
          
          // Delete keys
          const keysPath = path.join(process.env.HOME || '', '.clawdbot', 'courtroom_keys.json');
          if (fs.existsSync(keysPath)) {
            fs.unlinkSync(keysPath);
          }
          
          console.log('\n✅ Consent revoked and all data deleted.\n');
        } else {
          console.log('\n❌ Revocation cancelled.\n');
        }
        rl.close();
      });
    } catch (err) {
      console.log('❌ Error:', err.message);
    }
    break;

  default:
    console.log('\n🏛️  ClawTrial Courtroom CLI\n');
    console.log('Commands:');
    console.log('  courtroom-status   - Check courtroom status');
    console.log('  courtroom-disable  - Temporarily disable');
    console.log('  courtroom-enable   - Re-enable');
    console.log('  courtroom-revoke   - Revoke consent & uninstall');
    console.log('');
}
