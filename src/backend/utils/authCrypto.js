const crypto = require("crypto");

export function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin, stored) {
  const [salt, hash] = stored.split(":");
  const hashBuffer = Buffer.from(hash, "hex");
  const suppliedHashBuffer = crypto.scryptSync(pin, salt, 64);
  return (
    hashBuffer.length === suppliedHashBuffer.length &&
    crypto.timingSafeEqual(hashBuffer, suppliedHashBuffer)
  );
}

// PINs are hashed+salted, so uniqueness can't be checked with a WHERE clause —
// loop and compare. Fine at POS-team scale (a handful of users).
export function isPinTaken(db, pin, excludeUserId = null) {
  const users = db
    .prepare("SELECT id, pin_hash FROM users WHERE is_active = 1")
    .all();
  return users.some(
    (u) => u.id !== excludeUserId && verifyPin(pin, u.pin_hash),
  );
}
