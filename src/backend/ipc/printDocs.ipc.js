// printDocsIpc.js
//
// Unified print/PDF handlers for all printable documents (sales invoices,
// purchase invoices, quotations, returns, expenses). The renderer already
// owns each document's data via its own route (e.g. /print-sales/:id), so
// this file only needs to know how to open a hidden window, load a given
// route, and either save it as PDF or send it to a printer. No document-
// specific logic lives here — that stays in each route's own component.

const { ipcMain, BrowserWindow, dialog } = require("electron");
import path from "path";
import fs from "fs";
import { loadRendererRoute } from "../../main";

// Injected before print/PDF so content inside fixed-height / scrolling
// containers flows into the document and paginates instead of clipping.
const PRINT_FIX_CSS = `

  html, body, #root {
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
  }
  #root * {
    max-height: none !important;
  }
  .h-screen, .min-h-screen, .overflow-hidden, .overflow-auto, .overflow-y-auto {
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
  }
  thead { display: table-header-group; }
  tr, img { break-inside: avoid; page-break-inside: avoid; }
`;

function withLang(route, lang) {
  if (!lang) return route;
  return `${route}${route.includes("?") ? "&" : "?"}lang=${encodeURIComponent(lang)}`;
}

function openHiddenDocumentWindow() {
  return new BrowserWindow({
    width: 900,
    height: 1000,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"), // matches main window exactly
    },
  });
}

// Polls until the print route sets body[data-print-ready="1"].
async function waitForPrintReady(win, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!win || win.isDestroyed()) return false;
    const ready = await win.webContents
      .executeJavaScript('document.body?.dataset.printReady === "1"', true)
      .catch(() => false);
    if (ready) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

export default function registerPrintDocsIPC() {
  // SAVE AS PDF
  // payload: { route, fileName }
  //   route    -> renderer path to load, e.g. "/print-sales/42"
  //   fileName -> suggested default filename, e.g. "invoice-42.pdf"
  // SAVE AS PDF
  ipcMain.handle(
    "save-document-pdf",
    async (event, { route, fileName, lang }) => {
      let win = openHiddenDocumentWindow();

      return new Promise((resolve) => {
        win.webContents.on("did-finish-load", async () => {
          if (!win) return;
          try {
            const ready = await waitForPrintReady(win);
            if (!ready) throw new Error("PRINT_NOT_READY");

            await win.webContents.insertCSS(PRINT_FIX_CSS);

            const pdfBuffer = await win.webContents.printToPDF({
              printBackground: true,
              pageSize: "A4",
              margins: { top: 0, bottom: 0.5, left: 0, right: 0 }, // inches
              displayHeaderFooter: true,
              headerTemplate: "<div></div>",
              footerTemplate: `
    <div style="width:100%; font-size:9px; color:#64748b; text-align:center; font-family:Arial, sans-serif;">
      <span class="pageNumber"></span> / <span class="totalPages"></span>
    </div>`,
            });

            const { filePath, canceled } = await dialog.showSaveDialog({
              title: "Save PDF",
              defaultPath: fileName || "document.pdf",
              filters: [{ name: "PDF", extensions: ["pdf"] }],
            });

            if (canceled || !filePath) {
              resolve({ success: false, error: "CANCELED" });
              return;
            }

            fs.writeFileSync(filePath, pdfBuffer);
            resolve({ success: true, filePath });
          } catch (err) {
            console.error("PDF generation failed:", err);
            resolve({ success: false, error: err.message || String(err) });
          } finally {
            if (win) {
              win.destroy();
              win = null;
            }
          }
        });

        win.webContents.on("did-fail-load", () => {
          if (win) {
            win.destroy();
            win = null;
          }
          resolve({ success: false, error: "Failed to load print route" });
        });

        loadRendererRoute(win, withLang(route, lang));
      });
    },
  );

  // PRINT
  // payload: { route }
  // PRINT
  ipcMain.handle("print-document", async (event, { route, lang }) => {
    let win = openHiddenDocumentWindow();

    return new Promise((resolve) => {
      win.webContents.on("did-finish-load", async () => {
        if (!win) return;

        try {
          const printers = await win.webContents.getPrintersAsync();
          if (!printers || printers.length === 0) {
            win.destroy();
            win = null;
            resolve({ success: false, error: "NO_PRINTER" });
            return;
          }
        } catch (err) {
          if (win) {
            win.destroy();
            win = null;
          }
          resolve({ success: false, error: "NO_PRINTER" });
          return;
        }

        const ready = await waitForPrintReady(win);
        if (!ready) {
          if (win) {
            win.destroy();
            win = null;
          }
          resolve({ success: false, error: "PRINT_NOT_READY" });
          return;
        }

        try {
          await win.webContents.insertCSS(PRINT_FIX_CSS);
        } catch (err) {
          console.error("Failed to inject print CSS:", err);
        }

        if (!win) return;
        win.webContents.print(
          {
            silent: false,
            printBackground: true,
            pageSize: "A4",
            margins: {
              marginType: "custom",
              top: 0,
              bottom: 38,
              left: 0,
              right: 0,
            },
          },
          (success, failureReason) => {
            if (!success) {
              console.error(`Print failed: ${failureReason}`);
              resolve({ success: false, error: failureReason });
            } else {
              resolve({ success: true });
            }
            if (win) {
              win.destroy();
              win = null;
            }
          },
        );
      });

      win.webContents.on("did-fail-load", () => {
        if (win) {
          win.destroy();
          win = null;
        }
        resolve({ success: false, error: "Failed to load print route" });
      });

      loadRendererRoute(win, withLang(route, lang));
    });
  });
}
