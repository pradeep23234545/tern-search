// Small JSON settings store kept in the app's user-data folder.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULTS = {
  // "local"  = run the Tern server on this computer with Docker
  // "remote" = use a Tern/SearXNG server running somewhere else
  mode: 'local',
  remoteUrl: '',
  port: 8888,
  // Let phones and other computers on the same Wi-Fi use this server
  lan: false,
  // Stop the Docker containers when the app quits
  stopOnQuit: true,
  openAtLogin: false,
  // Open search results in the default browser instead of inside Tern
  openLinksExternally: true,
};

function file() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function load() {
  try {
    const saved = JSON.parse(fs.readFileSync(file(), 'utf8'));
    return { ...DEFAULTS, ...saved };
  } catch {
    return { ...DEFAULTS };
  }
}

function validate(input) {
  const s = { ...load(), ...input };
  s.mode = s.mode === 'remote' ? 'remote' : 'local';
  s.port = Number.parseInt(s.port, 10);
  if (!Number.isInteger(s.port) || s.port < 1024 || s.port > 65535) {
    throw new Error('Port must be a number between 1024 and 65535.');
  }
  s.remoteUrl = String(s.remoteUrl || '').trim().replace(/\/+$/, '');
  if (s.mode === 'remote') {
    let u;
    try { u = new URL(s.remoteUrl); } catch { throw new Error('Enter a full server address, for example http://192.168.1.20:8888'); }
    if (!/^https?:$/.test(u.protocol)) throw new Error('The server address must start with http:// or https://');
  }
  for (const k of ['lan', 'stopOnQuit', 'openAtLogin', 'openLinksExternally']) s[k] = Boolean(s[k]);
  return s;
}

function save(input) {
  const s = validate(input);
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(s, null, 2));
  return s;
}

module.exports = { DEFAULTS, load, save, validate };
