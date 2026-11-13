// Everything to do with the local Tern server: preparing its files,
// finding and starting Docker, and running docker compose.
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { app } = require('electron');

const isWin = process.platform === 'win32';
const isMac = process.platform === 'darwin';

// ---------------------------------------------------------------- paths

/** Read-only copy of the server files shipped with the app (or the repo in dev). */
function sourceDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'server')
    : path.resolve(__dirname, '..', '..', '..');
}

/** Writable working copy that docker compose runs from. */
function serverDir() {
  // TERN_SERVER_DIR lets developers (or sandboxed launchers) pick another folder.
  return process.env.TERN_SERVER_DIR || path.join(app.getPath('userData'), 'server');
}

// Apps opened from Finder / the Start menu get a short PATH, so add the
// places Docker installs its CLI.
function dockerEnv() {
  const extra = isWin
    ? [path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Docker', 'Docker', 'resources', 'bin')]
    : isMac
      ? ['/usr/local/bin', '/opt/homebrew/bin', '/Applications/Docker.app/Contents/Resources/bin', path.join(os.homedir(), '.docker', 'bin')]
      : ['/usr/local/bin', '/usr/bin', '/snap/bin'];
  const sep = isWin ? ';' : ':';
  const key = Object.keys(process.env).find((k) => k.toUpperCase() === 'PATH') || 'PATH';
  return { ...process.env, [key]: [process.env[key], ...extra].filter(Boolean).join(sep) };
}

// ---------------------------------------------------------------- process helper

function run(cmd, args, { cwd, timeout = 0, onData } = {}) {
  return new Promise((resolve) => {
    let out = '';
    let done = false;
    let child;
    const finish = (code, error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ code, out, error });
    };
    try {
      child = spawn(cmd, args, { cwd, env: dockerEnv(), windowsHide: true });
    } catch (e) {
      return resolve({ code: -1, out: '', error: e });
    }
    const timer = timeout ? setTimeout(() => { child.kill(); finish(-2, new Error('timeout')); }, timeout) : null;
    const onChunk = (buf) => {
      const text = buf.toString();
      out += text;
      if (onData) text.split(/\r?\n/).filter((l) => l.trim()).forEach(onData);
    };
    child.stdout.on('data', onChunk);
    child.stderr.on('data', onChunk);
    child.on('error', (e) => finish(-1, e));
    child.on('close', (code) => finish(code));
  });
}

// ---------------------------------------------------------------- files

function hash(file) {
  try { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); } catch { return null; }
}

/**
 * Write `from` to `to` only if the content differs. Never deletes and re-creates
 * files that are already identical: Docker Desktop keeps single-file bind mounts
 * pointed at the old file, so churn would break a running server.
 * Returns true when something was written.
 */
function syncFile(from, to) {
  if (hash(from) === hash(to)) return false;
  // Docker creates a folder when a bind-mounted file is missing; replace it.
  try { if (fs.statSync(to).isDirectory()) fs.rmSync(to, { recursive: true, force: true }); } catch { /* missing */ }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  return true;
}

function syncDir(from, to) {
  let changed = false;
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name === 'upstream-snapshot') continue;
    const a = path.join(from, entry.name);
    const b = path.join(to, entry.name);
    if (entry.isDirectory()) changed = syncDir(a, b) || changed;
    else if (entry.isFile()) changed = syncFile(a, b) || changed;
  }
  return changed;
}

/**
 * Copy the shipped server files into the writable folder.
 * Theme, compose file and Caddy config follow the app version.
 * Files in core-config/ are only replaced if the user has not edited them.
 * Returns true when anything changed (the containers must then be recreated).
 */
function prepareFiles() {
  const src = sourceDir();
  const dst = serverDir();
  fs.mkdirSync(dst, { recursive: true });
  let changed = false;

  for (const f of ['docker-compose.yml', '.env.example']) {
    changed = syncFile(path.join(src, f), path.join(dst, f)) || changed;
  }
  for (const d of ['theme', 'caddy']) {
    changed = syncDir(path.join(src, d), path.join(dst, d)) || changed;
  }

  // core-config: keep user edits
  const stampFile = path.join(dst, '.shipped-hashes.json');
  let stamps = {};
  try { stamps = JSON.parse(fs.readFileSync(stampFile, 'utf8')); } catch { /* first run */ }
  const cfgSrc = path.join(src, 'core-config');
  const cfgDst = path.join(dst, 'core-config');
  for (const name of fs.readdirSync(cfgSrc)) {
    const from = path.join(cfgSrc, name);
    const to = path.join(cfgDst, name);
    if (!fs.statSync(from).isFile()) continue;
    const current = hash(to);
    const untouched = current === null || stamps[name] === undefined || current === stamps[name];
    if (untouched) {
      changed = syncFile(from, to) || changed;
      stamps[name] = hash(to);
    }
  }
  fs.writeFileSync(stampFile, JSON.stringify(stamps, null, 2));
  return changed;
}

function setEnvLine(lines, key, value) {
  const re = new RegExp(`^#?\\s*${key}=`);
  const i = lines.findIndex((l) => re.test(l));
  if (i >= 0) lines[i] = `${key}=${value}`;
  else lines.push(`${key}=${value}`);
}

/** Create .env with a fresh secret on first run, then apply port / LAN settings. */
function writeEnv(settings) {
  const dst = serverDir();
  const envFile = path.join(dst, '.env');
  if (!fs.existsSync(envFile)) fs.copyFileSync(path.join(dst, '.env.example'), envFile);
  const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
  const secretLine = lines.find((l) => l.startsWith('SEARXNG_SECRET='));
  if (!secretLine || /CHANGE_ME|=\s*$/.test(secretLine)) {
    setEnvLine(lines, 'SEARXNG_SECRET', crypto.randomBytes(32).toString('hex'));
  }
  setEnvLine(lines, 'BIND_ADDRESS', settings.lan ? '0.0.0.0' : '127.0.0.1');
  setEnvLine(lines, 'HOST_PORT', String(settings.port));
  fs.writeFileSync(envFile, lines.join('\n').replace(/\n*$/, '\n'), { mode: 0o600 });
}

// ---------------------------------------------------------------- docker

/** "missing" | "stopped" | "running" */
async function dockerState() {
  const r = await run('docker', ['info', '--format', '{{.ServerVersion}}'], { timeout: 20000 });
  if (r.code === 0) return 'running';
  if (r.error && r.error.code === 'ENOENT') return desktopInstalled() ? 'stopped' : 'missing';
  return 'stopped';
}

function desktopPath() {
  if (isWin) return path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Docker', 'Docker', 'Docker Desktop.exe');
  if (isMac) return '/Applications/Docker.app';
  return null;
}

function desktopInstalled() {
  const p = desktopPath();
  return p ? fs.existsSync(p) : false;
}

function detached(cmd, args) {
  const child = spawn(cmd, args, { detached: true, stdio: 'ignore', env: dockerEnv() });
  child.on('error', () => { /* reported by the wait loop */ });
  child.unref();
}

function startDockerDesktop() {
  try {
    if (isWin && desktopInstalled()) {
      detached(desktopPath(), []);
    } else if (isMac) {
      detached('open', ['-a', 'Docker']);
    } else {
      // Docker Desktop for Linux; plain Docker Engine is normally already running as a service.
      detached('systemctl', ['--user', 'start', 'docker-desktop']);
    }
  } catch { /* the wait loop reports the failure */ }
}

async function waitForDocker(timeoutMs, onTick) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if ((await dockerState()) === 'running') return true;
    if (onTick) onTick(Math.round((Date.now() - start) / 1000));
    await new Promise((r) => setTimeout(r, 3000));
  }
  return false;
}

function compose(args, onData) {
  return run('docker', ['compose', ...args], { cwd: serverDir(), onData });
}

const up = (onData, recreate = false) => compose(['up', '-d', ...(recreate ? ['--force-recreate'] : [])], onData);
const stop = () => compose(['stop']);
const restart = (onData) => compose(['restart'], onData);
const pull = (onData) => compose(['pull'], onData);
const logs = () => compose(['logs', '--tail', '200', '--no-color']);

// ---------------------------------------------------------------- health

async function isHealthy(baseUrl) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${baseUrl}/healthz`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitHealthy(baseUrl, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isHealthy(baseUrl)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

// MAC prefixes of virtual adapters (VirtualBox, Hyper-V/WSL, VMware, Parallels, Docker).
const VIRTUAL_MAC = /^(0a:00:27|08:00:27|00:15:5d|00:50:56|00:0c:29|00:05:69|00:1c:42|02:42:)/i;
const VIRTUAL_NAME = /vEthernet|docker|wsl|vmware|virtualbox|vbox|vmnet|br-|veth|utun|tun|tap|zerotier|tailscale|wireguard|vpn|hamachi|loopback/i;

/**
 * Addresses of this computer on the home network, best guess first.
 * Physical Wi-Fi / Ethernet adapters with private addresses come first.
 */
function lanAddresses() {
  const list = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      let score = 0;
      if (/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address)) score += 4;
      if (/wi-?fi|wireless|wlan|^en\d|^eth|ethernet/i.test(name)) score += 2;
      if (VIRTUAL_NAME.test(name)) score -= 10;
      if (VIRTUAL_MAC.test(a.mac) || a.mac === '00:00:00:00:00:00') score -= 10;
      if (a.address.startsWith('169.254.')) score -= 20;
      list.push({ address: a.address, score });
    }
  }
  return list.sort((x, y) => y.score - x.score).filter((x) => x.score > -15).map((x) => x.address);
}

module.exports = {
  serverDir, prepareFiles, writeEnv,
  dockerState, desktopInstalled, startDockerDesktop, waitForDocker,
  up, stop, restart, pull, logs,
  isHealthy, waitHealthy, lanAddresses,
};
