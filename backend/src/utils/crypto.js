const crypto = require("crypto");
const { JWT_SECRET } = require("../config/env");

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash).split(":");
  if (!salt || !hash) return false;
  const stored = Buffer.from(hash, "hex");
  const candidate = Buffer.from(hashPassword(password, salt).split(":")[1], "hex");
  return stored.length === candidate.length && crypto.timingSafeEqual(stored, candidate);
}

function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash("sha256").update(process.env.TOKEN_ENCRYPTION_KEY || JWT_SECRET).digest();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptSecret(value) {
  if (!value) return null;
  const [iv, tag, encrypted] = String(value).split(":");
  const key = crypto.createHash("sha256").update(process.env.TOKEN_ENCRYPTION_KEY || JWT_SECRET).digest();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted, "hex")), decipher.final()]).toString("utf8"));
}

function signaturesMatch(raw, signature, secret) {
  if (!raw || !signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const received = Buffer.from(String(signature).replace(/^sha256=/, ""));
  const candidate = Buffer.from(expected);
  return received.length === candidate.length && crypto.timingSafeEqual(received, candidate);
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

module.exports = {
  hashPassword,
  verifyPassword,
  encryptSecret,
  decryptSecret,
  signaturesMatch,
  tokenHash,
};
