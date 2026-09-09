const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("studio", {
  load: () => ipcRenderer.invoke("studio:load"),
  saveSettings: (payload) => ipcRenderer.invoke("studio:save-settings", payload),
  createSite: (payload) => ipcRenderer.invoke("studio:create", payload),
  saveSite: (payload) => ipcRenderer.invoke("studio:save-site", payload),
  deleteSite: (id) => ipcRenderer.invoke("studio:delete-site", id),
  syncPush: () => ipcRenderer.invoke("studio:sync-push"),
  syncPull: () => ipcRenderer.invoke("studio:sync-pull"),
  open: (url) => ipcRenderer.invoke("studio:open", url),
  onLog: (fn) => {
    const listener = (_event, line) => fn(line);
    ipcRenderer.on("studio:log", listener);
    return () => ipcRenderer.removeListener("studio:log", listener);
  },
});
