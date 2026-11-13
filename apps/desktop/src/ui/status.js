const $ = (id) => document.getElementById(id);

const ACTIONS = {
  retry: { label: 'Try again', run: () => window.tern.retry() },
  start: { label: 'Start', run: () => window.tern.retry() },
  installDocker: { label: 'Get Docker Desktop', run: () => window.tern.openDockerDownload() },
  settings: { label: 'Settings', run: () => window.tern.openSettings() },
  folder: { label: 'Open server folder', run: () => window.tern.openServerFolder() },
  logs: { label: 'View logs', run: () => window.tern.openLogs() },
};

function render(s) {
  const root = $('root');
  root.classList.toggle('error', s.phase === 'error');
  $('title').textContent = s.title || 'Tern';
  $('detail').textContent = s.detail || '';
  $('spinner').classList.toggle('hidden', s.phase !== 'working');
  $('steps').classList.toggle('hidden', !s.step);
  for (const li of $('steps').children) {
    const n = Number(li.dataset.step);
    li.classList.toggle('active', n === s.step);
    li.classList.toggle('done', s.step > n);
  }
  const box = $('actions');
  box.replaceChildren();
  (s.actions || []).forEach((key, i) => {
    const a = ACTIONS[key];
    if (!a) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = a.label;
    if (i === 0) b.className = 'primary';
    b.addEventListener('click', a.run);
    box.append(b);
  });
  if (s.phase === 'error' && $('log').textContent) {
    $('logBox').classList.remove('hidden');
    $('logBox').open = true;
  }
  if (box.firstChild) box.firstChild.focus();
}

function addLog(line) {
  const pre = $('log');
  pre.textContent += `${line}\n`;
  pre.scrollTop = pre.scrollHeight;
  $('logBox').classList.remove('hidden');
}

window.tern.onStatus((d) => {
  if (d.status) render(d.status);
  if (d.log) addLog(d.log);
});

window.tern.getStatus().then(({ status, log }) => {
  log.forEach(addLog);
  render(status);
});
