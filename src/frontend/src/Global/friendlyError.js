// Turns whatever a failed action returned into a sentence a shop owner can
// act on — never a system code or a developer message.
//
//   friendlyError(t, source, fallbackKey?)  → string to show
//   friendlyFail(t, source, fallbackKey?)   → an Error that already carries it
//
// `source` can be an IPC result ({ success:false, error, message }), a caught
// exception, or a plain string. Backend errors are codes like
// "INSUFFICIENT_STOCK:Milk"; their wording lives in the locale files under
// errors.<CODE> (and errors.<CODE>_NAMED when the code carries a detail).
// Anything unknown shows `fallbackKey` (or a generic sentence) and is logged
// to the console so it can be given proper wording.

const MISSING = "\u0000missing";

// Electron prefixes errors thrown by ipcMain handlers with this.
const IPC_WRAPPER = /^Error invoking remote method '[^']*':\s*(?:Error:\s*)?/i;

// A few older backend errors are English sentences, not codes.
const TEXT_TO_CODE = {
  "error enter data": "MISSING_REQUIRED_FIELDS",
  "product not found": "PRODUCT_NOT_FOUND",
  "tax not found": "INVALID_TAX_ID",
  "invoice not found": "INVOICE_NOT_FOUND",
  "purchase invoice not found": "INVOICE_NOT_FOUND",
  "product is used in invoices": "PRODUCT_IN_USE",
  "cannot delete customer because it has transactions.": "CONTACT_HAS_TRANSACTIONS",
  "cannot delete supplier because it has transactions.": "CONTACT_HAS_TRANSACTIONS",
  "export cancelled": "EXPORT_CANCELLED",
  "admin pin must be exactly 6 digits": "PIN_INVALID_LENGTH",
  "admin username is required": "ADMIN_USERNAME_REQUIRED",
  "country is required": "COUNTRY_REQUIRED",
  "pin already in use": "PIN_ALREADY_IN_USE",
};

export class FriendlyError extends Error {
  constructor(message) {
    super(message);
    this.friendly = true;
  }
}

const lookup = (t, key, params) => {
  const value = t(key, { ...params, defaultValue: MISSING });
  return value === MISSING ? null : value;
};

const rawText = (source) => {
  if (!source) return "";
  if (typeof source === "string") return source;
  return String(source.error || source.code || source.message || "");
};

export function friendlyError(t, source, fallbackKey = "errors.generic") {
  // already worded for the user (see friendlyFail)
  if (source && source.friendly && source.message) return source.message;

  const text = rawText(source)
    .trim()
    .replace(IPC_WRAPPER, "")
    .replace(/^Error:\s*/i, "");

  let code = null;
  let detail = "";
  const coded = /^([A-Z][A-Z0-9_]+)(?::\s*(.*))?$/.exec(text);
  if (coded) {
    code = coded[1];
    detail = (coded[2] || "").trim();
  } else if (TEXT_TO_CODE[text.toLowerCase()]) {
    code = TEXT_TO_CODE[text.toLowerCase()];
  }

  if (code) {
    if (detail) {
      const named = lookup(t, `errors.${code}_NAMED`, { name: detail });
      if (named) return named;
    }
    const hit = lookup(t, `errors.${code}`) || lookup(t, `screens.errors.${code}`);
    if (hit) return hit;
  }

  if (text && typeof console !== "undefined") {
    console.warn("[friendlyError] no friendly wording for:", text);
  }
  return (
    lookup(t, fallbackKey) ||
    lookup(t, "errors.generic") ||
    "Something went wrong. Please try again."
  );
}

export const friendlyFail = (t, source, fallbackKey) =>
  new FriendlyError(friendlyError(t, source, fallbackKey));
