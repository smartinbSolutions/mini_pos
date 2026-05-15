import { BrowserWindow, ipcMain } from "electron";
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";

let scalePort = null;
let scaleParser = null;

const sendToRenderer = (channel, payload) => {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send(channel, payload);
  });
};

const extractWeight = (text) => {
  const cleaned = String(text || "").replace(",", ".");
  const matches = cleaned.match(/[+-]?\d+(?:\.\d+)?/g);

  if (!matches?.length) return null;

  const parsed = Number(matches[matches.length - 1]);
  return Number.isFinite(parsed) ? Math.abs(parsed) : null;
};

const pickDefaultPort = (ports) =>
  ports.find((port) => {
    const label = [
      port.path,
      port.manufacturer,
      port.friendlyName,
      port.pnpId,
      port.vendorId,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      label.includes("usb") ||
      label.includes("ftdi") ||
      label.includes("prolific") ||
      label.includes("ch340")
    );
  }) || ports[0];

const closeScalePort = () =>
  new Promise((resolve) => {
    if (!scalePort?.isOpen) {
      scaleParser = null;
      scalePort = null;
      resolve();
      return;
    }

    scalePort.close(() => {
      scaleParser = null;
      scalePort = null;
      resolve();
    });
  });

export default function registerSerialIPC() {
  ipcMain.handle("scale:list-ports", async () => SerialPort.list());

  ipcMain.handle("scale:connect", async (_event, options = {}) => {
    await closeScalePort();

    const ports = await SerialPort.list();
    const selectedPath = options.path || pickDefaultPort(ports)?.path;

    if (!selectedPath) {
      return { ok: false, message: "No serial ports found." };
    }

    const baudRate = Number(options.baudRate) || 9600;

    scalePort = new SerialPort({
      path: selectedPath,
      baudRate,
      autoOpen: false,
    });

    scaleParser = scalePort.pipe(new ReadlineParser({ delimiter: "\r\n" }));

    scaleParser.on("data", (line) => {
      const weight = extractWeight(line);

      if (weight === null) return;

      sendToRenderer("scale:data", {
        weight,
        raw: line,
        path: selectedPath,
      });
    });

    scalePort.on("error", (error) => {
      sendToRenderer("scale:status", {
        connected: false,
        message: error.message,
      });
    });

    scalePort.on("close", () => {
      sendToRenderer("scale:status", {
        connected: false,
        message: "Disconnected",
      });
    });

    await new Promise((resolve, reject) => {
      scalePort.open((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    sendToRenderer("scale:status", {
      connected: true,
      message: `Connected to ${selectedPath}`,
      path: selectedPath,
    });

    return {
      ok: true,
      path: selectedPath,
      baudRate,
      ports,
    };
  });

  ipcMain.handle("scale:disconnect", async () => {
    await closeScalePort();
    return { ok: true };
  });
}
