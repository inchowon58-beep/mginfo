const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("studio", {
  load: () => ipcRenderer.invoke("studio:load"),
  saveSettings: (payload) => ipcRenderer.invoke("studio:save-settings", payload),
  createSite: (payload) => ipcRenderer.invoke("studio:create", payload),
  open: (url) => ipcRenderer.invoke("studio:open", url),
  onLog: (fn) => {
    const listener = (_event, line) => fn(line);
    ipcRenderer.on("studio:log", listener);
    return () => ipcRenderer.removeListener("studio:log", listener);
  },
});
