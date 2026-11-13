// Bridge for Tern's own local pages (status + settings) only.
// The search pages served by SearXNG get nothing from here.
const { contextBridge, ipcRenderer } = require('electron');

if (location.protocol === 'file:') {
  contextBridge.exposeInMainWorld('tern', {
    getSettings: () => ipcRenderer.invoke('settings:get'),
    saveSettings: (s) => ipcRenderer.invoke('settings:save', s),
    testRemote: (url) => ipcRenderer.invoke('remote:test', url),
    phoneInfo: () => ipcRenderer.invoke('phone:info'),
    retry: () => ipcRenderer.send('boot:retry'),
    openSettings: () => ipcRenderer.send('settings:open'),
    closeSettings: () => ipcRenderer.send('settings:close'),
    openExternal: (url) => ipcRenderer.send('open:external', url),
    openServerFolder: () => ipcRenderer.send('open:serverFolder'),
    openLogs: () => ipcRenderer.send('open:logs'),
    openDockerDownload: () => ipcRenderer.send('open:dockerDownload'),
    getStatus: () => ipcRenderer.invoke('status:get'),
    onStatus: (fn) => ipcRenderer.on('status', (_e, data) => fn(data)),
    version: () => ipcRenderer.invoke('app:version'),
  });
}
