const $ = (id) => document.getElementById(id);
const form = $('form');

function mode() {
  return form.elements.mode.value;
}

function syncVisibility() {
  const local = mode() === 'local';
  $('localFields').classList.toggle('hidden', !local);
  $('remoteFields').classList.toggle('hidden', local);
  $('lanToggle').classList.toggle('hidden', !local);
  $('stopToggle').classList.toggle('hidden', !local);
}

async function refreshPhone() {
  const info = await window.tern.phoneInfo();
  const show = info.qr && info.url;
  $('phoneInfo').classList.toggle('hidden', !show);
  $('phoneOff').classList.toggle('hidden', Boolean(show) || info.mode === 'remote');
  if (info.mode === 'local' && info.lan && !info.url) {
    $('phoneOff').textContent = "Couldn't find this computer's Wi-Fi address. Check your network connection.";
    $('phoneOff').classList.remove('hidden');
  }
  if (show) {
    $('qr').src = info.qr;
    $('phoneUrl').textContent = info.url;
    const others = info.others || [];
    $('otherUrls').classList.toggle('hidden', !others.length);
    $('otherUrls').textContent = others.length ? `Not working? Try: ${others.join(', ')}` : '';
  }
}

function fill(s) {
  form.elements.mode.value = s.mode;
  form.elements.port.value = s.port;
  form.elements.remoteUrl.value = s.remoteUrl || '';
  for (const k of ['lan', 'stopOnQuit', 'openAtLogin', 'openLinksExternally']) form.elements[k].checked = s[k];
  syncVisibility();
}

function read() {
  return {
    mode: mode(),
    port: form.elements.port.value,
    remoteUrl: form.elements.remoteUrl.value,
    lan: form.elements.lan.checked,
    stopOnQuit: form.elements.stopOnQuit.checked,
    openAtLogin: form.elements.openAtLogin.checked,
    openLinksExternally: form.elements.openLinksExternally.checked,
  };
}

function message(text, kind) {
  const m = $('msg');
  m.textContent = text;
  m.className = `msg ${kind || ''}`;
}

form.addEventListener('change', (e) => {
  if (e.target.name === 'mode') syncVisibility();
  message('');
});

$('testBtn').addEventListener('click', async () => {
  const r = $('testResult');
  r.className = 'test-result';
  r.textContent = 'Testing…';
  const ok = await window.tern.testRemote(form.elements.remoteUrl.value);
  r.className = `test-result ${ok ? 'ok' : 'bad'}`;
  r.textContent = ok ? 'Connected. This is a working Tern / SearXNG server.' : 'No answer. Check the address, that the server is running, and that it allows other devices.';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  $('save').disabled = true;
  const res = await window.tern.saveSettings(read());
  $('save').disabled = false;
  if (!res.ok) {
    message(res.error, 'bad');
    return;
  }
  fill(res.settings);
  message(res.restarted ? 'Saved. Restarting the search server…' : 'Saved.', 'ok');
  setTimeout(refreshPhone, 1500);
});

$('cancel').addEventListener('click', () => window.tern.closeSettings());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.tern.closeSettings(); });

window.tern.onStatus((d) => {
  if (d.scrollTo) document.getElementById(d.scrollTo)?.scrollIntoView({ behavior: 'smooth' });
});

(async () => {
  fill(await window.tern.getSettings());
  refreshPhone();
  $('version').textContent = `Tern desktop ${await window.tern.version()}`;
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
})();
