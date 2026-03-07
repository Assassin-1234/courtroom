/**
 * Storage — simple filesystem-backed key-value store
 *
 * All data lives under the given dataDir as JSON files.
 * No external dependencies.
 */

const fs = require('fs');
const path = require('path');

class Storage {
  /**
   * @param {string} dataDir — absolute path to a writable directory
   */
  constructor(dataDir) {
    this.dataDir = dataDir;
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
    } catch { /* ignore */ }
  }

  _filePath(key) {
    // Sanitise key for filesystem
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.dataDir, `${safeKey}.json`);
  }

  async get(key) {
    try {
      const file = this._filePath(key);
      if (!fs.existsSync(file)) return null;
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return null;
    }
  }

  async set(key, value) {
    try {
      const file = this._filePath(key);
      fs.writeFileSync(file, JSON.stringify(value, null, 2));
    } catch (err) {
      console.error(`[ClawTrial Storage] Write failed for ${key}:`, err.message);
    }
  }

  async delete(key) {
    try {
      const file = this._filePath(key);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch { /* ignore */ }
  }

  async list(prefix) {
    try {
      const files = fs.readdirSync(this.dataDir);
      return files
        .filter(f => f.endsWith('.json') && (!prefix || f.startsWith(prefix)))
        .map(f => f.replace('.json', ''));
    } catch {
      return [];
    }
  }
}

module.exports = { Storage };
