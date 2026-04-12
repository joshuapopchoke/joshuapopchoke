import { app, BrowserWindow, ipcMain, screen } from "electron";
import path from "node:path";
import { autoUpdater } from "electron-updater";

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

function configureAutoUpdates() {
  if (isDev) {
    return;
  }

  const feedUrl = process.env.AUTO_UPDATE_URL;
  if (feedUrl) {
    try {
      const parsedFeedUrl = new URL(feedUrl);
      if (parsedFeedUrl.protocol === "https:") {
        autoUpdater.setFeedURL({ provider: "generic", url: parsedFeedUrl.toString() });
      }
    } catch {
      return;
    }
  }

  void autoUpdater.checkForUpdatesAndNotify();
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay.workAreaSize;
  const targetWidth = Math.max(1100, Math.min(1600, Math.floor(workArea.width * 0.94)));
  const targetHeight = Math.max(760, Math.min(1000, Math.floor(workArea.height * 0.94)));

  const win = new BrowserWindow({
    width: targetWidth,
    height: targetHeight,
    minWidth: Math.min(1100, workArea.width),
    minHeight: Math.min(760, workArea.height),
    backgroundColor: "#07111f",
    title: "FIDUCIARY DUTY",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      nodeIntegrationInSubFrames: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: isDev
    }
  });

  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event) => {
    event.preventDefault();
  });
  win.webContents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });
  win.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  win.once("ready-to-show", () => {
    if (workArea.width <= 1440 || workArea.height <= 900) {
      win.maximize();
    }
    win.show();
  });

  if (isDev) {
    void win.loadURL(process.env.VITE_DEV_SERVER_URL!);
  } else {
    void win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  configureAutoUpdates();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.on("close-app", () => app.quit());
ipcMain.on("minimize-app", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});
ipcMain.on("maximize-app", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);

  if (!win) {
    return;
  }

  if (win.isMaximized()) {
    win.unmaximize();
    return;
  }

  win.maximize();
});
