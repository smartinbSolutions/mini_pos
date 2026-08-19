const { BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
import { rgbaToEscposReceipt } from "../utils/escposRaster";
import { getRawPrintScriptPath } from "../utils/getRawPrintScriptPath";

// 80mm: confirmed via a full-width stripe test against real PT80KM
// hardware — fills the paper with a small margin to spare, no clipping.
// 58mm: still the original unverified estimate — revisit with the same
// stripe-test method if a 58mm printer is ever added.
const PAPER_WIDTH_DOTS = {
  "58mm": 280,
  "80mm": 576,
};

export function getPaperWidthDots(paperSize) {
  return PAPER_WIDTH_DOTS[paperSize] || PAPER_WIDTH_DOTS["80mm"];
}

// Our raw capture maps CSS px directly to printer dots at ~203dpi. The
// shared receipt HTML template's font-size values were written assuming
// the old ~96dpi CSS-px-to-paper mapping (correct for the 'electron'
// backend's driver-based print, which still uses that template as-is).
//
// Rather than zoom the page before capture (tried first — Chromium's zoom
// didn't reliably grow the viewport to match the zoomed content, causing
// content past a certain point to be silently clipped instead of
// captured), we render at a SMALLER width using the template's original
// font sizes unmodified, then upscale the final bitmap to the real target
// width. This reuses the same resize() call already needed for the Retina
// fix below, instead of introducing a second, less predictable mechanism.
// 203/96 ≈ 2.1 — same ratio as before, now used as a width divisor
// instead of a zoom multiplier. Adjust this one constant if real receipts
// still look too small/large.
const RAW_PRINT_RENDER_SCALE = 2.1;

export async function captureHtmlAsBitmap(html, widthDots) {
  const renderWidthDots = Math.max(
    1,
    Math.round(widthDots / RAW_PRINT_RENDER_SCALE),
  );

  const win = new BrowserWindow({
    show: false,
    width: renderWidthDots,
    height: 50, // placeholder, resized below once real content height is known
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });

  try {
    await win.loadURL(
      "data:text/html;charset=utf-8," + encodeURIComponent(html),
    );

    // Force scrollbars off entirely. Without this, if the actual rendered
    // content is even 1px taller than our scrollHeight measurement below
    // (a common rounding/timing edge case), Chromium shows a scrollbar
    // instead of clipping — and that scrollbar gets captured as part of
    // the image. Its darker "thumb" then thresholds to solid black in the
    // monochrome conversion, producing a black bar down one edge of the
    // printed receipt.
    await win.webContents.insertCSS(
      "html, body { overflow: hidden !important; }",
    );

    const contentHeight = await win.webContents.executeJavaScript(
      "document.documentElement.scrollHeight",
    );

    // Small buffer on top of the measured height, belt-and-suspenders
    // alongside the overflow:hidden above — keeps us clear of the exact
    // borderline case that triggers a scrollbar in the first place.
    const heightWithBuffer = Math.max(1, Math.ceil(contentHeight) + 4);

    win.setContentSize(renderWidthDots, heightWithBuffer);
    // setContentSize triggers an async relayout — give it a tick before capturing.
    await new Promise((resolve) => setTimeout(resolve, 50));

    const rawImage = await win.webContents.capturePage();

    // Single resize() call does two jobs at once:
    // 1. Corrects for the display's backing scale factor (e.g. 2x on a
    //    Retina Mac) — capturePage() returns a bitmap at that scale, not
    //    the CSS pixel size the window was set to.
    // 2. Upscales from renderWidthDots to the real target widthDots,
    //    proportionally enlarging the font (and everything else) in dot
    //    terms — this is what makes the text physically legible on paper.
    const image = rawImage.resize({ width: widthDots });

    // TEMPORARY DEBUG: dump the exact image being sent into the raster
    // encoder as a real PNG you can open and look at directly — isolates
    // whether the black bar comes from rendering/capture (would show in
    // this PNG) or from the raster encoding step after this (wouldn't).
    // Remove this block once the black-bar issue is resolved.
    try {
      const debugPath = path.join(
        os.tmpdir(),
        `noonpos-debug-capture-${Date.now()}.png`,
      );
      fs.writeFileSync(debugPath, image.toPNG());
      console.log("DEBUG: capture saved to", debugPath);
    } catch (debugErr) {
      console.log("DEBUG PNG save failed:", debugErr.message);
    }

    const { width, height } = image.getSize();
    const bitmap = image.toBitmap();

    return { bitmap, width, height };
  } finally {
    win.close();
  }
}

// Windows: send bytes via winspool.drv through send-raw-print.ps1, the
// script validated earlier against real PT80KM hardware.
function runRawPrintScriptWindows(printerName, tmpPath) {
  return new Promise((resolve) => {
    const scriptPath = getRawPrintScriptPath();

    const ps = spawn("powershell", [
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptPath,
      "-PrinterName",
      printerName,
      "-FilePath",
      tmpPath,
    ]);

    let stdout = "";
    let stderr = "";
    ps.stdout.on("data", (d) => (stdout += d.toString()));
    ps.stderr.on("data", (d) => (stderr += d.toString()));

    ps.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true, message: stdout.trim() });
      } else {
        resolve({
          success: false,
          error:
            stderr.trim() || stdout.trim() || `Script exited with code ${code}`,
        });
      }
    });

    ps.on("error", (err) => {
      resolve({
        success: false,
        error: `Failed to launch PowerShell: ${err.message}`,
      });
    });
  });
}

// macOS: CUPS' own raw-passthrough mode via `lp -o raw`. No intermediate
// script needed — CUPS' raw datatype does exactly what Windows' RAW
// spooler datatype does, skip driver rendering, pass bytes straight
// through to the printer.
function runRawPrintScriptMac(printerName, tmpPath) {
  return new Promise((resolve) => {
    const lp = spawn("lp", ["-d", printerName, "-o", "raw", tmpPath]);

    let stdout = "";
    let stderr = "";
    lp.stdout.on("data", (d) => (stdout += d.toString()));
    lp.stderr.on("data", (d) => (stderr += d.toString()));

    lp.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true, message: stdout.trim() });
      } else {
        resolve({
          success: false,
          error:
            stderr.trim() || stdout.trim() || `lp exited with code ${code}`,
        });
      }
    });

    lp.on("error", (err) => {
      resolve({ success: false, error: `Failed to launch lp: ${err.message}` });
    });
  });
}

export function runRawPrintScript(printerName, buffer) {
  const tmpPath = path.join(os.tmpdir(), `noonpos-print-${Date.now()}.bin`);
  fs.writeFileSync(tmpPath, buffer);

  const cleanup = () => fs.unlink(tmpPath, () => {}); // best-effort, don't block on it

  const platformPrint =
    process.platform === "win32"
      ? runRawPrintScriptWindows(printerName, tmpPath)
      : process.platform === "darwin"
        ? runRawPrintScriptMac(printerName, tmpPath)
        : Promise.resolve({
            success: false,
            error: `RAW_ESCPOS_UNSUPPORTED_PLATFORM: ${process.platform}`,
          });

  return platformPrint.then((result) => {
    cleanup();
    return result;
  });
}

/**
 * Full raw-ESC/POS print pipeline: HTML -> bitmap -> ESC/POS bytes -> sent
 * to the printer via the OS's raw-passthrough mechanism (Windows RAW
 * spooler job, or macOS CUPS `-o raw`). Single entry point used by both
 * the real print-receipt handler and the test-print handler.
 *
 * @param {string} html
 * @param {object} options
 * @param {string} options.deviceName - exact printer queue name (Windows
 *   deviceName, or the CUPS printer name from `lpstat -p` on macOS)
 * @param {string} options.paperSize - '58mm' | '80mm'
 * @param {boolean} options.hasCutter
 * @returns {Promise<{success: boolean, error?: string, message?: string}>}
 */
export async function printViaRawEscpos(
  html,
  { deviceName, paperSize, hasCutter },
) {
  if (process.platform !== "win32" && process.platform !== "darwin") {
    return { success: false, error: "RAW_ESCPOS_UNSUPPORTED_PLATFORM" };
  }

  try {
    const widthDots = getPaperWidthDots(paperSize);
    const { bitmap, width, height } = await captureHtmlAsBitmap(
      html,
      widthDots,
    );
    const receiptBuffer = rgbaToEscposReceipt(bitmap, width, height, {
      hasCutter,
    });
    return await runRawPrintScript(deviceName, receiptBuffer);
  } catch (err) {
    return { success: false, error: err.message };
  }
}
