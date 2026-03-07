/**
 * Debug / Logger — self-contained, no external dependencies
 */

const fs = require('fs');
const path = require('path');

let _logDir = null;

/**
 * Set the directory for log files.
 * Called by the plugin with the extension data directory.
 */
function setLogDir(dir) {
  _logDir = dir;
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch { /* ignore */ }
}

function getLogDir() {
  if (_logDir) return _logDir;
  // Fallback to ~/.openclaw/extensions/courtroom/data
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(home, '.openclaw', 'extensions', 'courtroom', 'data');
}

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.CLAWTRIAL_LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

function writeToFile(level, component, message, data) {
  try {
    const dir = getLogDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const logFile = path.join(dir, 'courtroom.log');
    const line = `[${new Date().toISOString()}] [${level}] [${component}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;
    fs.appendFileSync(logFile, line);
  } catch { /* ignore */ }
}

const logger = {
  debug(component, message, data) {
    if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
      console.debug(`[ClawTrial] [${component}] ${message}`, data || '');
      writeToFile('DEBUG', component, message, data);
    }
  },
  info(component, message, data) {
    if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
      writeToFile('INFO', component, message, data);
    }
  },
  warn(component, message, data) {
    if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(`[ClawTrial] [${component}] ${message}`, data || '');
      writeToFile('WARN', component, message, data);
    }
  },
  error(component, message, data) {
    console.error(`[ClawTrial] [${component}] ${message}`, data || '');
    writeToFile('ERROR', component, message, data);
  }
};

module.exports = { logger, setLogDir, getLogDir };
