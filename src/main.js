import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";

import { fileURLToPath } from "url";
import { dirname } from "path";
import registerAllIPC from "./backend/registerAllIPC";
import activateLicense from "./main/license/activateLicense";
import verifyLicenseFile from "./main/license/verifyLicenseFile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (started) app.quit();

let mainWindow;

function loadRendererRoute(window, routePath) {
  const devServerUrl = app.isPackaged
    ? null
    : process.env.RENDERER_DEV_SERVER_URL || "http://localhost:3000";

  if (devServerUrl) {
    window.loadURL(new URL(routePath, devServerUrl).toString());
    return;
  }

  const rendererName =
    typeof MAIN_WINDOW_VITE_NAME !== "undefined"
      ? MAIN_WINDOW_VITE_NAME
      : "main_window";

  window.loadFile(
    path.join(__dirname, `../renderer/${rendererName}/index.html`),
  );
}

function createWindow(routePath = "/") {
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

  loadRendererRoute(mainWindow, routePath);

  mainWindow.webContents.openDevTools();
}

function registerLicenseIPC() {
  ipcMain.handle("license:status", async () => verifyLicenseFile());
  ipcMain.handle("license:activate", async (_event, licenseKey) => {
    const result = await activateLicense(licenseKey);

    if (result.success && mainWindow) {
      loadRendererRoute(mainWindow, "/");
    }

    return result;
  });
}

app.whenReady().then(async () => {
  registerLicenseIPC();

  try {
    registerAllIPC();
  } catch (error) {
    console.error("Failed to register application IPC handlers", error);
  }

  const licenseStatus = await verifyLicenseFile();
  createWindow(licenseStatus.valid ? "/" : "/activation");

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      verifyLicenseFile().then((status) => {
        createWindow(status.valid ? "/" : "/activation");
      });
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
