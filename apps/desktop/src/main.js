// Tern desktop app: starts your private SearXNG server with Docker and
// shows it in its own window, with a tray icon and settings.
const {
  app, BrowserWindow, Menu, Tray, Notification, clipboard, dialog,
  ipcMain, nativeImage, nativeTheme, shell,
} = require('electron');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const store = require('./settings');
const server = require('./server');

const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';
const ROOT = path.join(__dirname, '..');
const ICON_PNG = path.join(ROOT, 'build', 'icon.png');
const ICON_ICO = path.join(ROOT, 'build', 'icon.ico');
const PRELOAD = path.join(__dirname, 'preload.js');
const DOCKER_DOWNLOAD = 'https://www.docker.com/products/docker-desktop/';

let win = null;
let settingsWin = null;
let tray = null;
let settings = null;
let baseUrl = null; // the search server currently shown
let booting = false;
let quitting = false;
let stoppedForQuit = false;
let trayHintShown = false;
let showingStatus = false; // status.html is (being) shown in the main window
let status = { phase: 'working', title: 'Starting Tern', detail: '', actions: [] };
let statusLog = [];

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showWindow());
  app.whenReady().then(start);
}

// ======================================================================= startup

function start() {
  settings = store.load();
  app.setAppUserModelId('org.tern.search');
  nativeTheme.themeSource = 'system';
  createWindow();
  createTray();
  buildAppMenu();
  applyLoginItem();
  boot();
}

function startHidden() {
  if (process.argv.includes('--hidden')) return true;
  if (isMac) {
    try { return app.getLoginItemSettings().wasOpenedAsHidden; } catch { return false; }
  }
  return false;
}

// ======================================================================= window

const stateFile = () => path.join(app.getPath('userData'), 'window.json');

function loadBounds() {
  try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')); } catch { return { width: 1200, height: 820 }; }
}

function saveBounds() {
  if (!win || win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return;
  try { fs.writeFileSync(stateFile(), JSON.stringify({ ...win.getBounds(), maximized: win.isMaximized() })); } catch { /* ignore */ }
}

function createWindow() {
  const b = loadBounds();
  win = new BrowserWindow({
    x: b.x, y: b.y, width: b.width || 1200, height: b.height || 820,
    minWidth: 400, minHeight: 480,
    title: 'Tern',
    icon: isWin ? ICON_ICO : ICON_PNG,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#111415' : '#ffffff',
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });
  if (b.maximized) win.maximize();
  if (!startHidden()) win.show();

  win.on('resize', saveBounds);
  win.on('move', saveBounds);
  win.on('close', (e) => {
    if (quitting) return;
    e.preventDefault();
    win.hide();
    if (!trayHintShown && !isMac && Notification.isSupported()) {
      trayHintShown = true;
      new Notification({ title: 'Tern is still running', body: 'Open it again from the tray icon. Use Quit in the tray menu to close it.', icon: ICON_PNG }).show();
    }
  });

  // Mouse back/forward buttons (Windows/Linux) and trackpad swipes (macOS)
  win.on('app-command', (_e, cmd) => {
    if (cmd === 'browser-backward') goBack();
    if (cmd === 'browser-forward') goForward();
  });
  win.on('swipe', (_e, dir) => {
    if (dir === 'left') goBack();
    if (dir === 'right') goForward();
  });

  const wc = win.webContents;
  wc.setWindowOpenHandler(({ url }) => {
    if (isInternal(url)) win.loadURL(url);
    else openOutside(url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (e, url) => {
    if (isInternal(url)) return;
    if (settings.openLinksExternally || !/^https?:/i.test(url)) {
      e.preventDefault();
      openOutside(url);
    }
  });
  wc.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3 /* aborted */ || !/^https?:/i.test(url)) return;
    setStatus({
      phase: 'error',
      title: "Can't reach the search server",
      detail: `${desc} (${url})`,
      actions: ['retry', 'settings'],
    });
    showStatusPage();
  });
  wc.on('did-start-navigation', (d) => {
    if (d.isMainFrame && !d.isSameDocument) showingStatus = d.url.endsWith('status.html');
  });
  wc.on('page-title-updated', () => updateTitle());
  wc.on('context-menu', (_e, p) => contextMenu(p));
  showStatusPage();
}

function showWindow() {
  if (!win || win.isDestroyed()) createWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function updateTitle() {
  if (!win || win.isDestroyed()) return;
  const t = win.webContents.getTitle();
  win.setTitle(t && !/^tern$/i.test(t) && !t.endsWith('.html') ? `${t}` : 'Tern');
}

function isInternal(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'file:' || u.protocol === 'devtools:') return true;
    if (!baseUrl) return false;
    const b = new URL(baseUrl);
    const local = (h) => h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
    return u.origin === b.origin || (local(u.hostname) && local(b.hostname) && u.port === b.port);
  } catch {
    return false;
  }
}

function openOutside(url) {
  if (/^(https?|mailto):/i.test(url)) shell.openExternal(url);
}

function onSearchPage() {
  return win && !win.isDestroyed() && /^https?:/.test(win.webContents.getURL());
}

function goBack() {
  const h = win.webContents.navigationHistory;
  if (h.canGoBack()) h.goBack();
}

function goForward() {
  const h = win.webContents.navigationHistory;
  if (h.canGoForward()) h.goForward();
}

function goHome() {
  if (baseUrl) win.loadURL(baseUrl);
  else boot();
}

function focusSearch() {
  if (!onSearchPage()) return;
  win.webContents.executeJavaScript(
    "(() => { const q = document.querySelector('#q, input[name=q]'); if (q) { q.focus(); q.select(); } })()",
  ).catch(() => {});
}

function contextMenu(p) {
  const wc = win.webContents;
  const items = [];
  if (p.misspelledWord && p.dictionarySuggestions.length) {
    for (const s of p.dictionarySuggestions.slice(0, 5)) {
      items.push({ label: s, click: () => wc.replaceMisspelling(s) });
    }
    items.push({ type: 'separator' });
  }
  if (p.linkURL) {
    items.push({ label: 'Open link in browser', click: () => openOutside(p.linkURL) });
    items.push({ label: 'Copy link address', click: () => clipboard.writeText(p.linkURL) });
    items.push({ type: 'separator' });
  }
  if (p.mediaType === 'image' && p.srcURL) {
    items.push({ label: 'Copy image', click: () => wc.copyImageAt(p.x, p.y) });
    items.push({ label: 'Copy image address', click: () => clipboard.writeText(p.srcURL) });
    items.push({ type: 'separator' });
  }
  if (p.isEditable) {
    items.push({ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' });
  } else if (p.selectionText) {
    items.push({ role: 'copy' });
    const q = p.selectionText.trim().slice(0, 200);
    if (baseUrl && q) {
      items.push({ label: `Search Tern for “${q.length > 30 ? `${q.slice(0, 30)}…` : q}”`, click: () => win.loadURL(`${baseUrl}/search?q=${encodeURIComponent(q)}`) });
    }
  }
  if (!p.isEditable && !p.linkURL) {
    if (items.length) items.push({ type: 'separator' });
    items.push(
      { label: 'Back', enabled: wc.navigationHistory.canGoBack(), click: goBack },
      { label: 'Forward', enabled: wc.navigationHistory.canGoForward(), click: goForward },
      { label: 'Reload', click: () => wc.reload() },
    );
  }
  Menu.buildFromTemplate(items).popup({ window: win });
}

// ======================================================================= status page

function showStatusPage() {
  if (!win || win.isDestroyed()) return;
  const file = path.join(__dirname, 'ui', 'status.html');
  if (!showingStatus) win.loadFile(file);
  showingStatus = true;
  win.setTitle('Tern');
}

function setStatus(s) {
  status = { actions: [], detail: '', ...s };
  send('status', { status });
  updateTray();
}

function log(line) {
  const clean = line.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '').trim();
  if (!clean) return;
  statusLog.push(clean);
  if (statusLog.length > 300) statusLog.shift();
  send('status', { log: clean });
}

function send(channel, data) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, data);
}

// ======================================================================= boot

async function boot() {
  if (booting) return;
  booting = true;
  baseUrl = null;
  statusLog = [];
  showStatusPage();
  try {
    if (settings.mode === 'remote') await bootRemote();
    else await bootLocal();
  } catch (e) {
    setStatus({ phase: 'error', title: 'Something went wrong', detail: String(e && e.message ? e.message : e), actions: ['retry', 'settings', 'folder'] });
  } finally {
    booting = false;
    updateTray();
    buildAppMenu();
  }
}

async function bootRemote() {
  const url = settings.remoteUrl;
  setStatus({ phase: 'working', title: 'Connecting to your Tern server', detail: url });
  if (!(await server.isHealthy(url))) {
    setStatus({
      phase: 'error',
      title: "Can't reach your Tern server",
      detail: `${url} did not answer. Check that the server is running and that this device is on the same network (or Tailscale).`,
      actions: ['retry', 'settings'],
    });
    return;
  }
  openSearch(url);
}

async function bootLocal() {
  const url = `http://127.0.0.1:${settings.port}`;

  setStatus({ phase: 'working', step: 1, title: 'Preparing Tern', detail: 'Copying the server files.' });
  const filesChanged = server.prepareFiles();
  server.writeEnv(settings);

  setStatus({ phase: 'working', step: 1, title: 'Checking Docker', detail: 'Tern runs its search engine inside Docker.' });
  let state = await server.dockerState();
  if (state === 'missing') {
    setStatus({
      phase: 'error',
      title: 'Docker Desktop is needed',
      detail: 'Tern runs its private search engine with Docker Desktop (free). Install it, open it once, then press Try again. Or use a Tern server that runs on another computer.',
      actions: ['installDocker', 'retry', 'settings'],
    });
    return;
  }
  if (state === 'stopped') {
    setStatus({ phase: 'working', step: 1, title: 'Starting Docker Desktop', detail: 'This can take a minute.' });
    server.startDockerDesktop();
    const ok = await server.waitForDocker(240000, (s) => setStatus({ phase: 'working', step: 1, title: 'Starting Docker Desktop', detail: `Waiting for Docker… ${s}s` }));
    if (!ok) {
      setStatus({ phase: 'error', title: "Docker didn't start", detail: 'Open Docker Desktop yourself, wait until it says "Engine running", then press Try again.', actions: ['retry', 'settings'] });
      return;
    }
  }

  setStatus({ phase: 'working', step: 2, title: 'Starting the search server', detail: 'The first start downloads about 150 MB. After that it takes a few seconds.' });
  const r = await server.up(log, filesChanged);
  if (r.code !== 0) {
    const portBusy = /port is already allocated|address already in use|bind/i.test(r.out);
    setStatus({
      phase: 'error',
      title: 'The search server could not start',
      detail: portBusy
        ? `Port ${settings.port} is used by another program. Pick another port in Settings.`
        : 'See the details below. Docker may still be starting, or the download was interrupted.',
      actions: portBusy ? ['settings', 'retry'] : ['retry', 'folder', 'settings'],
    });
    return;
  }

  setStatus({ phase: 'working', step: 3, title: 'Waiting for the search engine', detail: 'Almost there.' });
  if (!(await server.waitHealthy(url, 120000))) {
    setStatus({ phase: 'error', title: "The search engine isn't answering", detail: 'The containers started but SearXNG did not respond. Use Server → View logs for details.', actions: ['retry', 'logs', 'folder'] });
    return;
  }
  openSearch(url);
}

function openSearch(url) {
  baseUrl = url;
  setStatus({ phase: 'ready', title: 'Ready', detail: url });
  win.loadURL(url);
}

// ======================================================================= server actions

async function restartServer() {
  if (settings.mode !== 'local') return boot();
  baseUrl = null;
  showStatusPage();
  setStatus({ phase: 'working', step: 2, title: 'Restarting the search server', detail: '' });
  await server.restart(log);
  return boot();
}

async function stopServer() {
  if (settings.mode !== 'local') return;
  baseUrl = null;
  showStatusPage();
  setStatus({ phase: 'working', title: 'Stopping the search server', detail: '' });
  await server.stop();
  setStatus({ phase: 'stopped', title: 'Search server stopped', detail: 'Press Start to run it again.', actions: ['start'] });
}

async function updateEngine() {
  if (settings.mode !== 'local') return;
  baseUrl = null;
  showStatusPage();
  setStatus({ phase: 'working', step: 2, title: 'Downloading the latest search engine', detail: 'SearXNG and Valkey images are being updated.' });
  const r = await server.pull(log);
  if (r.code !== 0) {
    setStatus({ phase: 'error', title: 'Update failed', detail: 'Check your internet connection and try again.', actions: ['retry'] });
    return;
  }
  return boot();
}

async function viewLogs() {
  const r = await server.logs();
  const file = path.join(app.getPath('userData'), 'tern-server-logs.txt');
  fs.writeFileSync(file, r.out || 'No logs yet. Is Docker running?');
  shell.openPath(file);
}

// ======================================================================= tray + menus

function trayImage() {
  if (isWin) return nativeImage.createFromPath(ICON_ICO);
  return nativeImage.createFromPath(ICON_PNG).resize({ width: isMac ? 18 : 24, height: isMac ? 18 : 24 });
}

function createTray() {
  tray = new Tray(trayImage());
  tray.setToolTip('Tern private search');
  tray.on('click', showWindow);
  updateTray();
}

function statusLabel() {
  if (status.phase === 'ready') return settings.mode === 'remote' ? 'Connected to remote server' : 'Search server running';
  if (status.phase === 'error') return 'Problem: open Tern for details';
  if (status.phase === 'stopped') return 'Search server stopped';
  return `${status.title}…`;
}

function updateTray() {
  if (!tray) return;
  const local = settings.mode === 'local';
  tray.setToolTip(`Tern: ${statusLabel()}`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Tern', click: showWindow },
    { label: 'Open in my browser', enabled: Boolean(baseUrl), click: () => baseUrl && shell.openExternal(baseUrl) },
    { type: 'separator' },
    { label: statusLabel(), enabled: false },
    ...(local ? [
      status.phase === 'stopped'
        ? { label: 'Start search server', click: boot }
        : { label: 'Restart search server', enabled: !booting, click: restartServer },
      { label: 'Stop search server', enabled: !booting && status.phase !== 'stopped', click: stopServer },
    ] : [{ label: 'Reconnect', click: boot }]),
    { type: 'separator' },
    { label: 'Settings…', click: openSettings },
    { label: 'Quit Tern', click: () => app.quit() },
  ]));
}

function buildAppMenu() {
  const local = settings && settings.mode === 'local';
  const template = [
    ...(isMac ? [{
      label: 'Tern',
      submenu: [
        { label: 'About Tern', click: about },
        { type: 'separator' },
        { label: 'Settings…', accelerator: 'Cmd+,', click: openSettings },
        { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: isMac ? 'File' : '&Tern',
      submenu: [
        { label: 'New search', accelerator: 'CmdOrCtrl+N', click: () => { showWindow(); goHome(); } },
        { label: 'Focus search box', accelerator: 'CmdOrCtrl+L', click: focusSearch },
        { label: 'Open in my browser', enabled: Boolean(baseUrl), click: () => baseUrl && shell.openExternal(baseUrl) },
        { label: 'Use Tern on my phone…', click: () => openSettings('phone') },
        ...(isMac ? [] : [
          { type: 'separator' },
          { label: 'Settings…', accelerator: 'Ctrl+,', click: openSettings },
          { type: 'separator' },
          { label: 'Close window', accelerator: 'Ctrl+W', click: () => win.close() },
          { label: 'Quit', accelerator: 'Ctrl+Q', click: () => app.quit() },
        ]),
      ],
    },
    { role: 'editMenu' },
    {
      label: '&View',
      submenu: [
        { label: 'Back', accelerator: isMac ? 'Cmd+[' : 'Alt+Left', click: goBack },
        { label: 'Forward', accelerator: isMac ? 'Cmd+]' : 'Alt+Right', click: goForward },
        { label: 'Home', accelerator: isMac ? 'Cmd+Shift+H' : 'Alt+Home', click: goHome },
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => win.webContents.reload() },
        { label: 'Reload', accelerator: 'F5', visible: false, acceleratorWorksWhenHidden: true, click: () => win.webContents.reload() },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: '&Server',
      submenu: local ? [
        { label: 'Restart search server', enabled: !booting, click: restartServer },
        { label: 'Stop search server', enabled: !booting, click: stopServer },
        { label: 'Update search engine', enabled: !booting, click: updateEngine },
        { type: 'separator' },
        { label: 'View logs', click: viewLogs },
        { label: 'Open server folder', click: () => shell.openPath(server.serverDir()) },
      ] : [
        { label: 'Reconnect', click: boot },
        { label: 'Change server…', click: openSettings },
      ],
    },
    {
      role: 'help',
      submenu: [
        { label: 'SearXNG documentation', click: () => shell.openExternal('https://docs.searxng.org/') },
        { label: 'Search syntax and !bangs', click: () => baseUrl && win.loadURL(`${baseUrl}/info/en/search-syntax`) },
        { label: 'Engine statistics', click: () => baseUrl && win.loadURL(`${baseUrl}/stats`) },
        ...(isMac ? [] : [{ type: 'separator' }, { label: 'About Tern', click: about }]),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function about() {
  dialog.showMessageBox(win, {
    type: 'info',
    title: 'About Tern',
    message: `Tern ${app.getVersion()}`,
    detail: 'Private search on your own server, built on SearXNG.\nNo ads, no trackers, no profile.',
    icon: nativeImage.createFromPath(ICON_PNG),
  });
}

// ======================================================================= settings window

function openSettings(section) {
  const hash = typeof section === 'string' ? section : '';
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.focus();
    if (hash) settingsWin.webContents.send('status', { scrollTo: hash });
    return;
  }
  settingsWin = new BrowserWindow({
    parent: win && win.isVisible() ? win : undefined,
    width: 600,
    height: 720,
    minWidth: 420,
    minHeight: 400,
    title: 'Tern settings',
    icon: isWin ? ICON_ICO : ICON_PNG,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#111415' : '#ffffff',
    webPreferences: { preload: PRELOAD, contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  settingsWin.setMenu(null);
  settingsWin.loadFile(path.join(__dirname, 'ui', 'settings.html'), { hash });
  settingsWin.once('ready-to-show', () => settingsWin.show());
  settingsWin.webContents.setWindowOpenHandler(({ url }) => { openOutside(url); return { action: 'deny' }; });
  settingsWin.on('closed', () => { settingsWin = null; });
}

function applyLoginItem() {
  try {
    if (process.platform === 'linux') return applyLinuxAutostart();
    if (!app.isPackaged) return; // don't register the dev Electron binary
    app.setLoginItemSettings({ openAtLogin: settings.openAtLogin, openAsHidden: true, args: ['--hidden'] });
  } catch { /* not supported */ }
}

function applyLinuxAutostart() {
  const dir = path.join(app.getPath('home'), '.config', 'autostart');
  const file = path.join(dir, 'tern.desktop');
  const exe = process.env.APPIMAGE || process.execPath;
  if (!settings.openAtLogin || !app.isPackaged) {
    fs.rmSync(file, { force: true });
    return;
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, `[Desktop Entry]\nType=Application\nName=Tern\nExec="${exe}" --hidden\nX-GNOME-Autostart-enabled=true\n`);
}

// ======================================================================= IPC

ipcMain.handle('settings:get', () => ({ ...settings, platform: process.platform }));

ipcMain.handle('settings:save', (_e, input) => {
  try {
    const before = settings;
    const next = store.save(input);
    settings = next;
    applyLoginItem();
    const changed = ['mode', 'remoteUrl', 'port', 'lan'].some((k) => before[k] !== next[k]);
    if (changed) boot();
    buildAppMenu();
    updateTray();
    return { ok: true, settings: next, restarted: changed };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('remote:test', async (_e, url) => {
  try {
    const u = new URL(String(url).trim());
    if (!/^https?:$/.test(u.protocol)) return false;
    return await server.isHealthy(String(url).trim().replace(/\/+$/, ''));
  } catch {
    return false;
  }
});

ipcMain.handle('phone:info', async () => {
  if (settings.mode !== 'local') {
    return { mode: 'remote', url: settings.remoteUrl, qr: settings.remoteUrl ? await QRCode.toDataURL(settings.remoteUrl, { margin: 1, width: 220 }) : null };
  }
  const [ip, ...others] = server.lanAddresses();
  const url = ip ? `http://${ip}:${settings.port}` : null;
  return {
    mode: 'local',
    lan: settings.lan,
    url,
    others: others.map((a) => `http://${a}:${settings.port}`),
    qr: settings.lan && url ? await QRCode.toDataURL(url, { margin: 1, width: 220 }) : null,
  };
});

ipcMain.handle('status:get', () => ({ status, log: statusLog }));
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.on('boot:retry', () => boot());
ipcMain.on('settings:open', () => openSettings());
ipcMain.on('settings:close', () => settingsWin && settingsWin.close());
ipcMain.on('open:external', (_e, url) => openOutside(String(url)));
ipcMain.on('open:serverFolder', () => shell.openPath(server.serverDir()));
ipcMain.on('open:logs', () => viewLogs());
ipcMain.on('open:dockerDownload', () => shell.openExternal(DOCKER_DOWNLOAD));

// ======================================================================= lifecycle

app.on('activate', showWindow); // macOS dock icon

app.on('window-all-closed', () => { /* keep running in the tray */ });

app.on('before-quit', (e) => {
  quitting = true;
  saveBounds();
  if (stoppedForQuit || !settings || settings.mode !== 'local' || !settings.stopOnQuit) return;
  e.preventDefault();
  stoppedForQuit = true;
  if (win && !win.isDestroyed()) win.hide();
  if (tray) tray.setToolTip('Tern: stopping the search server…');
  Promise.race([server.stop(), new Promise((r) => setTimeout(r, 30000))]).finally(() => app.quit());
});
