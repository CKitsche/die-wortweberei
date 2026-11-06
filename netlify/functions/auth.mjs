// Admin-Anmeldung für den Redaktionsbereich (/admin).
//
// Passwort: entweder das in Netlify hinterlegte ADMIN_PASSWORD oder – sobald
// Carolina es im Admin-Bereich geändert hat – ein PBKDF2-Hash im Blob-Store.
// Sitzung: signiertes Cookie (HMAC-SHA256), rein serverseitig prüfbar, kein
// Zustand nötig. Ändert sich das Passwort, ändert sich der Schlüssel und alle
// alten Sitzungen sind ungültig – gewollt.

export const COOKIE_NAME = "ww_admin";
const SESSION_SECONDS = 60 * 60 * 12;
const PBKDF2_ITERATIONS = 210000;
const PW_KEY = "auth/password";

const enc = new TextEncoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** Vergleich ohne früh abzubrechen (verrät nicht, ab welchem Zeichen es klemmt). */
export function safeEqual(a, b) {
  const x = enc.encode(String(a));
  const y = enc.encode(String(b));
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export async function hashPassword(password, saltBytes) {
  const salt = saltBytes ?? crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, key, 256,
  );
  return { salt: b64(salt), hash: b64(bits), iterations: PBKDF2_ITERATIONS };
}

async function verifyStored(password, stored) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromB64(stored.salt), iterations: stored.iterations || PBKDF2_ITERATIONS, hash: "SHA-256" },
    key, 256,
  );
  return safeEqual(b64(bits), stored.hash);
}

/** Passwort-Datensatz aus dem Blob-Store (null = es gilt noch ADMIN_PASSWORD). */
async function storedPassword(store) {
  try {
    return await store.get(PW_KEY, { type: "json" });
  } catch {
    return null;
  }
}

export async function setPassword(store, password) {
  await store.setJSON(PW_KEY, await hashPassword(password));
}

/**
 * Schlüsselmaterial der Sitzungssignatur. Enthält bewusst das aktuelle
 * Passwort(-Hash): Passwortwechsel wirft alle Sitzungen raus.
 */
async function sessionKeyMaterial(store) {
  const stored = await storedPassword(store);
  const parts = [
    process.env.ADMIN_SECRET || "",
    stored ? stored.hash : "",
    stored ? "" : (process.env.ADMIN_PASSWORD || ""),
  ];
  return parts.join("|");
}

async function hmac(material, message) {
  const key = await crypto.subtle.importKey("raw", enc.encode(material), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

/** Ist überhaupt ein Passwort eingerichtet? Ohne das bleibt der Admin zu. */
export async function adminConfigured(store) {
  if (await storedPassword(store)) return true;
  return Boolean(process.env.ADMIN_PASSWORD);
}

export async function checkPassword(store, password) {
  if (typeof password !== "string" || !password) return false;
  const stored = await storedPassword(store);
  if (stored) return verifyStored(password, stored);
  const env = process.env.ADMIN_PASSWORD;
  if (!env) return false;
  return safeEqual(password, env);
}

export async function makeSessionCookie(store, now = Date.now()) {
  const exp = Math.floor(now / 1000) + SESSION_SECONDS;
  const sig = await hmac(await sessionKeyMaterial(store), "v1|" + exp);
  const value = `${exp}.${sig}`;
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

function cookieValue(header, name) {
  for (const part of (header || "").split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/** true, wenn das Request-Cookie eine gültige, nicht abgelaufene Sitzung trägt. */
export async function isLoggedIn(store, req, now = Date.now()) {
  const raw = cookieValue(req.headers.get("cookie"), COOKIE_NAME);
  if (!raw) return false;
  const [expStr, sig] = raw.split(".");
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || !sig) return false;
  if (exp * 1000 < now) return false;
  const expected = await hmac(await sessionKeyMaterial(store), "v1|" + exp);
  return safeEqual(sig, expected);
}

// --- Einfache Bremse gegen Durchprobieren (pro Function-Instanz) ---
const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function tooManyAttempts(ip, now = Date.now()) {
  const list = (attempts.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  attempts.set(ip, list);
  return list.length >= MAX_ATTEMPTS;
}

export function noteFailedAttempt(ip, now = Date.now()) {
  const list = attempts.get(ip) || [];
  list.push(now);
  attempts.set(ip, list);
}

export function resetAttempts(ip) {
  attempts.delete(ip);
}
