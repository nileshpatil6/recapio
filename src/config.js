const path = require('path');
const fs = require('fs');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.voicenotes');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULTS = {
  geminiApiKey: '',
  hotkey: 'CommandOrControl+Shift+N',
  recordMic: true,
  recordSystem: true,
  theme: 'dark',
  supabaseUrl: '',
  supabaseAnonKey: '',
  supabaseSession: null,
};

class Config {
  constructor() {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
    this._data = { ...DEFAULTS };
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        Object.assign(this._data, saved);
      }
    } catch {}
  }

  save() {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(this._data, null, 2));
  }

  get(key) { return this._data[key] ?? DEFAULTS[key]; }

  set(key, value) {
    this._data[key] = value;
    this.save();
  }

  setAll(obj) {
    Object.assign(this._data, obj);
    this.save();
  }

  all() { return { ...this._data }; }
}

module.exports = new Config();
