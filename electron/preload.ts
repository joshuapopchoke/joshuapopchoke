import { contextBridge, ipcRenderer } from "electron";

const electronAPI = {
  closeApp: () => ipcRenderer.send("close-app"),
  minimizeApp: () => ipcRenderer.send("minimize-app"),
  maximizeApp: () => ipcRenderer.send("maximize-app")
};

contextBridge.exposeInMainWorld("electronAPI", Object.freeze(electronAPI));

declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
