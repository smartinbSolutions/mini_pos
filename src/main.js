import { app, BrowserWindow } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";

import { fileURLToPath } from "url";
import { dirname } from "path";
import registerAllIPC from "./backend/registerAllIPC";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (started) app.quit();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  });

  // DEV
  mainWindow.loadURL("http://localhost:3000");

  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  registerAllIPC();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
